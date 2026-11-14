import { Block } from 'notion-types';

const notionOrigin = 'https://app.notion.com';
const notionHosts = new Set([
  'www.notion.so',
  'notion.so',
  'www.notion.com',
  'notion.com',
  'app.notion.com',
]);

export const defaultMapImageUrl = (
  url: string,
  block: Block,
  {
    forceProxy = false,
    width,
    format,
  }: { forceProxy?: boolean; width?: number; format?: 'webp' } = {},
): string | null => {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  if (format && url.startsWith('/images/')) url = `${notionOrigin}${url}`;

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
        if (
          !format &&
          (source.pathname.startsWith('/images/') || source.pathname.startsWith('/icons/'))
        ) {
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
  if (format) imageUrl.searchParams.set('format', format);
  return imageUrl.toString();
};
