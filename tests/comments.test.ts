import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createCommentPostAccess, createCommentsHandler } from '../lib/blog-comments';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [root, post, draft, gallery, collection, view] = Array.from({ length: 6 }, (_, n) =>
  id(n + 1),
);

function setup(overrides: Partial<Parameters<typeof createCommentsHandler>[0]> = {}) {
  const calls: { method: string; params: any }[] = [];
  const handler = createCommentsHandler({
    enabled: true,
    configured: true,
    canComment: async pageId => pageId === post,
    comments: {
      list: async params => {
        calls.push({ method: 'list', params });
        return { results: [{ id: 'existing' }], has_more: false, next_cursor: null };
      },
      create: async params => {
        calls.push({ method: 'create', params });
        return { id: 'created' };
      },
    },
    ...overrides,
  });
  return {
    calls,
    async request(method = 'GET', query: any = { id: post }, body: any = {}) {
      let status = 200;
      let result: any;
      const headers: Record<string, string> = {};
      const response: any = {
        setHeader(name, value) {
          headers[name] = value;
          return response;
        },
        status(value) {
          assert(Number.isInteger(value));
          status = value;
          return response;
        },
        json(value) {
          result = value;
          return response;
        },
      };
      await handler({ method, query, body } as any, response);
      return { status, body: result, headers };
    },
  };
}

test('disabled, unsupported and unconfigured comments never call Notion', async () => {
  const disabled = setup({ enabled: false });
  assert.equal((await disabled.request()).status, 404);
  assert.equal(disabled.calls.length, 0);
  const missing = setup({ configured: false });
  const response = await missing.request();
  assert.equal(response.status, 503);
  assert.equal(response.body.code, 'comments_not_configured');
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal((await missing.request('DELETE')).headers.Allow, 'GET, POST');
  assert.equal((await missing.request('DELETE')).status, 405);
  assert.equal(missing.calls.length, 0);
});

test('rejects malformed IDs, cursors, empty and oversized comments before any Notion write', async () => {
  const api = setup();
  for (const query of [{ id: 'bad-id' }, { id: [post, draft] }, { id: post, cursor: ['bad'] }]) {
    assert.equal((await api.request('GET', query)).status, 400);
  }
  for (const body of [
    null,
    {},
    { content: ['text'] },
    { content: ' \n ' },
    { content: 'x'.repeat(2001) },
  ]) {
    assert.equal((await api.request('POST', { id: post }, body)).status, 400);
  }
  assert.equal(api.calls.length, 0);
});

test('unpublished or unrelated pages cannot read or write comments through the blog token', async () => {
  const api = setup();
  for (const pageId of [root, draft, id(99)]) {
    assert.equal((await api.request('GET', { id: pageId })).status, 404);
    assert.equal((await api.request('POST', { id: pageId }, { content: 'hello' })).status, 404);
  }
  assert.equal(api.calls.length, 0);
});

test('lists paginated comments and writes trimmed text against the normalized public post ID', async () => {
  const api = setup();
  const response = await api.request('GET', { id: post.replace(/-/g, ''), cursor: 'next-page' });
  assert.equal(response.status, 200);
  assert.equal(response.body.results[0].id, 'existing');
  assert.deepEqual(api.calls[0], {
    method: 'list',
    params: { block_id: post, start_cursor: 'next-page' },
  });
  assert.equal(
    (await api.request('POST', { id: post }, { content: '  hello\nworld  ' })).status,
    200,
  );
  assert.deepEqual(api.calls[1], {
    method: 'create',
    params: { parent: { page_id: post }, rich_text: [{ text: { content: 'hello\nworld' } }] },
  });
});

test('handles missing permissions, rate limits and network errors without leaking upstream details', async () => {
  for (const code of [
    'unauthorized',
    'restricted_resource',
    'object_not_found',
    'rate_limited',
    undefined,
  ]) {
    const fail = async () => {
      throw Object.assign(new Error('private upstream details'), { code });
    };
    const api = setup({ comments: { list: fail, create: fail } });
    const response = await api.request();
    assert.equal(response.status, code === 'rate_limited' ? 429 : 503);
    assert(!JSON.stringify(response.body).includes('private upstream details'));
  }
  const api = setup({
    canComment: async () => {
      throw new Error('unavailable');
    },
  });
  assert.equal((await api.request()).status, 503);
  assert.equal(api.calls.length, 0);
});

test('only grants comment access to posts in visible collection views and shares the cached crawl', async () => {
  const entry = (value: any) => ({ role: 'reader', value });
  const page = (pageId: string, parentTable = 'collection') => ({
    id: pageId,
    type: 'page',
    parent_table: parentTable,
    space_id: 'blog',
    properties: { title: [['Post']] },
  });
  const rootMap: any = {
    block: {
      [root]: entry(page(root, 'space')),
      [post]: entry(page(post)),
      [draft]: entry(page(draft)),
      [gallery]: entry({
        id: gallery,
        type: 'collection_view',
        collection_id: collection,
        view_ids: [view],
      }),
    },
    collection_query: {
      [collection]: { [view]: { collection_group_results: { blockIds: [post] } } },
    },
  };
  const requested: string[] = [];
  const canComment = createCommentPostAccess({
    rootPageId: root,
    getPage: async pageId => {
      requested.push(pageId);
      return pageId === root ? rootMap : ({ block: { [post]: entry(page(post)) } } as any);
    },
  });
  assert.deepEqual(await Promise.all([canComment(post), canComment(draft), canComment(root)]), [
    true,
    false,
    false,
  ]);
  assert.equal(await canComment(id(99)), false);
  assert.deepEqual(requested.sort(), [root, post].sort());
});

test('does not grant access when the public blog root cannot be loaded', async () => {
  const canComment = createCommentPostAccess({ rootPageId: root, getPage: async () => null });
  await assert.rejects(() => canComment(post), /Blog is unavailable/);
});
