// Library tab: everything the team saved, as a grid of previews.
// Open loads a pattern into the tool; Link copies a link that opens exactly
// that pattern; rename and delete work on the shared library for everyone.

import { el, iconButton } from './controls.js';

export function createLibraryView(root, { store, onOpen, flash, onCount }) {
  const head = el('div', { class: 'lib-head' });
  const title = el('h2', {}, 'Bibliothek');
  const where = el('span', { class: 'hint' }, store.shared ? 'Für das ganze Team' : 'Nur in diesem Browser — die Team-Bibliothek ist noch nicht verbunden');
  const search = el('input', { type: 'search', id: 'lib-search', placeholder: 'Suchen', 'aria-label': 'Bibliothek durchsuchen', class: 'input' });
  const reload = iconButton('reset', 'Aktualisieren', { variant: 'secondary', size: 'medium' });
  head.append(title, where, el('span', { class: 'spacer' }), search, reload);
  const grid = el('div', { class: 'lib-grid' });
  const empty = el('p', { class: 'lib-empty' }, 'Noch keine Muster. Im Werkzeug auf „Speichern“ klicken, um das aktuelle Muster hier abzulegen.');
  root.append(head, grid, empty);

  let items = [];
  search.addEventListener('input', draw);
  reload.addEventListener('click', () => refresh());

  async function refresh() {
    try { items = await store.list(); where.textContent = store.shared ? 'Für das ganze Team' : 'Nur in diesem Browser — die Team-Bibliothek ist noch nicht verbunden'; }
    catch (e) { flash('Bibliothek nicht erreichbar: ' + e.message); }
    onCount && onCount(items.length);
    draw();
  }

  function draw() {
    const q = search.value.trim().toLowerCase();
    const shown = items.filter((i) => !q || (i.name + ' ' + (i.author || '')).toLowerCase().includes(q));
    grid.replaceChildren(...shown.map(card));
    empty.hidden = items.length > 0;
  }

  function card(it) {
    const c = el('article', { class: 'lib-card' });
    const open = el('button', { type: 'button', class: 'lib-thumb', title: 'Im Werkzeug öffnen' });
    if (it.thumb) { const img = el('img', { src: it.thumb, alt: '', loading: 'lazy' }); open.append(img); }
    else open.append(el('span', {}, it.name));
    open.addEventListener('click', () => onOpen(it));
    const name = el('div', { class: 'lib-name' }, it.name);
    const an = it.settings && it.settings.anim;
    const animated = an && an.on;
    const meta = el('div', { class: 'lib-meta' }, [it.author, it.created ? new Date(it.created).toLocaleDateString('de-DE') : '', animated ? 'Animation' : ''].filter(Boolean).join(' · '));
    const actions = el('div', { class: 'lib-actions' });
    const link = iconButton('share', 'Link kopieren');
    const ren = iconButton('edit', 'Umbenennen');
    const del = iconButton('trash', 'Löschen');
    link.addEventListener('click', async () => {
      const url = location.href.split('#')[0] + encodeShare(it.settings);
      try { await navigator.clipboard.writeText(url); flash('Link kopiert.'); }
      catch { prompt('Link kopieren:', url); }
    });
    ren.addEventListener('click', () => {
      const input = el('input', { type: 'text', value: it.name, 'aria-label': 'Neuer Name', class: 'input' });
      name.replaceChildren(input);
      input.focus();
      input.select();
      const done = async (save) => {
        const v = input.value.trim();
        if (save && v && v !== it.name) {
          try { await store.rename(it.id, v); it.name = v; flash('Umbenannt.'); } catch (e) { flash('Umbenennen fehlgeschlagen: ' + e.message); }
        }
        name.textContent = it.name;
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); });
      input.addEventListener('blur', () => done(true));
    });
    del.addEventListener('click', async () => {
      if (!(await confirmDelete(it.name))) return;
      try { await store.remove(it.id); items = items.filter((x) => x.id !== it.id); onCount && onCount(items.length); draw(); flash('Gelöscht: ' + it.name); }
      catch (e) { flash('Löschen fehlgeschlagen: ' + e.message); }
    });
    actions.append(link, ren, del);
    c.append(open, name, meta, actions);
    return c;
  }

  async function save({ name, author, settings, thumb }) {
    const it = await store.add({ name, author, settings, thumb });
    items = [it, ...items];
    onCount && onCount(items.length);
    draw();
    return it;
  }

  // Toolkit Modal (error variant) to confirm a delete for everyone.
  function confirmDelete(name) {
    const d = document.getElementById('confirmDialog');
    d.querySelector('.modal-text').textContent = `„${name}“ wird für das ganze Team gelöscht.`;
    d.returnValue = '';
    d.showModal();
    return new Promise((resolve) => d.addEventListener('close', () => resolve(d.returnValue === 'ok'), { once: true }));
  }

  refresh();
  return { refresh, save };
}

export function encodeShare(settings) {
  const bytes = new TextEncoder().encode(JSON.stringify(settings));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return '#p=' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeShare(hash) {
  const m = /[#&]p=([\w-]+)/.exec(hash || '');
  if (!m) return null;
  try {
    const bin = atob(m[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch { return null; }
}
