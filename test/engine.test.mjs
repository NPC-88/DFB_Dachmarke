import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEngine, PRESETS, letterWidths, variantStyles, LAYOUT_DEFAULTS, ANIM_DEFAULTS, animLength, AREAS, pairsOf } from '../src/core/index.js';

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
  assert.equal(at('letters', { text: 'Fußballliebe' }).phrase, 'FUSSBALLLIEBE');
  assert.equal(at('single', { text: '  club   100 ' }).phrase, 'CLUB 100');
});

test('reference CLUB 100 layout: 4 rows, Organisation cut (Wide Black), last baseline 26 px above the edge', () => {
  const m = at('single');
  assert.equal(m.rows.length, 4);
  assert.ok(Math.abs(m.rows[3].baseline - (624 - 26)) < 0.01);
  assert.ok(Math.abs(m.rows[1].baseline - m.rows[0].baseline - 58) < 0.01);
  for (const r of m.rows) for (const g of r.glyphs) assert.deepEqual(g.c, { wdth: 133, wght: 925 });
  assert.ok(Math.abs(m.fontSize - 70) < 1e-9);
});

test('Schnittmix: three cuts (Compressed / Condensed / Extended), same order in every row', () => {
  const m = at('letters', { text: 'Fußballliebe' });
  assert.equal(m.letterMap.length, 13);
  for (const w of m.letterMap) assert.ok([40, 80, 166].includes(w));
  for (const r of m.rows) for (const g of r.glyphs) { assert.equal(g.c.wdth, m.letterMap[g.letter % 13]); assert.equal(g.c.wght, 925); }
});

test('rows never overlap: line height ≥ cap height', () => {
  for (const id of ['single', 'rows', 'letters']) {
    const m = at(id, { lineHeight: 0.1 });
    const cap = e.font.capHeight / e.font.unitsPerEm * m.fontSize;
    assert.ok(m.rows[1].baseline - m.rows[0].baseline > cap, id);
  }
});

test('3 Schnitte: rows in sets of 3 (3·6·9·12), the three cuts repeat', () => {
  assert.deepEqual([1, 4, 6, 8, 12].map((r) => at('rows', { rows: r }).rows.length), [3, 3, 6, 9, 12]);
  const m = at('rows', { rows: 9 });
  m.rows.forEach((r, i) => { for (const g of r.glyphs) assert.deepEqual(g.c, P('rows').rowStyles[i % 3]); });
  assert.equal(m.rotate, 0);   // horizontal by default, like every pattern
  for (const id of ['single', 'rows', 'letters']) assert.equal(at(id, { orientation: 'vertical' }).rotate, -90);
});

test('same seed → same pattern; other seed → other pattern', () => {
  const a = at('letters', { ref: null, seed: 42 }), b = at('letters', { ref: null, seed: 42 }), c = at('letters', { ref: null, seed: 43 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.starts, c.starts);
});

test('Schnittmix rules: three cuts, wide share, a wide letter per word, no wide runs, no 3× same', () => {
  for (let seed = 1; seed < 400; seed++) {
    const p = { ...LAYOUT_DEFAULTS, seed, wideShare: 0.25, wideRun: 1 };
    const w = letterWidths(13, p, [8, 5]);                  // FUSSBALL LIEBE
    for (const x of w) assert.ok([40, 80, 166].includes(x), 'level ' + x);
    const wide = w.map((x) => x === 166);
    const nWide = wide.filter(Boolean).length;
    assert.ok(nWide >= 2 && nWide <= Math.max(2, Math.round(13 * 0.25)), 'share ' + seed + ' ' + nWide);
    assert.ok(w.slice(0, 8).includes(166) && w.slice(8).includes(166), 'one per word ' + seed);
    for (let i = 1; i < 13; i++) assert.ok(!(wide[i] && wide[i - 1]), 'run ' + seed);
    for (let i = 2; i < 13; i++) assert.ok(!(w[i] === w[i - 1] && w[i] === w[i - 2]), 'three same ' + seed);
  }
});

test('Verlauf (test): widths follow a wave along each row', () => {
  const m = at('letters', { mix: 'verlauf', gradAxis: 'wdth' });
  const ws = m.rows[1].glyphs.map((g) => g.c.wdth);
  assert.ok(Math.min(...ws) < 60 && Math.max(...ws) > 140);
  const g2 = at('letters', { mix: 'verlauf', gradAxis: 'wght' }).rows[1].glyphs.map((g) => g.c.wght);
  assert.ok(Math.min(...g2) < 300 && Math.max(...g2) > 800);
});

test('no stacked words: neighbouring rows start at least ¼ repeat apart (1 Schnitt)', () => {
  const check = (m, L) => {
    for (let r = 1; r < m.rowStarts.length; r++) {
      const d = (((m.rowStarts[r] - m.rowStarts[r - 1]) % L) + L) % L;
      assert.ok(Math.min(d, L - d) >= 0.25 * L - 1e-6, `rows ${r - 1}/${r}`);
    }
  };
  const unitLen = (m) => { const g = m.rows[0].glyphs; return null; };
  for (const id of ['single', 'letters']) for (let seed = 1; seed < 40; seed++) for (const shift of [0, 0.3, 1]) {
    const p = { ...P(id), width: 441, height: 624, ref: null, seed, shift };
    const m = e.layout(p);
    // repeat length = phrase + space (+ gap)
    const L = e.font.run(m.phrase + ' ', id === 'single' ? p.style : { wdth: 100, wght: 925 }, p.italic).reduce((s, g) => s + g.advance, 0) * m.scale;
    if (id === 'single') check(m, L);
  }
  // the Figma counter-example (87:1477): rows 1/2 and 3/4 start together → separated
  const bad = e.layout({ ...P('single'), width: 441, height: 624, ref: { xs: [-301, -301, -488, -488].map((x) => x / 441) } });
  assert.notEqual(bad.rowStarts[0], bad.rowStarts[1]);
  assert.notEqual(bad.rowStarts[2], bad.rowStarts[3]);
});

test('areas: allowed colours from the chart, not-allowed ones left out', () => {
  const ids = (a) => pairsOf(a).map((p) => p.background + '>' + p.color);
  assert.ok(!ids('gesellschaft').includes('#004941>#6100FF'));          // Dunkelgrün → Violett not allowed
  assert.ok(!ids('sport').includes('#C8F2E0>#BBFD00'));                 // Mint 01 → Akzentgrün not allowed
  assert.ok(ids('gesellschaft').includes('#001F23>#6100FF'));
  assert.equal(AREAS.find((a) => a.id === 'sport').italic, true);
  assert.deepEqual(AREAS.find((a) => a.id === 'organisation').widths, [100, 133]);
});

test('Neue Variante: 1 Schnitt picks the area cuts; 3 Schnitte reorders the three fixed cuts', () => {
  const org = AREAS[0], ges = AREAS[1];
  for (let seed = 1; seed < 60; seed++) {
    const a = variantStyles('single', seed, org).style, b = variantStyles('single', seed, ges).style;
    assert.ok(org.widths.includes(a.wdth) && org.weights.includes(a.wght));
    assert.ok(ges.widths.includes(b.wdth) && ges.weights.includes(b.wght));
    const ws = variantStyles('rows', seed, org).rowStyles.map((r) => r.wdth + '/' + r.wght).sort();
    assert.deepEqual(ws, ['166/925', '40/925', '80/925']);
  }
  assert.deepEqual(variantStyles('letters', 3), {});
});

test('tiled rows fill the frame edge to edge; Schnittmix: one phrase per row, placed freely', () => {
  for (const id of ['single', 'rows']) for (const seed of [1, 2, 3, 99]) {
    const m = at(id, { ref: null, seed });
    for (const r of m.rows) {
      if (!r.glyphs.length) continue;
      assert.ok(r.glyphs[r.glyphs.length - 1].x >= m.vw - m.fontSize * 1.5, `${id} ${seed} reaches end`);
      assert.ok(r.glyphs[0].x <= m.fontSize * 1.2, `${id} ${seed} starts at the edge`);
    }
  }
  for (const seed of [1, 2, 3, 99]) {
    const m = at('letters', { ref: null, seed });
    for (const r of m.rows) assert.ok(r.glyphs.length <= 13, 'one phrase');
    // Zeilenversatz scales the positions continuously (no jumps)
    const a = at('letters', { ref: null, seed, shift: 0.5 }).rowStarts, b = at('letters', { ref: null, seed, shift: 0.51 }).rowStarts;
    a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) < 0.05 * 441));
  }
});

test('svg: outlines and live text', () => {
  const m = at('letters');
  const o = e.svg(m, { color: '#C8F2E0', mode: 'outlines' });
  assert.match(o, /<path id="Zeile_01" d="M/);
  const t = e.svg(m, { color: '#C8F2E0', mode: 'text' });
  assert.match(t, /font-family="'DFB Sans Pro Static Extd Black', 'DFB Sans Pro Static', 'DFB Sans Pro'"/);
  assert.match(e.svg(at('letters', { italic: true }), { mode: 'text' }), /font-style="italic"/);
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
  const p = { ...P('letters'), text: 'Fußballliebe', width: 441, height: 624 };
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
