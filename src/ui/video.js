// Video export of an animation, frame by frame at full quality.
//   MP4: H.264 through the browser's WebCodecs encoder + mp4-muxer
//        (Chrome, Edge, Safari 16.4+; not every Firefox).
//   GIF: gifenc, palette = 32 steps between background and pattern colour
//        (the pattern only ever mixes those two), so every frame maps exactly.
// renderFrame(ctx, i, t) draws frame i (time t s) onto a canvas of size w × h.

import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { GIFEncoder } from 'gifenc';

export function mp4Supported() { return typeof window.VideoEncoder === 'function' && typeof window.VideoFrame === 'function'; }

export async function exportMP4({ width, height, fps, frames, renderFrame, onProgress, signal }) {
  if (!mp4Supported()) throw new Error('Dieser Browser kann kein MP4 erzeugen. Bitte Chrome, Edge oder Safari verwenden.');
  const w = width - (width % 2), h = height - (height % 2);          // H.264 needs even sizes
  const codec = w * h <= 2097152 ? 'avc1.640028' : 'avc1.640033';     // High profile, level 4.0 / 5.1
  const config = { codec, width: w, height: h, bitrate: Math.round(w * h * fps * 0.25), framerate: fps, avc: { format: 'avc' } };
  const sup = await VideoEncoder.isConfigSupported(config);
  if (!sup.supported) throw new Error(`MP4 in ${w} × ${h} wird von diesem Browser nicht unterstützt. Kleinere Größe wählen.`);

  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: w, height: h, frameRate: fps }, fastStart: 'in-memory' });
  let failure = null;
  const encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { failure = e; } });
  encoder.configure(config);

  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < frames; i++) {
    if (signal && signal.aborted) { encoder.close(); throw new DOMException('Abgebrochen', 'AbortError'); }
    if (failure) throw failure;
    renderFrame(ctx, i, i / fps);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
    encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();
    if (encoder.encodeQueueSize > 4) await new Promise((r) => encoder.addEventListener('dequeue', r, { once: true }));
    onProgress && onProgress((i + 1) / frames);
    if (i % 4 === 0) await tick();
  }
  await encoder.flush();
  encoder.close();
  if (failure) throw failure;
  muxer.finalize();
  return new Blob([muxer.target.buffer], { type: 'video/mp4' });
}

export async function exportGIF({ width, height, fps, frames, renderFrame, background, color, onProgress, signal }) {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const bg = hex(background), fg = hex(color);
  const STEPS = 32;
  const palette = Array.from({ length: STEPS }, (_, i) => bg.map((c, k) => Math.round(c + ((fg[k] - c) * i) / (STEPS - 1))));
  const d = fg.map((c, k) => c - bg[k]);
  const dd = d[0] * d[0] + d[1] * d[1] + d[2] * d[2] || 1;
  const index = new Uint8Array(width * height);
  const gif = GIFEncoder();
  const delay = Math.round(1000 / fps);
  for (let i = 0; i < frames; i++) {
    if (signal && signal.aborted) throw new DOMException('Abgebrochen', 'AbortError');
    renderFrame(ctx, i, i / fps);
    const px = ctx.getImageData(0, 0, width, height).data;
    for (let p = 0, q = 0; q < index.length; p += 4, q++) {
      const t = ((px[p] - bg[0]) * d[0] + (px[p + 1] - bg[1]) * d[1] + (px[p + 2] - bg[2]) * d[2]) / dd;
      index[q] = t <= 0 ? 0 : t >= 1 ? STEPS - 1 : Math.round(t * (STEPS - 1));
    }
    gif.writeFrame(index, width, height, i === 0 ? { palette, delay, repeat: 0 } : { delay });
    onProgress && onProgress((i + 1) / frames);
    await tick();
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
const tick = () => new Promise((r) => setTimeout(r, 0));
const hex = (h) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
