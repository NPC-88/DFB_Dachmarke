// Opens dist/index.html in Chromium, clicks through the tool and saves
// screenshots to test/out. Fails on page errors.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') if (!/403/.test(m.text())) errors.push(m.text()); });
  await p.goto('file://' + path.resolve('dist/index.html'));
  await p.waitForTimeout(1200);
  const shot = (n) => p.screenshot({ path: `test/out/ui-${n}.png` });
  await shot('1-default');
  for (const id of ['rows', 'letters']) {
    // 3 Schnitte must open horizontal
    await p.click(`.chip[data-value="${id}"]`);
    await p.waitForTimeout(400);
    await shot('2-' + id);
  }
  await p.click('#variant'); await p.waitForTimeout(300); await shot('3-variant');
  await p.fill('#ctl-text', 'Fußball'); await p.dispatchEvent('#ctl-text', 'change'); await p.waitForTimeout(300); await shot('4-text');
  // export popover + downloads
  await p.click('#download'); await p.waitForTimeout(200); await shot('5-export');
  for (const kind of ['svg-outlines', 'svg-text', 'png']) {
    if (!(await p.isVisible('#exportPop'))) await p.click('#download');
    await p.click(`#exportKinds [data-id="${kind}"]`);
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#exportGo')]);
    await dl.saveAs('test/out/export-' + kind + path.extname(dl.suggestedFilename()));
    console.log('download', dl.suggestedFilename());
  }
  // animation points: point 1, change things, point 2, change again, point 3
  await p.click('.chip[data-value="letters"]');
  await p.click('#markPoint'); await p.waitForTimeout(150);
  await p.click('#variant'); await p.click('.chip[data-value="vertical"]'); await p.waitForTimeout(150);
  await p.click('.chip[data-value="horizontal"]');
  await p.click('#markPoint'); await p.waitForTimeout(150);
  await p.click('#variant');
  await p.click('#markPoint'); await p.waitForTimeout(300);
  await shot('6a-points');
  await p.click('[data-tab=animation]'); await p.waitForTimeout(500);
  await p.click('.previewbar .btn'); await p.waitForTimeout(1300); await shot('6-anim');
  await p.click('.previewbar .btn');
  await p.click('.anim-aside .chip[data-value="welle"]'); await p.waitForTimeout(200); await shot('6b-anim-effect');
  const [vid] = await Promise.all([p.waitForEvent('download', { timeout: 120000 }), p.click('#videoExport')]);
  console.log('video', vid.suggestedFilename());
  await p.click('[data-tab=library]'); await p.waitForTimeout(800); await shot('7-library');
  await p.emulateMedia({ colorScheme: 'dark' });
  await p.click('[data-tab=tool]'); await p.waitForTimeout(300); await shot('8-dark');
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
  await b.close();
  if (errors.length) process.exit(1);
})();
