(async () => {
  let cat = new URLSearchParams(location.search).get("cat") || "", q = "";
  const [c, p] = await Promise.all([
    db.from("categories").select("*").order("name"),
    db.from("papers").select("title,slug,abstract,author,created_at,pdf_path,category_id").eq("published", true).order("created_at", {ascending:false}).limit(300)
  ]);
  if (c.error || p.error) { $("list").innerHTML = '<div class="empty">Papers couldn’t be loaded. Check js/config.js and try again.</div>'; return; }
  const cats = c.data, papers = p.data, byId = Object.fromEntries(cats.map(x => [x.id, x]));
  function render() {
    $("cats").innerHTML = [{slug:"",name:"All"}, ...cats].map(x =>
      `<button class="cat${x.slug === cat ? " on" : ""}" data-c="${esc(x.slug)}">${esc(x.name)}</button>`).join("");
    const t = q.toLowerCase();
    const rows = papers.filter(x => (!cat || byId[x.category_id]?.slug === cat) && (!t || (x.title + " " + x.abstract).toLowerCase().includes(t)));
    $("list").innerHTML = rows.length ? rows.map(x => `<article class="paper">
      <h2><a href="paper.html?slug=${encodeURIComponent(x.slug)}">${esc(x.title)}</a></h2>
      <div class="meta">${x.author ? "By " + esc(x.author) + " · " : ""}${esc(byId[x.category_id]?.name || "Uncategorised")} · ${fmt(x.created_at)}${x.pdf_path ? " · PDF available" : ""}</div>
      ${x.abstract ? `<p>${esc(x.abstract)}</p>` : ""}</article>`).join("") : '<div class="empty">No papers found.</div>';
  }
  $("cats").onclick = e => { const s = e.target.dataset.c; if (s !== undefined) { cat = s; render(); } };
  $("q").oninput = e => { q = e.target.value.trim(); render(); };
  render();
})();
