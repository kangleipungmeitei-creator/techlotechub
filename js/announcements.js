(async () => {
  const { data, error } = await db.from("announcements").select("*").eq("published", true).order("created_at", { ascending: false });
  if (error) { $("list").innerHTML = '<div class="empty">Announcements couldn’t be loaded. Please try again later.</div>'; return; }
  $("list").innerHTML = data.length ? data.map(a => `<article class="paper"><h2>${esc(a.title)}</h2>
    <div class="meta">${fmt(a.created_at)}</div>
    ${(a.body || "").split(/\n\s*\n/).filter(x => x.trim()).map(x => `<p style="white-space:pre-wrap">${esc(x.trim())}</p>`).join("")}</article>`).join("")
    : '<div class="empty">No announcements yet. Check back soon.</div>';
})();
