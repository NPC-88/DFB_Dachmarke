// Animation, as in the national-team tool: "Punkte" (keyframes) are marked in
// the tool; the pattern moves from point to point. On top, an optional effect
// moves the type along its variable axes.
//
//   anim = { moments: [{ params }], durations: [s…], easing, loop,
//            effect, axis, amount, waves, cycles, length }
//
// What blends between points (everything continuous):
//   styles (width / weight of 1 Schnitt, of each row, per letter in Schnittmix
//   — Schnittmix letters change width letter by letter), font size, line
//   spacing, margin, spacing between repeats and the start of every row (rows
//   slide). What stays as in the tool: text, pattern, direction, position,
//   number of rows, italic, format.
//
// Effects (loop seamlessly over the whole animation):
//   welle   — a wave runs along the rows (each letter a little later)
//   atmen   — all letters widen and narrow together
//   wechsel — letters change their style and back (Schnittmix: to another
//             variation; 3 Schnitte: rows trade styles; 1 Schnitt: the style
//             swings towards the far end of the axis)
// Pure math, no DOM.

import { letterWidths } from './layout.js';

export const ANIM_DEFAULTS = {
  moments: [],          // [{ params }] — snapshots of the tool
  durations: [],        // seconds from point i to the next (the last one leads back to the first)
  easing: 'smooth',     // 'smooth' | 'linear'
  loop: 'loop',         // 'loop' (… → last → first) | 'pingpong' (… → last → … → first)
  effect: 'none',       // 'none' | 'welle' | 'atmen' | 'wechsel'
  axis: 'wdth',         // effect axis: 'wdth' | 'wght' | 'both'
  amount: 0.6,          // effect: 0..1 of the axis range
  waves: 1.5,           // welle: waves across the frame
  cycles: 1,            // effect repetitions per loop (when there are points)
  length: 6,            // seconds, used when there are fewer than two points
};

// Structure: always taken from the tool, never blended.
export const STRUCTURE = ['text', 'pattern', 'orientation', 'band', 'rows', 'italic', 'width', 'height'];

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => k * k * (3 - 2 * k);
const ease = (k, kind) => (kind === 'linear' ? k : smooth(k));

export function normalizeAnim(anim) {
  const a = { ...ANIM_DEFAULTS, ...(anim || {}) };
  if (anim && anim.mode && !anim.effect) a.effect = anim.mode;   // first version stored `mode`
  delete a.mode;
  return a;
}

// Total loop length in seconds.
export function animLength(anim) {
  const a = normalizeAnim(anim);
  const n = a.moments.length;
  if (n < 2) return a.length;
  const d = (i) => Math.max(0.1, a.durations[i] ?? 2);
  let s = 0;
  if (a.loop === 'pingpong') { for (let i = 0; i < n - 1; i++) s += d(i); return 2 * s; }
  for (let i = 0; i < n; i++) s += d(i);
  return s;
}

// Which two points and how far between them at time t → [i, j, k].
export function segmentAt(anim, t) {
  const a = normalizeAnim(anim);
  const n = a.moments.length;
  if (n === 0) return null;
  if (n === 1) return [0, 0, 0];
  const L = animLength(a);
  const u = ((t % L) + L) % L;
  const d = (i) => Math.max(0.1, a.durations[i] ?? 2);
  const segs = [];
  if (a.loop === 'pingpong') {
    for (let i = 0; i < n - 1; i++) segs.push([i, i + 1, d(i)]);
    for (let i = n - 1; i > 0; i--) segs.push([i, i - 1, d(i - 1)]);
  } else for (let i = 0; i < n; i++) segs.push([i, (i + 1) % n, d(i)]);
  let acc = 0;
  for (const [i, j, len] of segs) {
    if (u <= acc + len) return [i, j, ease(clamp((u - acc) / len, 0, 1), a.easing)];
    acc += len;
  }
  const last = segs[segs.length - 1];
  return [last[0], last[1], 1];
}

// The params of one point, on the tool's structure.
export function momentParams(params, moment) {
  const out = { ...moment.params };
  for (const k of STRUCTURE) out[k] = params[k];
  return out;
}

// Blend two resolved points. `ra`/`rb` = { xs, letters } of each point (row
// starts as share of the frame, per-letter widths), from the layout.
export function blendParams(A, B, ra, rb, k) {
  const out = { ...(k < 0.5 ? A : B) };
  for (const key of ['size', 'lineHeight', 'margin', 'gap', 'letterWght']) {
    if (typeof A[key] === 'number' && typeof B[key] === 'number') out[key] = lerp(A[key], B[key], k);
  }
  const bc = (x, y) => ({ wdth: lerp(x.wdth, y.wdth, k), wght: lerp(x.wght, y.wght, k) });
  if (A.style && B.style) out.style = bc(A.style, B.style);
  if (A.rowStyles && B.rowStyles) out.rowStyles = A.rowStyles.map((s, i) => bc(s, B.rowStyles[i] || s));
  const xs = ra.xs.map((x, i) => lerp(x, rb.xs[i] ?? x, k));
  const letters = ra.letters && rb.letters && ra.letters.length === rb.letters.length
    ? ra.letters.map((w, i) => lerp(w, rb.letters[i], k)) : (k < 0.5 ? ra.letters : rb.letters);
  out.ref = { xs, ...(letters ? { letters } : {}) };
  return out;
}

// → motion(c, info) for layoutPattern, or null when no effect is on.
export function motionAt(params, anim, t, axes = { wdth: { min: 40, max: 200 }, wght: { min: 75, max: 1000 } }) {
  const a = normalizeAnim(anim);
  if (!a.effect || a.effect === 'none') return null;
  const L = animLength(a);
  const reps = a.moments.length >= 2 ? Math.max(1, Math.round(a.cycles)) : 1;
  const u = ((((t / L) * reps) % 1) + 1) % 1;            // 0..1 through one effect cycle
  const doW = a.axis !== 'wght', doG = a.axis !== 'wdth';
  const spanW = (axes.wdth.max - axes.wdth.min) * a.amount;
  const spanG = (900 - 400) * a.amount;                  // keep weight inside readable styles

  // Swing around the style by ±span/2; a style near the end of an axis swings
  // inwards instead (the whole range moves inside the axis), so it always moves.
  const swing = (v, s, span, lo, hi) => {
    let mid = v;
    if (mid + span / 2 > hi) mid = hi - span / 2;
    if (mid - span / 2 < lo) mid = lo + span / 2;
    return clamp(mid + (s * span) / 2, lo, hi);
  };
  const shiftAxes = (c, s) => ({                          // s in −1..1
    wdth: doW ? swing(c.wdth, s, spanW, axes.wdth.min, axes.wdth.max) : c.wdth,
    wght: doG ? swing(c.wght, s, spanG, 145, 1000) : c.wght,
  });

  if (a.effect === 'atmen') {
    const s = Math.sin(TAU * u);
    return (c) => shiftAxes(c, s);
  }

  if (a.effect === 'wechsel') {
    const k = smooth(0.5 - 0.5 * Math.cos(TAU * u));    // 0 → 1 → 0
    if (params.pattern === 'letters') {
      return (c, info) => {
        if (info.letter < 0 || !info.alt) return c;
        const to = info.alt[info.letter % info.alt.length];
        return { wdth: doW ? c.wdth + (to - c.wdth) * k : c.wdth, wght: doG ? clamp(c.wght - k * spanG, 145, 1000) : c.wght };
      };
    }
    if (params.pattern === 'rows') {
      const styles = params.rowStyles;
      return (c, info) => {
        const n = Math.min(styles.length, info.rows);
        const B = styles[(info.row + 1) % n];
        return { wdth: doW ? c.wdth + (B.wdth - c.wdth) * k : c.wdth, wght: doG ? c.wght + (B.wght - c.wght) * k : c.wght };
      };
    }
    return (c) => {
      const down = c.wdth - axes.wdth.min > axes.wdth.max - c.wdth;
      const gDown = c.wght > 600;
      return {
        wdth: doW ? clamp(c.wdth + (down ? -1 : 1) * k * spanW, axes.wdth.min, axes.wdth.max) : c.wdth,
        wght: doG ? clamp(c.wght + (gDown ? -1 : 1) * k * spanG, 145, 1000) : c.wght,
      };
    };
  }

  // welle
  return (c, info) => shiftAxes(c, Math.sin(TAU * (u - info.x * a.waves / 2 - info.row * 0.11)));
}

// Second per-letter mapping for "wechsel" (another variation of the same seed).
export function altLetters(params, n, words) {
  return letterWidths(n, { ...params, seed: (params.seed || 1) * 31 + 7 }, words);
}
