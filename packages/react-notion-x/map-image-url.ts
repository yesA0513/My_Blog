import { Block } from 'notion-types';

const notionOrigin = 'https://app.notion.com';
const notionHosts = new Set([
  'www.notion.so',
  'notion.so',
  'www.notion.com',
  'notion.com',
  'app.notion.com',
]);

export const getHeifImageType = (url?: string): 'image/heic' | 'image/heif' | null => {
  if (!url || url.startsWith('data:')) return null;
  let path = url.split(/[?#]/)[0];
  try {
    path = decodeURIComponent(path);
  } catch {
    // Malformed escapes must not prevent other images from rendering.
  }
  path = path.split(/[?#]/)[0];
  if (/\.heic$/i.test(path)) return 'image/heic';
  if (/\.(heif|hif)$/i.test(path)) return 'image/heif';
  return null;
};

export const defaultMapImageUrl = (
  url: string,
  block: Block,
  { forceProxy = false, width }: { forceProxy?: boolean; width?: number } = {},
): string | null => {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  let imageUrl: URL;
  try {
    const source = new URL(url);
    if (source.protocol === 'https:') {
      // Signed file URLs already grant access. Proxying them again can break
      // their signatures or depend on the old Notion domain being reachable.
      if (
        !forceProxy &&
        ((source.hostname === 'file.notion.com' &&
          source.searchParams.has('signature') &&
          source.searchParams.has('expirationTimestamp')) ||
          (source.hostname.endsWith('.amazonaws.com') &&
            source.searchParams.has('X-Amz-Credential') &&
            source.searchParams.has('X-Amz-Signature') &&
            source.searchParams.has('X-Amz-Algorithm')) ||
          source.hostname === 'images.unsplash.com')
      ) {
        return url;
      }

      if (notionHosts.has(source.hostname)) {
        if (source.pathname.startsWith('/images/') || source.pathname.startsWith('/icons/')) {
          return `${notionOrigin}${source.pathname}${source.search}`;
        }
        if (source.pathname.startsWith('/image/')) {
          imageUrl = new URL(`${source.pathname}${source.search}`, notionOrigin);
        }
      }
    }
  } catch {
    // Relative Notion paths and attachment: URLs are resolved below.
  }

  if (url.startsWith('/images/') || url.startsWith('/icons/')) {
    return `${notionOrigin}${url}`;
  }
  if (!imageUrl) {
    imageUrl = new URL(
      url.startsWith('/image/') ? url : `/image/${encodeURIComponent(url)}`,
      notionOrigin,
    );
  }

  const table =
    !block.parent_table || block.parent_table === 'space' || block.parent_table === 'collection'
      ? 'block'
      : block.parent_table;
  imageUrl.searchParams.set('table', table);
  imageUrl.searchParams.set('id', block.id);
  imageUrl.searchParams.set('cache', 'v2');
  if (Number.isFinite(width) && width > 0) {
    imageUrl.searchParams.set('width', String(Math.round(width)));
  }
  return imageUrl.toString();
};
