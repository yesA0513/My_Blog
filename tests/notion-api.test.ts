import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';

import { NotionAPI } from '../packages/notion-client/notion-api';
import { normalizeRecordMap } from '../packages/notion-client/normalize-record-map';
import { defaultMapImageUrl, getHeifImageType } from '../packages/react-notion-x/map-image-url';

const pageId = '01234567-89ab-cdef-0123-456789abcdef';
const textId = '11234567-89ab-cdef-0123-456789abcdef';
const viewBlockId = '21234567-89ab-cdef-0123-456789abcdef';
const collectionId = '31234567-89ab-cdef-0123-456789abcdef';
const viewId = '41234567-89ab-cdef-0123-456789abcdef';
const postId = '51234567-89ab-cdef-0123-456789abcdef';

test('preserves current signed Notion file URLs without encoding their signatures again', () => {
  const block = { id: postId, parent_table: 'block' } as any;
  const signed =
    'https://file.notion.com/f/f/space/file/photo.png?table=block&id=photo&expirationTimestamp=9999999999999&signature=a%2Fb%3D';
  assert.equal(defaultMapImageUrl(signed, block), signed);

  const unsigned = 'https://file.notion.com/f/f/space/file/photo.png';
  const proxy = new URL(defaultMapImageUrl(unsigned, block));
  assert.equal(proxy.origin, 'https://app.notion.com');
  assert.equal(decodeURIComponent(proxy.pathname.slice('/image/'.length)), unsigned);
});

test('preserves both old and new signed S3 image URLs', () => {
  const block = { id: postId, parent_table: 'block' } as any;
  for (const path of [
    's3.us-west-2.amazonaws.com/secure.notion-static.com/file/photo.png',
    'prod-files-secure.s3.us-west-2.amazonaws.com/space/file/photo.png',
  ]) {
    const signed = `https://${path}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=credential&X-Amz-Signature=signature`;
    assert.equal(defaultMapImageUrl(signed, block), signed);
  }
});

test('resolves attachments and existing Notion image proxies on the current host', () => {
  const block = { id: postId, parent_table: 'collection' } as any;
  const source = 'attachment:file-id:한글 사진.png';
  const proxy = new URL(defaultMapImageUrl(source, block));
  assert.equal(proxy.origin, 'https://app.notion.com');
  assert.equal(decodeURIComponent(proxy.pathname.slice('/image/'.length)), source);
  assert.equal(proxy.searchParams.get('table'), 'block');
  assert.equal(proxy.searchParams.get('id'), postId);

  const legacy = new URL(proxy);
  legacy.hostname = 'www.notion.so';
  legacy.searchParams.set('width', '1200');
  const migrated = new URL(defaultMapImageUrl(legacy.toString(), block));
  assert.equal(migrated.origin, 'https://app.notion.com');
  assert.equal(migrated.pathname, proxy.pathname);
  assert.equal(migrated.searchParams.get('width'), '1200');
});

test('keeps direct images and resolves built-in Notion images and icons', () => {
  const block = { id: postId, parent_table: 'block' } as any;
  for (const source of ['https://images.unsplash.com/photo-123', 'data:image/png;base64,AAA']) {
    assert.equal(defaultMapImageUrl(source, block), source);
  }
  assert.equal(
    defaultMapImageUrl('/images/page-cover/photo.jpg', block),
    'https://app.notion.com/images/page-cover/photo.jpg',
  );
  assert.equal(
    defaultMapImageUrl('https://www.notion.so/icons/computer_gray.svg', block),
    'https://app.notion.com/icons/computer_gray.svg',
  );
  assert.equal(defaultMapImageUrl('', block), null);
});

function entry(value: any) {
  return { spaceId: 'public-space', value: { value, role: 'reader' } };
}

function pageRecordMap(authorId?: string) {
  return {
    block: {
      [pageId]: entry({
        id: pageId,
        type: 'page',
        properties: { title: [['Test blog']] },
        content: [textId],
        ...(authorId ? { created_by_id: authorId } : {}),
      }),
      [textId]: entry({ id: textId, type: 'text', properties: { title: [['First post']] } }),
    },
  };
}

async function withApi(
  reply: (endpoint: string, body: any) => { status?: number; body: any },
  check: (api: NotionAPI, requests: string[], apiBaseUrl: string) => Promise<void>,
  options: { hiddenCollectionViewIds?: string[] } = {},
) {
  const requests: string[] = [];
  const server = createServer(async (request, response) => {
    request.setEncoding('utf8');
    let body = '';
    for await (const chunk of request) body += chunk;
    const endpoint = request.url.slice(1);
    requests.push(endpoint);
    const result = reply(endpoint, JSON.parse(body));
    response.writeHead(result.status || 200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(result.body));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address();
    if (typeof address === 'string' || !address) throw new Error('No test server address');
    const apiBaseUrl = `http://127.0.0.1:${address.port}`;
    await check(new NotionAPI({ apiBaseUrl, ...options }), requests, apiBaseUrl);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve())),
    );
  }
}

test('uses the current API host with missing, blank, or legacy deployment overrides', async () => {
  await withApi(
    () => ({ body: { recordMap: pageRecordMap() } }),
    async (_api, _requests, testApiBaseUrl) => {
      const destinations: string[] = [];
      for (const apiBaseUrl of [
        undefined,
        '',
        ' https://www.notion.so/api/v3/ ',
        'https://notion.com/api/v3',
      ]) {
        const api = new NotionAPI({ apiBaseUrl });
        const map = await api.getPage(pageId, {
          fetchCollections: false,
          signFileUrls: false,
          gotOptions: {
            hooks: {
              beforeRequest: [
                options => {
                  destinations.push(options.url.toString());
                  // Test the outgoing request without using the public network.
                  options.url = new URL(`${testApiBaseUrl}/loadPageChunk`);
                },
              ],
            },
          },
        });
        assert.equal(map.block[pageId].value.type, 'page');
      }
      assert.deepEqual(destinations, Array(4).fill('https://app.notion.com/api/v3/loadPageChunk'));
    },
  );
});

test('normalizes nested records in every table and preserves legacy entries', () => {
  const legacy = { role: 'reader', value: { id: textId, type: 'text' } };
  const map: any = {
    ...pageRecordMap(),
    collection: { [collectionId]: entry({ id: collectionId, name: [['Posts']] }) },
    collection_view: { [viewId]: entry({ id: viewId, type: 'gallery' }) },
    notion_user: { author: entry({ id: 'author', name: 'Writer' }) },
  };
  map.block[textId] = legacy;
  normalizeRecordMap(map);
  assert.equal(map.block[pageId].value.type, 'page');
  assert.equal(map.collection[collectionId].value.id, collectionId);
  assert.equal(map.collection_view[viewId].value.type, 'gallery');
  assert.equal(map.notion_user.author.value.name, 'Writer');
  assert.equal(map.block[pageId].role, 'reader');
  assert.equal(map.block[pageId].spaceId, 'public-space');
  assert.equal(map.block[textId], legacy);
  const once = JSON.stringify(map);
  normalizeRecordMap(map);
  assert.equal(JSON.stringify(map), once);
});

// Model Notion's query contract with rows from different categories and statuses.
const rows = [
  { id: 'published-daily', category: 'Daily', status: '게시됨' },
  { id: 'published-development', category: 'Development', status: '게시됨' },
  { id: 'published-car', category: 'Car', status: '게시됨' },
  { id: 'draft-daily', category: 'Daily', status: '초안' },
  { id: 'empty-status-daily', category: 'Daily', status: '' },
];

function matches(filter: any, row: typeof rows[number]): boolean {
  if (!filter) return true;
  if (filter.filters) {
    return filter.operator === 'or'
      ? filter.filters.some(child => matches(child, row))
      : filter.filters.every(child => matches(child, row));
  }
  if (filter.filter.operator === 'enum_contains') {
    return row[filter.property] === filter.filter.value.value;
  }
  if (filter.filter.operator === 'status_is') {
    const statusGroups = { 게시됨: 'Complete', 초안: 'To-do' };
    return statusGroups[row.status] === filter.filter.value.value;
  }
  throw new Error(`Unexpected test filter: ${filter.filter.operator}`);
}

function filteredView() {
  const category = value => ({
    property: 'category',
    filter: { operator: 'enum_contains', value: { type: 'exact', value } },
  });
  return {
    id: viewId,
    type: 'list',
    query2: { filter: { operator: 'or', filters: [category('Daily'), category('Development')] } },
    format: {
      property_filters: [
        {
          filter: {
            property: 'status',
            filter: { operator: 'status_is', value: { type: 'is_group', value: 'Complete' } },
          },
        },
      ],
    },
  };
}

test('combines category OR conditions with Complete status instead of replacing them', async () => {
  await withApi(
    (_endpoint, body) => {
      assert(body.loader.reducers.collection_group_results);
      return {
        body: {
          result: {
            blockIds: rows.filter(row => matches(body.loader.filter, row)).map(row => row.id),
          },
        },
      };
    },
    async api => {
      const view = filteredView();
      // Switching a Notion board/feed to a list can leave old board settings behind.
      (view.format as any).board_columns_by = { property: 'status', type: 'status' };
      const published = await api.getCollectionData(collectionId, viewId, view);
      assert.deepEqual(published.result.blockIds, ['published-daily', 'published-development']);

      const draft = await api.getCollectionData(collectionId, viewId, view, { draftView: true });
      assert.deepEqual(draft.result.blockIds, [
        'published-daily',
        'published-development',
        'draft-daily',
        'empty-status-daily',
      ]);
    },
  );
});

test('grouped collections retain category and status restrictions for results and group totals', async () => {
  await withApi(
    (_endpoint, body) => ({
      body: {
        result: {
          total: rows.filter(row => matches(body.loader.filter, row)).length,
          groupTotal: rows.filter(row => matches(body.loader.reducers.gallery_groups.filter, row))
            .length,
        },
      },
    }),
    async api => {
      const view: any = filteredView();
      view.type = 'gallery';
      view.format.collection_group_by = { property: 'category', type: 'select' };
      const { result } = await api.getCollectionData(collectionId, viewId, view);
      assert.equal(result.total, 2);
      assert.equal((result as any).groupTotal, 2);
    },
  );
});

test('omits hidden All queries and displays a feed view as a filtered list', async () => {
  const hiddenViewId = '61234567-89ab-cdef-0123-456789abcdef';
  const queriedViews: string[] = [];
  await withApi(
    (endpoint, body) => {
      if (endpoint === 'queryCollection') {
        queriedViews.push(body.collectionView.id);
        assert(body.loader.reducers.collection_group_results);
        return {
          body: {
            recordMap: {
              block: {
                [viewBlockId]: entry({
                  id: viewBlockId,
                  type: 'collection_view_page',
                  collection_id: collectionId,
                  view_ids: [hiddenViewId, viewId],
                }),
              },
            },
            result: {
              reducerResults: {
                collection_group_results: {
                  blockIds: rows.filter(row => matches(body.loader.filter, row)).map(row => row.id),
                },
              },
            },
          },
        };
      }
      const map: any = pageRecordMap();
      map.block[pageId].value.value.content = [viewBlockId];
      map.block[viewBlockId] = entry({
        id: viewBlockId,
        type: 'collection_view_page',
        collection_id: collectionId,
        view_ids: [hiddenViewId, viewId],
      });
      const view: any = filteredView();
      view.type = 'feed';
      view.format.collection_group_by = { property: 'status', type: 'status' };
      view.format.board_columns_by = view.format.collection_group_by;
      map.collection = { [collectionId]: entry({ id: collectionId, name: [['Memo']] }) };
      map.collection_view = {
        [viewId]: entry(view),
        [hiddenViewId]: entry({ id: hiddenViewId, type: 'list', name: 'All' }),
      };
      return { body: { recordMap: map } };
    },
    async api => {
      const map = await api.getPage(pageId, { signFileUrls: false });
      assert.deepEqual((map.block[viewBlockId].value as any).view_ids, [viewId]);
      assert.deepEqual(queriedViews, [viewId]);
      assert.equal(map.collection_view[viewId].value.type, 'list');
      assert.equal(
        (map.collection_view[viewId].value.format as any).collection_group_by,
        undefined,
      );
      assert.deepEqual(
        map.collection_query[collectionId][viewId].collection_group_results.blockIds,
        ['published-daily', 'published-development'],
      );
      assert.equal(map.collection_query[collectionId][hiddenViewId], undefined);
    },
    { hiddenCollectionViewIds: [hiddenViewId] },
  );
});

test('loads a public page without issuing an empty author lookup', async () => {
  await withApi(
    () => ({ body: { recordMap: pageRecordMap() } }),
    async (api, requests) => {
      const map = await api.getPage(pageId, { fetchCollections: false, signFileUrls: false });
      assert.equal(map.block[pageId].value.type, 'page');
      assert.deepEqual(map.block[textId].value.properties.title, [['First post']]);
      assert.deepEqual(requests, ['loadPageChunk']);
    },
  );
});

test('an unavailable author profile does not prevent loading content', async () => {
  await withApi(
    endpoint =>
      endpoint === 'getRecordValues'
        ? { status: 400, body: { name: 'ValidationError' } }
        : { body: { recordMap: pageRecordMap('redacted-author') } },
    async api => {
      const map = await api.getPage(pageId, { fetchCollections: false, signFileUrls: false });
      assert.equal(map.block[pageId].value.type, 'page');
      assert.deepEqual(map.notion_user, {});
    },
  );
});

test('merges normalized collection results so gallery posts remain visible', async () => {
  await withApi(
    endpoint => {
      if (endpoint === 'queryCollection') {
        return {
          body: {
            recordMap: {
              block: {
                [postId]: entry({ id: postId, type: 'page', properties: { title: [['Post']] } }),
              },
              collection: {},
              collection_view: {},
              notion_user: {},
            },
            result: { reducerResults: { collection_group_results: { blockIds: [postId] } } },
          },
        };
      }
      const map: any = pageRecordMap();
      map.block[pageId].value.value.content = [viewBlockId];
      map.block[viewBlockId] = entry({
        id: viewBlockId,
        type: 'collection_view',
        collection_id: collectionId,
        view_ids: [viewId],
      });
      map.collection = { [collectionId]: entry({ id: collectionId, name: [['Posts']] }) };
      map.collection_view = { [viewId]: entry({ id: viewId, type: 'gallery' }) };
      return { body: { recordMap: map } };
    },
    async (api, requests) => {
      const map = await api.getPage(pageId, { signFileUrls: false });
      assert.equal(map.block[postId].value.type, 'page');
      assert.deepEqual(
        map.collection_query[collectionId][viewId].collection_group_results.blockIds,
        [postId],
      );
      assert.deepEqual(requests, ['loadPageChunk', 'queryCollection']);
    },
  );
});

test('detects HEIF-family uploads and encoded attachment paths without treating HDR JPEGs as HEIF', () => {
  assert.equal(getHeifImageType('attachment:file-id:IMG_3838.HEIC'), 'image/heic');
  assert.equal(
    getHeifImageType('https://file.notion.com/photo%20one%2Eheif?signature=abc'),
    'image/heif',
  );
  assert.equal(getHeifImageType('/image/attachment%3Afile%3Aphoto.hif?width=1000'), 'image/heif');
  assert.equal(getHeifImageType('https://example.com/photo.jpeg?name=photo.heic'), null);
  assert.equal(getHeifImageType('https://example.com/HDR.jpg'), null);
  assert.equal(getHeifImageType('data:image/jpeg;base64,heic'), null);
});

test('requests a compatible rendition only when explicitly asked, preserving signed originals', () => {
  const block = { id: postId, parent_table: 'block' } as any;
  const signed =
    'https://file.notion.com/f/f/space/file/IMG.heic?expirationTimestamp=9999999999999&signature=a%2Fb%3D';
  assert.equal(defaultMapImageUrl(signed, block), signed);
  const fallback = new URL(defaultMapImageUrl(signed, block, { forceProxy: true, width: 1920 }));
  assert.equal(fallback.origin, 'https://app.notion.com');
  assert.equal(decodeURIComponent(fallback.pathname.slice('/image/'.length)), signed);
  assert.equal(fallback.searchParams.get('width'), '1920');
  assert.equal(fallback.searchParams.get('id'), postId);
  assert.equal(fallback.searchParams.get('table'), 'block');
});

test('uses stable attachment references for HEIF renditions without changing stored originals', () => {
  const source = 'attachment:file-id:IMG_3838.heic';
  const fallback = new URL(
    defaultMapImageUrl(source, { id: postId, parent_table: 'collection' } as any, {
      forceProxy: true,
      width: 1920,
    }),
  );
  assert.equal(decodeURIComponent(fallback.pathname.slice('/image/'.length)), source);
  assert.equal(fallback.searchParams.get('table'), 'block');
  const updated = new URL(
    defaultMapImageUrl(fallback.toString(), { id: postId } as any, {
      forceProxy: true,
      width: 1920,
    }),
  );
  assert.equal(updated.toString(), fallback.toString());
});
