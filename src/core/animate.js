// Animation: the type moves along its variable axes (width and/or weight);
// rows keep their start, so letters grow and shrink and the rows reflow.
//   welle  — a wave runs along the rows (each letter a little later)
//   atmen  — all letters widen and narrow together
//   wechsel — letters change their style: the per-letter widths blend into the
//             next variation and back (Schnittmix); rows trade styles (3 Schnitte);
//             the single style swings between its width and the narrowest
// t is in seconds; every mode loops seamlessly after `length` seconds.

import { letterWidths } from './layout.js';

export const ANIM_DEFAULTS = {
  mode: 'welle',         // 'welle' | 'atmen' | 'wechsel'
  axis: 'wdth',          // 'wdth' | 'wght' | 'both'
  amount: 0.6,           // 0..1 of the axis range
  waves: 1.5,            // welle: waves across the frame
  length: 6,             // seconds per loop
  easing: 'smooth',
};

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (k) => k * k * (3 - 2 * k);

// → motion(c, info) for layoutPattern, or null when nothing moves.
export function motionAt(params, anim, t, axes = { wdth: { min: 40, max: 200 }, wght: { min: 75, max: 1000 } }) {
  const a = { ...ANIM_DEFAULTS, ...anim };
  const u = (((t / a.length) % 1) + 1) % 1;            // 0..1 through the loop
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

  if (a.mode === 'atmen') {
    const s = Math.sin(TAU * u);
    return (c) => shiftAxes(c, s);
  }

  if (a.mode === 'wechsel') {
    const k = a.easing === 'linear' ? 1 - Math.abs(2 * u - 1) : smooth(0.5 - 0.5 * Math.cos(TAU * u));   // 0 → 1 → 0
    if (params.pattern === 'letters') {
      return (c, info) => {
        if (info.letter < 0 || !info.map || !info.alt) return c;
        const from = info.map[info.letter % info.map.length], to = info.alt[info.letter % info.alt.length];
        return { wdth: doW ? from + (to - from) * k : c.wdth, wght: doG ? clamp(c.wght - k * spanG, 145, 1000) : c.wght };
      };
    }
    if (params.pattern === 'rows') {
      const styles = params.rowStyles;
      return (c, info) => {
        const n = Math.min(styles.length, info.rows);
        const A = styles[info.row % n], B = styles[(info.row + 1) % n];
        return { wdth: doW ? A.wdth + (B.wdth - A.wdth) * k : c.wdth, wght: doG ? A.wght + (B.wght - A.wght) * k : c.wght };
      };
    }
    // single style: swing towards the far end of the axis and back
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

// Second per-letter mapping for "wechsel" (the next variation of the same seed).
export function altLetters(params, n) {
  return letterWidths(n, { ...params, seed: (params.seed || 1) * 31 + 7 });
}
