(async () => {
  const slug = new URLSearchParams(location.search).get("slug");
  const { data: p } = await db.from("papers").select("id,title").eq("slug", slug || "").eq("published", true).maybeSingle();
  if (!p) { $("ptitle").textContent = "This paper wasn’t found."; return; }
  $("ptitle").textContent = "About: " + p.title; $("f").hidden = false;
  const msg = (t, ok) => { $("msg").textContent = t; $("msg").className = ok ? "ok" : "err"; };
  $("f").onsubmit = async e => {
    e.preventDefault(); if ($("hp").value) return;
    const m = $("m").value.trim();
    if (m.length < 10) return msg("Please describe the problem in a little more detail.");
    $("go").disabled = true;
    const { error } = await db.from("issue_reports").insert({ paper_id: p.id, kind: $("k").value, message: m, reporter_email: $("e").value.trim() });
    $("go").disabled = false;
    if (error) return msg("Your report couldn’t be sent. Please try again.");
    $("f").reset(); msg("Thank you. Your report was sent to our team, and we will check it.", true);
  };
})();
