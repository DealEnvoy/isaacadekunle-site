// Build: src/ -> site/index.html, site/css/main.css, site/js/main.js, and the ITF woff2 files.
// Run: npm install && node tools/build.mjs   (esbuild 0.27.7 is the only dependency)
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const claimsFile = JSON.parse(fs.readFileSync(path.join(root, 'src/claims.json'), 'utf8'));
const claims = Object.fromEntries(claimsFile.claims.map(c => [c.id, c]));
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// seeded RNG so the build is reproducible
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const TAGS = { shipped: 'Shipped', specified: 'Specified', assumption: 'Assumption', limit: 'Limit', human_gate: 'Human gate' };
const tagCls = { shipped: 'shipped', specified: 'specified', assumption: 'assumption', limit: 'limit', human_gate: 'gate' };
const tagEl = t => `<span class="tag tag--${tagCls[t]}"><span class="tag__mark" aria-hidden="true"></span>${TAGS[t]}</span>`;
const used = new Set();
function claim(id, cls = '') {
  const c = claims[id]; if (!c) throw new Error('unknown claim ' + id);
  used.add(id);
  return `<p class="claim ${cls}" data-claim="${id}" data-tag="${c.tag}">${tagEl(c.tag)}<span class="claim__text">${esc(c.text)}</span></p>`;
}

// ---- ISOLATE field: ticks on a jittered grid, banded by distance from the fault ----
function field() {
  const R = rng(20261031), F = [1120, 470], bands = [[], [], [], []];
  for (let y = 24; y < 900; y += 44) for (let x = 24; x < 1600; x += 44) {
    const jx = x + (R() - .5) * 22, jy = y + (R() - .5) * 22, a = R() * Math.PI, len = 8 + R() * 8;
    const d = Math.hypot(jx - F[0], jy - F[1]);
    if (d < 24) continue;   /* the odd bar (#odd, in index.src.html) stands at the fault point: no ordinary bar sits underneath it */
    const b = d > 520 ? 0 : d > 300 ? 1 : d > 150 ? 2 : 3;
    bands[b].push(`M${jx.toFixed(0)} ${jy.toFixed(0)}l${(Math.cos(a) * len).toFixed(1)} ${(Math.sin(a) * len).toFixed(1)}`);
  }
  return bands.map((p, i) => `<path class="mk mk--dim" data-band="${i}" d="${p.join('')}"/>`).join('') +
    `<g mask="url(#lampmask)">` + bands.map((p, i) => `<path class="mk mk--lit" data-band="${i}" d="${p.join('')}"/>`).join('') + `</g>`;
}

let html = fs.readFileSync(path.join(root, 'src/index.src.html'), 'utf8');
html = html
  .replace(/\{\{claim:([\w-]+)(?::([\w-]+))?\}\}/g, (_, id, cls) => claim(id, cls || ''))
  .replace(/\{\{field\}\}/g, field)
  .replace(/\{\{ledger\}\}/g, () => {
    const order = ['shipped', 'specified', 'limit', 'human_gate', 'assumption'];
    const EXTRA=['pr-adoption','aml-count','gig-25-pending','pr-national-scores','w1-concept-limit'];
    const rows = claimsFile.claims.filter(c => used.has(c.id) || EXTRA.includes(c.id)).sort((a, b) => order.indexOf(a.tag) - order.indexOf(b.tag));
    return `<ul class="ledger" data-count="${rows.length}">` + rows.map(c => `<li class="ledger__row" data-claim="${c.id}" data-tag="${c.tag}">${tagEl(c.tag)}<span>${esc(c.text)}</span></li>`).join('') + `</ul>`;
  });
// ledger must run after all claims are used: re-run once if the ledger macro came first
if (/\{\{/.test(html)) throw new Error('unresolved macro: ' + html.match(/\{\{[^}]+\}\}/)[0]);
fs.writeFileSync(path.join(root, 'site/index.html'), html);
console.log('built site/index.html', (html.length / 1024).toFixed(1) + ' KB;', used.size, 'claims rendered');

// Delivered CSS and JS match the Pages upload: one minified stylesheet, one minified script.
// esbuild is a build dependency only. Pin 0.27.7; that version produced the approved package.
const esbuild = await import('esbuild');
const css = fs.readFileSync(path.join(root, 'src/css/tokens.css'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'src/css/main.css'), 'utf8');
const cssOut = await esbuild.transform(css, { loader: 'css', minify: true });
const js = fs.readFileSync(path.join(root, 'src/js/main.js'), 'utf8');
const jsOut = await esbuild.transform(js, { loader: 'js', minify: true });
fs.mkdirSync(path.join(root, 'site/css'), { recursive: true });
fs.mkdirSync(path.join(root, 'site/js'), { recursive: true });
fs.writeFileSync(path.join(root, 'site/css/main.css'), cssOut.code);
fs.writeFileSync(path.join(root, 'site/js/main.js'), jsOut.code);
const tokensOut = path.join(root, 'site/css/tokens.css');
if (fs.existsSync(tokensOut)) fs.unlinkSync(tokensOut);
console.log('built site/css/main.css', cssOut.code.length, 'bytes');
console.log('built site/js/main.js', jsOut.code.length, 'bytes');

// Zodiak and Switzer are stored as base64 so the exact served bytes stay in git.
const fontSrc = path.join(root, 'src/fonts');
const fontOut = path.join(root, 'site/fonts');
fs.mkdirSync(fontOut, { recursive: true });
if (fs.existsSync(fontSrc)) {
  for (const name of fs.readdirSync(fontSrc)) {
    if (!name.endsWith('.b64')) continue;
    const bytes = Buffer.from(fs.readFileSync(path.join(fontSrc, name), 'utf8').replace(/\s/g, ''), 'base64');
    fs.writeFileSync(path.join(fontOut, name.slice(0, -4)), bytes);
  }
}
