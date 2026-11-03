// Team library over Firestore REST, against a fake server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firestoreStore, createStore } from '../src/ui/store.js';

function fakeFirestore() {
  const docs = new Map();
  let n = 0;
  const calls = [];
  const fetchFn = async (url, init = {}) => {
    calls.push([init.method, url]);
    const u = new URL(url);
    assert.equal(u.searchParams.get('key'), 'KEY');
    const parts = u.pathname.split('/');
    const id = parts.at(-1) === 'patterns' ? null : decodeURIComponent(parts.at(-1));
    const res = (status, body) => ({ ok: status < 300, status, json: async () => body });
    const name = (i) => `projects/p/databases/(default)/documents/patterns/${i}`;
    if (init.method === 'POST') { const i = 'd' + ++n; const doc = { name: name(i), ...JSON.parse(init.body), createTime: new Date().toISOString() }; docs.set(i, doc); return res(200, doc); }
    if (init.method === 'GET') return res(200, { documents: [...docs.values()].reverse() });
    if (init.method === 'PATCH') { const d = docs.get(id); Object.assign(d.fields, JSON.parse(init.body).fields); assert.equal(u.searchParams.get('updateMask.fieldPaths'), 'name'); return res(200, d); }
    if (init.method === 'DELETE') { docs.delete(id); return res(200, {}); }
    return res(400, {});
  };
  return { fetchFn, docs, calls };
}

test('firestore store: add, list, rename, remove', async () => {
  const fake = fakeFirestore();
  const store = firestoreStore({ projectId: 'p', apiKey: 'KEY' }, fake.fetchFn);
  assert.equal(store.shared, true);
  const settings = { v: 2, params: { text: 'Mit dir', field: { mode: 'points' } }, colorPair: 'gold' };
  const a = await store.add({ name: 'Weich', author: 'NC', settings, thumb: 'data:image/jpeg;base64,xx' });
  await store.add({ name: 'Hart', settings });
  let list = await store.list();
  assert.deepEqual(list.map((i) => i.name), ['Hart', 'Weich']);
  assert.deepEqual(list[1].settings, settings);
  assert.equal(list[1].author, 'NC');
  await store.rename(a.id, 'Sehr weich');
  await store.remove(list[0].id);
  list = await store.list();
  assert.deepEqual(list.map((i) => i.name), ['Sehr weich']);
  assert.ok(fake.calls.every(([, url]) => url.startsWith('https://firestore.googleapis.com/v1/projects/p/databases/(default)/documents/patterns')));
});

test('createStore: this browser when no project is configured; team only after it answered', () => {
  assert.equal(createStore({ projectId: '', apiKey: '' }).shared, false);
  assert.equal(createStore({ projectId: 'p', apiKey: 'k' }).shared, false);
});
