import { ExtendedRecordMap, RecordMap, SearchResults } from 'notion-types';
import {
  getAllPagesInSpace,
  getBlockCollectionId,
  getBlockTitle,
  getPageContentBlockIds,
  getTextContent,
  parsePageId,
} from 'notion-utils';

const normalize = (text: string) => text.normalize('NFKC').toLowerCase();
const emptyResults = (): SearchResults => ({ results: [], total: 0, recordMap: { block: {} } });

export function createBlogSearch({
  rootPageId,
  rootSpaceId,
  getPage,
}: {
  rootPageId: string;
  rootSpaceId?: string;
  getPage: (pageId: string) => Promise<ExtendedRecordMap>;
}) {
  const buildIndex = async () => {
    const pages = await getAllPagesInSpace(rootPageId, rootSpaceId, getPage);
    if (!pages[parsePageId(rootPageId)]) throw new Error('Unable to load the blog search index');

    return Object.entries(pages).flatMap(([id, map]) => {
      const page = map?.block[id]?.value;
      if (!page || (page.type !== 'page' && page.type !== 'collection_view_page')) return [];
      const title = getBlockTitle(page, map);
      if (!title) return [];

      const text = getPageContentBlockIds(map, id)
        .filter(blockId => {
          const block = map.block[blockId]?.value;
          return (
            blockId !== id &&
            block &&
            block.type !== 'page' &&
            block.type !== 'collection_view_page'
          );
        })
        .map(blockId => {
          const block = map.block[blockId]?.value;
          const properties = Object.entries(block?.properties || {})
            .filter(([key]) => key !== 'source')
            .map(([, value]) => (Array.isArray(value) ? getTextContent(value) : ''));
          const publicLink =
            block?.type === 'external_object_instance' ? block.format?.original_url : undefined;
          return [...properties, publicLink].filter(Boolean).join(' ');
        })
        .join(' ')
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim();

      const collectionId =
        page.type === 'collection_view_page' ? getBlockCollectionId(page, map) : undefined;
      const record = {
        ...map.block[id],
        value: {
          ...page,
          content: undefined,
          properties: { title: [[title]] },
          ...(collectionId ? { collection_id: collectionId } : {}),
        },
      };
      return [
        {
          id,
          title,
          text,
          haystack: normalize(`${title} ${text}`),
          record,
          collectionId,
          collection: collectionId && map.collection[collectionId],
        },
      ];
    });
  };

  let cachedIndex: Awaited<ReturnType<typeof buildIndex>> | undefined;
  let cacheUntil = 0;
  let pendingIndex: ReturnType<typeof buildIndex> | undefined;
  const getIndex = () => {
    if (cachedIndex && Date.now() < cacheUntil) return Promise.resolve(cachedIndex);
    // Opening the dialog warms the index while the first query can already be
    // arriving. Share the pending crawl instead of issuing both sets of requests.
    if (!pendingIndex) {
      pendingIndex = buildIndex()
        .then(index => {
          cachedIndex = index;
          cacheUntil = Date.now() + 60_000;
          return index;
        })
        .finally(() => {
          pendingIndex = undefined;
        });
    }
    return pendingIndex;
  };

  return async (query: string, limit = 20): Promise<SearchResults> => {
    const index = await getIndex();
    const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return emptyResults();

    const matches = index
      .filter(entry => terms.every(term => entry.haystack.includes(term)))
      .map(entry => {
        const title = normalize(entry.title);
        const exact = title === normalize(query.trim());
        const score = exact ? 100 : terms.every(term => title.includes(term)) ? 50 : 10;
        return { ...entry, score };
      })
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'ko'));

    const recordMap: RecordMap = { block: {}, collection: {} };
    const results = matches.slice(0, Math.max(1, Math.min(50, limit))).map(entry => {
      recordMap.block[entry.id] = entry.record as any;
      if (entry.collection) recordMap.collection[entry.collectionId] = entry.collection;
      const lowerText = normalize(entry.text);
      const term = terms.find(term => lowerText.includes(term));
      const start = term ? Math.max(0, lowerText.indexOf(term) - 35) : 0;
      const end = start + 160;
      return {
        id: entry.id,
        isNavigable: true,
        score: entry.score,
        highlight: {
          pathText: entry.title,
          text: `${start ? '…' : ''}${entry.text.slice(start, end)}${
            end < entry.text.length ? '…' : ''
          }`,
        },
      };
    });
    return { results, total: matches.length, recordMap };
  };
}
