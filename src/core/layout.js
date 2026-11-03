// Dachmarke pattern layout: a phrase in capitals, repeated along parallel rows
// that run off the frame edges. Three pattern types, as on the Figma board
// "Dachmarke — DFB Sans Pro" (grafisches Typopattern):
//
//   single  — 1 Schriftschnitt mit Zeilenversatz: one style everywhere, rows
//             shifted against each other (CLUB 100).
//   rows    — 3 Schriftschnitte, 1 Schnitt pro Zeile (max 3 Zeilen): every row
//             in its own width, same size (DEUTSCHER FUSSBALL BUND).
//   letters — Schnittmix pro Buchstabe mit Zeilenversatz: every letter in its
//             own width; the mapping repeats identically in every row; rows
//             start at different points, some inside the frame (FUSSBALLLIEBE).
//
// Rules from the board and the team: capitals only, rows never overlap
// (line height ≥ cap height), rotation only for the whole pattern (−90°,
// reading upwards), the pattern sits in a band of the frame (bottom / right)
// and leaves the rest free for headline and logo.
//
// Layout happens in a "virtual" horizontal frame; a vertical pattern is the
// same layout rotated −90° (virtual bottom = right edge of the frame).
// Output is plain data (no DOM): rows of positioned glyphs with their axes.

import { WIDTHS } from './font.js';
import { stream } from './random.js';
import { logoBox, defaultCenter } from './logo.js';

export const LAYOUT_DEFAULTS = {
  text: 'Fußballliebe',
  pattern: 'single',
  width: 1080, height: 1350,
  orientation: 'horizontal',   // 'horizontal' | 'vertical' (whole pattern −90°)
  size: 0.16,                  // font size as a share of the frame's shorter side
  lineHeight: 0.83,            // row distance in em (never below cap height)
  rows: 4,
  band: 'end',                 // 'end' (bottom / right) | 'start' | 'center' | 'fill'
  margin: 0.06,                // distance of the outer row from the edge, share of the shorter side (negative = bleeds)
  italic: false,
  style: { wdth: 200, wght: 925 },                       // single
  rowStyles: [{ wdth: 200, wght: 925 }, { wdth: 100, wght: 925 }, { wdth: 80, wght: 650 }], // rows
  letterMin: 40, letterMax: 200, letterWght: 925,        // letters
  wideShare: 0.25,             // letters: share of wide letters (Extended / Super Extended)
  wideRun: 1,                  // letters: wide letters in a row at most
  gap: 0,                      // extra space between repeats, em
  shift: 1,                    // 0 = rows aligned, 1 = full offset
  seed: 1,
  ref: null,                   // reference values from Figma ({ xs, letters }); dropped on a new variation
  altMap: null,                // animation 'wechsel': second per-letter mapping (set by the engine)
  logo: null,                  // { on, mode: 'free' | 'over' | 'fit', style, size, cx, cy, ox, oy, pad, snap } (see logo.js)
  blockX: 0,                   // whole pattern sideways, share of the row length (frame width; height when vertical)
  rowShift: null,              // per row slide, share of the row length (1 Schnitt: drag a row in the preview)
};

export const MAX_ROWS_PER_STYLE = 3;   // "max 3 Zeilen" for the rows pattern

export function layoutPattern(font, input, motion = null) {
  const p = { ...LAYOUT_DEFAULTS, ...input };
  const W = p.width, H = p.height, short = Math.min(W, H);
  const vertical = p.orientation === 'vertical';
  const vw = vertical ? H : W, vh = vertical ? W : H;
  const fontSize = Math.max(1, p.size * short);
  const scale = fontSize / font.unitsPerEm;
  const cap = (font.capHeight || 0.69 * font.unitsPerEm) * scale;
  const lh = Math.max(p.lineHeight, (font.capHeight / font.unitsPerEm) + 0.04) * fontSize;   // no overlap
  const it = !!p.italic;

  const phrase = cleanText(p.text);
  const unitText = phrase + ' ';
  const gapPx = p.gap * fontSize;

  // --- rows and baselines --------------------------------------------------------
  let n = Math.max(1, Math.round(p.rows));
  if (p.pattern === 'rows') n = Math.min(n, MAX_ROWS_PER_STYLE);
  let first;
  if (p.band === 'fill') {
    n = Math.ceil((vh + cap) / lh) + 1;
    first = (vh - ((n - 1) * lh + cap)) / 2 + cap;
  } else if (p.band === 'start') first = p.margin * short + cap;
  else if (p.band === 'center') first = (vh - ((n - 1) * lh + cap)) / 2 + cap;
  else first = vh - p.margin * short - (n - 1) * lh;

  // --- styles ----------------------------------------------------------------------
  const words = phrase.split(' ').map((w) => w.length);
  const letterCount = words.reduce((a, b) => a + b, 0);
  const letterMap = p.pattern === 'letters'
    ? (validRef(p.ref && p.ref.letters, letterCount) || letterWidths(letterCount, p, words))
    : null;
  const styleOf = (row, li) => {
    if (p.pattern === 'rows') return p.rowStyles[row % p.rowStyles.length];
    if (p.pattern === 'letters') return { wdth: li >= 0 ? letterMap[li % letterMap.length] : 100, wght: p.letterWght };
    return p.style;
  };

  // --- shape one unit (phrase + space) per row --------------------------------------
  // Each glyph takes its advance from a shaping of the whole unit at its own
  // instance, so kerning matches its style.
  function shapeUnit(row, withMotion) {
    const glyphs = [];
    let li = 0, x = 0;
    const base = font.run(unitText, styleOf(row, 0), it);
    const runs = new Map();
    for (let gi = 0; gi < base.length; gi++) {
      const isSpace = /^\s*$/.test(base[gi].chars);
      const letter = isSpace ? -1 : li++;
      const c = styleOf(row, letter);
      const k = c.wdth + ',' + c.wght;
      if (!runs.has(k)) runs.set(k, font.run(unitText, c, it));
      const own = runs.get(k);
      const g = own.length === base.length ? own[gi] : base[gi];
      glyphs.push({ id: g.id, chars: g.chars, c, x, advance: g.advance * scale, letter, space: isSpace });
      x += g.advance * scale;
    }
    return { glyphs, length: x + gapPx };
  }

  // --- row offsets (seeded) ---------------------------------------------------------
  const units = Array.from({ length: n }, (_, r) => shapeUnit(r, false));
  const starts = rowStarts(n, units.map((u) => u.length), vw, p);

  // Block offset (whole pattern sideways) and per-row slide, share of the row length.
  const bx = (p.blockX || 0) * vw;
  const rowShift = (r) => ((p.rowShift && p.rowShift[r]) || 0) * vw;

  // --- band of the pattern (frame px) and the logo ---------------------------------------
  const vTop = Math.max(0, first - cap), vBottom = Math.min(vh, first + (n - 1) * lh);
  const bandBox = vertical
    ? { x: vTop, y: 0, w: vBottom - vTop, h: H }
    : { x: 0, y: vTop, w: W, h: vBottom - vTop };
  // band centre follows the block offset (vertical: virtual x → frame −y)
  const bandCenter = vertical
    ? { x: bandBox.x + bandBox.w / 2, y: H / 2 - bx }
    : { x: W / 2 + bx, y: bandBox.y + bandBox.h / 2 };
  const logo = p.logo && p.logo.on
    ? logoBox(p.logo, W, H, defaultCenter(p.logo.mode, p.logo.size, { width: W, height: H, rotate: vertical, bandBox }), bandCenter)
    : null;
  // "In der Typo": rows that cross the plate open up around it (virtual coordinates).
  // The gap is measured on the ink of the letters (not their advance boxes), the
  // same on both sides: 22 px at 70 px in Figma "Organisation" (0.31 em).
  let hole = null;
  if (logo && logo.mode === 'fit') {
    const hx = vertical ? H - (logo.y + logo.size) : logo.x;
    const hy = vertical ? logo.x : logo.y;
    hole = { l: hx, r: hx + logo.size, t: hy, b: hy + logo.size, pad: (p.logo.pad ?? 0.31) * fontSize, snap: p.logo.snap !== false };
  }
  const inkL = (g, x) => { const b = font.bounds(g.id, g.c, it); return b ? x + b.xMin * scale : x; };
  const inkR = (g, x, adv) => { const b = font.bounds(g.id, g.c, it); return b ? x + b.xMax * scale : x + adv; };

  // --- place --------------------------------------------------------------------------
  const rows = [];
  let prevGap = null;            // word gap used by the row above (opened rows alternate)
  for (let r = 0; r < n; r++) {
    const baseline = first + r * lh;
    if (baseline - cap > vh + lh || baseline < -lh) { rows.push({ baseline, glyphs: [] }); continue; }
    const L = units[r].length;
    let x = starts[r] + bx + rowShift(r);
    // tiled rows never start inside the frame (Schnittmix rows may: ragged start)
    if (p.pattern !== 'letters' && x > 0) x -= Math.ceil(x / L) * L;
    const holeHere = hole && baseline > hole.t && baseline - cap < hole.b ? hole : null;
    if (holeHere) x -= 2 * L;                       // extra row on the left: the left part may move right
    // the row as one sequence (spaces kept for the logo split)
    const seq = [];
    let rep = 0;
    const end = vw + (holeHere ? 2 * L + (holeHere.r - holeHere.l) : 0);
    while (x < end) {
      let gx = x;
      for (const g of units[r].glyphs) {
        let c = g.c, adv = g.advance;
        if (motion) {
          c = motion(g.c, { row: r, letter: g.letter, rep, x: gx / vw, rows: n, map: letterMap, alt: p.altMap });
          if (c !== g.c) adv = font.advance(g.id, c, it) * scale + (g.advance - font.advance(g.id, g.c, it) * scale);
        }
        seq.push({ id: g.id, chars: g.chars, x: gx, c: font.norm(c), letter: g.letter, space: g.space, adv });
        gx += adv;
      }
      x = motion ? gx + gapPx : x + L;
      rep++;
      if (rep > 4000) break;
    }
    const opened = holeHere ? openAround(seq, holeHere, rowShift(r) ? null : prevGap) : null;   // a row moved by hand keeps the gap it was moved to
    if (opened) prevGap = rowShift(r) ? null : opened.word;           // alternate only between rows nobody moved
    const glyphs = [];
    for (const g of seq) if (!g.space && g.x + g.adv > -fontSize && g.x < vw + fontSize) glyphs.push({ id: g.id, chars: g.chars, x: g.x, c: g.c, letter: g.letter });
    rows.push({ baseline, glyphs, opened });
  }

  // Split the row at the logo: the part before ends (ink) `pad` before the plate,
  // the part after starts (ink) `pad` after it. With `snap` the split is a word
  // space, so no word is cut: the one nearest to the plate's centre — but a
  // different word gap than the row above, when there is one within reach (as
  // in Figma "Organisation": 00 ▢ CL / UB ▢ 10). Without `snap`, the first letter
  // that would touch the plate and everything after it move behind the plate.
  // Returns { word, prev, next, cur }: the gap used (letter index before it) and how
  // far the row has to move (px, virtual) to open at the previous / next / this gap.
  function openAround(seq, h, avoid) {
    const hc = (h.l + h.r) / 2;
    let s = -1, prev = null, next = null;
    if (h.snap) {
      const spaces = [];
      seq.forEach((g, i) => { if (g.space) spaces.push(i); });
      // one entry per gap (several spaces in a row = one gap): centre + the letter before it
      const gaps = [];
      for (const i of spaces) {
        if (gaps.length && gaps[gaps.length - 1].last === i - 1) { gaps[gaps.length - 1].last = i; continue; }
        let k = i - 1; while (k >= 0 && seq[k].space) k--;
        gaps.push({ first: i, last: i, word: k >= 0 ? seq[k].letter : -1 });
      }
      for (const gp of gaps) gp.c = (seq[gp.first].x + seq[gp.last].x + seq[gp.last].adv) / 2;
      if (gaps.length) {
        let bi = 0;
        gaps.forEach((gp, i) => { if (Math.abs(gp.c - hc) < Math.abs(gaps[bi].c - hc)) bi = i; });
        if (avoid != null && gaps[bi].word === avoid) {
          // the nearest other kind of gap, if it is not much further away than a word
          let alt = -1;
          gaps.forEach((gp, i) => { if (gp.word !== avoid && (alt < 0 || Math.abs(gp.c - hc) < Math.abs(gaps[alt].c - hc))) alt = i; });
          if (alt >= 0 && Math.abs(gaps[alt].c - hc) < Math.abs(gaps[bi].c - hc) + 0.8 * fontSize * 4) bi = alt;
        }
        s = gaps[bi].first;
        // moving the row by (hc − gap centre) puts a gap right at the plate centre
        if (bi > 0) prev = hc - gaps[bi - 1].c;
        if (bi < gaps.length - 1) next = hc - gaps[bi + 1].c;
        var word = gaps[bi].word, lastSpace = gaps[bi].last, cur = hc - gaps[bi].c;
      }
    }
    let leftEnd, rightStart;
    if (s >= 0) {
      leftEnd = s - 1; rightStart = lastSpace + 1;
      while (leftEnd >= 0 && seq[leftEnd].space) leftEnd--;
      while (rightStart < seq.length && seq[rightStart].space) rightStart++;
    } else {
      rightStart = seq.findIndex((g) => !g.space && inkR(g, g.x, g.adv) > h.l - h.pad && inkL(g, g.x) < h.r + h.pad);
      if (rightStart < 0) return { word: null, prev: null, next: null };
      leftEnd = rightStart - 1;
      while (leftEnd >= 0 && seq[leftEnd].space) leftEnd--;
    }
    const dL = leftEnd >= 0 && s >= 0 ? (h.l - h.pad) - inkR(seq[leftEnd], seq[leftEnd].x, seq[leftEnd].adv) : 0;
    const dR = rightStart < seq.length ? (h.r + h.pad) - inkL(seq[rightStart], seq[rightStart].x) : 0;
    for (let i = 0; i < seq.length; i++) {
      if (i <= leftEnd) seq[i].x += dL;
      else if (i >= rightStart) seq[i].x += dR;
      else seq[i].space = true;                      // the split space itself
    }
    return { word: s >= 0 ? word : null, prev, next, cur: s >= 0 ? cur : 0 };
  }

  return {
    width: W, height: H, vw, vh,
    rotate: vertical ? -90 : 0,
    fontSize, scale, italic: it,
    phrase,
    rows,
    letterMap,
    starts,
    bandBox,
    bandCenter,
    logo,
  };
}

// Capitals (ß → SS as on the board: FUSSBALL), single spaces.
export function cleanText(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim().toUpperCase();
  return t || 'DFB';
}

function validRef(arr, n) {
  return Array.isArray(arr) && arr.length === n ? arr.slice() : null;
}

// Start of each row in px (virtual frame). Reference values (from Figma) win;
// otherwise seeded:
//   tiled patterns: rows step sideways by irregular amounts (0.25–0.5 of a
//     repeat), always in one direction, as in CLUB 100;
//   letters: each row starts somewhere between ~0.65 frame widths left of the
//     edge and 0.3 inside it; neighbours at least 0.12 frame widths apart.
export function rowStarts(n, lengths, vw, p) {
  if (p.ref && Array.isArray(p.ref.xs) && p.ref.xs.length >= n) return p.ref.xs.slice(0, n).map((f) => f * vw);
  const R = stream(p.seed, 'rows');
  const out = [];
  if (p.pattern === 'letters') {
    const lo = -0.65, hi = 0.3;
    let prev = null;
    for (let i = 0; i < n; i++) {
      let u = 0;
      for (let k = 0; k < 12; k++) {
        u = R.range(lo, hi);
        if (prev == null || Math.abs(u - prev) >= 0.12) break;
      }
      prev = u;
      out.push(u * p.shift * vw);
    }
    return out;
  }
  const dir = R() < 0.5 ? -1 : 1;
  let phase = R() * p.shift;
  for (let i = 0; i < n; i++) {
    out.push(-(((phase % 1) + 1) % 1) * lengths[i]);
    phase += dir * p.shift * R.range(0.25, 0.5);
  }
  return out;
}

// Width per letter for the letters pattern (seeded). Rules from the approved
// DFB Sans Pro example (Figma "A4 - 35", FUSSBALLLIEBE, node 47:5393):
//   levels   Compressed 40, Compact 60, Condensed 80, normal 100, Wide 133,
//            Super Extended 200 (Extended 166 is not used), inside [letterMin, letterMax]
//   wide     = Wide or wider; at most round(n × wideShare) of them, at least one
//            in words of 3+ letters, never more than `wideRun` next to each other
//   super    = the widest level (Super Extended): at most one per word, the
//            other wide letters take the next wide level (Wide)
//   others   weighted like the example: normal and Compact most often,
//            Condensed and Compressed now and then; never 3× the same in a row
// `words` = letter counts per word (FUSSBALL LIEBE → [8, 5]).
export const LETTER_LEVELS = [40, 60, 80, 100, 133, 200];

export function letterWidths(n, p, words = [n]) {
  if (n <= 0) return [];
  const R = stream(p.seed, 'letters');
  const lo = Math.min(p.letterMin, p.letterMax), hi = Math.max(p.letterMin, p.letterMax);
  let levels = LETTER_LEVELS.filter((w) => w >= lo && w <= hi);
  if (!levels.length) levels = [WIDTHS.map((w) => w.wdth).reduce((a, b) => (Math.abs(b - (lo + hi) / 2) < Math.abs(a - (lo + hi) / 2) ? b : a))];
  const wideCut = levels.some((w) => w >= 133) ? 133 : levels[levels.length - 1];
  const wide = levels.filter((w) => w >= wideCut);
  const narrow = levels.filter((w) => w < wideCut);
  const top = wide[wide.length - 1], second = wide.length > 1 ? wide[wide.length - 2] : top;
  const out = new Array(n).fill(null);
  const wordOf = [];
  words.forEach((len, wi) => { for (let k = 0; k < len; k++) wordOf.push(wi); });
  while (wordOf.length < n) wordOf.push(words.length - 1);

  const want = narrow.length ? Math.min(n, Math.max(n >= 3 ? 1 : 0, Math.round(n * p.wideShare))) : n;
  const run = Math.max(1, Math.round(p.wideRun));
  const order = Array.from({ length: n }, (_, i) => i).sort(() => R() - 0.5);
  const runAt = (i) => {
    let a = i, b = i;
    while (a - 1 >= 0 && out[a - 1] != null && out[a - 1] >= wideCut) a--;
    while (b + 1 < n && out[b + 1] != null && out[b + 1] >= wideCut) b++;
    return b - a + 1;
  };
  const hasTop = new Set();
  let placed = 0;
  for (const i of order) {
    if (placed >= want) break;
    const w = wordOf[i];
    out[i] = !hasTop.has(w) || !narrow.length ? top : second;
    if (runAt(i) > run) { out[i] = null; continue; }
    if (out[i] === top) hasTop.add(w);
    placed++;
  }
  const weight = (w) => (w === 100 || w === 60 ? 3 : 1);
  for (let i = 0; i < n; i++) {
    if (out[i] != null) continue;
    const p1 = i > 0 ? out[i - 1] : null, p2 = i > 1 ? out[i - 2] : null;
    let pool = narrow.filter((w) => !(w === p1 && w === p2));
    if (!pool.length) pool = narrow.length ? narrow : levels;
    const total = pool.reduce((s, w) => s + weight(w), 0);
    let r = R() * total;
    out[i] = pool.find((w) => (r -= weight(w)) < 0) ?? pool[0];
  }
  return out;
}

// "Neue Variante" for 1 Schnitt and 3 Schnitte: new styles inside the rules
// of the board — heavy styles only (Bold, Black; the examples use nothing lighter);
// 3 Schnitte: three clearly different widths, one wide (Wide or wider), one
// middle (Condensed / normal), one narrow (Compressed / Compact), in any order.
export function variantStyles(pattern, seed) {
  const R = stream(seed, 'styles');
  const heavy = () => (R() < 0.7 ? 925 : 650);
  if (pattern === 'single') return { style: { wdth: R.pick([40, 60, 80, 100, 133, 166, 200]), wght: heavy() } };
  if (pattern === 'rows') {
    const rows = [
      { wdth: R.pick([133, 166, 200, 200]), wght: heavy() },
      { wdth: R.pick([80, 100]), wght: heavy() },
      { wdth: R.pick([40, 60]), wght: heavy() },
    ].sort(() => R() - 0.5);
    return { rowStyles: rows };
  }
  return {};
}
