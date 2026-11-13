import { NextApiRequest, NextApiResponse } from 'next';

import { createBlogSearch } from '../../lib/blog-search';
import { rootNotionPageId, rootNotionSpaceId } from '../../lib/config';
import { notion } from '../../lib/notion-api';

export const config = { maxDuration: 60 };
const search = createBlogSearch({
  rootPageId: rootNotionPageId,
  rootSpaceId: rootNotionSpaceId,
  getPage: pageId => notion.getPage(pageId, { signFileUrls: false }),
});

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send({ error: 'method not allowed' });
  }

  if (typeof req.body?.query !== 'string' || req.body.query.length > 200) {
    return res.status(400).json({ error: '검색어를 확인해 주세요.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    // The client cannot change which blog is searched via ancestorId or filters.
    const limit = Number.isFinite(req.body.limit) ? req.body.limit : 20;
    return res.status(200).json(await search(req.body.query, limit));
  } catch (error) {
    console.error('Blog search failed:', error.message);
    return res
      .status(503)
      .json({ error: '검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' });
  }
};
