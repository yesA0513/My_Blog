import { Client } from '@notionhq/client';

import { createCommentPostAccess, createCommentsHandler } from '../../../lib/blog-comments';
import { enableComment, rootNotionPageId, rootNotionSpaceId } from '../../../lib/config';
import { notion as publicNotion } from '../../../lib/notion-api';

export const config = { maxDuration: 60 };

const apiKey = process.env.NOTION_API_KEY?.trim();
const notion = new Client({ auth: apiKey, timeoutMs: 15_000 });
const canComment = createCommentPostAccess({
  rootPageId: rootNotionPageId,
  rootSpaceId: rootNotionSpaceId,
  getPage: pageId => publicNotion.getPage(pageId, { signFileUrls: false }),
});

export default createCommentsHandler({
  enabled: enableComment,
  configured: !!apiKey,
  canComment,
  comments: notion.comments,
});
