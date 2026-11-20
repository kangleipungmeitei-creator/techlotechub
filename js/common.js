const db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = d => new Date(d).toLocaleDateString(undefined, {year:"numeric", month:"short", day:"numeric"});
const pdfUrl = p => p ? db.storage.from("papers").getPublicUrl(p).data.publicUrl : "";
const slugify = s => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g,"").trim().replace(/[\s_]+/g,"-").slice(0,70) || "paper";
document.querySelectorAll(".site-name").forEach(e => e.textContent = CONFIG.SITE_NAME);
const clip = (s, n = 240) => { s = String(s || ""); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s; };
