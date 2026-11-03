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

// Pattern colour on background, as used on the board and in the moodboard.
export const COLOR_PAIRS = [
  { id: 'mint', name: 'Mintgrün 01 auf Mintgrün 02', color: '#C8F2E0', background: '#A6CABA', source: 'Basis (alle drei Muster)' },
  { id: 'sport', name: 'Akzentgrün auf Mintgrün 02', color: '#BDFF00', background: '#A6CABA', source: 'In Anwendung › Sport' },
  { id: 'gesellschaft', name: 'Akzentviolett auf Mintgrün 02', color: '#6100FF', background: '#A6CABA', source: 'In Anwendung › Gesellschaft' },
  { id: 'dunkel', name: 'Dunkelgrün auf Tiefgrün', color: '#004941', background: '#001F23', source: 'Moodboard (Banner)' },
  { id: 'mint-dunkel', name: 'Mintgrün 01 auf Dunkelgrün', color: '#C8F2E0', background: '#004941', source: 'Moodboard' },
];

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

// Schnittmix pro Buchstabe mit Zeilenversatz — Graf_Typopattern_3
// (FUSSBALLLIEBE): every letter its own width, same order in every row,
// 111.9 px Black Italic, rows 90 px apart, the last one bleeding off the bottom,
// rows start at +85 / −42 / −273 / +120 px.
export const LETTERS = {
  id: 'letters', name: 'Schnittmix', label: 'Schnittmix pro Buchstabe mit Zeilenversatz', colorPair: 'mint',
  params: {
    text: 'Fußballliebe', pattern: 'letters', orientation: 'horizontal', italic: true,
    letterMin: 40, letterMax: 200, letterWght: 925, wideShare: 0.25, wideRun: 1,
    size: F(111.9), lineHeight: 90 / 111.9, rows: 4, band: 'end', margin: F(-26.5), gap: 0, shift: 1,
    ref: { xs: [85, -42, -273, 120].map(F), letters: [60, 100, 200, 100, 100, 40, 100, 200, 60, 100, 200, 80, 40] },
  },
};

export const PRESETS = [SINGLE, ROWS, LETTERS];
export const DEFAULT_FORMAT = FORMATS[0];
