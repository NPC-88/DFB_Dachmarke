import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEngine, PRESETS, letterWidths, variantStyles, LAYOUT_DEFAULTS, ANIM_DEFAULTS, animLength } from '../src/core/index.js';

const e = createEngine(readFileSync('fonts/DFB-Sans-Pro.ttf'), readFileSync('fonts/DFB-Sans-Pro-Italic.ttf'));
const P = (id) => PRESETS.find((p) => p.id === id).params;
const at = (id, extra = {}) => e.layout({ ...P(id), width: 441, height: 624, ...extra });

test('font: two axes, upright and italic', () => {
  assert.deepEqual([e.font.axes.wdth.min, e.font.axes.wdth.max], [40, 200]);
  assert.deepEqual([e.font.axes.wght.min, e.font.axes.wght.max], [75, 1000]);
  const up = e.font.outline(e.font.run('H', { wdth: 100, wght: 400 }, false)[0].id, { wdth: 100, wght: 400 }, false);
  const it = e.font.outline(e.font.run('H', { wdth: 100, wght: 400 }, true)[0].id, { wdth: 100, wght: 400 }, true);
  assert.notDeepEqual(up, it);
});

test('text: capitals, ß → SS', () => {
  assert.equal(at('letters').phrase, 'FUSSBALLLIEBE');
  assert.equal(at('single', { text: '  club   100 ' }).phrase, 'CLUB 100');
});

test('reference CLUB 100: 4 rows, Super Extended Black, last baseline 26 px above the edge', () => {
  const m = at('single');
  assert.equal(m.rows.length, 4);
  assert.ok(Math.abs(m.rows[3].baseline - (624 - 26)) < 0.01);
  assert.ok(Math.abs(m.rows[1].baseline - m.rows[0].baseline - 58) < 0.01);
  for (const r of m.rows) for (const g of r.glyphs) assert.deepEqual(g.c, { wdth: 200, wght: 925 });
  assert.ok(Math.abs(m.fontSize - 70) < 1e-9);
});

test('reference FUSSBALLLIEBE (A4 - 35, DFB Sans Pro): letter widths from Figma, same order in every row', () => {
  const m = at('letters');
  assert.deepEqual(m.letterMap, [60, 60, 200, 100, 100, 40, 100, 133, 60, 100, 133, 80, 60]);
  for (const r of m.rows) for (const g of r.glyphs) assert.equal(g.c.wdth, m.letterMap[g.letter % 13]);
});

test('rows never overlap: line height ≥ cap height', () => {
  for (const id of ['single', 'rows', 'letters']) {
    const m = at(id, { lineHeight: 0.1 });
    const cap = e.font.capHeight / e.font.unitsPerEm * m.fontSize;
    assert.ok(m.rows[1].baseline - m.rows[0].baseline > cap, id);
  }
});

test('3 Schnitte: at most 3 rows, one style per row', () => {
  const m = at('rows', { rows: 9 });
  assert.equal(m.rows.length, 3);
  m.rows.forEach((r, i) => { for (const g of r.glyphs) assert.deepEqual(g.c, P('rows').rowStyles[i]); });
  assert.equal(m.rotate, 0);   // horizontal by default, like every pattern
  for (const id of ['single', 'rows', 'letters']) assert.equal(at(id, { orientation: 'vertical' }).rotate, -90);
});

test('same seed → same pattern; other seed → other pattern', () => {
  const a = at('letters', { ref: null, seed: 42 }), b = at('letters', { ref: null, seed: 42 }), c = at('letters', { ref: null, seed: 43 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.starts, c.starts);
});

test('Schnittmix rules: levels, wide share, one Super Extended per word, no wide runs', () => {
  for (let seed = 1; seed < 400; seed++) {
    const p = { ...LAYOUT_DEFAULTS, seed, letterMin: 40, letterMax: 200, wideShare: 0.25, wideRun: 1 };
    const words = [8, 5];                                   // FUSSBALL LIEBE
    const w = letterWidths(13, p, words);
    for (const x of w) assert.ok([40, 60, 80, 100, 133, 200].includes(x), 'level ' + x);
    const wide = w.map((x) => x >= 133);
    const nWide = wide.filter(Boolean).length;
    assert.ok(nWide >= 1 && nWide <= Math.round(13 * 0.25), 'share ' + seed);
    for (let i = 1; i < 13; i++) assert.ok(!(wide[i] && wide[i - 1]), 'run ' + seed);
    assert.ok(w.slice(0, 8).filter((x) => x === 200).length <= 1 && w.slice(8).filter((x) => x === 200).length <= 1, 'super per word ' + seed);
    for (let i = 2; i < 13; i++) assert.ok(!(w[i] === w[i - 1] && w[i] === w[i - 2] && w[i] < 133), 'three same ' + seed);
    for (const x of letterWidths(13, { ...p, letterMin: 60, letterMax: 100 })) assert.ok(x >= 60 && x <= 100);
  }
});

test('Neue Variante: new styles within the rules for 1 Schnitt and 3 Schnitte', () => {
  const singles = new Set(), rowsSets = new Set();
  for (let seed = 1; seed < 60; seed++) {
    const { style } = variantStyles('single', seed);
    assert.ok([650, 925].includes(style.wght));
    singles.add(style.wdth + ',' + style.wght);
    const { rowStyles } = variantStyles('rows', seed);
    const ws = rowStyles.map((r) => r.wdth).sort((a, b) => a - b);
    assert.ok(ws[0] <= 60 && ws[1] >= 80 && ws[1] <= 100 && ws[2] >= 133, 'three distinct widths ' + ws);
    rowsSets.add(JSON.stringify(rowStyles));
  }
  assert.ok(singles.size > 6 && rowsSets.size > 15);
  assert.deepEqual(variantStyles('letters', 3), {});
});

test('tiled rows fill the frame edge to edge; Schnittmix rows reach the far edge', () => {
  for (const id of ['single', 'rows', 'letters']) {
    for (const seed of [1, 2, 3, 99]) {
      const m = at(id, { ref: null, seed });
      for (const r of m.rows) {
        if (!r.glyphs.length) continue;
        const last = r.glyphs[r.glyphs.length - 1];
        assert.ok(last.x + m.fontSize * 0.2 >= m.vw - m.fontSize * 1.5, `${id} ${seed} reaches end`);
        if (id !== 'letters') assert.ok(r.glyphs[0].x <= m.fontSize * 1.2, `${id} ${seed} starts at the edge`);
      }
    }
  }
});

test('svg: outlines and live text', () => {
  const m = at('letters');
  const o = e.svg(m, { color: '#C8F2E0', mode: 'outlines' });
  assert.match(o, /<path id="Zeile_01" d="M/);
  const t = e.svg(m, { color: '#C8F2E0', mode: 'text' });
  assert.match(t, /font-family="'DFB Sans Pro Static SupEx Black', 'DFB Sans Pro Static', 'DFB Sans Pro'"/);
  assert.match(t, /font-style="italic"/);
  const v = e.svg(at('rows', { orientation: 'vertical' }), { mode: 'outlines', background: '#A6CABA' });
  assert.match(v, /matrix\(0 -1 1 0 0 624\)/);
  assert.match(v, /<rect id="Hintergrund"/);
});

test('animation effects: loop seamlessly, move the axes', () => {
  for (const effect of ['welle', 'atmen', 'wechsel']) for (const id of ['single', 'rows', 'letters']) {
    const p = { ...P(id), width: 441, height: 624 };
    const a = { ...ANIM_DEFAULTS, effect };
    const cs = (m) => m.rows.map((r) => r.glyphs.map((g) => g.c));
    assert.deepEqual(cs(e.frame(p, a, 0)), cs(e.frame(p, a, a.length)), `${effect} ${id} loop`);
    assert.notDeepEqual(cs(e.frame(p, a, 0)), cs(e.frame(p, a, a.length / 4)), `${effect} ${id} moves`);
  }
});

test('animation points: start at point 1, pass point 2, loop back; rows slide, letters change width', () => {
  const p = { ...P('letters'), width: 441, height: 624 };
  const m1 = { params: { ...p } };
  const m2 = { params: { ...p, ref: null, seed: 5, size: p.size * 0.8 } };
  const a = { ...ANIM_DEFAULTS, moments: [m1, m2], durations: [2, 3] };
  assert.equal(animLength(a), 5);
  const still = (q) => JSON.stringify(e.layout(q).rows);
  assert.equal(JSON.stringify(e.frame(p, a, 0).rows), still(p));
  assert.equal(JSON.stringify(e.frame(p, a, 2).rows), still({ ...p, ...m2.params }));
  assert.equal(JSON.stringify(e.frame(p, a, 5).rows), still(p));
  const mid = e.frame(p, a, 1);
  assert.ok(mid.fontSize < p.size * 441 && mid.fontSize > p.size * 0.8 * 441);
  // structure (text, pattern) comes from the tool, not from the points
  const other = e.frame({ ...p, text: 'Fußball' }, a, 1);
  assert.equal(other.phrase, 'FUSSBALL');
  // pingpong: 1 → 2 → 1
  assert.equal(animLength({ ...a, loop: 'pingpong' }), 4);
});

const inkGaps = (m) => m.rows.filter((r) => r.opened).map((r) => {
  const b = m.logo;
  let L = -Infinity, R = Infinity, cut = false;
  for (const g of r.glyphs) {
    const bb = e.font.bounds(g.id, g.c, m.italic);
    const l = g.x + bb.xMin * m.scale, rr = g.x + bb.xMax * m.scale;
    if (rr <= b.x) L = Math.max(L, rr); else if (l >= b.x + b.size) R = Math.min(R, l); else cut = true;
  }
  return { left: b.x - L, right: R - b.x - b.size, cut };
});

test('logo In der Typo: two rows open (Organisation), equal ink gap both sides, at word gaps', () => {
  const plain = at('single');
  const oy = (492.5 - plain.bandCenter.y) / 441;
  const fit = at('single', { logo: { on: true, mode: 'fit', style: 'dunkelgruen', size: 77 / 441, ox: 0, oy } });
  assert.ok(Math.abs(fit.logo.x - 182) < 1e-6 && Math.abs(fit.logo.y - 454) < 1e-6);   // as in Figma
  const gaps = inkGaps(fit);
  assert.equal(gaps.length, 2);
  for (const g of gaps) {
    assert.ok(!g.cut);
    assert.ok(Math.abs(g.left - g.right) < 0.01, `symmetric ${g.left} ${g.right}`);
    assert.ok(Math.abs(g.left - 0.31 * 70) < 0.01);
  }
  // snap: the letters right before / after the plate end / start a word
  const phrase = 'CLUB 100';
  for (const r of fit.rows.filter((x) => x.opened)) {
    const before = r.glyphs.filter((g) => g.x < fit.logo.x).pop(), after = r.glyphs.find((g) => g.x > fit.logo.x);
    assert.ok(['B', '0'].includes(before.chars) && ['C', '1'].includes(after.chars), before.chars + after.chars);
  }
  // rows that do not cross the logo stay as they are
  fit.rows.forEach((r, i) => { if (!r.opened) assert.deepEqual(r.glyphs, plain.rows[i].glyphs); });
  // without snap: no word gap needed, still nothing touches the plate
  for (const g of inkGaps(at('single', { logo: { on: true, mode: 'fit', size: 77 / 441, oy, snap: false } }))) assert.ok(!g.cut && g.left >= 0.31 * 70 - 0.01 && Math.abs(g.right - 0.31 * 70) < 0.01);
});

test('block offset moves rows and the logo (über / in der Typo), not a free logo', () => {
  const lg = { on: true, mode: 'over', size: 0.15 };
  const a = at('single', { logo: lg }), b = at('single', { logo: lg, blockX: 0.1 });
  assert.ok(Math.abs(b.logo.x - a.logo.x - 44.1) < 1e-6);
  assert.notDeepEqual(a.rows[0].glyphs.map((g) => g.x), b.rows[0].glyphs.map((g) => g.x));
  const f1 = at('single', { logo: { ...lg, mode: 'free' } }), f2 = at('single', { logo: { ...lg, mode: 'free' }, blockX: 0.1 });
  assert.equal(f1.logo.x, f2.logo.x);
  const v = at('single', { orientation: 'vertical', logo: lg, blockX: 0.1 }), v0 = at('single', { orientation: 'vertical', logo: lg });
  assert.ok(Math.abs(v0.logo.y - v.logo.y - 62.4) < 1e-6);   // vertical: block moves up
});

test('row slide: only that row moves; tiled rows still cover the frame', () => {
  const a = at('single'), b = at('single', { rowShift: [0, 0.2, 0, 0] });
  assert.deepEqual(a.rows[0].glyphs, b.rows[0].glyphs);
  assert.notDeepEqual(a.rows[1].glyphs.map((g) => g.x), b.rows[1].glyphs.map((g) => g.x));
  assert.ok(b.rows[1].glyphs[0].x <= 0);
});

test('logo: over keeps the typography, free sits top centre in the safe zone, svg layer', () => {
  const logo = { on: true, mode: 'over', style: 'dunkelgruen', size: 77 / 441 };
  assert.deepEqual(at('single', { logo }).rows.map((r) => r.glyphs), at('single').rows.map((r) => r.glyphs));
  const free = at('letters', { logo: { on: true, mode: 'free', style: 'violett', size: 54.4 / 441 } });
  assert.ok(Math.abs(free.logo.y - 27) < 0.5 && Math.abs(free.logo.x + free.logo.size / 2 - 220.5) < 0.5);
  const svg = e.svg(at('single', { logo: { ...logo, mode: 'fit', oy: (492.5 - 486.85) / 441 } }), { color: '#C8F2E0' });
  assert.match(svg, /<g id="Logo" transform="translate\(182 454\)"><rect id="Traegerflaeche" width="77" height="77" rx="4.87" fill="#004941"\/>/);
  assert.equal(at('single', { logo: { ...logo, on: false } }).logo, null);
});
