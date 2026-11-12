import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';

import { NotionAPI } from '../packages/notion-client/notion-api';
import { normalizeRecordMap } from '../packages/notion-client/normalize-record-map';

const pageId = '01234567-89ab-cdef-0123-456789abcdef';
const textId = '11234567-89ab-cdef-0123-456789abcdef';
const viewBlockId = '21234567-89ab-cdef-0123-456789abcdef';
const collectionId = '31234567-89ab-cdef-0123-456789abcdef';
const viewId = '41234567-89ab-cdef-0123-456789abcdef';
const postId = '51234567-89ab-cdef-0123-456789abcdef';

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
  check: (api: NotionAPI, requests: string[]) => Promise<void>,
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
    await check(new NotionAPI({ apiBaseUrl: `http://127.0.0.1:${address.port}` }), requests);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve())),
    );
  }
}

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
