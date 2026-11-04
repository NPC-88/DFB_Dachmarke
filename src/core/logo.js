// DFB logo (Picturemark) in the layout. The mark is the "Logo" component of
// the DFB Dachmarke UI Library (type picturemark, 200 × 200, one path); its
// colour and the plate ("Trägerfläche") come from the layout, as on the board:
//
//   Figma "Graf_Typopattern_1_orga" (53:106)  — in der Typo: CLUB 100 rows open up
//       around a 77 px plate (Dunkelgrün, mint mark); the text continues after it
//   Figma "Frame 1321316049" (47:5457)        — über der Typo: 87.8 px plate
//       (Akzentgrün, dunkelgrün mark) on a full-frame Schnittmix
//   Figma "Graf_Typopattern_3_gesell" (53:217) — freie Fläche: 54.4 px plate
//       (Akzentviolett, mint mark) top centre, 26 px from the edge
//   Template "Logo mit Trägerfläche": 64 px plate, mark 51 px (80 %),
//       "Logobreite" 63 px in a 441 px frame (≈ 1/7 of the shorter side),
//       safe zone 27 px.
// Plate corners ≈ 6.3 % of the plate, the mark fills 80 % of it.

export const LOGO_PATH = 'M166.632 161.536L173.461 167.849C162.857 179.324 149.598 188.31 134.659 193.83L131.44 185.103C144.989 180.096 157.015 171.945 166.632 161.536ZM100 190.7C91.4754 190.7 83.2247 189.524 75.4029 187.325L72.8777 196.277C81.5024 198.703 90.5998 200 100 200C109.424 200 118.544 198.696 127.189 196.259L124.664 187.306C116.823 189.518 108.549 190.7 100 190.7ZM33.4082 161.58L26.5791 167.892C37.1914 179.364 50.4587 188.343 65.4051 193.854L68.6253 185.127C55.068 180.129 43.0341 171.984 33.4082 161.58ZM178.561 161.879C191.988 144.856 200 123.364 200 100C200 44.7716 155.228 0 100 0C44.7715 0 0 44.7716 0 100C0 123.384 8.02612 144.893 21.4738 161.923L28.7767 156.164C16.5796 140.718 9.3 121.209 9.3 100C9.3 49.9078 49.9078 9.30004 100 9.30004C150.092 9.30004 190.7 49.9078 190.7 100C190.7 121.189 183.434 140.681 171.258 156.12L178.561 161.879ZM162.681 110.847V124.963L102.52 159.697V145.583L150.459 117.905L131.666 107.055L90.2965 130.94L90.2964 166.755L78.0729 159.698V137.998L59.2802 148.848L47.0522 141.788V58.2082L59.2801 51.1484L78.0729 61.9984V40.2983L90.2964 33.2411L114.744 47.3557V61.4703L90.2965 47.3557V69.0557L114.744 83.1703V97.2848L90.2965 83.1703V116.826L150.459 82.0907L126.967 68.5276V54.413L162.681 75.0325V89.1489L143.89 99.998L162.681 110.847ZM78.0729 76.113L59.2757 65.2605V134.736L78.0729 123.883V76.113Z';
export const LOGO_VIEWBOX = 200;

// Plate + mark colours seen on the board (and the UI Library's logo colours).
export const LOGO_STYLES = [
  { id: 'dunkelgruen', name: 'Mint auf Dunkelgrün', plate: '#004941', mark: '#C8F2E0', source: 'In Anwendung › Organisation' },
  { id: 'violett', name: 'Mint auf Akzentviolett', plate: '#6100FF', mark: '#C8F2E0', source: 'In Anwendung › Gesellschaft' },
  { id: 'akzentgruen', name: 'Dunkelgrün auf Akzentgrün', plate: '#BDFF00', mark: '#004941', source: 'Podcast-Kachel (47:5457)' },
  { id: 'highlight', name: 'Akzentgrün auf Dunkelgrün', plate: '#004941', mark: '#BBFD00', source: 'UI Library: highlight-on-emphasis' },
  { id: 'mint', name: 'Dunkelgrün auf Mintgrün', plate: '#C8F2E0', mark: '#004941', source: 'für dunkle Hintergründe (Organisation)' },
  { id: 'ohne', name: 'Ohne Fläche, Dunkelgrün', plate: null, mark: '#004941', source: 'UI Library: on-highlight' },
  { id: 'ohne-hell', name: 'Ohne Fläche, Mintgrün', plate: null, mark: '#C8F2E0', source: 'UI Library: on-emphasis' },
];

export const LOGO_MODES = [
  ['free', 'Freie Fläche'],
  ['over', 'Über der Typo'],
  ['fit', 'In der Typo'],
];

export const LOGO_DEFAULTS = {
  on: false,
  mode: 'free',
  style: 'dunkelgruen',
  size: 63 / 441,        // plate, share of the frame's shorter side ("Logobreite")
  cx: null, cy: null,    // Freie Fläche: centre, share of width / height (null = default)
  ox: 0, oy: 0,          // Über / In der Typo: offset from the band centre, share of the shorter side
  pad: 0.31,             // In der Typo: ink gap around the plate, em (22 px at 70 px in Figma)
  snap: true,            // In der Typo: open the rows at word gaps (no word is cut)
};

export const SAFE_ZONE = 27 / 441;   // share of the shorter side
const PLATE_RADIUS = 4.873 / 77;
const MARK = 61.405 / 77;

// Default centre for a mode: free → top centre inside the safe zone (as in
// Gesellschaft); over / fit → centre of the pattern band.
export function defaultCenter(mode, size, model) {
  const { width: W, height: H } = model;
  const s = size * Math.min(W, H), safe = SAFE_ZONE * Math.min(W, H);
  if (mode === 'free') {
    const band = model.bandBox;
    // put it on the side away from the pattern
    if (model.rotate) return { cx: (safe + s / 2) / W, cy: 0.5 };
    if (band && band.y + band.h / 2 < H / 2) return { cx: 0.5, cy: (H - safe - s / 2) / H };
    return { cx: 0.5, cy: (safe + s / 2) / H };
  }
  const b = model.bandBox || { x: 0, y: 0, w: W, h: H };
  return { cx: Math.min(1, Math.max(0, (b.x + b.w / 2) / W)), cy: Math.min(1, Math.max(0, (b.y + b.h / 2) / H)) };
}

// Logo box in frame pixels (plate square) for params.logo, or null.
// Freie Fläche: position on the frame (cx, cy as share of width / height).
// Über / In der Typo: position relative to the pattern band (ox, oy as share of
// the shorter side from the band centre), so the logo moves with the block.
export function logoBox(logo, W, H, center, bandCenter) {
  if (!logo || !logo.on) return null;
  const short = Math.min(W, H);
  const s = Math.max(4, logo.size * short);
  let cx, cy;
  if (logo.mode !== 'free' && bandCenter) {
    cx = bandCenter.x + (logo.ox || 0) * short;
    cy = bandCenter.y + (logo.oy || 0) * short;
  } else {
    cx = (logo.cx ?? center.cx) * W; cy = (logo.cy ?? center.cy) * H;
  }
  const st = LOGO_STYLES.find((x) => x.id === logo.style) || LOGO_STYLES[0];
  return { x: cx - s / 2, y: cy - s / 2, size: s, radius: s * PLATE_RADIUS, mark: s * MARK, plateColor: st.plate, markColor: st.mark, mode: logo.mode };
}

export function logoSVG(box, id = 'Logo') {
  if (!box) return '';
  const k = box.mark / LOGO_VIEWBOX, off = (box.size - box.mark) / 2;
  const n = (v) => +v.toFixed(2);
  const plate = box.plateColor ? `<rect id="Traegerflaeche" width="${n(box.size)}" height="${n(box.size)}" rx="${n(box.radius)}" fill="${box.plateColor}"/>` : '';
  return `<g id="${id}" transform="translate(${n(box.x)} ${n(box.y)})">${plate}<path id="Picturemark" transform="translate(${n(off)} ${n(off)}) scale(${+k.toFixed(5)})" d="${LOGO_PATH}" fill="${box.markColor}"/></g>`;
}
