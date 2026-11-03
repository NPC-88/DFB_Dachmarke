// Public entry of the Dachmarke pattern engine. No DOM anywhere in core/, so
// the same engine runs in the browser and in Node (tests).
//
//   const engine = createEngine(uprightBytes, italicBytes);
//   const model  = engine.layout(params);            // plain data
//   const svg    = engine.svg(model, { color, mode: 'outlines' | 'text' });
//   const frame  = engine.frame(params, anim, t);    // model at time t (animation)

import * as fontkit from 'fontkit';
import { createFont } from './font.js';
import { layoutPattern, LAYOUT_DEFAULTS, cleanText } from './layout.js';
import { toSVG } from './svg.js';
import { motionAt, altLetters, normalizeAnim, segmentAt, momentParams, blendParams } from './animate.js';

export { WIDTHS, WEIGHTS, styleName } from './font.js';
export { LAYOUT_DEFAULTS, MAX_ROWS_PER_STYLE, letterWidths, variantStyles, LETTER_LEVELS, cleanText } from './layout.js';
export { PALETTE, COLOR_PAIRS, FORMATS, PRESETS, TEXT_SUGGESTIONS, DEFAULT_FORMAT } from './presets.js';
export { ANIM_DEFAULTS, STRUCTURE, motionAt, animLength, normalizeAnim, segmentAt } from './animate.js';
export { newSeed } from './random.js';

const bytes = (b) => (b instanceof Uint8Array ? b : new Uint8Array(b));

export function createEngine(uprightBytes, italicBytes) {
  const font = createFont(fontkit.create(bytes(uprightBytes)), italicBytes ? fontkit.create(bytes(italicBytes)) : null);
  const layout = (params) => layoutPattern(font, params);

  // Row starts (share of the frame) and per-letter widths of one point, cached.
  const resolved = new Map();
  function resolve(p) {
    const key = JSON.stringify(p);
    let r = resolved.get(key);
    if (!r) {
      const m = layout(p);
      r = { xs: m.starts.map((x) => x / m.vw), letters: m.letterMap };
      if (resolved.size > 200) resolved.clear();
      resolved.set(key, r);
    }
    return r;
  }

  function frameArgs(params, anim, t) {
    let p = { ...LAYOUT_DEFAULTS, ...params };
    const a = normalizeAnim(anim);
    const seg = segmentAt(a, t);
    if (seg) {
      const [i, j, k] = seg;
      const A = { ...LAYOUT_DEFAULTS, ...momentParams(p, a.moments[i]) };
      const B = { ...LAYOUT_DEFAULTS, ...momentParams(p, a.moments[j]) };
      p = { ...p, ...blendParams(A, B, resolve(A), resolve(B), k) };
    }
    if (a.effect === 'wechsel' && p.pattern === 'letters') {
      const words = cleanText(p.text).split(' ').map((w) => w.length);
      p.altMap = altLetters(p, words.reduce((x, y) => x + y, 0), words);
    }
    return [p, motionAt(p, a, t, font.axes)];
  }
  return {
    font,
    layout,
    svg: (model, opts) => toSVG(model, font, opts),
    // Model at time t: points blended (if any), then the effect (if any).
    frame(params, anim, t) {
      return layoutPattern(font, ...frameArgs(params, anim, t));
    },
    // Params of the pattern at time t (points blended), for previews of a point.
    paramsAt: (params, anim, t) => frameArgs(params, anim, t)[0],
  };
}
