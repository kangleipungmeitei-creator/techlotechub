(async () => {
  const { data } = await db.from("categories").select("name").order("name");
  $("sc").innerHTML = '<option value="">Not sure</option>' + (data || []).map(c => `<option>${esc(c.name)}</option>`).join("");
  const msg = (t, ok) => { $("msg").textContent = t; $("msg").className = ok ? "ok" : "err"; };
  $("f").onsubmit = async e => {
    e.preventDefault();
    if ($("hp").value) return;
    const v = id => $(id).value.trim(), file = $("sf").files[0];
    if (v("an").length < 2 || !/^\S+@\S+\.\S+$/.test(v("ae")) || v("st").length < 3 || !v("sa")) return msg("Please fill in your name, a valid email, the title and a summary.");
    if (!file) return msg("Please attach your paper as a PDF.");
    if (file.type !== "application/pdf") return msg("The file must be a PDF.");
    if (file.size > 20971520) return msg("The PDF is larger than 20 MB.");
    if (!$("ok").checked) return msg("Please confirm that the work is original and that you agree to the terms.");
    $("go").disabled = true; msg("Sending…", true);
    const path = crypto.randomUUID() + ".pdf";
    const up = await db.storage.from("submissions").upload(path, file, { contentType: "application/pdf" });
    if (up.error) { $("go").disabled = false; return msg("The file couldn’t be uploaded. Please try again."); }
    const ins = await db.from("submissions").insert({ title: v("st"), author_name: v("an"), author_email: v("ae"), affiliation: v("af"),
      category: v("sc"), abstract: v("sa"), author_bio: v("bi"), author_website: v("lw"), author_github: v("lg"), author_linkedin: v("ll"), author_orcid: v("lo"), content: $("sx").value, pdf_path: path });
    if (ins.error) { await db.storage.from("submissions").remove([path]); $("go").disabled = false; return msg("Your submission couldn’t be sent. Please try again."); }
    $("f").reset(); $("go").disabled = false;
    msg("Thank you! Your paper was sent to our team for review. If it is published, you will be credited as the author.", true);
  };
})();
