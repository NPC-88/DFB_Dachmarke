// node test/shot.cjs out.png a.svg b.png ... → side-by-side PNG (Chromium)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const [out, ...files] = process.argv.slice(2);
  const imgs = files.map((f) => {
    const b = fs.readFileSync(f);
    const mime = f.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    return `<figure><img src="data:${mime};base64,${b.toString('base64')}" width="441" height="624"><figcaption>${path.basename(f)}</figcaption></figure>`;
  }).join('');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 470 * files.length, height: 670 }, deviceScaleFactor: 1 });
  await p.setContent(`<body style="margin:0;display:flex;gap:12px;padding:8px;font:12px sans-serif;background:#fff">${imgs}</body>`);
  await p.screenshot({ path: out });
  await b.close();
})();
