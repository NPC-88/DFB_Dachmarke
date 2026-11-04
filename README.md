# DFB Dachmarke Typo-Pattern

Generates the Dachmarke's typographic patterns in **DFB Sans Pro**: a word or short phrase,
in capitals, repeated along parallel rows that run off the edges of the frame. The pattern sits in
one band of the format (bottom or right edge) and leaves room for headline and logo.

This tool is separate from the national-team tool ([DFB_NMN](https://github.com/NPC-88/DFB_NMN)),
which uses DFB Sans Var and a wave. Here the variation comes from the **width axis** of DFB Sans Pro
and from how the rows are offset.

## Use

```bash
npm install
npm run build      # docs/ (GitHub Pages), dist/index.html + dist/artifact.html (font embedded)
npm test           # engine + library tests
node test/ui.cjs   # clicks through the built page in Chromium, screenshots in test/out
```

**GitHub Pages:** *Settings → Pages → Deploy from a branch → `main` / `docs`*. The page then
opens at `https://npc-88.github.io/DFB_Dachmarke/`.

### What the tool does

- **Text:** type any word or short phrase, or pick one of the examples (*Fußballliebe, Fußball,
  Deutscher Fußballbund, Club 100, Zukunft:sicher*). The text is always set in capitals, and ß
  becomes SS.
- **Muster:** the three types from the Figma board. They differ only in how the styles mix; every
  type can be horizontal or turned −90°. Choosing one loads its settings and keeps the current text
  and format.

  | Tool | Figma label | Example |
  |---|---|---|
  | **1 Schnitt** | 1 Schriftschnitt mit Zeilenversatz | CLUB 100 |
  | **3 Schnitte** | 3 Schriftschnitte, 1 Schnitt pro Zeile (max 3 Zeilen) | DEUTSCHER FUSSBALL BUND |
  | **Schnittmix** | Schnittmix pro Buchstabe mit Zeilenversatz | FUSSBALLLIEBE |
- **Schrift** (font settings, which change with the pattern type):
  - *1 Schnitt*: width (7 named widths) and weight (Light, Regular, Bold, Black).
  - *3 Schnitte*: one style for each row (any of the 28 named styles).
  - *Schnittmix*: narrowest and widest width, the share of wide letters, and how many wide
    letters may follow one another.
  - All three: *Kursiv* (italic).
- **Anordnung** (arrangement): direction (horizontal, or the whole pattern turned −90°), position
  (bottom/right, top/left, centre or the whole frame), number of rows, font size (as a percentage
  of the shorter side), line spacing, distance from the edge (negative values bleed off),
  row offset, and spacing between repeats.
- **Block and rows:** *Block verschieben* moves the whole pattern sideways (up/down is the distance
  to the edge). In *1 Schnitt*, each row can be dragged sideways in the preview (locked to the row
  direction); *Zeilen zurücksetzen* undoes it. *Neue Variante* also resets the rows.
- **Variante:** *Neue Variante* rearranges the pattern and keeps every setting. The variant number
  (seed) stores the arrangement, so the same number always gives the same pattern, also in a link
  or in the library. Typing a number brings back that variant.
- **Logo** (Picturemark from the UI Library's *Logo* component, on a plate as in the layouts):
  - *Freie Fläche* — in a free area, by default top centre inside the safe zone (Figma
    Gesellschaft, 53:217).
  - *Über der Typo* — on top of the pattern, the rows run on underneath (Podcast tile, 47:5457).
  - *In der Typo* — fitted into the typography: rows that cross the plate open up around it and
    continue after it, mainly for 1 Schnitt (Organisation, 53:106 — reproduced exactly). The gap
    is measured on the ink of the letters, the same on both sides (default 0.31 em = 22 px at
    70 px, as in Figma). *An Wortgrenzen öffnen* (on by default) opens each row at a word space, so no word
    is cut: the nearest one, and neighbouring rows use different word gaps (as in Figma: 00 ▢ CL /
    UB ▢ 10). The ‹ › buttons next to the logo open a row at the previous / next word gap; the
    other rows keep theirs.
  - Über / In der Typo: the logo position is relative to the pattern block, so it moves with the
    block.
  - Colours: Mint on Dunkelgrün, Mint on Akzentviolett, Dunkelgrün on Akzentgrün, Akzentgrün on
    Dunkelgrün, or no plate (Dunkelgrün mark).
  - Size: starts at 1/7 of the shorter side (the template's *Logobreite*, 63 px in 441); 10–30 %. In the preview: drag to move, drag the corner to resize, × (or Delete) to remove,
    arrow keys to nudge. The logo is part of every export (own layer `Logo` in the SVG) and stays
    fixed in animations.
- **Format:** Hochformat A (the Figma frame proportions, 1 : √2), 1 : 1, 4 : 5, 9 : 16, 16 : 9, or
  any custom size.
- **Bereich & Farbe** (first panel): choose the area (Organisation / Gesellschaft / Sport), then one
  of its allowed colour combinations (Figma *Color systematic*, 87:453; the "NOT alowed" ones are
  left out). The area also sets the cuts of 1 Schnitt, the italic default (Sport italic) and the
  logo colours on offer.

  | Area | Cuts (1 Schnitt) | Background → pattern |
  |---|---|---|
  | Organisation | normal + Wide, Bold / Black, upright | Mint 02 → Mint 01 · Tiefgrün → Dunkelgrün · Dunkelgrün → Tiefgrün |
  | Gesellschaft | Wide + Extended, Bold / Black, upright | Mint 02 → Mint 01 / Violett / Dunkelgrün · Mint 01 → Violett · Tiefgrün → Violett |
  | Sport | Wide + Extended, Bold / Black, italic | Mint 02 → Akzentgrün / Mint 01 / Dunkelgrün · Tiefgrün → Akzentgrün · Dunkelgrün → Akzentgrün |

  Not allowed (chart): Gesellschaft Dunkelgrün → Violett, Sport Mint 01 → Akzentgrün. Where the
  chart and the meeting notes differ (violet on dark backgrounds), the chart wins.
- **Pattern rules (Nov 2026):** 3 Schnitte = normal Black, Wide Black, Super Extended Black in any
  order, for every area. Schnittmix = Compressed, Condensed, Extended Black; band by default, the
  whole frame as an option; *Verlauf (Test)*: widths and/or weights as a wave along the rows
  (compressed → extended → compressed, light → bold → light), not an approved rule yet. No stacked
  words: neighbouring rows never start at the same point of the phrase (at least ¼ of a repeat
  apart; 1 Schnitt and Schnittmix), also after "Neue Variante", the row offset slider and dragging.
- **Export:**
  - **SVG · Konturen** (outlines): looks the same everywhere.
  - **SVG · Live-Text**: editable text, needs the fonts installed (see below).
  - **PNG**.
  - Each export can include the background as its own layer or leave it transparent. Rows are
    named `Zeile_01`, `Zeile_02` … in the layer list.
- **Animation with points** (as in the national-team tool): *Punkt merken* stores the current state
  as a point, as many as wanted. The animation runs from point to point and loops.
  - What moves between points: styles (Schnittmix letters change width letter by letter), font
    size, line spacing, margin, spacing and the start of every row (rows slide). Text, pattern,
    direction, position, row count, italic and format stay as set in the tool.
  - Points: reorder, time to the next point, open in the tool, delete. Transition smooth or
    linear; loop or back and forth.
  - Optional effect on top, along the variable axes (width, weight or both): *Welle* (a wave runs
    along the rows), *Atmen* (all letters together), *Schnittwechsel* (letters change style and
    back). It also works without points.
  - Export as MP4 (Chrome, Edge, Safari) or GIF, at 100 % or 50 %, 25 or 30 fps.
- **Bibliothek** (library): saved patterns with their animation. Each can be opened, shared as a
  link, renamed or deleted. Light and dark interface.

### Live-text SVG and fonts

Each piece of text in the SVG names the matching **static** font family first, for example
`'DFB Sans Pro Static SupEx Black'` in italic. It then falls back to `'DFB Sans Pro Static'` (with
`font-weight` and `font-stretch`) and finally to the variable `'DFB Sans Pro'` (with
`font-variation-settings`). To edit it, the designer installs the static fonts from
`DFB-Sans-Pro.zip → DFB-Sans-Pro-Static.zip`.

`node test/livetext.mjs` tests this. It renders each pattern as live text, using only the
installed static fonts (no web font), and compares the result with the outlines: under 2.5 % of
the ink pixels differ, which is edge antialiasing. Live text is exact as long as letters use the
named styles, which is always the case in the tool. Animation frames use in-between values and are
only exported as video.

### Team library

**Connected** (Firebase project `dfbsp-8a077`, the same as the national-team tool, own collection
`dachmarke`; rules published). If the library cannot be reached, the tool falls back to "this
browser only" without errors. The rule block for the collection, next to the `patterns` block in
*Firestore → Rules*:

```
match /dachmarke/{id} {
  allow read: if true;
  allow create: if request.resource.data.keys().hasOnly(['name','author','thumb','settings','created'])
                && request.resource.data.name is string && request.resource.data.name.size() < 120
                && request.resource.data.settings.size() < 200000 && request.resource.data.thumb.size() < 400000;
  allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name']);
  allow delete: if true;
}
```

## Sources and decisions

**From the approved Figma examples** (*DFB-DynamicFont-Tool → DFB Dachmarke → Dachmarke — DFB Sans
Pro*, frames `Graf_Typopattern_1/2/3`, 441 × 624):

- **Default state (CLUB 100):**
  - DFB Sans Pro Super Extended Black at 70 px.
  - Rows 58 px apart, 4 rows, last baseline 26 px above the bottom edge.
  - Rows start at −41, −301, −488 and −747 px.

  The *Zurücksetzen* (reset) button restores these values exactly.
- **3 Schnitte:**
  - On the board: turned −90°, 3 columns at the right edge, 26.9 px, about 29 px apart. Team
    decision: horizontal by default (size and spacing as CLUB 100), turning is an option for every
    pattern.
  - Phrase lengths 636, 308 and 201 px → Super Extended Black, Condensed Black, Compressed Bold,
    italic.
- **Schnittmix** (reference: the DFB Sans Pro frame *A4 - 35*, node 47:5393, 278.7 × 394.4):
  - 66.6 px Black Italic, rows about 53 px apart, the last row bleeding off the bottom edge.
  - Rows start at −0.5, −70.2, −178.2 and −5.5 px.
  - Letter widths as set there: F U S S B A L L L I E B E = 60 60 200 100 100 40 100 133 60 100
    133 80 60, in the same order in every row.
  - Rules taken from it: always Black Italic; widths 40, 60, 80, 100, 133, 200 (Extended 166 not
    used); at most one Super Extended per word, the other wide letters Wide (133); about a quarter of
    the letters wide, never two wide letters side by side; normal and Compact most often; the
    same width may repeat once, never three times.
- **Neue Variante** for *1 Schnitt* and *3 Schnitte* also picks new styles within the rules: Bold or
  Black only (nothing lighter appears on the board); 3 Schnitte gets one wide (Wide or wider), one
  middle (Condensed / normal) and one narrow (Compressed / Compact) row, in any order.
- **Druk mapping** (3 Schnitte only now): the board set patterns 2 and 3 in Druk, a placeholder used before DFB Sans Pro
  was available. Their widths are mapped to DFB Sans Pro by measured length:
  - XCondensed → Compressed (40)
  - Condensed → Compact (60)
  - Druk → Condensed (80)
  - Text → normal width (100)
  - Wide → Super Extended (200)
- **Colours** (file variables): Mintgrün 01 `#C8F2E0`, Mintgrün 02 `#A6CABA`, Dunkelgrün `#004941`,
  Tiefgrün `#001F23`, Akzentgrün `#BDFF00`, Akzentviolett `#6100FF`. Pairs used:
  - Mint 01 on Mint 02 (base)
  - Akzentgrün on Mint 02 (Sport)
  - Akzentviolett on Mint 02 (Gesellschaft)
  - Tiefgrün on Dunkelgrün (frame A4 - 35), and Mint 01 on Dunkelgrün (moodboard)
- **UI:** DFB Dachmarke UI Library (violet primary, accent green in dark mode, DFB Sans Pro Wide
  Bold headings, 12 px radii, chips, range sliders, tab bar). The icons come from the DFB icon set.

**Team decisions (this round):**

- No overlapping rows. The tool keeps line spacing above cap height.
- Rotation only for the whole pattern, never for single words.
- Schnittmix widths are random per seed, within limits: width range, share of wide letters, and
  wide letters in a row.
- Formats are chosen by the user, with presets.
- Animation moves the variable font, from point to point (any number of points).
- 3 Schnitte = three rows, one style each; every pattern can be horizontal or vertical.
- The library and animation export follow the national-team tool.

**Implementation proposals, awaiting feedback:**

- The Schnittmix limits as defaults:
  - 25 % wide letters
  - never two wide letters in a row
  - "wide" means Extended or Super Extended
  - the other letters lean towards normal width
- Row offsets:
  - *1 Schnitt / 3 Schnitte*: each row steps 25–50 % of a repeat further in one direction, like
    the irregular staircase in CLUB 100.
  - *Schnittmix*: each row starts between 65 % of the frame width outside the left edge and 30 %
    inside it, with neighbouring rows at least 12 % apart.
- In other formats, row starts are scaled to the frame width, and font size and margin to the
  shorter side.
- Animation modes (Welle, Atmen, Schnittwechsel) and their defaults.
- Exportable colour pairs. The moodboard pairs are taken from screenshots and are not labelled as
  approved.
- Paste straight into Figma: postponed until the rules are settled (see the Figma-plugin structure
  in DFB_NMN).

**Open questions:**

- Are the three base patterns, and the moodboard pairs, the full approved set?
- Where should a pattern sit in landscape formats? The board only shows portrait.
- Is the third style in *3 Schnitte* Bold or Black?

## Structure

```
src/core/          pattern engine — no DOM; runs in the browser and in Node
  font.js          DFB Sans Pro adapter (fontkit): wdth + wght, upright + italic, named styles
  layout.js        the three pattern types, rows, offsets, per-letter widths → plain model
  random.js        seeded randomness (same seed → same pattern)
  animate.js       variable-font motion (Welle / Atmen / Schnittwechsel), seamless loops
  svg.js           model → SVG (outlines / live text), optional background layer
  presets.js       palette, colour pairs, formats, the three Figma references
  index.js         createEngine(upright, italic) → { layout, svg, frame, font }
src/ui/            app shell (shell.html, app.js), animation tab + video export, library, store
src/hosts/web.js   font loading and file saving in the browser
docs/              GitHub Pages build
test/              node:test suites, live-text check, UI click-through (Playwright)
```

The font is licensed: it is kept only inside `DFB-Sans-Pro.zip`, `npm run fonts` unpacks it into
the git-ignored `fonts/` folder, and builds embed it, as in the national-team tool.
