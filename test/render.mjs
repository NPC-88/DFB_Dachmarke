// Renders presets to SVG/PNG in test/out (for visual checks).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createEngine, PRESETS, COLOR_PAIRS } from '../src/core/index.js';
const e = createEngine(readFileSync('fonts/DFB-Sans-Pro.ttf'), readFileSync('fonts/DFB-Sans-Pro-Italic.ttf'));
mkdirSync('test/out', { recursive: true });
const [w, h] = (process.argv[2] || '441x624').split('x').map(Number);
for (const pr of PRESETS) {
  const pair = COLOR_PAIRS.find((c) => c.id === pr.colorPair);
  const t0 = performance.now();
  const m = e.layout({ ...pr.params, width: w, height: h });
  const svg = e.svg(m, { color: pair.color, background: pair.background, title: pr.name });
  writeFileSync(`test/out/${pr.id}-${w}x${h}.svg`, svg);
  console.log(pr.id, (performance.now() - t0).toFixed(0) + 'ms', m.rows.map((r) => r.glyphs.length).join(','), m.letterMap ? m.letterMap.join(' ') : '');
}
