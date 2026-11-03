import { LOGO_PATH, LOGO_VIEWBOX } from '../core/logo.js';

// Draw a layout model straight onto a 2D canvas (animation preview, video
// frames, PNG export, thumbnails). `k` scales frame pixels to canvas pixels.

export function drawModel(ctx, model, font, { color, background, k = 1 }) {
  const { width, height } = model;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); }
  else ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width * k, height * k);
  ctx.clip();
  ctx.fillStyle = color;
  const s = model.scale * k;
  for (const row of model.rows) {
    for (const g of row.glyphs) {
      const path = glyphPath(font, g.id, g.c, model.italic);
      if (!path) continue;
      const vx = g.x * k, vy = row.baseline * k;
      // vertical: virtual (x, y) → frame (y, H − x), i.e. turned −90°
      if (model.rotate) ctx.setTransform(0, -s, s, 0, vy, height * k - vx);
      else ctx.setTransform(s, 0, 0, s, vx, vy);
      ctx.fill(path);
    }
  }
  ctx.restore();
  if (model.logo) drawLogo(ctx, model.logo, k);
}

let logoPath = null;
function drawLogo(ctx, b, k) {
  ctx.setTransform(k, 0, 0, k, b.x * k, b.y * k);
  if (b.plateColor) {
    ctx.fillStyle = b.plateColor;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, 0, b.size, b.size, b.radius); else ctx.rect(0, 0, b.size, b.size);
    ctx.fill();
  }
  if (!logoPath) logoPath = new Path2D(LOGO_PATH);
  const off = (b.size - b.mark) / 2, s = b.mark / LOGO_VIEWBOX;
  ctx.setTransform(k * s, 0, 0, k * s, (b.x + off) * k, (b.y + off) * k);
  ctx.fillStyle = b.markColor;
  ctx.fill(logoPath);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

const paths = new Map();
function glyphPath(font, id, c, italic) {
  const key = id + '@' + c.wdth + ',' + c.wght + (italic ? 'i' : '');
  let p = paths.get(key);
  if (p === undefined) {
    const cmds = font.outline(id, c, italic);
    p = null;
    if (cmds.length) {
      p = new Path2D();
      for (const { command, args: a } of cmds) {
        switch (command) {
          case 'moveTo': p.moveTo(a[0], -a[1]); break;
          case 'lineTo': p.lineTo(a[0], -a[1]); break;
          case 'quadraticCurveTo': p.quadraticCurveTo(a[0], -a[1], a[2], -a[3]); break;
          case 'bezierCurveTo': p.bezierCurveTo(a[0], -a[1], a[2], -a[3], a[4], -a[5]); break;
          case 'closePath': p.closePath(); break;
        }
      }
    }
    if (paths.size > 40000) paths.clear();
    paths.set(key, p);
  }
  return p;
}
