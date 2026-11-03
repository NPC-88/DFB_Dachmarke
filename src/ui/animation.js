// Animation tab: the type moves along its variable axes (width / weight).
//   Bewegung — Welle (runs along the rows), Atmen (all together), Wechsel
//              (letters change style and back)
//   Achse    — Breite, Stärke or both; Stärke of the movement; Länge
//   Export   — MP4 or GIF, 100 % / 50 %, 25 / 30 fps (GIF 25), with progress
// Every movement loops seamlessly. The preview plays live; the export renders
// every frame at full quality.

import { panel, el, chips, slider, iconButton } from './controls.js';
import { icon } from './icons.js';
import { drawModel } from './render.js';
import { exportMP4, exportGIF, mp4Supported } from './video.js';

export function createAnimationView(root, ctx) {
  // ctx: { engine, params(), pair(), anim(), setAnim(patch, { transient }), flash, save(file), fileName() }
  const main = el('main', { class: 'anim-main' });
  const viewport = el('div', { class: 'anim-viewport' });
  const canvas = el('canvas', { class: 'anim-canvas' });
  viewport.append(canvas);
  const transport = el('div', { class: 'previewbar' });
  const playBtn = iconButton('play', 'Abspielen', { variant: 'primary', size: 'medium' });
  const scrub = el('input', { type: 'range', min: 0, max: 1, step: 0.001, value: 0, 'aria-label': 'Zeit', class: 'scrub' });
  const timeLabel = el('span', { class: 'time' }, '0,0 / 6,0 s');
  const fpsLabel = el('span', { id: 'animStatus' });
  transport.append(playBtn, scrub, timeLabel, fpsLabel);
  main.append(viewport, transport);

  const aside = el('aside', { class: 'anim-aside' });
  const bBox = panel('Bewegung', true);
  const mode = chips('Art', [['welle', 'Welle'], ['atmen', 'Atmen'], ['wechsel', 'Schnittwechsel']], (v) => ctx.setAnim({ mode: v }), { small: true });
  const modeHint = el('p', { class: 'hint' });
  const axis = chips('Achse der Schrift', [['wdth', 'Breite'], ['wght', 'Stärke'], ['both', 'Beides']], (v) => ctx.setAnim({ axis: v }), { small: true });
  const amount = slider({ key: 'anim-amount', label: 'Ausschlag', min: 5, max: 100, step: 1, unit: '%' }, (v, tr) => ctx.setAnim({ amount: v / 100 }, { transient: tr }));
  const waves = slider({ key: 'anim-waves', label: 'Wellen über die Fläche', min: 0.5, max: 4, step: 0.1, unit: '×' }, (v, tr) => ctx.setAnim({ waves: v }, { transient: tr }));
  const length = slider({ key: 'anim-length', label: 'Länge einer Schleife', min: 2, max: 12, step: 0.5, unit: 's' }, (v, tr) => ctx.setAnim({ length: v }, { transient: tr }));
  bBox.body.append(mode.node, modeHint, axis.node, amount.node, waves.node, length.node);

  const xBox = panel('Export', true);
  const fmt = chips('Format', [['mp4', 'MP4'], ['gif', 'GIF']], (v) => { exportOpts.format = v; syncExport(); }, { small: true });
  const size = chips('Größe', [['1', '100 %'], ['0.5', '50 %']], (v) => { exportOpts.scale = +v; syncExport(); }, { small: true });
  const rate = chips('Bilder pro Sekunde', [['25', '25'], ['30', '30']], (v) => { exportOpts.fps = +v; syncExport(); }, { small: true });
  const xInfo = el('p', { class: 'hint' });
  const xBtn = el('button', { type: 'button', class: 'btn btn-primary btn-medium', id: 'videoExport' });
  xBtn.append(icon('download', 20), document.createTextNode('Video exportieren'));
  const progress = el('div', { class: 'progress', hidden: '' });
  const bar = el('div', { class: 'progress-bar' });
  const pLabel = el('span', { class: 'progress-label' });
  const cancel = el('button', { type: 'button', class: 'btn btn-ghost btn-small' }, 'Abbrechen');
  progress.append(el('div', { class: 'progress-track' }, ''), pLabel, cancel);
  progress.firstChild.append(bar);
  xBox.body.append(fmt.node, size.node, rate.node, xInfo, xBtn, progress);
  aside.append(bBox.node, xBox.node);
  root.append(main, aside);

  const exportOpts = { format: 'mp4', scale: 1, fps: 25 };
  let playing = false, t0 = 0, tNow = 0, raf = 0, busy = false, abort = null;
  let lastDraw = 0, frames = 0, fpsShown = 0;
  const L = () => ctx.anim().length;

  function draw(t) {
    const p = ctx.params();
    const r = viewport.getBoundingClientRect();
    const fit = Math.min((r.width - 32) / p.width, (r.height - 32) / p.height);
    const cssW = Math.max(1, Math.floor(p.width * fit)), cssH = Math.max(1, Math.floor(p.height * fit));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.min(p.width, Math.round(cssW * dpr)), ch = Math.round((cw * p.height) / p.width);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    const model = ctx.engine.frame(p, ctx.anim(), t);
    drawModel(canvas.getContext('2d'), model, ctx.engine.font, { color: ctx.pair().color, background: ctx.pair().background, k: cw / p.width });
  }

  function frame(now) {
    if (!playing) return;
    tNow = ((now - t0) / 1000) % L();
    draw(tNow);
    frames++;
    if (now - lastDraw > 1000) { fpsShown = frames; frames = 0; lastDraw = now; }
    syncTime();
    raf = requestAnimationFrame(frame);
  }
  function setPlaying(on) {
    playing = on;
    playBtn.replaceChildren(icon(on ? 'pause' : 'play', 20));
    playBtn.setAttribute('aria-label', on ? 'Pause' : 'Abspielen');
    playBtn.dataset.tip = on ? 'Pause' : 'Abspielen';
    cancelAnimationFrame(raf);
    if (on) { t0 = performance.now() - tNow * 1000; lastDraw = performance.now(); frames = 0; raf = requestAnimationFrame(frame); }
    else fpsShown = 0;
    syncTime();
  }
  playBtn.addEventListener('click', () => setPlaying(!playing));
  scrub.addEventListener('input', () => { setPlaying(false); tNow = +scrub.value * L(); draw(tNow); syncTime(); });
  new ResizeObserver(() => { if (!root.hidden) draw(tNow); }).observe(viewport);

  function syncTime() {
    scrub.value = tNow / L();
    timeLabel.textContent = `${fmtS(tNow)} / ${fmtS(L())} s`;
    fpsLabel.textContent = playing && fpsShown ? `Vorschau ${fpsShown} B/s` : '';
  }

  const HINTS = {
    welle: 'Eine Welle läuft durch die Zeilen: jeder Buchstabe wird nacheinander breiter und schmaler.',
    atmen: 'Alle Buchstaben werden gemeinsam breiter und schmaler.',
    wechsel: 'Schnittmix: jeder Buchstabe wechselt zu einer anderen Breite und zurück. 3 Schnitte: die Zeilen tauschen ihre Schnitte. 1 Schnitt: der Schnitt schwingt zum anderen Ende der Achse.',
  };

  function syncExport() {
    const p = ctx.params();
    fmt.set(exportOpts.format);
    size.set(String(exportOpts.scale));
    const fps = exportOpts.format === 'gif' ? 25 : exportOpts.fps;
    rate.set(String(fps));
    rate.node.hidden = exportOpts.format === 'gif';
    const w = Math.round(p.width * exportOpts.scale), h = Math.round(p.height * exportOpts.scale);
    const n = Math.round(L() * fps);
    const mp4Note = exportOpts.format === 'mp4' && !mp4Supported() ? ' · MP4 geht in diesem Browser nicht (Chrome, Edge oder Safari verwenden)' : '';
    xInfo.textContent = `${w} × ${h} px · ${fmtS(L())} s · ${n} Bilder · Schleife${exportOpts.format === 'gif' ? ' · GIF-Dateien werden groß' : ''}${mp4Note}`;
  }

  xBtn.addEventListener('click', async () => {
    if (busy) return;
    const p = ctx.params(), a = ctx.anim(), pair = ctx.pair();
    const fps = exportOpts.format === 'gif' ? 25 : exportOpts.fps;
    const total = Math.round(a.length * fps);
    const w = Math.round(p.width * exportOpts.scale), h = Math.round(p.height * exportOpts.scale);
    const renderFrame = (c2, i, t) => {
      drawModel(c2, ctx.engine.frame(p, a, t), ctx.engine.font, { color: pair.color, background: pair.background, k: c2.canvas.width / p.width });
    };
    setPlaying(false);
    busy = true;
    abort = new AbortController();
    xBtn.disabled = true;
    progress.hidden = false;
    const started = performance.now();
    const onProgress = (q) => {
      bar.style.width = (q * 100).toFixed(1) + '%';
      const e2 = (performance.now() - started) / 1000, rest = q > 0.02 ? e2 / q - e2 : null;
      pLabel.textContent = `${Math.round(q * 100)} %` + (rest != null ? ` · noch ca. ${Math.ceil(rest)} s` : '');
    };
    onProgress(0);
    try {
      const opts = { width: w, height: h, fps, frames: total, renderFrame, onProgress, signal: abort.signal, background: pair.background, color: pair.color };
      const blob = exportOpts.format === 'gif' ? await exportGIF(opts) : await exportMP4(opts);
      ctx.flash(await ctx.save({ filename: `${ctx.fileName()}-${a.mode}.${exportOpts.format}`, data: blob }));
    } catch (e) {
      ctx.flash(e && e.name === 'AbortError' ? 'Export abgebrochen.' : 'Export fehlgeschlagen: ' + (e && e.message));
    } finally {
      busy = false;
      xBtn.disabled = false;
      progress.hidden = true;
    }
  });
  cancel.addEventListener('click', () => abort && abort.abort());

  function sync() {
    const a = ctx.anim();
    mode.set(a.mode);
    modeHint.textContent = HINTS[a.mode];
    axis.set(a.axis);
    amount.set(Math.round(a.amount * 100));
    waves.set(a.waves);
    waves.node.hidden = a.mode !== 'welle';
    length.set(a.length);
    syncExport();
    if (tNow > L()) tNow = 0;
    syncTime();
    if (!root.hidden && !playing) draw(tNow);
  }
  function light() { syncExport(); syncTime(); if (!playing) draw(tNow); }

  return {
    sync,
    light,
    show() { sync(); draw(tNow); },
    hide() { setPlaying(false); },
  };
}

const fmtS = (s) => (Math.round(s * 10) / 10).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
