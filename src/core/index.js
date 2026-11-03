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
import { motionAt, altLetters, ANIM_DEFAULTS } from './animate.js';

export { WIDTHS, WEIGHTS, styleName } from './font.js';
export { LAYOUT_DEFAULTS, MAX_ROWS_PER_STYLE, letterWidths, cleanText } from './layout.js';
export { PALETTE, COLOR_PAIRS, FORMATS, PRESETS, TEXT_SUGGESTIONS, DEFAULT_FORMAT } from './presets.js';
export { ANIM_DEFAULTS, motionAt } from './animate.js';
export { newSeed } from './random.js';

const bytes = (b) => (b instanceof Uint8Array ? b : new Uint8Array(b));

export function createEngine(uprightBytes, italicBytes) {
  const font = createFont(fontkit.create(bytes(uprightBytes)), italicBytes ? fontkit.create(bytes(italicBytes)) : null);
  const layout = (params) => layoutPattern(font, params);
  return {
    font,
    layout,
    svg: (model, opts) => toSVG(model, font, opts),
    frame(params, anim, t) {
      const p = { ...LAYOUT_DEFAULTS, ...params };
      const a = { ...ANIM_DEFAULTS, ...anim };
      if (a.mode === 'wechsel' && p.pattern === 'letters') {
        const n = [...cleanText(p.text)].filter((ch) => !/\s/.test(ch)).length;
        p.altMap = altLetters(p, n);
      }
      return layoutPattern(font, p, motionAt(p, a, t, font.axes));
    },
  };
}
