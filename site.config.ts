import { siteConfig } from './lib/site-config';

// Start here: docs/SETUP.ko.md
// A public page ID is not an API key. These settings are also used in the browser.
export default siteConfig({
  rootNotionPageId: process.env.NEXT_PUBLIC_NOTION_PAGE_ID || '',
  rootNotionSpaceId: null,

  name: process.env.NEXT_PUBLIC_SITE_NAME || '나의 블로그',
  author: process.env.NEXT_PUBLIC_SITE_AUTHOR || '블로그 작성자',
  domain: process.env.NEXT_PUBLIC_SITE_DOMAIN || 'localhost:3000',
  description: '노션으로 작성하는 블로그',
  language: 'ko',

  defaultPageIcon: null,
  defaultPageCover: null,
  defaultPageCoverPosition: 0.5,

  isPreviewImageSupportEnabled: false,
  isSocialImageEnabled: false,
  isRedisEnabled: false,
  includeNotionIdInUrls: true,
  pageUrlOverrides: null,

  navigationStyle: 'default',
  navigationLinks: [],

  dateformat: 'yyyy년 MM월 dd일',
  hiddenPostProperties: ['설명', '상태', '최하위 정렬'],
  contentPositionTextAlign: 'left',
  defaultTheme: 'system',
  enableComment: false,
});
