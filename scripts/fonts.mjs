// Unpacks DFB Sans Pro (variable, upright + italic) from DFB-Sans-Pro.zip into
// fonts/ (git-ignored). The font is licensed ("You may not sell or give away
// this font"), so the repository keeps it only inside the supplied archive.
// The archive holds two zips (Static, Var); the tool uses the variable files.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ZIP = join(root, 'DFB-Sans-Pro.zip');
const FILES = {
  'DFB-Sans-Pro.ttf': 'DFB-Sans-Pro-Var/DFB-Sans-Pro.ttf',
  'DFB-Sans-Pro-Italic.ttf': 'DFB-Sans-Pro-Var/DFB-Sans-Pro-Italic.ttf',
  'DFB-Sans-Pro.woff2': 'DFB-Sans-Pro-Var/web/DFB-Sans-Pro.woff2',
  'DFB-Sans-Pro-Italic.woff2': 'DFB-Sans-Pro-Var/web/DFB-Sans-Pro-Italic.woff2',
};

export function ensureFonts() {
  const dir = join(root, 'fonts');
  mkdirSync(dir, { recursive: true });
  const missing = Object.keys(FILES).filter((f) => !existsSync(join(dir, f)));
  if (!missing.length) return;
  if (!existsSync(ZIP)) throw new Error(`Missing fonts/${missing[0]} and DFB-Sans-Pro.zip — put the font files into fonts/.`);
  const inner = join(dir, '.var.zip');   // inner archive, removed again below
  writeFileSync(inner, execFileSync('unzip', ['-p', ZIP, 'DFB-Sans-Pro-Var.zip'], { maxBuffer: 64 << 20 }));
  for (const name of missing) {
    writeFileSync(join(dir, name), execFileSync('unzip', ['-p', inner, FILES[name]], { maxBuffer: 64 << 20 }));
    console.log('extracted fonts/' + name);
  }
  rmSync(inner, { force: true });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) ensureFonts();
