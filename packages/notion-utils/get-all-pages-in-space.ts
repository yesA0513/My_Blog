import PQueue from 'p-queue';
import pRetry from 'p-retry';

import { ExtendedRecordMap, PageMap } from 'notion-types';
import { parsePageId } from './parse-page-id';

/**
 * Performs a traversal over a given Notion workspace starting from a seed page.
 *
 * Returns a map containing all of the pages that are reachable from the seed
 * page in the space.
 *
 * If `rootSpaceId` is not defined, the space ID of the root page will be used
 * to scope traversal.
 *
 *
 * @param rootPageId - Page ID to start from.
 * @param rootSpaceId - Space ID to scope traversal.
 * @param getPage - Function used to fetch a single page.
 * @param opts - Optional config
 */
export async function getAllPagesInSpace(
  rootPageId: string,
  rootSpaceId: string | undefined,
  getPage: (pageId: string) => Promise<ExtendedRecordMap>,
  {
    concurrency = 4,
    traverseCollections = true,
    targetPageId = null,
  }: {
    concurrency?: number;
    traverseCollections?: boolean;
    targetPageId?: string;
  } = {},
): Promise<PageMap> {
  const pages: PageMap = {};
  const pendingPageIds = new Set<string>();
  const queue = new PQueue({ concurrency });
  const allowCollectionItemIds = new Set<string>();

  async function processPage(pageId: string) {
    if (targetPageId && pendingPageIds.has(targetPageId)) {
      return;
    }

    pageId = parsePageId(pageId) as string;

    if (pageId && !pages[pageId] && !pendingPageIds.has(pageId)) {
      pendingPageIds.add(pageId);

      queue.add(async () => {
        try {
          await pRetry(
            async () => {
              if (targetPageId && pendingPageIds.has(targetPageId) && pageId !== targetPageId) {
                return;
              }

              const page = await getPage(pageId);

              // console.log(
              //   `\n---------- ${pageId} / "${
              //     page.block[pageId].value.properties['title'] || '???'
              //   }" ----------\n`,
              // );

              if (!page) {
                return;
              }

              const spaceId = page.block[pageId]?.value?.space_id;

              if (spaceId) {
                if (!rootSpaceId) {
                  rootSpaceId = spaceId;
                } else if (rootSpaceId !== spaceId) {
                  return;
                }
              }

              // Only crawl collection items included in the views displayed on the blog.
              Object.values(page.block).forEach(({ value: block }) => {
                if (!block || !block?.type) {
                  return;
                }

                if (
                  traverseCollections &&
                  (block.type === 'collection_view' || block.type === 'collection_view_page')
                ) {
                  // Inline galleries display the first view. Full-page databases
                  // display every visible tab; hidden All views are already removed.
                  const viewIds =
                    block.type === 'collection_view_page'
                      ? block.view_ids || []
                      : (block.view_ids || []).slice(0, 1);
                  for (const viewId of viewIds) {
                    const collectionId =
                      block.collection_id ||
                      page.collection_view?.[viewId]?.value?.format?.collection_pointer?.id;
                    const data = page.collection_query?.[collectionId]?.[viewId];
                    if (!data) continue;
                    const groups: any[] = [data.collection_group_results, data];
                    for (const [key, result] of Object.entries(data)) {
                      if (key.startsWith('results:')) groups.push(result);
                    }
                    for (const group of groups) {
                      for (const id of group?.blockIds || []) allowCollectionItemIds.add(id);
                    }
                  }
                }
              });

              Object.keys(page.block)
                .filter(key => {
                  const block = page.block[key]?.value;

                  if (!block) return false;

                  if (block.type !== 'page' && block.type !== 'collection_view_page') {
                    return false;
                  }

                  // the space id check is important to limit traversal because pages
                  // can reference pages in other spaces
                  if (rootSpaceId && block.space_id && block.space_id !== rootSpaceId) {
                    return false;
                  }

                  // Metadata from unfiltered views must not make drafts discoverable.
                  if (block.parent_table === 'collection') {
                    if (!allowCollectionItemIds.has(block.id)) {
                      return false;
                    }
                  }

                  // console.log(block.id, block.properties.title);

                  return true;
                })
                .forEach(subPageId => processPage(subPageId));

              // CUSTOM: 위 커스텀 코드로 인해 이 코드 필요가 없어짐
              // traverse collection item pages as they may contain subpages as well
              // if (traverseCollections) {
              //   for (const collectionViews of Object.values(page.collection_query)) {
              //     for (const collectionData of Object.values(collectionViews)) {
              //       const { blockIds } = collectionData;

              //       if (blockIds) {
              //         for (const collectionItemId of blockIds) {
              //           processPage(collectionItemId);
              //         }
              //       }
              //     }
              //   }
              // }

              pages[pageId] = page;
            },
            {
              onFailedAttempt: error => {
                console.log(
                  `Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`,
                );
              },
              retries: 3,
            },
          );

          // console.log('\n----------------------------------------------\n\n');
        } catch (err) {
          console.warn(
            'page load error',
            { pageId, spaceId: rootSpaceId },
            err.statusCode,
            err.message,
          );
          pages[pageId] = null;
        }

        pendingPageIds.delete(pageId);
      });
    }
  }

  await processPage(rootPageId);
  await queue.onIdle();

  return pages;
}
