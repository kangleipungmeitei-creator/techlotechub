// Shows the latest announcement marked "show in top bar" at the top of every public page.
(async () => {
  try {
    const me = document.currentScript && document.currentScript.src;
    if (!me || typeof CONFIG === "undefined") return;
    const base = me.replace(/js\/announce\.js.*$/, "");
    const r = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/announcements?select=id,title&published=eq.true&show_in_bar=eq.true&order=created_at.desc&limit=1`,
      { headers: { apikey: CONFIG.SUPABASE_KEY } });
    if (!r.ok) return;
    const a = (await r.json())[0]; if (!a) return;
    try { if (localStorage.getItem("ann-dismissed") === a.id) return; } catch (e) {}
    const bar = document.createElement("div");
    bar.className = "annbar"; bar.setAttribute("role", "status");
    const t = document.createElement("span"); t.textContent = a.title;
    const l = document.createElement("a"); l.href = base + "announcements.html"; l.textContent = "Read more";
    const x = document.createElement("button"); x.type = "button"; x.setAttribute("aria-label", "Dismiss announcement"); x.textContent = "×";
    x.onclick = () => { bar.remove(); try { localStorage.setItem("ann-dismissed", a.id); } catch (e) {} };
    bar.append(t, l, x);
    document.body.prepend(bar);
  } catch (e) {}
})();
