// SVG export of a layout model, in the pattern colour (optionally with the
// background as its own layer).
//
// mode 'outlines': one <path> per row, glyphs outlined at their exact width
//                  and weight. Looks the same everywhere, needs no font.
// mode 'text':     live <text>, one <tspan> per style change. Editable; renders
//                  right only where DFB Sans Pro is installed. Every tspan names
//                  the matching static family first (e.g. "DFB Sans Pro Static
//                  SupEx Black" + italic), then "DFB Sans Pro Static" with
//                  font-weight / font-stretch, then the variable "DFB Sans Pro"
//                  with font-variation-settings.

import { staticFace, styleName } from './font.js';
import { logoSVG } from './logo.js';

export function toSVG(model, font, { color = '#000000', background = null, mode = 'outlines', title = 'DFB Pattern', precision = 2 } = {}) {
  const { width, height } = model;
  const ids = uniqueIds();
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  out.push(`<title>${esc(title)}</title>`);
  out.push(`<defs><clipPath id="frame"><rect width="${width}" height="${height}"/></clipPath></defs>`);
  if (background) out.push(`<rect id="${ids('Hintergrund')}" width="${width}" height="${height}" fill="${background}"/>`);
  const turn = model.rotate ? ` transform="matrix(0 -1 1 0 0 ${num(height, precision)})"` : '';
  out.push(`<g id="${ids(mode === 'text' ? 'Muster_Text' : 'Muster')}" fill="${color}" clip-path="url(#frame)">`);
  out.push(`<g${turn}>`);

  model.rows.forEach((row, ri) => {
    if (!row.glyphs.length) return;
    const name = 'Zeile_' + String(ri + 1).padStart(2, '0');
    if (mode === 'text') out.push(textRow(row, model, ids(name), precision));
    else {
      const d = rowPath(row, model, font, precision);
      if (d) out.push(`<path id="${ids(name)}" d="${d}"/>`);
    }
  });

  out.push('</g>', '</g>');
  if (model.logo) out.push(logoSVG(model.logo));
  out.push('</svg>');
  return out.join('\n');
}

// All glyphs of a row as one path, in virtual-frame pixels (the group turns them).
export function rowPath(row, model, font, precision = 2) {
  const parts = [];
  const s = model.scale;
  for (const g of row.glyphs) {
    const cmds = font.outline(g.id, g.c, model.italic);
    if (!cmds.length) continue;
    const X = (v) => num(g.x + v * s, precision);
    const Y = (v) => num(row.baseline - v * s, precision);
    for (const { command, args } of cmds) {
      switch (command) {
        case 'moveTo': parts.push('M' + X(args[0]) + ' ' + Y(args[1])); break;
        case 'lineTo': parts.push('L' + X(args[0]) + ' ' + Y(args[1])); break;
        case 'quadraticCurveTo': parts.push('Q' + X(args[0]) + ' ' + Y(args[1]) + ' ' + X(args[2]) + ' ' + Y(args[3])); break;
        case 'bezierCurveTo': parts.push('C' + X(args[0]) + ' ' + Y(args[1]) + ' ' + X(args[2]) + ' ' + Y(args[3]) + ' ' + X(args[4]) + ' ' + Y(args[5])); break;
        case 'closePath': parts.push('Z'); break;
      }
    }
  }
  return parts.join('');
}

function textRow(row, model, id, precision) {
  const out = [`<text id="${id}" xml:space="preserve" font-size="${num(model.fontSize, 3)}" y="${num(row.baseline, precision)}">`];
  // consecutive glyphs of the same style → one tspan with an x per character
  let group = [];
  const flush = () => {
    if (!group.length) return;
    const c = group[0].c;
    const chars = [], xs = [];
    for (const g of group) {
      const cs = [...g.chars];
      cs.forEach((ch, k) => { chars.push(ch); xs.push(num(g.x, precision)); });
    }
    const f = staticFace(c);
    const wd = Math.round(c.wdth), wg = Math.round(c.wght);
    out.push(`<tspan x="${xs.join(' ')}" font-family="'${f.family}', 'DFB Sans Pro Static', 'DFB Sans Pro'" data-style="${esc(styleName(c, model.italic))}" font-weight="${f.weight}" font-style="${model.italic ? 'italic' : 'normal'}" font-stretch="${f.stretch}" style="font-variation-settings:'wdth' ${wd},'wght' ${wg}">${esc(chars.join(''))}</tspan>`);
    group = [];
  };
  let prev = null;
  for (const g of row.glyphs) {
    const same = prev && prev.c.wdth === g.c.wdth && prev.c.wght === g.c.wght;
    if (!same) flush();
    group.push(g);
    prev = g;
  }
  flush();
  out.push('</text>');
  return out.join('');
}

// XML ids must be unique NCNames; Figma and Illustrator show them as layer names.
function uniqueIds() {
  const seen = new Map();
  return (raw) => {
    let id = String(raw).normalize('NFC').replace(/[^\p{L}\p{N}_.-]+/gu, '_').replace(/^[^\p{L}_]/u, '_$&') || '_';
    const n = seen.get(id) || 0;
    seen.set(id, n + 1);
    return n ? `${id}_${n + 1}` : id;
  };
}

function num(v, p) { const s = v.toFixed(p); return s.includes('.') ? s.replace(/\.?0+$/, '') || '0' : s; }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
