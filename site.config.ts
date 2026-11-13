import { siteConfig } from './lib/site-config';

// Start here: docs/SETUP.ko.md
// A public page ID is not an API key. These settings are also used in the browser.
export default siteConfig({
  rootNotionPageId: process.env.NEXT_PUBLIC_NOTION_PAGE_ID || '',
  rootNotionSpaceId: null,

  name: process.env.NEXT_PUBLIC_SITE_NAME || '나의 블로그',
  homePageTitle: '일상과 개발의 기록',
  author: process.env.NEXT_PUBLIC_SITE_AUTHOR || '블로그 작성자',
  // Optional avatar images keyed by the author's Notion user ID.
  authorAvatarOverrides: {
    '92a3d7c9-7af3-4c01-a247-c410b1ebb510': '/author-avatar.png',
  },
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
  // Keep Memo's unfiltered All view in Notion, but omit it from the blog.
  hiddenCollectionViewIds: ['41722acc-6a48-80d2-b856-000c4b07304f'],
  contentPositionTextAlign: 'left',
  defaultTheme: 'system',
  enableComment: false,
});
