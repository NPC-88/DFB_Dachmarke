import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEngine, PRESETS, letterWidths, LAYOUT_DEFAULTS, ANIM_DEFAULTS } from '../src/core/index.js';

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

test('reference FUSSBALLLIEBE: letter widths from Figma, same order in every row', () => {
  const m = at('letters');
  assert.deepEqual(m.letterMap, [60, 100, 200, 100, 100, 40, 100, 200, 60, 100, 200, 80, 40]);
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
  assert.equal(m.rotate, -90);
});

test('same seed → same pattern; other seed → other pattern', () => {
  const a = at('letters', { ref: null, seed: 42 }), b = at('letters', { ref: null, seed: 42 }), c = at('letters', { ref: null, seed: 43 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.starts, c.starts);
});

test('Schnittmix limits: wide share, no wide runs above the limit, range respected', () => {
  for (let seed = 1; seed < 300; seed++) {
    const p = { ...LAYOUT_DEFAULTS, seed, letterMin: 40, letterMax: 200, wideShare: 0.25, wideRun: 1 };
    const w = letterWidths(13, p);
    const wide = w.map((x) => x >= 166);
    assert.ok(wide.filter(Boolean).length <= Math.round(13 * 0.25), 'share ' + seed);
    assert.ok(wide.filter(Boolean).length >= 1, 'at least one ' + seed);
    for (let i = 1; i < 13; i++) assert.ok(!(wide[i] && wide[i - 1]), 'run ' + seed);
    for (const x of w) assert.ok(x >= 40 && x <= 200);
    const narrow = letterWidths(13, { ...p, letterMin: 60, letterMax: 100 });
    for (const x of narrow) assert.ok(x >= 60 && x <= 100);
  }
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
  const v = e.svg(at('rows'), { mode: 'outlines', background: '#A6CABA' });
  assert.match(v, /matrix\(0 -1 1 0 0 624\)/);
  assert.match(v, /<rect id="Hintergrund"/);
});

test('animation: loops seamlessly, moves the axes', () => {
  for (const mode of ['welle', 'atmen', 'wechsel']) for (const id of ['single', 'rows', 'letters']) {
    const p = { ...P(id), width: 441, height: 624 };
    const a = { ...ANIM_DEFAULTS, mode };
    const f0 = e.frame(p, a, 0), fL = e.frame(p, a, a.length);
    assert.deepEqual(f0.rows.map((r) => r.glyphs.map((g) => g.c)), fL.rows.map((r) => r.glyphs.map((g) => g.c)), `${mode} ${id} loop`);
    const mid = e.frame(p, a, a.length / 4);
    assert.notDeepEqual(f0.rows.map((r) => r.glyphs.map((g) => g.c)), mid.rows.map((r) => r.glyphs.map((g) => g.c)), `${mode} ${id} moves`);
  }
});
