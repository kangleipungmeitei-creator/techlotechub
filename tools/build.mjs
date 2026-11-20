// Pre-renders every published paper as plain HTML so search engines and AdSense can read the full text.
// Run (Node 18+):  node tools/build.mjs
// Then upload the generated papers/ folder, archive.html, sitemap.xml and robots.txt along with the rest of the site.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";

const cfg = readFileSync("js/config.js", "utf8");
const get = k => (cfg.match(new RegExp(k + '\\s*:\\s*"([^"]*)"')) || [])[1];
const URL_ = get("SUPABASE_URL"), KEY = get("SUPABASE_KEY"), NAME = get("SITE_NAME"), SITE = (get("SITE_URL") || "").replace(/\/$/, "");
const clip = (s, n = 240) => { s = String(s || ""); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s; };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const date = d => new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });

let papers;
if (process.env.PAPERS_JSON) papers = JSON.parse(readFileSync(process.env.PAPERS_JSON, "utf8"));   // for testing
else {
  const r = await fetch(`${URL_}/rest/v1/papers?select=*,categories(name,slug),authors(name,slug)&published=eq.true&order=created_at.desc`, { headers: { apikey: KEY } });
  if (!r.ok) { console.error("Could not load papers:", r.status, await r.text()); process.exit(1); }
  papers = await r.json();
}

const LINKS = p => `<a href="${p}about.html">About</a> · <a href="${p}contact.html">Contact</a> · <a href="${p}privacy.html">Privacy Policy</a> · <a href="${p}terms.html">Terms &amp; Disclaimer</a> · <a href="${p}announcements.html">Announcements</a> · <a href="${p}archive.html">All papers</a>`;
const shell = (p, title, desc, canon, extra, body) => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">${canon ? `<link rel="canonical" href="${esc(canon)}">` : ""}
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${p}css/style.css?v=6">${extra}</head><body>
<header class="top"><div class="wrap"><a class="site-name" href="${p}index.html">${esc(NAME)}</a><nav><a href="${p}index.html">Papers</a><a href="${p}submit.html">Submit a paper</a></nav></div></header>
${body}
<footer><div class="wrap"><p>Every paper here is contributed by independent researchers and developers who share their knowledge for free. Each paper credits its author.</p><p>Tech Lo Tech Hub (kangleipungweb.in) is operated under Kangleipung Initiative.</p><p class="flinks">${LINKS(p)}</p></div></footer><script src="${p}js/config.js?v=6"></script><script src="${p}js/announce.js?v=6"></script></body></html>`;

rmSync("papers", { recursive: true, force: true }); mkdirSync("papers");
for (const p of papers) {
  const url = p.pdf_path ? `${URL_}/storage/v1/object/public/papers/${p.pdf_path}` : "";
  const text = (p.content || "").split(/\n\s*\n/).map(x => x.trim()).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join("\n") || "<p>The full text of this paper is available as a PDF.</p>";
  const desc = (p.abstract || p.title).slice(0, 155);
  const an = p.authors ? p.authors.name : (p.author || ""), yr = new Date(p.created_at).getFullYear();
  const link = SITE ? `${SITE}/papers/${p.slug}.html` : "";
  const who = p.authors ? `<a href="../author.html?slug=${esc(p.authors.slug)}">${esc(p.authors.name)}</a>` : esc(p.author || "");
  const ticks = [[p.checked_original, "Original work checked"], [p.checked_sources, "Sources checked"], [p.checked_pdf, "PDF matches the text"]].filter(x => x[0]);
  const review = p.reviewed_at ? `<aside class="review"><b>Reviewed by ${esc(p.reviewed_by || "the editorial team")} on ${date(p.reviewed_at)}</b>${ticks.length ? `<ul>${ticks.map(t => `<li>✓ ${t[1]}</li>`).join("")}</ul>` : ""}${p.editor_note ? `<p><b>Editor’s note:</b> ${esc(p.editor_note)}</p>` : ""}</aside>` : "";
  const refs = (p.references_text || "").split("\n").map(x => x.trim()).filter(Boolean);
  const corr = Array.isArray(p.corrections) ? p.corrections : [];
  const apa = `${an ? an + ". " : ""}(${yr}). ${p.title}. ${NAME}.${link ? " " + link : ""}`;
  const bib = `@misc{${p.slug.replace(/[^a-z0-9]/gi, "")},\n  author = {${an}},\n  title = {${p.title}},\n  year = {${yr}},\n  howpublished = {${NAME}}${link ? `,\n  url = {${link}}` : ""}\n}`;
  const ld = `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "ScholarlyArticle", headline: p.title, description: p.abstract || "", datePublished: p.created_at, ...(an ? { author: { "@type": "Person", name: an } } : {}), ...(link ? { url: link } : {}) }).replace(/</g, "\\u003c")}</script>`;
  const body = `<main class="wrap"><article>
<h1 style="margin:34px 0 6px">${esc(p.title)}</h1>
<div class="meta">${who ? `By ${who} · ` : ""}${p.categories ? `${esc(p.categories.name)} · ` : ""}${date(p.created_at)}</div>
${p.abstract ? `<p class="abs">${esc(p.abstract)}</p>` : ""}${review}
${url ? `<p><a href="${esc(url)}" download>Download the PDF</a> · <a href="${esc(url)}" target="_blank" rel="noopener">Open the PDF in a new tab</a></p>` : ""}
<div class="article">${text}</div>
${refs.length ? `<section class="sec"><h2>References</h2><ol>${refs.map(r => `<li>${esc(r)}</li>`).join("")}</ol></section>` : ""}
${corr.length ? `<section class="sec"><h2>Updates and corrections</h2><ul>${corr.map(c => `<li><b>${date(c.date)}:</b> ${esc(c.note)}</li>`).join("")}</ul></section>` : ""}
<section class="sec"><details><summary>How to cite</summary><p class="meta">APA</p><pre class="cite">${esc(apa)}</pre><p class="meta">BibTeX</p><pre class="cite">${esc(bib)}</pre></details></section>
<p class="sec"><a href="../report.html?slug=${encodeURIComponent(p.slug)}">Report an issue with this paper</a></p></article></main>`;
  writeFileSync(`papers/${p.slug}.html`, shell("../", `${p.title} · ${NAME}`, desc, link, ld, body));
}

const list = papers.map(p => `<article class="paper"><h2><a href="papers/${esc(p.slug)}.html">${esc(p.title)}</a></h2>
<div class="meta">${(p.authors ? p.authors.name : p.author) ? `By ${esc(p.authors ? p.authors.name : p.author)} · ` : ""}${p.categories ? `${esc(p.categories.name)} · ` : ""}${date(p.created_at)}</div>${p.abstract ? `<p>${esc(clip(p.abstract))}</p>` : ""}</article>`).join("\n");
// Put the same list into the home page as plain HTML (the page script then replaces it with the searchable version)
let idx = readFileSync("index.html", "utf8");
idx = idx.replace(/<!--PAPERS-->[\s\S]*?<!--\/PAPERS-->/, () => `<!--PAPERS-->${list || '<div class="empty">No papers have been published yet.</div>'}<!--/PAPERS-->`);
writeFileSync("index.html", idx);
writeFileSync("archive.html", shell("", `All papers · ${NAME}`, `Browse every paper published on ${NAME}.`, SITE ? `${SITE}/archive.html` : "", "",
  `<main class="wrap prose"><h1>All papers</h1>${list || "<p>No papers have been published yet.</p>"}</main>`));

if (SITE) {
  const pages = ["", "archive.html", "submit.html", "announcements.html", "about.html", "contact.html", "privacy.html", "terms.html", ...papers.map(p => `papers/${p.slug}.html`)];
  writeFileSync("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(x => `<url><loc>${SITE}/${x}</loc></url>`).join("\n")}\n</urlset>\n`);
  writeFileSync("robots.txt", `User-agent: *\nDisallow: /admin.html\nDisallow: /report.html\n\nSitemap: ${SITE}/sitemap.xml\n`);
}
console.log(`Built ${papers.length} paper page(s), archive.html${SITE ? ", sitemap.xml and robots.txt" : ""}.`);
