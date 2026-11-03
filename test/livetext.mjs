// Live-text check: every preset as live-text SVG and as outlines, rendered by
// Chromium with NO web fonts — only the static DFB Sans Pro fonts installed in
// the system. Prints the share of differing pixels per pattern.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createEngine, PRESETS } from '../src/core/index.js';
const { chromium } = createRequire(import.meta.url)('playwright');
const e = createEngine(readFileSync('fonts/DFB-Sans-Pro.ttf'), readFileSync('fonts/DFB-Sans-Pro-Italic.ttf'));
mkdirSync('test/out', { recursive: true });
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1240, height: 1754 } });
for (const pr of PRESETS) {
  const m = e.layout({ ...pr.params, width: 1240, height: 1754 });
  const px = {};
  for (const mode of ['outlines', 'text']) {
    const svg = e.svg(m, { color: '#000', background: '#fff', mode });
    writeFileSync(`test/out/live-${pr.id}-${mode}.svg`, svg);
    await page.setContent(`<body style="margin:0">${svg}</body>`);
    await page.waitForTimeout(200);
    px[mode] = await page.screenshot({ path: `test/out/live-${pr.id}-${mode}.png` });
  }
  const diff = await page.evaluate(async ([a, c]) => {
    const load = (b64) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + b64; });
    const [ia, ic] = await Promise.all([load(a), load(c)]);
    const cv = document.createElement('canvas'); cv.width = ia.width; cv.height = ia.height;
    const x = cv.getContext('2d');
    x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, cv.width, cv.height).data;
    x.drawImage(ic, 0, 0); const dc = x.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0, ink = 0;
    for (let i = 0; i < da.length; i += 4) { if (da[i] < 128) ink++; if ((da[i] < 128) !== (dc[i] < 128)) n++; }
    return { diff: n, ink };
  }, [px.outlines.toString('base64'), px.text.toString('base64')]);
  console.log(pr.id.padEnd(8), 'differing pixels:', (100 * diff.diff / diff.ink).toFixed(2) + '% of ink');
}
await b.close();
