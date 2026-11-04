// Brand data and presets. Values come from the Figma file "DFB-DynamicFont-Tool",
// page "DFB Dachmarke", section "Dachmarke — DFB Sans Pro" (node 21:93):
//   - colours: the file's colour variables (DFB-Dachmarke_RGB, Farberweiterung)
//   - patterns: frames Graf_Typopattern_1 / _2 / _3 (441 × 624), measured.
// The board set patterns 2 and 3 in Druk (placeholder before DFB Sans Pro);
// their widths are mapped to DFB Sans Pro: XCondensed → Compressed 40,
// Condensed → Compact 60, Druk → Condensed 80, Text → 100, Wide → Super Extended 200.

export const PALETTE = [
  { id: 'mint1', name: 'DFB-Mintgrün 01', hex: '#C8F2E0' },
  { id: 'mint2', name: 'DFB-Mintgrün 02', hex: '#A6CABA' },
  { id: 'dunkelgruen', name: 'DFB-Dunkelgrün', hex: '#004941' },
  { id: 'tiefgruen', name: 'DFB-Tiefgrün', hex: '#001F23' },
  { id: 'akzentgruen', name: 'DFB-Akzentgrün', hex: '#BDFF00' },
  { id: 'akzentviolett', name: 'DFB-Akzentviolett', hex: '#6100FF' },
  { id: 'weiss', name: 'Weiß', hex: '#FFFFFF' },
];

// Dachmarke areas ("Bereiche"): Organisation, Gesellschaft, Sport. The area sets
// the type rules and the allowed colour combinations (rules of the team, Nov 2026,
// reduced for the tool; colours from Figma "Color systematic", node 87:453 —
// combinations marked "NOT alowed" there are left out):
//   Organisation — cuts normal width + Wide, Bold / Black, upright
//   Gesellschaft — cuts Wide + Extended, Bold / Black, upright
//   Sport        — like Gesellschaft, italic
// Patterns are always italic (team decision); the area's upright rule is for headlines.
export const AREAS = [
  { id: 'organisation', name: 'Organisation', italic: true, widths: [100, 133], weights: [650, 925], logos: ['dunkelgruen', 'mint', 'ohne', 'ohne-hell'] },
  { id: 'gesellschaft', name: 'Gesellschaft', italic: true, widths: [133, 166], weights: [650, 925], logos: ['violett', 'ohne', 'ohne-hell'] },
  { id: 'sport', name: 'Sport', italic: true, widths: [133, 166], weights: [650, 925], logos: ['dunkelgruen', 'akzentgruen', 'ohne', 'ohne-hell'] },
];
export const CATEGORIES = AREAS;

// Background + pattern colour per area. `logo` = the logo colour that comes with it.
//   Organisation: Mint 02 → Mint 01 · Tiefgrün → Dunkelgrün · Dunkelgrün → Tiefgrün
//   Gesellschaft: Mint 02 → Mint 01 / Violett / Dunkelgrün · Mint 01 → Violett · Tiefgrün → Violett
//                 (not allowed: Dunkelgrün → Violett)
//   Sport:        Mint 02 → Akzentgrün / Mint 01 / Dunkelgrün · Tiefgrün → Akzentgrün · Dunkelgrün → Akzentgrün
//                 (not allowed: Mint 01 → Akzentgrün)
const C = { mint1: '#C8F2E0', mint2: '#A6CABA', dunkel: '#004941', tief: '#001F23', violett: '#6100FF', akzent: '#BBFD00' };
export const COLOR_PAIRS = [
  { id: 'mint', area: 'organisation', name: 'Mintgrün 01 auf Mintgrün 02', color: C.mint1, background: C.mint2, logo: 'dunkelgruen' },
  { id: 'org-tief', area: 'organisation', name: 'Dunkelgrün auf Tiefgrün', color: C.dunkel, background: C.tief, logo: 'mint' },
  { id: 'dunkel', area: 'organisation', name: 'Tiefgrün auf Dunkelgrün', color: C.tief, background: C.dunkel, logo: 'mint' },
  { id: 'gesellschaft-mint', area: 'gesellschaft', name: 'Mintgrün 01 auf Mintgrün 02', color: C.mint1, background: C.mint2, logo: 'violett' },
  { id: 'gesellschaft', area: 'gesellschaft', name: 'Akzentviolett auf Mintgrün 02', color: C.violett, background: C.mint2, logo: 'violett' },
  { id: 'ges-dunkel', area: 'gesellschaft', name: 'Dunkelgrün auf Mintgrün 02', color: C.dunkel, background: C.mint2, logo: 'violett' },
  { id: 'ges-hell', area: 'gesellschaft', name: 'Akzentviolett auf Mintgrün 01', color: C.violett, background: C.mint1, logo: 'violett' },
  { id: 'ges-tief', area: 'gesellschaft', name: 'Akzentviolett auf Tiefgrün', color: C.violett, background: C.tief, logo: 'violett' },
  { id: 'sport', area: 'sport', name: 'Akzentgrün auf Mintgrün 02', color: C.akzent, background: C.mint2, logo: 'dunkelgruen' },
  { id: 'sport-mint', area: 'sport', name: 'Mintgrün 01 auf Mintgrün 02', color: C.mint1, background: C.mint2, logo: 'akzentgruen' },
  { id: 'sport-dunkel', area: 'sport', name: 'Dunkelgrün auf Mintgrün 02', color: C.dunkel, background: C.mint2, logo: 'akzentgruen' },
  { id: 'sport-tief', area: 'sport', name: 'Akzentgrün auf Tiefgrün', color: C.akzent, background: C.tief, logo: 'akzentgruen' },
  { id: 'sport-dunkelbg', area: 'sport', name: 'Akzentgrün auf Dunkelgrün', color: C.akzent, background: C.dunkel, logo: 'akzentgruen' },
];
export const areaOf = (id) => AREAS.find((a) => a.id === id) || AREAS[0];
export const pairsOf = (areaId) => COLOR_PAIRS.filter((p) => p.area === areaId);
export const categoryOf = (pairId) => areaOf((COLOR_PAIRS.find((p) => p.id === pairId) || COLOR_PAIRS[0]).area);
// dark background → light logo variants
export const isDark = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 110; };

export const FORMATS = [
  { id: 'a', name: 'Hochformat A (Figma)', ratio: '1 : √2', width: 1240, height: 1754 },
  { id: '1x1', name: 'Quadrat', ratio: '1 : 1', width: 1080, height: 1080 },
  { id: '4x5', name: 'Hochformat', ratio: '4 : 5', width: 1080, height: 1350 },
  { id: '9x16', name: 'Story', ratio: '9 : 16', width: 1080, height: 1920 },
  { id: '16x9', name: 'Querformat', ratio: '16 : 9', width: 1920, height: 1080 },
];

export const TEXT_SUGGESTIONS = ['Fußballliebe', 'Fußball', 'Deutscher Fußballbund', 'Deutscher Fußball Bund', 'Club 100', 'Zukunft:sicher'];

const F = (px) => px / 441;      // Figma frame is 441 px wide (shorter side)

// Pattern 2: three cuts, as Figma Graf_Typopattern_2 (53:683): Extended Black
// Italic → Condensed Black Italic → Compressed Black Italic; order can change.
export const PATTERN2_CUTS = [{ wdth: 166, wght: 925 }, { wdth: 80, wght: 925 }, { wdth: 40, wght: 925 }];
// Pattern 3: three cuts — Extended, Condensed, Compressed (team rules, Nov 2026).
export const PATTERN3_LEVELS = [40, 80, 166];

// 1 Schriftschnitt mit Zeilenversatz — layout as Graf_Typopattern_1 (CLUB 100):
// 70 px, rows 58 px apart, 4 rows at the bottom, last baseline 26 px above the
// edge, rows start at −41 / −301 / −488 / −747 px. The cut follows the area
// (Organisation: Wide Black; the board's Super Extended predates the rules).
export const SINGLE = {
  id: 'single', name: '1 Schnitt', label: '1 Schriftschnitt mit Zeilenversatz', colorPair: 'mint',
  params: {
    area: 'organisation', text: 'Club 100', pattern: 'single', orientation: 'horizontal', italic: true,
    style: { wdth: 133, wght: 925 },
    size: F(70), lineHeight: 58 / 70, rows: 4, band: 'end', margin: F(26), gap: 0, shift: 1,
    ref: { xs: [-41, -301, -488, -747].map(F) },
  },
};

// 3 Schriftschnitte, 1 Schnitt pro Zeile (max 3 Zeilen): normal Black → Wide
// Black → Super Extended Black; horizontal or turned −90°. Size and spacing as CLUB 100.
export const ROWS = {
  id: 'rows', name: '3 Schnitte', label: '3 Schriftschnitte, 1 Schnitt pro Zeile', colorPair: 'mint',
  params: {
    area: 'organisation', text: 'Club 100', pattern: 'rows', orientation: 'horizontal', italic: true,
    rowStyles: PATTERN2_CUTS.map((c) => ({ ...c })),
    size: 0.159, lineHeight: 0.83, rows: 3, band: 'end', margin: 0.059, gap: 0, shift: 1, blockX: 0,
    seed: 7,
  },
};

// Schnittmix pro Buchstabe mit Zeilenversatz: Compressed / Condensed / Extended
// Black, per letter, same order in every row. Size, spacing and row starts as the
// DFB Sans Pro frame "A4 - 35" (node 47:5393, 278.7 × 394.4 px): 66.6 px, rows
// ~53 px apart, the last row bleeding off the bottom; band by default, the whole
// frame as an option. mix 'verlauf' (test): widths / weights as a wave along the rows.
const G = (px) => px / 278.67;
export const LETTERS = {
  id: 'letters', name: 'Schnittmix', label: 'Schnittmix pro Buchstabe mit Zeilenversatz', colorPair: 'mint',
  params: {
    area: 'organisation', text: 'Club 100', pattern: 'letters', orientation: 'horizontal', italic: true,
    letterWght: 925, wideShare: 0.25, wideRun: 1, mix: 'random', gradAxis: 'wdth', gradWaves: 1,
    size: 0.239, lineHeight: 0.79, rows: 4, band: 'end', margin: -0.085, gap: 0, shift: 0.56, blockX: 0.215,
    seed: 3,
  },
};

export const PRESETS = [SINGLE, ROWS, LETTERS];
export const DEFAULT_FORMAT = FORMATS[0];
