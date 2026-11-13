import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createBlogSearch } from '../lib/blog-search';
import { createNavigationHistory } from '../lib/navigation-history';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [root, gallery, memo, post, draft, daily, hardware, hidden] = Array.from(
  { length: 8 },
  (_, n) => id(n + 1),
);
const postsId = id(20);
const memoId = id(21);
const publicView = id(30);
const allPostsView = id(31);
const dailyView = id(32);
const hardwareView = id(33);
const allMemoView = id(34);

function entry(value: any) {
  return { role: 'reader', value };
}
function page(pageId: string, title: string, parentId = root, parentTable = 'collection') {
  return {
    id: pageId,
    type: 'page',
    space_id: 'blog-space',
    parent_id: parentId,
    parent_table: parentTable,
    properties: { title: [[title]] },
  };
}
function map(blocks: any[], queries = {}): any {
  return {
    block: Object.fromEntries(blocks.map(block => [block.id, entry(block)])),
    collection: {
      [postsId]: entry({ id: postsId, name: [['Posts']] }),
      [memoId]: entry({ id: memoId, name: [['Memo']], icon: '✏️' }),
    },
    collection_view: {},
    notion_user: {},
    collection_query: queries,
    signed_urls: {},
  };
}
const result = (ids: string[]) => ({ collection_group_results: { blockIds: ids } });

function fixture() {
  const rootBlock = { ...page(root, '내 블로그', 'space', 'space'), content: [gallery, memo] };
  const galleryBlock = {
    id: gallery,
    type: 'collection_view',
    parent_id: root,
    parent_table: 'block',
    collection_id: postsId,
    view_ids: [publicView, allPostsView],
  };
  const memoBlock = {
    id: memo,
    type: 'collection_view_page',
    parent_id: root,
    parent_table: 'block',
    space_id: 'blog-space',
    collection_id: memoId,
    view_ids: [dailyView, hardwareView],
  };
  const postBlock = page(post, '프리텐다드 설정', postsId);
  const draftBlock = page(draft, '숨긴 초안', postsId);
  const dailyBlock = page(daily, 'Nemesis', memoId);
  const hardwareBlock = page(hardware, '키보드', memoId);
  const hiddenBlock = page(hidden, 'All에서만 보이는 초안', memoId);
  const document = (block: any, text: string, textId: string) =>
    map([
      { ...block, content: [textId] },
      {
        id: textId,
        type: 'text',
        parent_id: block.id,
        parent_table: 'block',
        properties: { title: [[text]] },
      },
    ]);
  const pages = {
    [root]: map([rootBlock, galleryBlock, memoBlock, postBlock, draftBlock], {
      [postsId]: { [publicView]: result([post]), [allPostsView]: result([post, draft]) },
    }),
    [memo]: map([memoBlock, dailyBlock, hardwareBlock, hiddenBlock], {
      [memoId]: {
        [dailyView]: result([daily]),
        [hardwareView]: result([hardware]),
        [allMemoView]: result([daily, hardware, hidden]),
      },
    }),
    [post]: document(postBlock, "프리텐다드 설치 예시 <script>alert('example')</script>", id(40)),
    [draft]: document(draftBlock, 'SECRET_DRAFT_CONTENT', id(41)),
    [daily]: document(dailyBlock, '현대자동차 CarPlay 연결 방법', id(42)),
    [hardware]: document(hardwareBlock, '프리텐다드 폰트를 사용하는 키보드', id(43)),
    [hidden]: document(hiddenBlock, 'SECRET_DRAFT_CONTENT', id(44)),
  };
  pages[hardware].block[hardware].value.content.push(id(45), id(46));
  pages[hardware].block[id(45)] = entry({
    id: id(45),
    type: 'table_row',
    properties: { firstColumn: [['DDR5 메모리']], secondColumn: [['32GB']] },
  });
  pages[hardware].block[id(46)] = entry({
    id: id(46),
    type: 'external_object_instance',
    format: { original_url: 'https://github.com/example/keyboard-repo' },
  });
  const fetched: string[] = [];
  const search = createBlogSearch({
    rootPageId: root,
    getPage: async pageId => {
      fetched.push(pageId);
      return pages[pageId];
    },
  });
  return { search, fetched };
}

test('searches titles and body text across all visible Memo tabs', async () => {
  const { search } = fixture();
  const title = await search('ｎｅｍｅｓｉｓ');
  assert.deepEqual(
    title.results.map(hit => hit.id),
    [daily],
  );
  const body = await search('carplay');
  assert.deepEqual(
    body.results.map(hit => hit.id),
    [daily],
  );
  const secondTab = await search('사용하는 키보드');
  assert.deepEqual(
    secondTab.results.map(hit => hit.id),
    [hardware],
  );
  const memoResult = await search('Memo');
  assert.deepEqual(
    memoResult.results.map(hit => hit.id),
    [memo],
  );
  assert.equal(memoResult.recordMap.block[memo].value.type, 'collection_view_page');
});

test('never indexes unpublished gallery rows or a hidden All view', async () => {
  const { search, fetched } = fixture();
  const response = await search('SECRET_DRAFT_CONTENT');
  assert.equal(response.total, 0);
  assert.deepEqual(response.recordMap.block, {});
  assert(!fetched.includes(draft));
  assert(!fetched.includes(hidden));
});

test('searches readable table cells and public GitHub link cards', async () => {
  const { search } = fixture();
  assert.deepEqual(
    (await search('DDR5 32GB')).results.map(hit => hit.id),
    [hardware],
  );
  assert.deepEqual(
    (await search('keyboard-repo')).results.map(hit => hit.id),
    [hardware],
  );
});

test('ranks title matches first, reports the total, and returns only matched page metadata', async () => {
  const { search } = fixture();
  const response = await search('프리텐다드', 1);
  assert.equal(response.total, 2);
  assert.deepEqual(
    response.results.map(hit => hit.id),
    [post],
  );
  assert.deepEqual(Object.keys(response.recordMap.block), [post]);
  assert.equal((response.recordMap.block[post].value as any).content, undefined);
  assert.match(response.results[0].highlight.text, /<script>/);
  assert.equal((response.results[0].highlight as any).html, undefined);
});

test('warms and reuses the index while whitespace and unmatched queries return no results', async () => {
  const { search, fetched } = fixture();
  assert.equal((await search('  ')).total, 0);
  const count = fetched.length;
  await search('Nemesis');
  assert.equal((await search('없는검색어987654')).total, 0);
  assert.equal(fetched.length, count);
});

test('an unavailable root is a search failure instead of an empty successful result', async () => {
  const search = createBlogSearch({ rootPageId: root, getPage: async () => null });
  await assert.rejects(search('test'), /Unable to load/);
});

test('shares a single index build when warmup and query overlap', async () => {
  const { search, fetched } = fixture();
  const [, title, body] = await Promise.all([search(''), search('Nemesis'), search('carplay')]);
  assert.deepEqual(
    title.results.map(hit => hit.id),
    [daily],
  );
  assert.deepEqual(
    body.results.map(hit => hit.id),
    [daily],
  );
  assert.equal(fetched.filter(pageId => pageId === root).length, 1);
});

test('back navigation stays inside the blog after pushes, replaces, and browser back/forward', () => {
  const history = createNavigationHistory();
  history.visit('direct-entry');
  history.visit('direct-entry');
  assert.equal(history.hasPrevious('direct-entry'), false);
  history.visit('memo');
  history.visit('post');
  assert.equal(history.hasPrevious('post'), true);
  history.visit('memo');
  assert.equal(history.hasPrevious('memo'), true);
  history.visit('direct-entry');
  assert.equal(history.hasPrevious('direct-entry'), false);
  history.visit('post');
  history.visit('post');
  assert.equal(history.hasPrevious('post'), true);
  assert.equal(history.hasPrevious('unknown-external-entry'), false);
});
