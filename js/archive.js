// Keeps the "All papers" page current: the page is pre-built for search engines,
// and this script refreshes the list for visitors with the latest published papers.
(async () => {
  const { data, error } = await db.from("papers")
    .select("title,slug,abstract,author,created_at,categories(name),authors(name)")
    .eq("published", true).order("created_at", { ascending: false });
  if (error || !data) return;   // keep the pre-built list if anything goes wrong
  $("alist").innerHTML = data.length ? data.map(p => {
    const who = (p.authors && p.authors.name) || p.author || "";
    return `<article class="paper"><h2><a href="paper.html?slug=${encodeURIComponent(p.slug)}">${esc(p.title)}</a></h2>
      <div class="meta">${who ? "By " + esc(who) + " · " : ""}${p.categories ? esc(p.categories.name) + " · " : ""}${fmt(p.created_at)}</div>
      ${p.abstract ? `<p>${esc(clip(p.abstract))}</p>` : ""}</article>`;
  }).join("") : "<p>No papers have been published yet.</p>";
})();
