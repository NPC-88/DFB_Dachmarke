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

// Brand categories ("Dachmarkenbereiche"): the colour set decides the category.
// From the board's "In Anwendung" layouts (Organisation / Gesellschaft / Sport):
// background always Mintgrün 02; pattern and logo colours depend on the category.
//   Organisation — pattern Mintgrün 01; logo plate Dunkelgrün (mint mark) or no plate
//   Gesellschaft — pattern Mintgrün 01 or Akzentviolett; logo plate Akzentviolett or no plate
//   Sport        — pattern Akzentgrün or Mintgrün 01; logo plate Dunkelgrün or Akzentgrün, or no plate
// "Weitere": dark combinations seen outside these rows (A4 - 35, moodboard).
export const CATEGORIES = [
  { id: 'organisation', name: 'Organisation', logos: ['dunkelgruen', 'ohne'] },
  { id: 'gesellschaft', name: 'Gesellschaft', logos: ['violett', 'ohne'] },
  { id: 'sport', name: 'Sport', logos: ['dunkelgruen', 'akzentgruen', 'ohne'] },
  { id: 'weitere', name: 'Weitere', logos: ['dunkelgruen', 'violett', 'akzentgruen', 'highlight', 'ohne'] },
];

// Pattern colour on background. `logo` = the logo colour that comes with it.
export const COLOR_PAIRS = [
  { id: 'mint', category: 'organisation', name: 'Organisation · Mintgrün 01 auf Mintgrün 02', color: '#C8F2E0', background: '#A6CABA', logo: 'dunkelgruen', source: 'In Anwendung › Organisation' },
  { id: 'gesellschaft-mint', category: 'gesellschaft', name: 'Gesellschaft · Mintgrün 01 auf Mintgrün 02', color: '#C8F2E0', background: '#A6CABA', logo: 'violett', source: 'In Anwendung › Gesellschaft' },
  { id: 'gesellschaft', category: 'gesellschaft', name: 'Gesellschaft · Akzentviolett auf Mintgrün 02', color: '#6100FF', background: '#A6CABA', logo: 'violett', source: 'In Anwendung › Gesellschaft' },
  { id: 'sport', category: 'sport', name: 'Sport · Akzentgrün auf Mintgrün 02', color: '#BBFD00', background: '#A6CABA', logo: 'dunkelgruen', source: 'In Anwendung › Sport' },
  { id: 'sport-mint', category: 'sport', name: 'Sport · Mintgrün 01 auf Mintgrün 02', color: '#C8F2E0', background: '#A6CABA', logo: 'akzentgruen', source: 'In Anwendung › Sport' },
  { id: 'dunkel', category: 'weitere', name: 'Tiefgrün auf Dunkelgrün', color: '#001F23', background: '#004941', logo: 'highlight', source: 'Figma „A4 - 35“ (Schnittmix in DFB Sans Pro)' },
  { id: 'mint-dunkel', category: 'weitere', name: 'Mintgrün 01 auf Dunkelgrün', color: '#C8F2E0', background: '#004941', logo: 'akzentgruen', source: 'Moodboard' },
];
export const categoryOf = (pairId) => CATEGORIES.find((c) => c.id === (COLOR_PAIRS.find((p) => p.id === pairId) || COLOR_PAIRS[0]).category) || CATEGORIES[0];

export const FORMATS = [
  { id: 'a', name: 'Hochformat A (Figma)', ratio: '1 : √2', width: 1240, height: 1754 },
  { id: '1x1', name: 'Quadrat', ratio: '1 : 1', width: 1080, height: 1080 },
  { id: '4x5', name: 'Hochformat', ratio: '4 : 5', width: 1080, height: 1350 },
  { id: '9x16', name: 'Story', ratio: '9 : 16', width: 1080, height: 1920 },
  { id: '16x9', name: 'Querformat', ratio: '16 : 9', width: 1920, height: 1080 },
];

export const TEXT_SUGGESTIONS = ['Fußballliebe', 'Fußball', 'Deutscher Fußballbund', 'Deutscher Fußball Bund', 'Club 100', 'Zukunft:sicher'];

const F = (px) => px / 441;      // Figma frame is 441 px wide (shorter side)

// 1 Schriftschnitt mit Zeilenversatz — Graf_Typopattern_1 (CLUB 100):
// Super Extended Black, 70 px, rows 58 px apart, 4 rows at the bottom,
// last baseline 26 px above the edge, rows start at −41 / −301 / −488 / −747 px.
export const SINGLE = {
  id: 'single', name: '1 Schnitt', label: '1 Schriftschnitt mit Zeilenversatz', colorPair: 'mint',
  params: {
    text: 'Club 100', pattern: 'single', orientation: 'horizontal', italic: false,
    style: { wdth: 200, wght: 925 },
    size: F(70), lineHeight: 58 / 70, rows: 4, band: 'end', margin: F(26), gap: 0, shift: 1,
    ref: { xs: [-41, -301, -488, -747].map(F) },
  },
};

// 3 Schriftschnitte, 1 Schnitt pro Zeile (max 3 Zeilen) — Graf_Typopattern_2
// (DEUTSCHER FUSSBALL BUND). The three styles are the board's (Druk Wide → Text
// → Bold, matched by phrase length 636 / 308 / 201 px: Super Extended Black →
// Condensed Black → Compressed Bold, italic). The board shows it turned −90°;
// team decision: like every pattern it is horizontal by default and can be
// turned. Horizontal size, spacing and margin follow CLUB 100.
export const ROWS = {
  id: 'rows', name: '3 Schnitte', label: '3 Schriftschnitte, 1 Schnitt pro Zeile', colorPair: 'mint',
  params: {
    text: 'Deutscher Fußball Bund', pattern: 'rows', orientation: 'horizontal', italic: true,
    rowStyles: [{ wdth: 200, wght: 925 }, { wdth: 80, wght: 925 }, { wdth: 40, wght: 650 }],
    size: F(70), lineHeight: 58 / 70, rows: 3, band: 'end', margin: F(26), gap: 0.4, shift: 1,
    seed: 7,
  },
};

// Schnittmix pro Buchstabe mit Zeilenversatz — the DFB Sans Pro version of
// Graf_Typopattern_3: frame "A4 - 35" (node 47:5393, 278.7 × 394.4 px),
// FUSSBALLLIEBE in Black Italic, 66.6 px, rows ~53 px apart, the last row
// bleeding off the bottom, rows start at −0.5 / −70.2 / −178.2 / −5.5 px;
// letter widths as set there (one Super Extended, two Wide per word).
const G = (px) => px / 278.67;
export const LETTERS = {
  id: 'letters', name: 'Schnittmix', label: 'Schnittmix pro Buchstabe mit Zeilenversatz', colorPair: 'mint',
  params: {
    text: 'Fußballliebe', pattern: 'letters', orientation: 'horizontal', italic: true,
    letterMin: 40, letterMax: 200, letterWght: 925, wideShare: 0.25, wideRun: 1,
    size: G(66.63), lineHeight: 52.96 / 66.63, rows: 4, band: 'end', margin: G(-25.8), gap: 0, shift: 1,
    ref: { xs: [-0.48, -70.16, -178.22, -5.46].map(G), letters: [60, 60, 200, 100, 100, 40, 100, 133, 60, 100, 133, 80, 60] },
  },
};

export const PRESETS = [SINGLE, ROWS, LETTERS];
export const DEFAULT_FORMAT = FORMATS[0];
