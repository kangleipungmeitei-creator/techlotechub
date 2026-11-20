(async () => {
  const slug = new URLSearchParams(location.search).get("slug");
  const { data: p } = await db.from("papers").select("*, categories(name,slug), authors(name,slug)").eq("slug", slug || "").eq("published", true).maybeSingle();
  if (!p) { $("main").innerHTML = '<div class="empty">This paper wasn’t found. <a href="index.html">Back to all papers</a></div>'; return; }
  document.title = p.title + " · " + CONFIG.SITE_NAME;
  const url = pdfUrl(p.pdf_path);
  const text = (p.content || "").split(/\n\s*\n/).filter(Boolean).map(x => `<p>${esc(x.trim())}</p>`).join("") || "<p>The text version isn’t available for this paper.</p>";
  const an = p.authors ? p.authors.name : (p.author || ""), yr = new Date(p.created_at).getFullYear();
  const link = CONFIG.SITE_URL ? `${CONFIG.SITE_URL}/papers/${p.slug}.html` : location.href;
  const who = p.authors ? `<a href="author.html?slug=${encodeURIComponent(p.authors.slug)}">${esc(p.authors.name)}</a>` : esc(p.author);
  const ticks = [[p.checked_original, "Original work checked"], [p.checked_sources, "Sources checked"], [p.checked_pdf, "PDF matches the text"]].filter(x => x[0]);
  const review = p.reviewed_at ? `<aside class="review"><b>Reviewed by ${esc(p.reviewed_by || "the editorial team")} on ${fmt(p.reviewed_at)}</b>
    ${ticks.length ? `<ul>${ticks.map(t => `<li>✓ ${t[1]}</li>`).join("")}</ul>` : ""}
    ${p.editor_note ? `<p><b>Editor’s note:</b> ${esc(p.editor_note)}</p>` : ""}</aside>` : "";
  const refs = (p.references_text || "").split("\n").map(x => x.trim()).filter(Boolean);
  const corr = Array.isArray(p.corrections) ? p.corrections : [];
  const apa = `${an ? an + ". " : ""}(${yr}). ${p.title}. ${CONFIG.SITE_NAME}. ${link}`;
  const bib = `@misc{${p.slug.replace(/[^a-z0-9]/gi, "")},\n  author = {${an}},\n  title = {${p.title}},\n  year = {${yr}},\n  howpublished = {${CONFIG.SITE_NAME}},\n  url = {${link}}\n}`;
  $("main").innerHTML = `<article>
    <h1 style="margin:34px 0 6px">${esc(p.title)}</h1>
    <div class="meta">${who ? "By " + who + " · " : ""}${p.categories ? `<a href="index.html?cat=${encodeURIComponent(p.categories.slug)}">${esc(p.categories.name)}</a> · ` : ""}${fmt(p.created_at)}</div>
    ${p.abstract ? `<p class="abs">${esc(p.abstract)}</p>` : ""}${review}
    <div class="tabs"><button id="tt" class="on">Read as text</button>${url ? '<button id="tp">View PDF</button>' : ""}${url ? `<a href="${esc(url)}" download><button>Download PDF</button></a>` : ""}</div>
    <div id="text" class="article">${text}</div>
    ${url ? `<iframe id="pdf" class="pdf" src="${esc(url)}" title="PDF of ${esc(p.title)}" hidden></iframe>` : ""}
    ${refs.length ? `<section class="sec"><h2>References</h2><ol>${refs.map(r => `<li>${esc(r)}</li>`).join("")}</ol></section>` : ""}
    ${corr.length ? `<section class="sec"><h2>Updates and corrections</h2><ul>${corr.map(c => `<li><b>${fmt(c.date)}:</b> ${esc(c.note)}</li>`).join("")}</ul></section>` : ""}
    <section class="sec"><details><summary>How to cite</summary><p class="meta">APA</p><pre class="cite">${esc(apa)}</pre><p class="meta">BibTeX</p><pre class="cite">${esc(bib)}</pre></details></section>
    <p class="sec"><a href="report.html?slug=${encodeURIComponent(p.slug)}">Report an issue with this paper</a></p></article>`;
  if (url) {
    const show = pdf => { $("text").hidden = pdf; $("pdf").hidden = !pdf; $("tt").classList.toggle("on", !pdf); $("tp").classList.toggle("on", pdf); };
    $("tt").onclick = () => show(false); $("tp").onclick = () => show(true);
  }
})();
