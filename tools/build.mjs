// Build: src/index.src.html + src/claims.json -> site/index.html
// Run: node tools/build.mjs   (no dependencies)
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
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

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

function render(template, { ledgerExtra = false } = {}) {
  const used = new Set();
  const claim = (id, cls = '') => {
    const c = claims[id]; if (!c) throw new Error('unknown claim ' + id);
    used.add(id);
    return `<p class="claim ${cls}" data-claim="${id}" data-tag="${c.tag}">${tagEl(c.tag)}<span class="claim__text">${esc(c.text)}</span></p>`;
  };
  let html = template
    .replaceAll('{{work}}', () => read('src/partials/work.html'))
    .replaceAll('{{pipeline}}', () => read('src/partials/pipeline.html'))
    .replace(/\{\{claim:([\w-]+)(?::([\w-]+))?\}\}/g, (_, id, cls) => claim(id, cls || ''))
    .replace(/\{\{field\}\}/g, field)
    .replace(/\{\{ledger\}\}/g, () => {
      const order = ['shipped', 'specified', 'limit', 'human_gate', 'assumption'];
      const EXTRA = ledgerExtra ? ['pr-adoption', 'aml-count', 'gig-25-pending', 'pr-national-scores', 'w1-concept-limit'] : [];
      const rows = claimsFile.claims.filter(c => used.has(c.id) || EXTRA.includes(c.id)).sort((a, b) => order.indexOf(a.tag) - order.indexOf(b.tag));
      return `<ul class="ledger" data-count="${rows.length}">` + rows.map(c => `<li class="ledger__row" data-claim="${c.id}" data-tag="${c.tag}">${tagEl(c.tag)}<span>${esc(c.text)}</span></li>`).join('') + `</ul>`;
    });
  if (/\{\{/.test(html)) throw new Error('unresolved macro: ' + html.match(/\{\{[^}]+\}\}/)[0]);
  return { html, used };
}

const pages = [
  ['src/index.src.html', 'site/index.html', true],
  ['src/pages/resume.src.html', 'site/resume/index.html', false],
  ['src/pages/log.src.html', 'site/log/index.html', false],
  ['src/pages/demo-textbackcaller.src.html', 'site/demo/textbackcaller/index.html', false],
  ['src/pages/work-textbackcaller.src.html', 'site/work/textbackcaller/index.html', false],
  ['src/pages/work-pitchreach.src.html', 'site/work/pitchreach/index.html', false],
  ['src/pages/work-agent-crs.src.html', 'site/work/agent-crs/index.html', false],
  ['src/pages/work-amltracker.src.html', 'site/work/amltracker/index.html', false],
  ['src/pages/work-airworthiness.src.html', 'site/work/airworthiness-mcp/index.html', false],
];

for (const [src, dest, extra] of pages) {
  const { html, used } = render(read(src), { ledgerExtra: extra });
  const out = path.join(root, dest);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log('built', dest, (html.length / 1024).toFixed(1) + ' KB;', used.size, 'claims rendered');
}
