// Builds the Dachmarke web tool (engine + fontkit inlined):
//   docs/index.html     — GitHub Pages, font embedded (the team decided to publish it)
//   dist/index.html     — local copy with the font embedded, opens from disk
//   dist/artifact.html  — the same for the private claude.ai page
// The Figma plugin UI is not built for now (parked until the tool is final).
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// `import b64 from 'font:NAME'` → the font file from fonts/ as base64.
// With embed = false it resolves to null.
const fontPlugin = (embed) => ({
  name: 'font',
  setup(b) {
    b.onResolve({ filter: /^font:/ }, (a) => ({ path: join(root, 'fonts', a.path.slice(5)), namespace: 'font' }));
    b.onLoad({ filter: /.*/, namespace: 'font' }, (a) => ({
      contents: `export default ${embed ? JSON.stringify(readFileSync(a.path).toString('base64')) : 'null'};`,
      loader: 'js',
    }));
  },
});

async function bundle(entry, embed = true) {
  const r = await build({
    entryPoints: [join(root, entry)],
    bundle: true, format: 'iife', platform: 'browser', target: 'es2020',
    minify: true, write: false, legalComments: 'none',
    plugins: [fontPlugin(embed)],
    loader: { '.svg': 'text' },
  });
  return r.outputFiles[0].text;
}

// UI font: DFB Sans Pro (variable, upright + italic) embedded as data URIs.
const uiFont = (file, style) => `@font-face { font-family: "DFB Sans Pro"; font-style: ${style}; font-weight: 75 1000; font-stretch: 40% 200%; font-display: block;
  src: url(data:font/woff2;base64,${readFileSync(join(root, 'fonts', file)).toString('base64')}) format("woff2"); }`;
const shell = readFileSync(join(root, 'src/ui/shell.html'), 'utf8')
  .replace('/*__UIFONTS__*/', () => uiFont('DFB-Sans-Pro.woff2', 'normal') + '\n' + uiFont('DFB-Sans-Pro-Italic.woff2', 'italic'));
const page = (js) => shell.replace('<script>/*__APP__*/</script>', () => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`);

// claude.ai artifact: the host wraps the page in its own <html>/<head>/<body>,
// so publish only title, metas, style and body content.
const artifactPage = (html) => {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta (charset|name="viewport")[^>]*>\s*/g, '');
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  return head.trim() + '\n' + body.trim() + '\n';
};

mkdirSync(join(root, 'dist'), { recursive: true });
mkdirSync(join(root, 'docs'), { recursive: true });
const web = page(await bundle('src/hosts/web.js'));
writeFileSync(join(root, 'dist/index.html'), web);
writeFileSync(join(root, 'dist/artifact.html'), artifactPage(web));
writeFileSync(join(root, 'docs/index.html'), web);
writeFileSync(join(root, 'docs/.nojekyll'), '');
console.log('built docs/index.html, dist/index.html, dist/artifact.html');
