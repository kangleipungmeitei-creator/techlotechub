(async () => {
  const slug = new URLSearchParams(location.search).get("slug");
  const { data: a } = await db.from("authors").select("*").eq("slug", slug || "").maybeSingle();
  if (!a) { $("main").innerHTML = '<div class="empty">This author wasn’t found. <a href="index.html">Back to all papers</a></div>'; return; }
  document.title = a.name + " · " + CONFIG.SITE_NAME;
  const { data: ps } = await db.from("papers").select("title,slug,abstract,created_at").eq("author_id", a.id).eq("published", true).order("created_at", { ascending: false });
  const http = u => /^https?:\/\//i.test(u || "") ? u : "";
  const orc = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(a.orcid || "") ? "https://orcid.org/" + a.orcid : http(a.orcid);
  const links = [["Website", http(a.website)], ["GitHub", http(a.github)], ["LinkedIn", http(a.linkedin)], ["ORCID", orc]].filter(l => l[1])
    .map(l => `<a href="${esc(l[1])}" target="_blank" rel="noopener noreferrer">${l[0]}</a>`).join(" · ");
  $("main").innerHTML = `<h1>${esc(a.name)}</h1>${a.bio ? `<p style="white-space:pre-wrap">${esc(a.bio)}</p>` : ""}${links ? `<p>${links}</p>` : ""}
    <h2>Papers by ${esc(a.name)}</h2>` + ((ps || []).length ? ps.map(x => `<article class="paper"><h2 style="font-size:1.15rem"><a href="paper.html?slug=${encodeURIComponent(x.slug)}">${esc(x.title)}</a></h2>
    <div class="meta">${fmt(x.created_at)}</div>${x.abstract ? `<p>${esc(x.abstract)}</p>` : ""}</article>`).join("") : '<div class="empty">No published papers yet.</div>');
})();
