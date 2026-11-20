# Tech Lo Tech Hub: setup

Static site (GitHub Pages) + Supabase backend. Public readers need no account; only you can add or change anything.

## 1. Supabase
1. Open your project, restore it if it is paused.
2. SQL Editor: paste and run `supabase/schema.sql`.
3. Authentication > Sign In / Providers: turn **off** "Allow new users to sign up".
4. Authentication > Users > Add user: your email and a strong password (tick auto-confirm).
5. SQL Editor: run the commented last line of `schema.sql` with your email. That makes you the only admin.
6. Project Settings > API: copy the Project URL and the publishable (anon) key into `js/config.js`.

## 2. GitHub Pages
1. Create a repository and upload everything in this folder.
2. Settings > Pages > Deploy from branch > `main` / root.
3. Public site: `https://USERNAME.github.io/REPO/`. Admin panel: `/admin.html`.

## 3. Use it
Sign in at `/admin.html`. Add categories first, then papers (title, summary, full text, PDF). Tick "Published" to make a paper public.

## Contributors and review
Anyone can send a paper at `/submit.html`. It goes to a private queue. In `/admin.html`, open the **Submissions** tab to read it, open the PDF, then **Approve as draft** (creates a draft paper credited to the author) or **Reject**. Check the draft in the Papers tab and tick Published.

## Making papers readable by Google (important for AdSense)
Paper pages in the browser load their text with JavaScript. To give search engines and AdSense plain HTML, run this after publishing or changing papers (needs Node 18+ from nodejs.org):

    node tools/build.mjs

It creates `papers/*.html` (full text, author credit, structured data), `archive.html`, `sitemap.xml` and `robots.txt`. Upload those along with the rest of the site, then submit `https://kangleipungweb.in/sitemap.xml` in Google Search Console. Set your real domain in `SITE_URL` in `js/config.js`.
