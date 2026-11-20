let cats = [], papers = [];
const msg = (id, t, ok) => { const e = $(id); e.textContent = t; e.className = ok ? "ok" : "err"; };

async function start() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return showLogin();
  const { data: row } = await db.from("admins").select("user_id").maybeSingle();
  if (!row) { await db.auth.signOut(); showLogin("This account is not an admin."); return; }
  $("login").hidden = true; $("app").hidden = false; $("out").hidden = false; $("who").textContent = session.user.email;
  await loadAll();
}
function showLogin(m) { $("login").hidden = false; $("app").hidden = true; $("out").hidden = true; $("who").textContent = ""; msg("lerr", m || ""); }

$("go").onclick = async () => {
  const { error } = await db.auth.signInWithPassword({ email: $("em").value.trim(), password: $("pw").value });
  if (error) return msg("lerr", "Email or password is incorrect.");
  $("pw").value = ""; start();
};
$("pw").onkeydown = e => { if (e.key === "Enter") $("go").click(); };
$("out").onclick = async () => { await db.auth.signOut(); showLogin(); };
["t1","t2","t3","t4","t5","t6"].forEach((id, i) => $(id).onclick = () => tab(i));
function tab(n) { [["pp","t1"],["cp","t2"],["sp","t3"],["ap","t4"],["aup","t5"],["rp","t6"]].forEach(([p, t], i) => { $(p).hidden = i !== n; $(t).classList.toggle("on", i === n); }); }

async function loadAll() {
  loadSubs(); loadAnn(); loadAuthors(); loadReports();
  const [c, p] = await Promise.all([db.from("categories").select("*").order("name"),
    db.from("papers").select("*").order("created_at", {ascending:false})]);
  cats = c.data || []; papers = p.data || [];
  $("pc").innerHTML = '<option value="">Uncategorised</option>' + cats.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join("");
  $("ctb").innerHTML = cats.length ? cats.map(x => `<tr><td><b>${esc(x.name)}</b><div class="meta">${esc(x.description)}</div></td>
    <td style="text-align:right"><button class="link" data-ce="${x.id}">Edit</button><button class="link danger" data-cd="${x.id}">Delete</button></td></tr>`).join("") : '<tr><td class="empty">No categories yet.</td></tr>';
  $("ptb").innerHTML = papers.length ? papers.map(x => `<tr><td>${esc(x.title)}</td>
    <td>${esc(cats.find(c => c.id === x.category_id)?.name || "—")}</td><td>${x.published ? "Published" : "Draft"}</td>
    <td style="text-align:right;white-space:nowrap"><button class="link" data-pe="${x.id}">Edit</button><button class="link danger" data-pd="${x.id}">Delete</button></td></tr>`).join("") : '<tr><td colspan="4" class="empty">No papers yet.</td></tr>';
}

$("cadd").onclick = async () => {
  const name = $("cn").value.trim(); if (!name) return msg("cmsg", "Enter a category name.");
  const { error } = await db.from("categories").insert({ name, slug: slugify(name), description: $("cd").value.trim() });
  if (error) return msg("cmsg", error.message);
  $("cn").value = $("cd").value = ""; msg("cmsg", "Category added.", true); loadAll();
};
$("ctb").onclick = async e => {
  const ed = e.target.dataset.ce, del = e.target.dataset.cd;
  if (ed) {
    const c = cats.find(x => x.id === ed), name = prompt("Category name", c.name); if (!name) return;
    const description = prompt("Description", c.description || "") ?? c.description;
    const { error } = await db.from("categories").update({ name: name.trim(), slug: slugify(name), description }).eq("id", ed);
    if (error) alert(error.message); loadAll();
  }
  if (del && confirm("Delete this category? Its papers stay, but become uncategorised.")) {
    const { error } = await db.from("categories").delete().eq("id", del); if (error) alert(error.message); loadAll();
  }
};

function clearForm() {
  ["pid","pt","pau","pa","px","pf"].forEach(i => $(i).value = ""); $("pc").value = ""; $("pub").checked = false; showName(); fillReview(null);
  $("pcur").textContent = ""; $("ftitle").textContent = "New paper"; msg("pmsg", "");
}
$("pnew").onclick = clearForm;
$("ptb").onclick = async e => {
  const ed = e.target.dataset.pe, del = e.target.dataset.pd;
  if (ed) {
    const p = papers.find(x => x.id === ed);
    $("pid").value = p.id; $("pt").value = p.title; $("pau").value = p.author || ""; $("pa").value = p.abstract || ""; $("px").value = p.content || "";
    $("pc").value = p.category_id || ""; $("pub").checked = p.published; $("pf").value = ""; showName(); fillReview(p);
    $("pcur").textContent = p.pdf_path ? "A PDF is attached. Choose a file only to replace it." : "No PDF attached.";
    $("ftitle").textContent = "Edit paper"; scrollTo({ top: 0, behavior: "smooth" });
  }
  if (del && confirm("Delete this paper and its PDF? This can’t be undone.")) {
    const p = papers.find(x => x.id === del);
    if (p.pdf_path) await db.storage.from("papers").remove([p.pdf_path]);
    const { error } = await db.from("papers").delete().eq("id", del); if (error) alert(error.message); loadAll();
  }
};

$("psave").onclick = async () => {
  const title = $("pt").value.trim(); if (!title) return msg("pmsg", "Enter a title.");
  const id = $("pid").value, old = papers.find(x => x.id === id), file = $("pf").files[0];
  if (file && file.type !== "application/pdf") return msg("pmsg", "The file must be a PDF.");
  if (file && file.size > 52428800) return msg("pmsg", "The PDF is larger than 50 MB.");
  $("psave").disabled = true; msg("pmsg", "Saving…", true);
  try {
    let pdf_path = old?.pdf_path || null;
    if (file) {
      const path = crypto.randomUUID() + ".pdf";
      const up = await db.storage.from("papers").upload(path, file, { contentType: "application/pdf" });
      if (up.error) throw up.error;
      if (pdf_path) await db.storage.from("papers").remove([pdf_path]);
      pdf_path = path;
    }
    const rec = { title, ...reviewFields(old), author: $("pau").value.trim(), abstract: $("pa").value.trim(), content: $("px").value, category_id: $("pc").value || null,
      published: $("pub").checked, pdf_path, updated_at: new Date().toISOString() };
    const r = id ? await db.from("papers").update(rec).eq("id", id)
                 : await db.from("papers").insert({ ...rec, slug: slugify(title) + "-" + Math.random().toString(36).slice(2, 6) });
    if (r.error) throw r.error;
    clearForm(); msg("pmsg", "Paper saved.", true); loadAll();
  } catch (e) { msg("pmsg", e.message || "Couldn’t save. Try again."); }
  $("psave").disabled = false;
};
start();

// Drag and drop for the PDF (the normal "Choose file" button still works)
function showName() { const f = $("pf").files[0]; $("pname").textContent = f ? "Selected: " + f.name : ""; }
const drop = $("drop");
["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => {
  const f = e.dataTransfer.files[0]; if (!f) return;
  if (f.type !== "application/pdf") return msg("pmsg", "Only PDF files can be dropped here.");
  const dt = new DataTransfer(); dt.items.add(f); $("pf").files = dt.files; msg("pmsg", ""); showName();
});
$("pf").onchange = showName;
// Stop the browser opening a PDF if it is dropped outside the box
window.addEventListener("dragover", e => e.preventDefault());
window.addEventListener("drop", e => e.preventDefault());

// ---- Submissions from contributors ----
let subs = [];
async function loadSubs() {
  const { data } = await db.from("submissions").select("*").order("created_at", { ascending: false });
  subs = data || [];
  const n = subs.filter(s => s.status === "pending").length;
  $("sbadge").textContent = n ? "(" + n + ")" : "";
  $("slist").innerHTML = subs.length ? subs.map(s => `<div class="card">
    <b>${esc(s.title)}</b> <span class="meta">· ${esc(s.status)} · ${fmt(s.created_at)}</span>
    <div class="meta">By ${esc(s.author_name)}${s.affiliation ? ", " + esc(s.affiliation) : ""} · <a href="mailto:${esc(s.author_email)}">${esc(s.author_email)}</a>${s.category ? " · " + esc(s.category) : ""}</div>
    ${s.abstract ? `<p>${esc(s.abstract)}</p>` : ""}
    ${s.content ? `<details><summary>Full text</summary><div class="article"><p>${esc(s.content)}</p></div></details>` : ""}
    <p>${s.pdf_path ? `<button data-spdf="${s.id}">Open PDF</button> ` : ""}
    ${s.status === "pending" ? `<button class="pri" data-sok="${s.id}">Approve as draft</button> <button class="danger" data-sno="${s.id}">Reject</button>` : ""}
    <button class="link danger" data-sdel="${s.id}">Delete</button></p></div>`).join("") : '<div class="empty">No submissions yet.</div>';
}
$("slist").onclick = async e => {
  const d = e.target.dataset, find = id => subs.find(x => x.id === id);
  try {
    if (d.spdf) { const { data, error } = await db.storage.from("submissions").createSignedUrl(find(d.spdf).pdf_path, 300); if (error) throw error; window.open(data.signedUrl, "_blank", "noopener"); }
    if (d.sok) { await approve(find(d.sok)); alert("Approved. A draft paper was created with the author’s credit. Review it in the Papers tab, then tick Published."); await loadAll(); }
    if (d.sno && confirm("Reject this submission?")) { await db.from("submissions").update({ status: "rejected" }).eq("id", d.sno); loadSubs(); }
    if (d.sdel && confirm("Delete this submission and its file permanently?")) {
      const s = find(d.sdel); if (s.pdf_path) await db.storage.from("submissions").remove([s.pdf_path]);
      await db.from("submissions").delete().eq("id", s.id); loadSubs();
    }
  } catch (err) { alert(err.message || "Something went wrong."); }
};
async function approve(s) {
  let pdf_path = null;
  if (s.pdf_path) {
    const dl = await db.storage.from("submissions").download(s.pdf_path); if (dl.error) throw dl.error;
    pdf_path = crypto.randomUUID() + ".pdf";
    const up = await db.storage.from("papers").upload(pdf_path, dl.data, { contentType: "application/pdf" }); if (up.error) throw up.error;
  }
  const cat = cats.find(c => c.name.toLowerCase() === (s.category || "").toLowerCase());
  const nm = s.author_name.trim().toLowerCase();
  let au = authors.find(a => a.name.toLowerCase() === nm);
  if (!au) {
    const r = await db.from("authors").insert({ name: s.author_name.trim(), slug: slugify(s.author_name) + "-" + Math.random().toString(36).slice(2, 6),
      bio: s.author_bio || "", website: s.author_website || "", github: s.author_github || "", linkedin: s.author_linkedin || "", orcid: s.author_orcid || "" }).select().single();
    if (r.error) throw r.error; au = r.data;
  }
  const ins = await db.from("papers").insert({ author_id: au.id, title: s.title, slug: slugify(s.title) + "-" + Math.random().toString(36).slice(2, 6),
    abstract: s.abstract, content: s.content, author: s.author_name + (s.affiliation ? ", " + s.affiliation : ""),
    pdf_path, category_id: cat ? cat.id : null, published: false });
  if (ins.error) throw ins.error;
  await db.from("submissions").update({ status: "approved" }).eq("id", s.id);
}

// ---- Announcements ----
let anns = [];
async function loadAnn() {
  const { data } = await db.from("announcements").select("*").order("created_at", { ascending: false });
  anns = data || [];
  $("atb").innerHTML = anns.length ? anns.map(a => `<tr><td><b>${esc(a.title)}</b><div class="meta">${fmt(a.created_at)} · ${a.published ? "Published" : "Hidden"}${a.show_in_bar ? " · In top bar" : ""}</div></td>
    <td style="text-align:right;white-space:nowrap"><button class="link" data-ae="${a.id}">Edit</button><button class="link danger" data-ad="${a.id}">Delete</button></td></tr>`).join("") : '<tr><td class="empty">No announcements yet.</td></tr>';
}
function clearAnn() { ["aid","at","ab"].forEach(i => $(i).value = ""); $("apub").checked = true; $("abar").checked = false; $("atitle").textContent = "New announcement"; msg("amsg", ""); }
$("anew").onclick = clearAnn;
$("atb").onclick = async e => {
  const ed = e.target.dataset.ae, del = e.target.dataset.ad;
  if (ed) { const a = anns.find(x => x.id === ed); $("aid").value = a.id; $("at").value = a.title; $("ab").value = a.body || ""; $("apub").checked = a.published; $("abar").checked = a.show_in_bar; $("atitle").textContent = "Edit announcement"; scrollTo({ top: 0, behavior: "smooth" }); }
  if (del && confirm("Delete this announcement?")) { const { error } = await db.from("announcements").delete().eq("id", del); if (error) alert(error.message); loadAnn(); }
};
$("asave").onclick = async () => {
  const title = $("at").value.trim(); if (!title) return msg("amsg", "Enter a title.");
  const rec = { title, body: $("ab").value, published: $("apub").checked, show_in_bar: $("abar").checked }, id = $("aid").value;
  const { error } = id ? await db.from("announcements").update(rec).eq("id", id) : await db.from("announcements").insert(rec);
  if (error) return msg("amsg", error.message);
  clearAnn(); msg("amsg", "Announcement saved.", true); loadAnn();
};

// ---- Review details on the paper form ----
function reviewFields(old) {
  const log = Array.isArray(old?.corrections) ? [...old.corrections] : [];
  const note = $("pcn").value.trim(); if (note) log.push({ date: new Date().toISOString(), note });
  return { author_id: $("pas").value || null, checked_original: $("cko").checked, checked_sources: $("cks").checked, checked_pdf: $("ckp").checked,
    reviewed_at: $("prev").checked ? (old?.reviewed_at || new Date().toISOString()) : null, reviewed_by: $("prb").value.trim(),
    editor_note: $("pen").value.trim(), references_text: $("prf").value.trim(), corrections: log };
}
function fillReview(p) {
  $("pas").value = p?.author_id || ""; $("cko").checked = !!p?.checked_original; $("cks").checked = !!p?.checked_sources; $("ckp").checked = !!p?.checked_pdf;
  $("prev").checked = !!p?.reviewed_at; $("prb").value = p?.reviewed_by || ""; $("pen").value = p?.editor_note || ""; $("prf").value = p?.references_text || "";
  $("pcn").value = ""; const log = Array.isArray(p?.corrections) ? p.corrections : [];
  $("plog").innerHTML = log.length ? log.map(c => esc(fmt(c.date)) + ": " + esc(c.note)).join("<br>") : "None";
}
$("pas").onchange = () => { const a = authors.find(x => x.id === $("pas").value); if (a && !$("pau").value.trim()) $("pau").value = a.name; };

// ---- Authors ----
let authors = [];
async function loadAuthors() {
  const { data } = await db.from("authors").select("*").order("name"); authors = data || [];
  $("pas").innerHTML = '<option value="">None</option>' + authors.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("");
  $("autb").innerHTML = authors.length ? authors.map(a => `<tr><td><b>${esc(a.name)}</b><div class="meta">${esc((a.bio || "").slice(0, 100))}</div></td>
    <td style="text-align:right;white-space:nowrap"><a href="author.html?slug=${encodeURIComponent(a.slug)}" target="_blank">View</a><button class="link" data-aue="${a.id}">Edit</button><button class="link danger" data-aud="${a.id}">Delete</button></td></tr>`).join("") : '<tr><td class="empty">No author pages yet. They are created automatically when you approve a submission.</td></tr>';
}
const AU = [["aun","name"],["aub","bio"],["auw","website"],["aug","github"],["aul","linkedin"],["auo","orcid"]];
function clearAuthor() { ["auid", ...AU.map(x => x[0])].forEach(i => $(i).value = ""); $("autitle").textContent = "New author page"; msg("aumsg", ""); }
$("aunew").onclick = clearAuthor;
$("autb").onclick = async e => {
  const ed = e.target.dataset.aue, del = e.target.dataset.aud;
  if (ed) { const a = authors.find(x => x.id === ed); $("auid").value = a.id; AU.forEach(([i, k]) => $(i).value = a[k] || ""); $("autitle").textContent = "Edit author page"; scrollTo({ top: 0, behavior: "smooth" }); }
  if (del && confirm("Delete this author page? Their papers stay, but the credit is no longer linked.")) { const { error } = await db.from("authors").delete().eq("id", del); if (error) alert(error.message); loadAuthors(); }
};
$("ausave").onclick = async () => {
  const name = $("aun").value.trim(); if (!name) return msg("aumsg", "Enter the author’s name.");
  const rec = {}; AU.forEach(([i, k]) => rec[k] = $(i).value.trim()); const id = $("auid").value;
  const { error } = id ? await db.from("authors").update(rec).eq("id", id)
    : await db.from("authors").insert({ ...rec, slug: slugify(name) + "-" + Math.random().toString(36).slice(2, 6) });
  if (error) return msg("aumsg", error.message);
  clearAuthor(); msg("aumsg", "Author saved.", true); loadAuthors();
};

// ---- Issue reports ----
const KINDS = { error: "Mistake or inaccuracy", plagiarism: "Plagiarism", copyright: "Copyright concern", broken_pdf: "Broken PDF", other: "Other" };
let reports = [];
async function loadReports() {
  const { data } = await db.from("issue_reports").select("*, papers(title,slug)").order("created_at", { ascending: false }); reports = data || [];
  const n = reports.filter(r => r.status === "new").length; $("rbadge").textContent = n ? "(" + n + ")" : "";
  $("rlist").innerHTML = reports.length ? reports.map(r => `<div class="card"><b>${esc(KINDS[r.kind] || r.kind)}</b> <span class="meta">· ${esc(r.status)} · ${fmt(r.created_at)}</span>
    <div class="meta">Paper: ${r.papers ? `<a href="paper.html?slug=${encodeURIComponent(r.papers.slug)}" target="_blank">${esc(r.papers.title)}</a>` : "(deleted)"}${r.reporter_email ? ` · <a href="mailto:${esc(r.reporter_email)}">${esc(r.reporter_email)}</a>` : ""}</div>
    <p style="white-space:pre-wrap">${esc(r.message)}</p>
    <p>${["confirmed", "resolved", "dismissed"].filter(s => s !== r.status).map(s => `<button data-rs="${s}" data-rid="${r.id}">Mark ${s}</button>`).join(" ")}
    <button class="link danger" data-rdel="${r.id}">Delete</button></p></div>`).join("") : '<div class="empty">No issue reports.</div>';
}
$("rlist").onclick = async e => {
  const d = e.target.dataset;
  if (d.rs) { const { error } = await db.from("issue_reports").update({ status: d.rs }).eq("id", d.rid); if (error) alert(error.message); loadReports(); }
  if (d.rdel && confirm("Delete this report?")) { await db.from("issue_reports").delete().eq("id", d.rdel); loadReports(); }
};
