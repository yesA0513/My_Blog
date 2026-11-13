import { NotionAPI } from 'notion-client';

import { hiddenCollectionViewIds } from './config';

export const notion = new NotionAPI({
  apiBaseUrl: process.env.NOTION_API_BASE_URL?.trim() || undefined,
  hiddenCollectionViewIds,
});
