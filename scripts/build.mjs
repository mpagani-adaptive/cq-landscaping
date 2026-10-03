// Static build for Vercel: copies the site into dist/ and renders job pages from
// projects/data/*.json (written by the crewpost Telegram bot). No dependencies.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'dist');
const SITE = 'https://cqyards.com';
const SKIP = new Set(['dist', 'api', 'scripts', 'node_modules', '.git', '.vercel', 'README.md', 'vercel.json', 'package.json']);

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
const write = (rel, body) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, body); };

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
for (const name of fs.readdirSync(ROOT)) {
  if (SKIP.has(name)) continue;
  fs.cpSync(path.join(ROOT, name), path.join(OUT, name), { recursive: true, filter: (src) => !src.includes(`${path.sep}projects${path.sep}data`) && !src.endsWith('.gitkeep') });
}

const dataDir = path.join(ROOT, 'projects', 'data');
const projects = fs.readdirSync(dataDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8')))
  .filter((p) => !p.hidden)
  .sort((a, b) => b.postedAt.localeCompare(a.postedAt));

const img = (p, i = 0) => p.photos[i];
const cover = (p) => `/projects/img/${p.slug}/${img(p).file}`;
const coverM = (p) => `/projects/img/${p.slug}/${img(p).fileM || img(p).file}`;

const shell = ({ title, desc, url, image, body }) => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:site_name" content="C&amp;Q Landscaping">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/logo-192.webp"><link rel="apple-touch-icon" href="/assets/logo-192.webp">
<style>
:root{--ink:#141a12;--gold:#f2b21a;--text:#fbf7ee}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:var(--text);background:#0f140d;line-height:1.6}
a{color:inherit;text-decoration:none}img{display:block;max-width:100%}
header{display:flex;justify-content:space-between;align-items:center;padding:14px 5vw;border-bottom:1px solid rgba(255,255,255,.1)}
header .brand{display:flex;align-items:center;gap:10px;font-weight:700}header .brand img{width:42px;height:42px;border-radius:50%}
header .call{color:var(--gold);font-weight:600}
main{max-width:960px;margin:0 auto;padding:40px 5vw 60px}
h1{font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:clamp(30px,5vw,48px);line-height:1.1;margin-bottom:10px}
.meta{opacity:.7;font-size:14px;margin-bottom:28px}
.photos{display:grid;gap:14px;margin-bottom:28px}.photos img{width:100%;border-radius:14px}
.body p{font-size:18px;margin-bottom:14px;max-width:65ch}
.cta{margin-top:36px;padding:28px;border-radius:18px;background:#1f2a1c;text-align:center}
.cta b{display:block;font-size:20px;margin-bottom:12px}.cta a{display:inline-block;margin:6px;padding:14px 24px;border-radius:999px;background:var(--gold);color:var(--ink);font-weight:700}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}
.card{border-radius:16px;overflow:hidden;background:#1f2a1c;border:1px solid rgba(255,255,255,.1)}.card img{width:100%;aspect-ratio:4/3;object-fit:cover}
.card span{display:block;padding:12px 14px;font-weight:600}.card small{display:block;opacity:.7;font-weight:400}
.back{display:inline-block;margin-top:28px;color:var(--gold);font-weight:600}
footer{text-align:center;padding:30px 5vw 50px;font-size:13px;opacity:.7}
</style></head><body>
<header><a class="brand" href="/"><img src="/assets/logo-192.webp" alt="">C&amp;Q Landscaping</a><a class="call" href="tel:7248880762">724-888-0762</a></header>
<main>${body}</main>
<footer>© ${new Date().getFullYear()} C&amp;Q Landscaping · Beaver County, PA · Free estimates</footer>
</body></html>`;

const cta = `<div class="cta"><b>Want yours done like this?</b><a href="tel:7248880762">Call 724-888-0762</a><a href="tel:7247091361">Call 724-709-1361</a></div>`;
const card = (p, cls) => `<a class="${cls}" href="/projects/${p.slug}/"><img src="${coverM(p)}" loading="lazy" alt="${esc(p.title)}"><span>${esc(p.title)}<small>${fmtDate(p.postedAt)}</small></span></a>`;

for (const p of projects) {
  const url = `${SITE}/projects/${p.slug}/`;
  const paras = p.body.split(/\n+/).filter(Boolean).map((l) => `<p>${esc(l)}</p>`).join('');
  const photos = p.photos.map((ph, i) => `<img src="/projects/img/${p.slug}/${ph.file}"${ph.fileM ? ` srcset="/projects/img/${p.slug}/${ph.fileM} 800w, /projects/img/${p.slug}/${ph.file} 1600w" sizes="(max-width:960px) 100vw, 960px"` : ''} ${i ? 'loading="lazy" ' : ''}alt="${esc(p.title)}, photo ${i + 1}">`).join('');
  const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: p.title, datePublished: p.postedAt, image: p.photos.map((ph) => `${SITE}/projects/img/${p.slug}/${ph.file}`), author: { '@type': 'Organization', name: 'C&Q Landscaping' } };
  write(`projects/${p.slug}/index.html`, shell({
    title: `${p.title} | C&Q Landscaping`,
    desc: p.body.replace(/\s+/g, ' ').slice(0, 155),
    url, image: SITE + cover(p),
    body: `<h1>${esc(p.title)}</h1><div class="meta">${fmtDate(p.postedAt)} · Beaver County, PA</div><div class="photos">${photos}</div><div class="body">${paras}</div>${cta}<a class="back" href="/projects/">← All jobs</a><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`,
  }));
}

write('projects/index.html', shell({
  title: 'Recent jobs | C&Q Landscaping', desc: 'Recent mowing, cleanup, mulch and hardscape jobs by C&Q Landscaping in Beaver County, PA.',
  url: `${SITE}/projects/`, image: `${SITE}/assets/og.jpg`,
  body: `<h1>Recent jobs</h1><div class="meta">Straight from the crew, as they finish.</div>${projects.length ? `<div class="grid">${projects.map((p) => card(p, 'card')).join('')}</div>` : '<p>New jobs coming soon.</p>'}${cta}`,
}));

// Homepage strip: the 6 newest jobs, only once there is at least one.
const home = path.join(OUT, 'index.html');
const recent = projects.length
  ? `<div class="recent"><h3>Fresh off the truck</h3><div class="rgrid">${projects.slice(0, 6).map((p) => card(p, 'rcard')).join('')}</div><a class="rmore" href="/projects/">See all recent jobs →</a></div>`
  : '';
fs.writeFileSync(home, fs.readFileSync(home, 'utf8').replace('<!--RECENT-->', recent));

const urls = [`${SITE}/`, `${SITE}/projects/`, ...projects.map((p) => `${SITE}/projects/${p.slug}/`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nDisallow: /options/\nDisallow: /badass/\nDisallow: /refined/\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`built ${projects.length} project page(s) into dist/`);
