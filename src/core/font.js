// DFB Sans Pro adapter around two fontkit fonts (upright + italic), both
// variable on two axes: wdth 40–200 and wght 75–1000. The engine only talks to
// this interface: shaped runs, advances and outlines at any (wdth, wght).
//
// Coordinates are rounded (wdth to 1, wght to 5 units) so instance and path
// caches stay small even while an animation sweeps through the axes.

// Named instances of the font (fvar), used as the style choices in the tool and
// for the static fonts designers have installed (live-text SVG export).
export const WIDTHS = [
  { wdth: 40, name: 'Compressed' },
  { wdth: 60, name: 'Compact' },
  { wdth: 80, name: 'Condensed' },
  { wdth: 100, name: '' },
  { wdth: 133, name: 'Wide' },
  { wdth: 166, name: 'Extended' },
  { wdth: 200, name: 'Super Extended' },
];
export const WEIGHTS = [
  { wght: 145, name: 'Light', css: 200 },
  { wght: 400, name: 'Regular', css: 400 },
  { wght: 650, name: 'Bold', css: 700 },
  { wght: 925, name: 'Black', css: 900 },
];

// "Super Extended Black Italic", "Black", "Regular Italic" … (static style name)
export function styleName({ wdth, wght }, italic) {
  const w = nearest(WIDTHS, 'wdth', wdth), g = nearest(WEIGHTS, 'wght', wght);
  const parts = [w.name, g.name].filter(Boolean);
  if (italic) parts.push('Italic');
  return parts.join(' ');
}
// PostScript name of the matching static font: DFBSansProStatic-SuperExtendedBlackItalic
export function staticPostScript(c, italic) {
  const w = nearest(WIDTHS, 'wdth', c.wdth), g = nearest(WEIGHTS, 'wght', c.wght);
  return 'DFBSansProStatic-' + (w.name + g.name).replace(/\s+/g, '') + (italic ? 'Italic' : '');
}
// Family name (name ID 1) of the matching static font, the most reliable name
// for apps that pick fonts by family + Regular/Italic (Illustrator, Figma,
// browsers). Light/Black faces have their own families with short width names.
const SHORT = { Compressed: 'Cmp', Compact: 'Cmpct', Condensed: 'Cond', Extended: 'Extd', 'Super Extended': 'SupEx', Wide: 'Wide', '': '' };
const LONG = { Compressed: 'Compressed', Compact: 'Compact', Condensed: 'Condensed', Extended: 'Extended', 'Super Extended': 'Super Extd', Wide: 'Wide', '': '' };
const STRETCH = { 40: '50%', 60: '62.5%', 80: '75%', 100: '100%', 133: '125%', 166: '150%', 200: '200%' };   // usWidthClass 1,2,3,5,7,8,9
export function staticFace(c0) {
  const w = nearest(WIDTHS, 'wdth', c0.wdth), g = nearest(WEIGHTS, 'wght', c0.wght);
  const own = g.name === 'Light' || g.name === 'Black';
  const width = own ? SHORT[w.name] : LONG[w.name];
  const family = ['DFB Sans Pro Static', width, own ? g.name : ''].filter(Boolean).join(' ');
  return { family, weight: g.css, stretch: STRETCH[w.wdth] };
}
export const isNamed = (c) => WIDTHS.some((w) => w.wdth === c.wdth) && WEIGHTS.some((g) => g.wght === c.wght);

function nearest(list, key, v) {
  return list.reduce((a, b) => (Math.abs(b[key] - v) < Math.abs(a[key] - v) ? b : a));
}

export function createFont(fkUpright, fkItalic, { features = ['kern', 'locl'] } = {}) {
  const fonts = [fkUpright, fkItalic || fkUpright];
  for (const f of fonts) {
    const ax = f.variationAxes || {};
    if (!ax.wdth || !ax.wght) throw new Error('DFB Sans Pro variable font expected (wdth + wght): ' + f.familyName);
  }
  const axes = fonts[0].variationAxes;
  const upm = fonts[0].unitsPerEm;
  const clampWdth = (v) => Math.round(Math.min(axes.wdth.max, Math.max(axes.wdth.min, v)));
  const clampWght = (v) => Math.round(Math.min(axes.wght.max, Math.max(axes.wght.min, v)) / 5) * 5;
  const norm = (c) => ({ wdth: clampWdth(c.wdth), wght: clampWght(c.wght) });
  const ikey = (c, it) => (it ? 'i' : 'u') + c.wdth + ',' + c.wght;

  const instances = new Map();
  function instance(c, it) {
    const k = ikey(c, it);
    let f = instances.get(k);
    if (!f) {
      f = fonts[it ? 1 : 0].getVariation({ wdth: c.wdth, wght: c.wght });
      if (instances.size > 1500) instances.clear();
      instances.set(k, f);
    }
    return f;
  }

  // fontkit leaves empty glyphs (space) at their default advance; apply the
  // gvar phantom-point deltas ourselves so word spaces follow width/weight.
  const advCache = new Map();
  function advance(gid, c0, it) {
    const c = norm(c0);
    const key = gid + '@' + ikey(c, it);
    let a = advCache.get(key);
    if (a === undefined) {
      const f = instance(c, it);
      const g = f.getGlyph(gid);
      a = g.advanceWidth;
      if (!g.path.commands.length && f._variationProcessor) {
        const base = fonts[it ? 1 : 0].getGlyph(gid).advanceWidth;
        const pt = (x) => ({ x, y: 0, onCurve: true, endContour: false, copy() { return pt(this.x); } });
        const pp = [pt(0), pt(base), pt(0), pt(0)];
        f._variationProcessor.transformPoints(gid, pp);
        a = pp[1].x - pp[0].x;
      }
      if (advCache.size > 100000) advCache.clear();
      advCache.set(key, a);
    }
    return a;
  }

  // Shape a string at one instance: [{ id, chars, advance (incl. kerning) }].
  const runCache = new Map();
  function run(text, c0, it) {
    const c = norm(c0);
    const key = text + '@' + ikey(c, it);
    let r = runCache.get(key);
    if (!r) {
      const lay = instance(c, it).layout(text, features);
      r = lay.glyphs.map((g, i) => {
        const kern = lay.positions[i].xAdvance - g.advanceWidth;   // GPOS adjustment only
        return { id: g.id, chars: String.fromCodePoint(...(g.codePoints || [])), advance: advance(g.id, c, it) + kern };
      });
      if (runCache.size > 20000) runCache.clear();
      runCache.set(key, r);
    }
    return r;
  }

  // Glyph outline commands in font units (y up).
  const pathCache = new Map();
  function outline(gid, c0, it) {
    const c = norm(c0);
    const key = gid + '@' + ikey(c, it);
    let p = pathCache.get(key);
    if (!p) {
      p = instance(c, it).getGlyph(gid).path.commands.map((cmd) => ({ command: cmd.command, args: cmd.args.slice() }));
      if (pathCache.size > 60000) pathCache.clear();
      pathCache.set(key, p);
    }
    return p;
  }

  return {
    family: 'DFB Sans Pro',
    unitsPerEm: upm,
    capHeight: fonts[0].capHeight,
    axes: { wdth: { ...pick(axes.wdth) }, wght: { ...pick(axes.wght) } },
    norm,
    run,
    advance,
    outline,
  };
}

const pick = (a) => ({ min: a.min, max: a.max, default: a.default });
