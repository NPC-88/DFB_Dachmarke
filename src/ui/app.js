// App shell: state + undo history, top bar (tabs, save, export), preview with
// format, colour, zoom and "Neue Variante", the Dachmarke control column and
// the animation and library tabs. Host-specific things (saving files) come
// from `host`; the library backend from `store`.

import {
  createEngine, PRESETS, COLOR_PAIRS, FORMATS, DEFAULT_FORMAT, TEXT_SUGGESTIONS, WIDTHS, WEIGHTS, styleName,
  ANIM_DEFAULTS, MAX_ROWS_PER_STYLE, newSeed,
} from '../core/index.js';
import { panel, el, chips, slider } from './controls.js';
import { createLibraryView, encodeShare, decodeShare } from './library.js';
import { icon, hydrateIcons } from './icons.js';
import { createAnimationView } from './animation.js';
import { drawModel } from './render.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
const ZOOMS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const AUTHOR_KEY = 'dfb-dachmarke-author';
const THEME_KEY = 'dfb-dachmarke-theme';
const WIDTH_LABEL = { 40: 'Compressed', 60: 'Compact', 80: 'Condensed', 100: 'Normal', 133: 'Wide', 166: 'Extended', 200: 'Super Ext.' };
const presetOf = (id) => PRESETS.find((p) => p.id === id) || PRESETS[0];

export function startApp({ fonts, host, store }) {
  const engine = createEngine(fonts.upright, fonts.italic);
  const base = (id) => ({ ...clone(presetOf(id).params), width: DEFAULT_FORMAT.width, height: DEFAULT_FORMAT.height, seed: presetOf(id).params.seed || 1 });
  let params = base('single');
  let pairId = presetOf('single').colorPair;
  let anim = clone(ANIM_DEFAULTS);
  let zoom = 'fit';
  let model = null;
  const exportOpts = { kind: 'svg-outlines', background: false };

  const $ = (s) => document.querySelector(s);
  hydrateIcons();

  // --- light / dark ------------------------------------------------------------
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : sysDark.matches;
  try { const t = localStorage.getItem(THEME_KEY); if (t) document.documentElement.dataset.theme = t; } catch { /* storage blocked */ }
  const themeBtn = $('#themeBtn');
  const syncTheme = () => {
    const dark = isDark();
    themeBtn.replaceChildren(icon(dark ? 'sun' : 'moon', 20));
    themeBtn.dataset.tip = dark ? 'Helles Design' : 'Dunkles Design';
    themeBtn.setAttribute('aria-label', themeBtn.dataset.tip);
  };
  themeBtn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* storage blocked */ }
    syncTheme();
  });
  sysDark.addEventListener('change', syncTheme);
  syncTheme();

  const viewport = $('#viewport'), stage = $('#stage'), art = $('#art');
  const pair = () => COLOR_PAIRS.find((c) => c.id === pairId) || COLOR_PAIRS[0];

  const shared = decodeShare(location.hash);
  if (shared) apply(shared);

  // --- undo history --------------------------------------------------------------
  const history = [JSON.stringify(snapshot())];
  let hi = 0;
  function commit() {
    const s = JSON.stringify(snapshot());
    if (s === history[hi]) return;
    history.splice(hi + 1);
    history.push(s);
    if (history.length > 200) history.shift();
    hi = history.length - 1;
    syncUndo();
  }
  function travel(d) {
    const n = hi + d;
    if (n < 0 || n >= history.length) return;
    hi = n;
    apply(JSON.parse(history[hi]));
    update(false);
    syncUndo();
  }
  function syncUndo() { $('#undo').disabled = hi <= 0; $('#redo').disabled = hi >= history.length - 1; }
  $('#undo').addEventListener('click', () => travel(-1));
  $('#redo').addEventListener('click', () => travel(1));
  document.addEventListener('keydown', (e) => {
    if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
    if (e.target.closest('input[type=text], input[type=search], input[type=number], textarea')) return;
    e.preventDefault();
    travel(e.shiftKey ? 1 : -1);
  });

  function set(patch, opts = {}) { params = { ...params, ...patch }; update(!opts.transient); }

  // --- tabs ------------------------------------------------------------------------
  const tabs = document.querySelectorAll('[role=tab]');
  tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
  function showTab(id) {
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === id)));
    $('#tool').hidden = id !== 'tool';
    $('#library').hidden = id !== 'library';
    $('#animation').hidden = id !== 'animation';
    document.body.dataset.tab = id;
    closePopovers();
    if (id === 'library') library.refresh();
    if (id === 'animation') animView.show(); else animView.hide();
    if (id === 'tool') layoutStage();
  }

  // --- colour pairs ------------------------------------------------------------------
  const pairBtns = COLOR_PAIRS.map((c) => {
    const b = el('button', { type: 'button', class: 'pair', title: `${c.name} — ${c.source}`, 'aria-label': c.name, 'data-id': c.id });
    b.style.background = c.background;
    const ink = el('span', {}, 'Aa');
    ink.style.color = c.color;
    b.append(ink);
    b.addEventListener('click', () => { pairId = c.id; update(); });
    $('#colors').append(b);
    return b;
  });

  // --- format popover ----------------------------------------------------------------
  const fmtList = $('#formatList');
  for (const f of FORMATS) {
    const b = el('button', { type: 'button', class: 'menu-item', 'data-id': f.id });
    b.append(document.createTextNode(`${f.name} · ${f.ratio}`), el('small', {}, `${f.width} × ${f.height} px`));
    b.addEventListener('click', () => { params = { ...params, width: f.width, height: f.height }; zoom = 'fit'; update(); closePopovers(); });
    fmtList.append(b);
  }
  const fw = $('#fmtW'), fh = $('#fmtH');
  const setSize = () => {
    const w = Math.min(10000, Math.max(50, +fw.value || params.width)), h = Math.min(10000, Math.max(50, +fh.value || params.height));
    params = { ...params, width: w, height: h };
    zoom = 'fit';
    update();
  };
  fw.addEventListener('change', setSize);
  fh.addEventListener('change', setSize);

  // popovers (format, export)
  document.querySelectorAll('[data-popover]').forEach((btn) => {
    const pop = document.getElementById(btn.dataset.popover);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = pop.hidden;
      closePopovers();
      pop.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
    pop.addEventListener('click', (e) => e.stopPropagation());
  });
  document.addEventListener('click', closePopovers);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopovers(); });
  function closePopovers() {
    document.querySelectorAll('.popover').forEach((p) => { p.hidden = true; });
    document.querySelectorAll('[data-popover]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }

  // --- control column -----------------------------------------------------------------
  const aside = $('#controls');
  const rows = [];          // { node, when?, sync? }
  const add = (body, item) => { body.append(item.node); rows.push(item); return item; };

  // Text
  const tBox = panel('Text', true);
  const tWrap = el('label', { class: 'field field-area' });
  tWrap.append(el('span', { class: 'field-label' }, 'Wort oder kurzer Satz'));
  const tArea = el('textarea', { rows: 2, spellcheck: 'false', id: 'ctl-text' });
  tWrap.append(tArea);
  tArea.addEventListener('input', () => set({ text: tArea.value }, { transient: true }));
  tArea.addEventListener('change', () => set({ text: tArea.value }));
  add(tBox.body, { node: tWrap, sync: () => { if (document.activeElement !== tArea) tArea.value = params.text; } });
  const sug = el('div', { class: 'suggest', role: 'group', 'aria-label': 'Beispiele' });
  for (const t of TEXT_SUGGESTIONS) {
    const b = el('button', { type: 'button', class: 'chip' }, t);
    b.addEventListener('click', () => set({ text: t }));
    sug.append(b);
  }
  add(tBox.body, { node: sug });
  add(tBox.body, { node: el('p', { class: 'hint' }, 'Wird immer in Versalien gesetzt (ß → SS).') });

  // Muster
  const mBox = panel('Muster', true);
  const pat = chips('', PRESETS.map((p) => [p.id, p.name]), (id) => switchPattern(id));
  add(mBox.body, { node: pat.node, sync: () => pat.set(params.pattern) });
  const boardLabel = el('p', { class: 'board-label' });
  add(mBox.body, { node: boardLabel, sync: () => { boardLabel.textContent = 'Figma: „' + presetOf(params.pattern).label + '“'; } });

  // Schrift
  const sBox = panel('Schrift', true);
  const isP = (...ids) => () => ids.includes(params.pattern);
  const widthChips = chips('Breite', WIDTHS.map((w) => [String(w.wdth), WIDTH_LABEL[w.wdth]]), (v) => set({ style: { ...params.style, wdth: +v } }), { small: true });
  add(sBox.body, { node: widthChips.node, when: isP('single'), sync: () => widthChips.set(params.style.wdth) });
  const weightChips = chips('Stärke', WEIGHTS.map((g) => [String(g.wght), g.name]), (v) => {
    if (params.pattern === 'letters') set({ letterWght: +v }); else set({ style: { ...params.style, wght: +v } });
  }, { small: true });
  add(sBox.body, { node: weightChips.node, when: isP('single', 'letters'), sync: () => weightChips.set(params.pattern === 'letters' ? params.letterWght : params.style.wght) });

  const allStyles = [];
  for (const w of WIDTHS) for (const g of WEIGHTS) allStyles.push({ wdth: w.wdth, wght: g.wght });
  for (let r = 0; r < MAX_ROWS_PER_STYLE; r++) {
    const sel = selectField(`Zeile ${r + 1}`, allStyles.map((c) => [`${c.wdth},${c.wght}`, styleName(c, false)]), (v) => {
      const [wdth, wght] = v.split(',').map(Number);
      const rs = clone(params.rowStyles);
      rs[r] = { wdth, wght };
      set({ rowStyles: rs });
    });
    add(sBox.body, { node: sel.node, when: () => params.pattern === 'rows' && r < Math.min(MAX_ROWS_PER_STYLE, params.rows), sync: () => sel.set(`${params.rowStyles[r].wdth},${params.rowStyles[r].wght}`) });
  }

  const wOpts = WIDTHS.map((w) => [String(w.wdth), `${WIDTH_LABEL[w.wdth]} (${w.wdth})`]);
  const lMin = selectField('Schmalste Breite', wOpts, (v) => set({ letterMin: +v, ref: dropLetters() }));
  const lMax = selectField('Breiteste Breite', wOpts, (v) => set({ letterMax: +v, ref: dropLetters() }));
  add(sBox.body, { node: lMin.node, when: isP('letters'), sync: () => lMin.set(String(params.letterMin)) });
  add(sBox.body, { node: lMax.node, when: isP('letters'), sync: () => lMax.set(String(params.letterMax)) });
  const share = slider({ key: 'wideShare', label: 'Anteil breiter Buchstaben', min: 0, max: 50, step: 1, unit: '%' }, (v, tr) => set({ wideShare: v / 100, ref: dropLetters() }, { transient: tr }));
  add(sBox.body, { node: share.node, when: isP('letters'), sync: () => share.set(Math.round(params.wideShare * 100)) });
  const run = chips('Breite Buchstaben nacheinander, höchstens', [['1', '1'], ['2', '2'], ['3', '3']], (v) => set({ wideRun: +v, ref: dropLetters() }), { small: true });
  add(sBox.body, { node: run.node, when: isP('letters'), sync: () => run.set(String(params.wideRun)) });

  const ital = switchRow('Kursiv', (on) => set({ italic: on }));
  add(sBox.body, { node: ital.node, sync: () => ital.set(params.italic) });

  // Anordnung
  const aBox = panel('Anordnung', true);
  const orient = chips('Richtung', [['horizontal', 'Waagerecht'], ['vertical', 'Senkrecht (−90°)']], (v) => set({ orientation: v }), { small: true });
  add(aBox.body, { node: orient.node, sync: () => orient.set(params.orientation) });
  const band = chips('Position', [['end', 'Unten'], ['start', 'Oben'], ['center', 'Mitte'], ['fill', 'Ganze Fläche']], (v) => set({ band: v }), { small: true });
  add(aBox.body, {
    node: band.node,
    sync: () => {
      const v = params.orientation === 'vertical';
      const labels = { end: v ? 'Rechts' : 'Unten', start: v ? 'Links' : 'Oben', center: 'Mitte', fill: 'Ganze Fläche' };
      band.node.querySelectorAll('.chip').forEach((b) => { b.textContent = labels[b.dataset.value]; });
      band.set(params.band);
    },
  });
  const rowsS = slider({ key: 'rows', label: 'Zeilen', min: 1, max: 12, step: 1 }, (v, tr) => set({ rows: v }, { transient: tr }));
  add(aBox.body, {
    node: rowsS.node, when: () => params.band !== 'fill',
    sync: () => { const r = rowsS.node.querySelector('input'); r.max = params.pattern === 'rows' ? MAX_ROWS_PER_STYLE : 12; rowsS.set(params.pattern === 'rows' ? Math.min(params.rows, 3) : params.rows); },
  });
  const sizeS = slider({ key: 'size', label: 'Schriftgröße (% der kurzen Seite)', min: 2, max: 40, step: 0.1, unit: '%' }, (v, tr) => set({ size: v / 100 }, { transient: tr }));
  add(aBox.body, { node: sizeS.node, sync: () => sizeS.set(+(params.size * 100).toFixed(1)) });
  const lhS = slider({ key: 'lineHeight', label: 'Zeilenabstand', min: 0.74, max: 1.6, step: 0.01, unit: '×' }, (v, tr) => set({ lineHeight: v }, { transient: tr }));
  add(aBox.body, { node: lhS.node, sync: () => lhS.set(params.lineHeight) });
  const marginS = slider({ key: 'margin', label: 'Abstand zum Rand (negativ = angeschnitten)', min: -20, max: 30, step: 0.5, unit: '%' }, (v, tr) => set({ margin: v / 100 }, { transient: tr }));
  add(aBox.body, { node: marginS.node, when: () => params.band === 'end' || params.band === 'start', sync: () => marginS.set(+(params.margin * 100).toFixed(1)) });
  const shiftS = slider({ key: 'shift', label: 'Zeilenversatz', min: 0, max: 100, step: 1, unit: '%' }, (v, tr) => set({ shift: v / 100, ref: dropXs() }, { transient: tr }));
  add(aBox.body, { node: shiftS.node, sync: () => shiftS.set(Math.round(params.shift * 100)) });
  const gapS = slider({ key: 'gap', label: 'Abstand zwischen Wiederholungen', min: 0, max: 3, step: 0.05, unit: 'em' }, (v, tr) => set({ gap: v }, { transient: tr }));
  add(aBox.body, { node: gapS.node, sync: () => gapS.set(params.gap) });

  // Variante
  const vBox = panel('Variante', true);
  const seedRow = el('div', { class: 'seed-row' });
  const seedField = el('label', { class: 'field' });
  const seedInput = el('input', { type: 'number', min: 1, max: 999999, step: 1, id: 'ctl-seed', 'aria-label': 'Varianten-Nummer' });
  seedField.append(el('span', { class: 'field-label' }, 'Varianten-Nummer'), seedInput);
  seedInput.addEventListener('change', () => { const v = Math.max(1, Math.round(+seedInput.value || 1)); set({ seed: v, ref: null }); });
  const vBtn = el('button', { type: 'button', class: 'btn btn-secondary btn-medium' });
  vBtn.append(icon('reset', 20), document.createTextNode('Neu'));
  vBtn.addEventListener('click', variant);
  seedRow.append(seedField, vBtn);
  add(vBox.body, { node: seedRow, sync: () => { if (document.activeElement !== seedInput) seedInput.value = params.seed; } });
  const refNote = el('p', { class: 'hint' });
  add(vBox.body, {
    node: refNote,
    sync: () => {
      refNote.textContent = params.ref
        ? 'Zeilenstarts' + (params.ref.letters ? ' und Buchstabenbreiten' : '') + ' wie im Figma-Beispiel. „Neu“ erzeugt eine eigene Anordnung; die Nummer merkt sie sich.'
        : 'Dieselbe Nummer ergibt immer dieselbe Anordnung — auch als Link oder in der Bibliothek.';
    },
  });

  aside.append(tBox.node, mBox.node, sBox.node, aBox.node, vBox.node);
  $('#variant').addEventListener('click', variant);

  function variant() { set({ seed: newSeed(), ref: null }); }
  function dropLetters() { return params.ref && params.ref.letters ? { ...params.ref, letters: undefined } : params.ref; }
  function dropXs() { return params.ref && params.ref.xs ? (params.ref.letters ? { letters: params.ref.letters } : null) : params.ref; }

  // Switching the pattern loads its Figma settings but keeps text, format and variant.
  function switchPattern(id) {
    if (id === params.pattern) return;
    const b = base(id);
    params = { ...b, text: params.text, width: params.width, height: params.height };
    update();
  }

  // --- preview: zoom -----------------------------------------------------------------
  $('#zoomIn').addEventListener('click', () => stepZoom(1));
  $('#zoomOut').addEventListener('click', () => stepZoom(-1));
  $('#zoomFit').addEventListener('click', () => { zoom = 'fit'; layoutStage(); });
  $('#zoom100').addEventListener('click', () => { zoom = 1; layoutStage(); });
  new ResizeObserver(() => layoutStage()).observe(viewport);

  // --- reset ---------------------------------------------------------------------------
  $('#reset').addEventListener('click', () => {
    params = { ...base(params.pattern), width: params.width, height: params.height };
    pairId = presetOf(params.pattern).colorPair;
    anim = clone(ANIM_DEFAULTS);
    zoom = 'fit';
    window.history.replaceState(null, '', location.pathname);
    update();
    flash('Zurückgesetzt auf das Figma-Beispiel „' + presetOf(params.pattern).label + '“.');
  });

  // --- export ---------------------------------------------------------------------------
  const KINDS = [
    ['svg-outlines', 'SVG · Konturen', 'Sieht überall gleich aus, Text nicht editierbar.'],
    ['svg-text', 'SVG · Live-Text', 'Editierbar. Braucht DFB Sans Pro (statische Schnitte) auf dem Rechner.'],
    ['png', 'PNG', 'Pixelbild in Formatgröße.'],
  ];
  const kindBtns = KINDS.map(([id, name, note]) => {
    const b = el('button', { type: 'button', class: 'menu-item', 'data-id': id });
    b.append(document.createTextNode(name), el('small', {}, note));
    b.addEventListener('click', () => { exportOpts.kind = id; syncExport(); });
    $('#exportKinds').append(b);
    return b;
  });
  const bgInput = $('#exportBg');
  bgInput.addEventListener('change', () => { exportOpts.background = bgInput.checked; syncExport(); });
  function syncExport() {
    kindBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === exportOpts.kind)));
    bgInput.checked = exportOpts.background;
    $('#exportNote').textContent = `${params.width} × ${params.height} px · ${pair().name}` + (exportOpts.background ? '' : ' · nur das Muster, transparenter Grund');
  }
  syncExport();
  $('#exportGo').addEventListener('click', async () => {
    if (!model) render();
    const name = fileName();
    const bg = exportOpts.background ? pair().background : null;
    closePopovers();
    if (exportOpts.kind === 'png') {
      const blob = await pngBlob(params.width, params.height, bg);
      flash(await host.save({ filename: name + '.png', data: blob }));
      return;
    }
    const mode = exportOpts.kind === 'svg-text' ? 'text' : 'outlines';
    const svg = engine.svg(model, { color: pair().color, background: bg, mode, title: name });
    flash(await host.save({ filename: name + (mode === 'text' ? '-livetext' : '') + '.svg', data: svg }));
  });
  function fileName() {
    const t = model ? model.phrase : params.text;
    const slug = String(t).normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
    return `DFB-Dachmarke-${presetOf(params.pattern).name.replace(/\s+/g, '')}-${slug}-${params.width}x${params.height}-v${params.seed}`;
  }
  function pngBlob(w, h, bg) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    drawModel(c.getContext('2d'), model, engine.font, { color: pair().color, background: bg, k: 1 });
    return new Promise((r) => c.toBlob(r, 'image/png'));
  }

  // --- library ---------------------------------------------------------------------------
  const library = createLibraryView($('#library'), {
    store,
    flash,
    onOpen: (it) => { apply(it.settings); zoom = 'fit'; showTab('tool'); update(); flash('Geöffnet: ' + it.name); },
    onCount: (n) => { $('#libCount').textContent = n ? String(n) : ''; },
  });
  const saveName = $('#saveName'), saveAuthor = $('#saveAuthor');
  try { saveAuthor.value = localStorage.getItem(AUTHOR_KEY) || ''; } catch { /* storage blocked */ }
  const saveDialog = $('#saveDialog');
  $('#saveBtn').addEventListener('click', () => { closePopovers(); saveDialog.showModal(); saveName.focus(); });
  $('#saveCancel').addEventListener('click', () => saveDialog.close());
  $('#saveForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = saveName.value.trim() || `${model ? model.phrase : 'Muster'} · ${presetOf(params.pattern).name}`;
    const author = saveAuthor.value.trim();
    try { localStorage.setItem(AUTHOR_KEY, author); } catch { /* storage blocked */ }
    const btn = $('#saveForm button[type=submit]');
    btn.disabled = true;
    try {
      await library.save({ name, author, settings: snapshot(), thumb: thumbnail() });
      saveName.value = '';
      saveDialog.close();
      flash(`Gespeichert: ${name} — zu finden unter „Bibliothek“.`);
    } catch (err) {
      flash('Speichern fehlgeschlagen: ' + err.message);
    } finally { btn.disabled = false; }
  });

  // --- animation tab ------------------------------------------------------------------------
  const animView = createAnimationView($('#animation'), {
    engine,
    params: () => params,
    pair,
    anim: () => anim,
    setAnim(patch, opts = {}) {
      anim = { ...anim, ...patch, on: true };
      if (opts.transient) { animView.light(); return; }
      commit();
      animView.sync();
    },
    flash,
    save: (file) => host.save(file),
    fileName,
  });

  // --- state ------------------------------------------------------------------------------------
  function apply(s) {
    if (s.params) {
      const id = presetOf(s.params.pattern).id;
      params = { ...base(id), ...clone(s.params) };
    }
    if (s.colorPair && COLOR_PAIRS.some((c) => c.id === s.colorPair)) pairId = s.colorPair;
    anim = { ...clone(ANIM_DEFAULTS), ...(s.anim ? clone(s.anim) : {}) };
  }
  function snapshot() { return { v: 1, tool: 'dachmarke', params: clone(params), colorPair: pairId, anim: clone(anim) }; }

  let queued = false;
  function update(record = true) {
    if (record) commit();
    for (const r of rows) {
      r.node.hidden = r.when ? !r.when() : false;
      if (r.sync && !r.node.hidden) r.sync();
    }
    pairBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === pairId)));
    const f = FORMATS.find((x) => x.width === params.width && x.height === params.height);
    $('#formatBtn .dd-value').textContent = f ? `${f.name} · ${f.ratio}` : `${params.width} × ${params.height}`;
    fmtList.querySelectorAll('.menu-item').forEach((b) => b.setAttribute('aria-pressed', String(!!f && b.dataset.id === f.id)));
    if (document.activeElement !== fw) fw.value = params.width;
    if (document.activeElement !== fh) fh.value = params.height;
    syncExport();
    if (document.body.dataset.tab === 'animation') animView.sync();
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; render(); });
  }

  function render() {
    model = engine.layout(params);
    art.innerHTML = engine.svg(model, { color: pair().color, mode: 'outlines', precision: 1 });
    stage.style.background = pair().background;
    layoutStage();
  }

  function layoutStage() {
    const W = params.width, H = params.height;
    const vw = viewport.clientWidth - 48, vh = viewport.clientHeight - 48;
    const fit = Math.max(0.01, Math.min(vw / W, vh / H));
    const z = zoom === 'fit' ? fit : zoom;
    stage.style.width = W * z + 'px';
    stage.style.height = H * z + 'px';
    $('#zoomLabel').textContent = Math.round(z * 100) + ' %';
  }
  function stepZoom(dir) {
    const cur = zoom === 'fit' ? parseFloat($('#zoomLabel').textContent) / 100 : zoom;
    const next = dir > 0 ? ZOOMS.find((z) => z > cur + 1e-6) : [...ZOOMS].reverse().find((z) => z < cur - 1e-6);
    if (next) { zoom = next; layoutStage(); }
  }

  // Small JPEG of the pattern on its background, for the library grid.
  function thumbnail() {
    if (!model) render();
    const w = 480, h = Math.max(1, Math.round((w * params.height) / params.width));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    drawModel(c.getContext('2d'), model, engine.font, { color: pair().color, background: pair().background, k: w / params.width });
    return c.toDataURL('image/jpeg', 0.75);
  }

  // Toast (UI library: none / success / error), closes itself after 4 s.
  function flash(msg, kind) {
    if (!msg) return;
    kind = kind || (/fehl|nicht|Fehler|abgebrochen/i.test(msg) ? 'error' : /^(Gespeichert|Geöffnet|Link kopiert|Umbenannt|Gelöscht)/.test(msg) ? 'success' : 'none');
    const n = $('#toast');
    n.className = 'toast toast-' + kind;
    n.replaceChildren();
    if (kind !== 'none') n.append(icon(kind === 'success' ? 'success' : 'error', 20));
    const text = el('span', { class: 'toast-text' }, msg);
    const close = el('button', { type: 'button', class: 'btn btn-icon btn-ghost btn-small', 'aria-label': 'Schließen' });
    close.append(icon('close', 16));
    close.addEventListener('click', () => { n.hidden = true; });
    n.append(text, close);
    n.hidden = false;
    clearTimeout(flash.t);
    flash.t = setTimeout(() => { n.hidden = true; }, 4000);
  }

  showTab('tool');
  update(false);
  syncUndo();
  return { get params() { return params; }, get model() { return model; }, engine, share: () => encodeShare(snapshot()), library, set };
}

// Dropdown field (UI library: label inside the field). Returns { node, set }.
function selectField(label, options, onPick) {
  const wrap = el('label', { class: 'select-field' });
  wrap.append(el('span', {}, label));
  const s = el('select');
  for (const [v, l] of options) s.append(el('option', { value: v }, l));
  s.addEventListener('change', () => onPick(s.value));
  wrap.append(s);
  return { node: wrap, set: (v) => { s.value = v; } };
}

function switchRow(label, onChange) {
  const wrap = el('label', { class: 'switch' });
  const t = el('input', { type: 'checkbox', role: 'switch' });
  wrap.append(el('span', { class: 'switch-label' }, label), t, el('span', { class: 'switch-track', 'aria-hidden': 'true' }));
  t.addEventListener('change', () => onChange(t.checked));
  return { node: wrap, set: (v) => { t.checked = !!v; } };
}
