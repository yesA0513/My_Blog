import { Block } from 'notion-types';
import { defaultMapImageUrl } from '../packages/react-notion-x/map-image-url';

export const mapImageUrl = (url: string, block: Block) => {
  if (!url) return null;
  // Local assets and inline images do not need Notion's image service.
  if (/^(data:|blob:)/i.test(url) || /^\/(?!\/|image\/|images\/|icons\/)/.test(url)) {
    return url;
  }

  let path = url.split(/[?#]/)[0];
  try {
    path = decodeURIComponent(path).split(/[?#]/)[0];
  } catch {
    // A malformed escape must not prevent the image from rendering.
  }
  // Preserve vector icons and animation; photos always use the SDR rendition.
  if (/\.(svg|gif|ico)$/i.test(path) || path.startsWith('/icons/')) {
    return defaultMapImageUrl(url, block);
  }

  return defaultMapImageUrl(url, block, { forceProxy: true, width: 1920, format: 'webp' });
};
