import type { NextApiRequest, NextApiResponse } from 'next';
import type { ExtendedRecordMap } from 'notion-types';
import { getAllPagesInSpace, parsePageId } from 'notion-utils';

export const commentMaxLength = 2000;

export function createCommentPostAccess({
  rootPageId,
  rootSpaceId,
  getPage,
}: {
  rootPageId: string;
  rootSpaceId?: string;
  getPage: (id: string) => Promise<ExtendedRecordMap>;
}) {
  let cached: Set<string>;
  let expires = 0;
  let pending: Promise<Set<string>>;

  return async (pageId: string) => {
    if (!cached || Date.now() >= expires) {
      if (!pending) {
        pending = getAllPagesInSpace(rootPageId, rootSpaceId, getPage)
          .then(pages => {
            if (!pages[parsePageId(rootPageId)]) throw new Error('Blog is unavailable');
            cached = new Set(
              Object.entries(pages)
                .filter(([id, map]) => {
                  const page = map?.block[id]?.value;
                  return page?.type === 'page' && page.parent_table === 'collection';
                })
                .map(([id]) => id),
            );
            expires = Date.now() + 60_000;
            return cached;
          })
          .finally(() => {
            pending = undefined;
          });
      }
      await pending;
    }
    return cached.has(parsePageId(pageId));
  };
}

export function createCommentsHandler({
  enabled,
  configured,
  canComment,
  comments,
}: {
  enabled: boolean;
  configured: boolean;
  canComment: (pageId: string) => Promise<boolean>;
  comments: {
    list: (params: { block_id: string; start_cursor?: string }) => Promise<unknown>;
    create: (params: {
      parent: { page_id: string };
      rich_text: { text: { content: string } }[];
    }) => Promise<unknown>;
  };
}) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Allow', 'GET, POST');
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ message: '지원하지 않는 요청입니다.' });
    }
    if (!enabled) return res.status(404).json({ message: '댓글을 사용할 수 없습니다.' });

    const { id, cursor } = req.query;
    if (
      typeof id !== 'string' ||
      !/^(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i.test(id) ||
      (cursor !== undefined && (typeof cursor !== 'string' || cursor.length > 200))
    ) {
      return res.status(400).json({ message: '댓글 주소를 확인해 주세요.' });
    }

    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (req.method === 'POST' && (!content || content.length > commentMaxLength)) {
      return res.status(400).json({ message: '댓글은 1~2,000자 사이로 입력해 주세요.' });
    }
    const notConfigured = () =>
      res.status(503).json({
        code: 'comments_not_configured',
        message: '댓글 연결을 준비 중입니다.',
      });
    if (!configured) return notConfigured();

    const pageId = parsePageId(id.toLowerCase());
    try {
      if (!(await canComment(pageId))) {
        return res.status(404).json({ message: '공개된 블로그 글에서 댓글을 이용해 주세요.' });
      }
      const result =
        req.method === 'POST'
          ? await comments.create({
              parent: { page_id: pageId },
              rich_text: [{ text: { content } }],
            })
          : await comments.list({
              block_id: pageId,
              ...(cursor ? { start_cursor: cursor as string } : {}),
            });
      return res.status(200).json(result);
    } catch (error) {
      if (['unauthorized', 'restricted_resource', 'object_not_found'].includes(error?.code)) {
        return notConfigured();
      }
      if (error?.code === 'rate_limited') {
        return res.status(429).json({ message: '잠시 후 다시 시도해 주세요.' });
      }
      return res.status(503).json({
        message:
          req.method === 'POST'
            ? '댓글을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.'
            : '댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      });
    }
  };
}
