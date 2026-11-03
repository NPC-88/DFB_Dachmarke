// Browser host (local file, GitHub Pages, claude.ai page).
// DFB Sans Pro (upright + italic, variable) is embedded in every build.
import upright from 'font:DFB-Sans-Pro.ttf';
import italic from 'font:DFB-Sans-Pro-Italic.ttf';
import { startApp } from '../ui/app.js';
import { createStore } from '../ui/store.js';
import { TEAM_LIBRARY } from '../config.js';

const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

// In a claude.ai page plain downloads are blocked: save through the page's
// `downloads` capability (the viewer confirms). Elsewhere: a normal link.
const saver = window.claude && window.claude.use ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null);

const TYPES = { svg: 'image/svg+xml', png: 'image/png', json: 'application/json', mp4: 'video/mp4', gif: 'image/gif' };

async function save({ filename, data }) {
  const downloads = await saver;
  if (downloads) {
    try { await downloads.save({ filename, data }); return 'Gespeichert: ' + filename; }
    catch (e) { return e && e.code === 'declined' ? 'Speichern abgebrochen.' : 'Speichern nicht möglich (' + ((e && e.code) || 'Fehler') + ').'; }
  }
  const ext = filename.split('.').pop();
  const blob = data instanceof Blob ? data : new Blob([data], { type: TYPES[ext] || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'Gespeichert: ' + filename;
}

window.dfbPattern = startApp({ fonts: { upright: fromB64(upright), italic: fromB64(italic) }, host: { save }, store: createStore(TEAM_LIBRARY) });
