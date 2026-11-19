#!/usr/bin/env node
/*
 * Builds the Library from resources.json.
 *
 *   node build-library.js
 *
 * Writes (static, crawlable HTML, no database needed):
 *   library/index.html
 *   library/developers/index.html
 *   library/designers/index.html
 *   sitemap.xml
 *   robots.txt
 *
 * Add or edit resources in resources.json, then run this script and commit the result.
 * See LIBRARY.md for the full guide.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'resources.json'), 'utf8'));
const SITE = data.siteUrl.replace(/\/$/, '');
const OWNER = data.owner;

// ---------- helpers ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attr = (s) => esc(s).replace(/\n/g, '&#10;');
const endDot = (s) => (/[.!?]$/.test(s) ? s : s + '.');
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const fmtSize = (b) => (b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`);
const TYPE_LABEL = { pdf: 'PDF', zip: 'ZIP', link: 'Links' };

const svg = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ICON = {
  link: svg('<path d="M7 17 17 7"/><path d="M8 7h9v9"/>'),
  pdf: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>'),
  zip: svg('<path d="M21 8v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>'),
  download: svg('<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>')
};

// ---------- shared nav + footer, taken from index.html so there is one source of truth ----------
const home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
function block(name) {
  const m = home.match(new RegExp(`<!--${name}-->([\\s\\S]*?)<!--/${name}-->`));
  if (!m) throw new Error(`Marker <!--${name}--> not found in index.html`);
  return m[1];
}
function toAbsolute(html) {
  return html
    .replace(/href="#(?!contact")/g, 'href="/#')
    .replace(/(src|href)="(?!https?:|\/|#|mailto:)/g, '$1="/');
}
const NAV = toAbsolute(block('NAV'));
const FOOTER = toAbsolute(block('FOOTER'));

// ---------- resources ----------
const ids = new Set();
const resources = data.resources.map((r) => {
  ['id', 'library', 'title', 'author', 'url', 'summary'].forEach((k) => {
    if (!r[k]) throw new Error(`Resource is missing "${k}": ${JSON.stringify(r).slice(0, 80)}`);
  });
  if (!r.license || !r.license.name || !r.license.url) throw new Error(`"${r.id}" needs license.name and license.url`);
  if (!Array.isArray(r.tags) || !r.tags.length) throw new Error(`"${r.id}" needs at least one tag`);
  if (!data.libraries[r.library]) throw new Error(`"${r.id}" uses unknown library "${r.library}"`);
  if (ids.has(r.id)) throw new Error(`Duplicate id "${r.id}"`);
  ids.add(r.id);

  const x = { ...r };
  if (x.file) {
    const p = path.join(ROOT, 'files', x.file);
    if (!fs.existsSync(p)) throw new Error(`"${x.id}": files/${x.file} does not exist`);
    const ext = path.extname(x.file).slice(1).toLowerCase();
    if (!['pdf', 'zip'].includes(ext)) throw new Error(`"${x.id}": only .pdf and .zip files are supported`);
    x.type = ext;
    x.sizeText = fmtSize(fs.statSync(p).size);
  } else {
    x.type = 'link';
  }
  return x;
});

// ---------- citations ----------
function apaParts(r) {
  const author = endDot(r.apaAuthor || r.author);
  const date = `(${r.year || 'n.d.'}).`;
  const edition = r.edition ? ` (${r.edition})` : '';
  const sameAsAuthor = r.publisher && (r.apaAuthor || r.author).replace(/\.$/, '') === r.publisher;
  const publisher = r.publisher && !sameAsAuthor ? `${r.publisher}. ` : '';
  return { author, date, title: r.title, edition, publisher, url: r.url };
}
function apaText(r) {
  const p = apaParts(r);
  return `${p.author} ${p.date} ${p.title}${p.edition}. ${p.publisher}${p.url}`;
}
function apaHtml(r) {
  const p = apaParts(r);
  return `${esc(p.author)} ${esc(p.date)} <i>${esc(p.title)}</i>${esc(p.edition)}. ${esc(p.publisher)}<a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.url)}</a>`;
}
function bibtex(r) {
  const key = r.id.replace(/-/g, '') + (r.year || 'nd');
  const lines = [
    `  author = {${r.bibAuthor || `{${r.author}}`}}`,
    `  title = {${r.title}}`
  ];
  if (r.year) lines.push(`  year = {${r.year}}`);
  if (r.edition) lines.push(`  edition = {${r.edition.replace(/\s*ed\.?$/i, '')}}`);
  if (r.publisher) lines.push(`  publisher = {${r.publisher}}`);
  lines.push(`  url = {${r.url}}`);
  lines.push(`  note = {License: ${r.license.name}}`);
  return `@misc{${key},\n${lines.join(',\n')}\n}`;
}
const isNC = (r) => /\bNC\b/.test(r.license.name);
const licenseLine = (r) =>
  `License: <a href="${esc(r.license.url)}" target="_blank" rel="noopener noreferrer">${esc(r.license.name)}</a>.` +
  (r.license.note ? ` ${esc(r.license.note)}` : '') +
  (isNC(r) ? ' Non-commercial: check the terms before using it in client or commercial work.' : '');

// ---------- page shell ----------
const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Anton&display=swap';

function page({ title, description, route, jsonld, body }) {
  const url = `${SITE}${route}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#0A0510">
<meta name="robots" content="index, follow, max-image-preview:large">

<meta property="og:site_name" content="${esc(OWNER)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/headshot.jpg">
<meta property="og:image:width" content="726">
<meta property="og:image:height" content="726">
<meta property="og:locale" content="en_NG">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}/headshot.jpg">

<script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
</script>

<script>document.documentElement.classList.add('js')</script>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/library.css">
</head>
<body>

${NAV}
<main>
${body}
</main>

${FOOTER}
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script src="/main.js"></script>
<script src="/library.js"></script>
</body>
</html>
`;
}

function titleHtml(lines, swash) {
  return lines
    .map((line, li) => {
      const idx = swash && swash[li];
      const inner =
        typeof idx === 'number' && idx >= 0 && idx < line.length
          ? `${esc(line.slice(0, idx))}<span class="swash-letter">${esc(line[idx])}</span>${esc(line.slice(idx + 1))}`
          : esc(line);
      return `<span class="line-mask"><span class="line-inner">${inner}</span></span>`;
    })
    .join('\n        ');
}

const personRef = { '@type': 'Person', '@id': `${SITE}/#person`, name: OWNER, url: `${SITE}/` };

function itemJsonLd(r) {
  const individual = (r.bibAuthor || '').includes(',');
  const item = {
    '@type': 'CreativeWork',
    name: r.title,
    description: r.summary,
    url: r.url,
    inLanguage: 'en',
    isAccessibleForFree: true,
    license: r.license.url,
    keywords: r.tags.join(', '),
    author: { '@type': individual ? 'Person' : 'Organization', name: r.apaAuthor || r.author },
    citation: apaText(r)
  };
  if (r.year) item.datePublished = String(r.year);
  if (r.publisher) item.publisher = { '@type': 'Organization', name: r.publisher };
  return item;
}

function crumbsLd(trail) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t[0], item: `${SITE}${t[1]}` }))
  };
}

// ---------- card ----------
function card(r, i) {
  const nc = isNC(r);
  const search = [r.title, r.author, r.kind, r.license.name, r.summary, ...r.tags].join(' ').toLowerCase();
  const primary = r.file
    ? `<a class="btn btn-primary" href="/files/${esc(r.file)}" download data-download>${ICON.download} Download ${TYPE_LABEL[r.type].replace('Links', 'file')}${r.sizeText ? ` <span class="res-size">${esc(r.sizeText)}</span>` : ''}</a>`
    : `<a class="btn btn-primary" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Open resource ${ICON.link}</a>`;
  const secondary = r.file
    ? `<a class="btn btn-ghost" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Original source ${ICON.link}</a>`
    : '';
  const meta = [r.author, r.year || 'n.d.', r.edition].filter(Boolean).join(' · ');

  return `<article class="res-card" id="${esc(r.id)}" style="--i:${i}" data-type="${r.type}" data-tags="${esc(r.tags.join('|'))}" data-search="${attr(search)}" data-url="${esc(r.url)}" data-apa="${attr(apaText(r))}" data-bibtex="${attr(bibtex(r))}">
  <div class="res-top">
    <span class="badge badge-kind">${ICON[r.type]} ${esc(r.kind || TYPE_LABEL[r.type])}</span>
    <span class="badge badge-lic${nc ? ' nc' : ''}" title="${nc ? 'Non-commercial license: check the terms before using in client or commercial work' : 'Open license'}">${esc(r.license.name)}</span>
  </div>
  <h3 class="res-title">${esc(r.title)}</h3>
  <p class="res-meta">${esc(meta)}</p>
  <p class="res-summary">${esc(r.summary)}</p>
  <ul class="res-tags">${r.tags.map((t) => `<li><button type="button" class="tag" data-tag="${esc(t)}">${esc(t)}</button></li>`).join('')}</ul>
  <div class="res-actions">${primary}${secondary}</div>
  <details class="res-cite">
    <summary>Cite &amp; license</summary>
    <div class="cite-body">
      <p class="cite-text">${apaHtml(r)}</p>
      <p class="cite-license">${licenseLine(r)}</p>
      <div class="cite-actions">
        <button type="button" class="mini" data-copy="apa">Copy APA</button>
        <button type="button" class="mini" data-copy="bibtex">Copy BibTeX</button>
      </div>
    </div>
  </details>
</article>`;
}

// ---------- library page ----------
function libraryPage(lib) {
  const items = resources.filter((r) => r.library === lib.slug).sort((a, b) => a.title.localeCompare(b.title));
  const n = items.length;
  const route = `/library/${lib.slug}/`;
  const other = data.libraries[lib.slug === 'developers' ? 'designers' : 'developers'];
  const types = [...new Set(items.map((r) => r.type))];

  const tagCount = {};
  items.forEach((r) => r.tags.forEach((t) => (tagCount[t] = (tagCount[t] || 0) + 1)));
  const tags = Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a] || a.localeCompare(b)).slice(0, 16);

  const typeChips =
    types.length > 1
      ? `<div class="lib-filters" role="group" aria-label="Filter by type">
      <button type="button" class="chip" data-type-filter="all" aria-pressed="true">All</button>
      ${types.map((t) => `<button type="button" class="chip" data-type-filter="${t}" aria-pressed="false">${TYPE_LABEL[t]}</button>`).join('\n      ')}
    </div>`
      : '';

  const refs = [...items].sort((a, b) => (a.apaAuthor || a.author).localeCompare(b.apaAuthor || b.author));

  const body = `
  <section class="lib-hero tone-dark">
    <div class="section-inner">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/library/">Library</a><span aria-hidden="true">/</span><span aria-current="page">${esc(lib.slug.charAt(0).toUpperCase() + lib.slug.slice(1))}</span></nav>
      <h1 class="jr-heading lib-title wipe-heading" aria-label="${esc(lib.name)}">
        ${titleHtml(lib.lines, lib.swash)}
      </h1>
      <p class="lib-lead">${esc(lib.lead)}</p>
      <ul class="lib-pills">
        <li class="lib-pill"><strong>${n}</strong> ${n === 1 ? 'resource' : 'resources'}</li>
        <li class="lib-pill">Open licenses</li>
        <li class="lib-pill">Every entry cited</li>
        <li class="lib-pill">One download at a time</li>
      </ul>
    </div>
  </section>

  <section class="lib-main tone-light">
    <div class="section-inner">
      <div class="lib-toolbar" id="libToolbar" role="search">
        <label class="lib-search"><span class="sr-only">Search resources</span>${ICON.search}<input id="libSearch" type="search" placeholder="Search ${plural(n, 'resource')}…" autocomplete="off"></label>
        ${typeChips}
      </div>
      <div class="lib-tagrow" role="group" aria-label="Filter by topic">
        ${tags.map((t) => `<button type="button" class="chip" data-tag-filter="${esc(t)}" aria-pressed="false">${esc(t)}</button>`).join('\n        ')}
      </div>
      <p class="lib-count" id="libCount" aria-live="polite">Showing ${n} of ${n} resources</p>
      <h2 class="sr-only">Resources</h2>
      <div class="res-grid" id="resGrid">
${items.map((r, i) => card(r, i)).join('\n')}
      </div>
      <div class="lib-empty" id="libEmpty"><p>No resources match that search.</p><button type="button" class="btn btn-ghost" id="libReset">Clear filters</button></div>
    </div>
  </section>

  <section class="lib-refs tone-light">
    <div class="section-inner">
      <h2 class="swash-heading">References</h2>
      <p class="lib-refs-lead">Every resource above in APA 7 style, with the license it is shared under. Please credit the authors when you use their work.</p>
      <ul class="refs">
${refs.map((r) => `        <li id="ref-${esc(r.id)}">${apaHtml(r)} <span class="ref-lic">${licenseLine(r)}</span></li>`).join('\n')}
      </ul>
      <p class="refs-note">Spotted a wrong license, a broken link or a missing credit? Message me using the contact options below and I'll fix it.</p>
    </div>
  </section>

  <section class="lib-cross tone-dark">
    <div class="section-inner lib-cross-inner">
      <h2>Looking for the ${esc(other.name)}?</h2>
      <a class="pill-solid" href="/library/${other.slug}/">Open the ${esc(other.name)} →</a>
    </div>
  </section>`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE}${route}#page`,
        url: `${SITE}${route}`,
        name: lib.name,
        description: lib.metaDescription,
        inLanguage: 'en',
        isPartOf: { '@id': `${SITE}/#website` },
        author: personRef,
        mainEntity: { '@id': `${SITE}${route}#list` }
      },
      {
        '@type': 'ItemList',
        '@id': `${SITE}${route}#list`,
        numberOfItems: n,
        itemListElement: items.map((r, i) => ({ '@type': 'ListItem', position: i + 1, item: itemJsonLd(r) }))
      },
      crumbsLd([['Home', '/'], ['Library', '/library/'], [lib.name, route]])
    ]
  };

  return { route, html: page({ title: lib.metaTitle, description: lib.metaDescription, route, jsonld, body }) };
}

// ---------- hub page ----------
function hubPage() {
  const route = '/library/';
  const libs = Object.values(data.libraries);
  const count = (slug) => resources.filter((r) => r.library === slug).length;
  const total = resources.length;
  const hasNC = resources.some(isNC);
  const title = `Library: free open-licensed resources | ${OWNER}`;
  const description = 'Two curated libraries of free, open-licensed resources, one for developers and one for designers. Every entry is credited, licensed and ready to cite.';

  const body = `
  <section class="lib-hero tone-dark">
    <div class="section-inner">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">Library</span></nav>
      <h1 class="jr-heading lib-title wipe-heading" aria-label="The library">
        ${titleHtml(['THE', 'LIBRARY'], [null, 3])}
      </h1>
      <p class="lib-lead">Free, open-licensed resources I use and recommend, split into two libraries. Every entry credits its author, shows its license and comes with a citation you can copy.</p>
      <ul class="lib-pills">
        <li class="lib-pill"><strong>${total}</strong> ${total === 1 ? 'resource' : 'resources'}</li>
        <li class="lib-pill">Open licenses</li>
        <li class="lib-pill">Every entry cited</li>
        <li class="lib-pill">One download at a time</li>
      </ul>
    </div>
  </section>

  <section class="lib-main tone-light">
    <div class="section-inner">
      <h2 class="sr-only">Choose a library</h2>
      <div class="lib-teaser-grid">
${libs
  .map(
    (l) => `        <a class="lib-tile reveal" href="/library/${l.slug}/">
          <span class="lib-tile-kind">For ${esc(l.slug)}</span>
          <span class="lib-tile-count">${plural(count(l.slug), 'resource')}</span>
          <span class="lib-tile-title">${esc(l.slug.toUpperCase())}</span>
          <span class="lib-tile-copy">${esc(l.lead.split('. ')[0])}.</span>
          <span class="lib-tile-go" aria-hidden="true">→</span>
        </a>`
  )
  .join('\n')}
      </div>
    </div>
  </section>

  <section class="lib-principles tone-dark">
    <div class="section-inner">
      <p class="eyebrow">How the library works</p>
      <div class="principles">
        <div class="principle"><span class="principle-num">01</span><h3>Open licenses only</h3><p>Every entry is free to use under a license stated on its card, so you know exactly what you can and can't do with it.</p></div>
        <div class="principle"><span class="principle-num">02</span><h3>Cited, always</h3><p>Authors are credited, sources are linked, and each card has a citation you can copy in APA or BibTeX.</p></div>
        <div class="principle"><span class="principle-num">03</span><h3>One at a time</h3><p>Downloads are one file per click, on purpose. There is no download-everything button and a gentle limit per visitor, so the library stays fast and free for everyone.</p></div>
      </div>
      ${hasNC ? '<p class="lib-nc-note">Licenses marked in amber include a non-commercial (NC) term. Read the terms before using those in client or commercial work.</p>' : ''}
    </div>
  </section>`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE}${route}#page`,
        url: `${SITE}${route}`,
        name: 'Library',
        description,
        inLanguage: 'en',
        isPartOf: { '@id': `${SITE}/#website` },
        author: personRef,
        hasPart: libs.map((l) => ({ '@type': 'CollectionPage', name: l.name, url: `${SITE}/library/${l.slug}/` }))
      },
      crumbsLd([['Home', '/'], ['Library', route]])
    ]
  };

  return { route, html: page({ title, description, route, jsonld, body }) };
}

// ---------- write everything ----------
const outputs = [hubPage(), ...Object.values(data.libraries).map(libraryPage)];
outputs.forEach(({ route, html }) => {
  const dir = path.join(ROOT, route.replace(/^\//, ''));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  console.log('wrote', path.join(route, 'index.html'));
});

const today = new Date().toISOString().slice(0, 10);
const urls = ['/', ...outputs.map((o) => o.route)];
fs.writeFileSync(
  path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url>\n    <loc>${SITE}${u}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`).join('\n') +
    `\n</urlset>\n`
);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`wrote sitemap.xml (${urls.length} urls) and robots.txt`);
console.log(`${resources.length} resources across ${Object.keys(data.libraries).length} libraries`);
