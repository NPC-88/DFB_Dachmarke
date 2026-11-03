// Library storage. Same interface for both backends:
//   list() → [{ id, name, author, created, settings, thumb }]   (newest first)
//   add({ name, author, settings, thumb }) → item
//   rename(id, name), remove(id)
//   shared: true when everyone sees the same library

const LOCAL_KEY = 'dfb-dachmarke-library-v1';

export function localStore() {
  const read = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; } catch { return []; } };
  const write = (v) => { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(v)); } catch { /* storage blocked */ } };
  return {
    shared: false,
    async list() { return read(); },
    async add(item) {
      const it = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), created: new Date().toISOString(), ...item };
      write([it, ...read()]);
      return it;
    },
    async rename(id, name) { write(read().map((i) => (i.id === id ? { ...i, name } : i))); },
    async remove(id) { write(read().filter((i) => i.id !== id)); },
  };
}

// Firestore over its REST API (no SDK needed).
export function firestoreStore({ projectId, apiKey, collection = 'patterns' }, fetchFn = (...a) => fetch(...a)) {
  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${collection}`;
  const key = `key=${encodeURIComponent(apiKey)}`;
  const call = async (url, init) => {
    const r = await fetchFn(url, { ...init, headers: { 'Content-Type': 'application/json' } });
    if (!r.ok) throw new Error(`Team-Bibliothek: ${r.status}`);
    return r.status === 204 ? null : r.json();
  };
  const toItem = (doc) => {
    const f = doc.fields || {};
    const str = (k) => (f[k] && f[k].stringValue) || '';
    let settings = null;
    try { settings = JSON.parse(str('settings')); } catch { /* skip broken */ }
    return { id: doc.name.split('/').pop(), name: str('name'), author: str('author'), thumb: str('thumb'),
      created: (f.created && f.created.timestampValue) || doc.createTime, settings };
  };
  return {
    shared: true,
    async list() {
      const out = [];
      let token = '';
      do {
        const j = await call(`${base}?${key}&pageSize=300&orderBy=created%20desc${token ? '&pageToken=' + encodeURIComponent(token) : ''}`, { method: 'GET' });
        for (const d of (j && j.documents) || []) { const it = toItem(d); if (it.settings) out.push(it); }
        token = j && j.nextPageToken;
      } while (token && out.length < 2000);
      return out;
    },
    async add({ name, author = '', settings, thumb = '' }) {
      const body = { fields: {
        name: { stringValue: name }, author: { stringValue: author }, thumb: { stringValue: thumb },
        settings: { stringValue: JSON.stringify(settings) }, created: { timestampValue: new Date().toISOString() },
      } };
      return toItem(await call(`${base}?${key}`, { method: 'POST', body: JSON.stringify(body) }));
    },
    async rename(id, name) {
      await call(`${base}/${encodeURIComponent(id)}?${key}&updateMask.fieldPaths=name`, { method: 'PATCH', body: JSON.stringify({ fields: { name: { stringValue: name } } }) });
    },
    async remove(id) { await call(`${base}/${encodeURIComponent(id)}?${key}`, { method: 'DELETE' }); },
  };
}

// Team library when it answers; otherwise (not set up yet, rules missing,
// offline) this browser only, so saving always works.
export function createStore(config) {
  const local = localStore();
  if (!(config && config.projectId && config.apiKey)) return local;
  const team = firestoreStore(config);
  let use = null;                         // decided on first list()
  const pick = async () => {
    if (use) return use;
    try { await team.list(); use = team; } catch { use = local; }
    return use;
  };
  return {
    get shared() { return use === team; },
    async list() { return (await pick()).list(); },
    async add(it) { return (await pick()).add(it); },
    async rename(id, n) { return (await pick()).rename(id, n); },
    async remove(id) { return (await pick()).remove(id); },
  };
}
