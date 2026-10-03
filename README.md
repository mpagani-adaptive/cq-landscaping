# C&Q Landscaping — website

Static site, no build step. Three layouts share one asset folder.

| Path | Concept |
|---|---|
| `/` | **Live site** (the photos layout): real before/after photos; the lawn gets mowed as you scroll. |
| `/options/` | Chooser page linking to all three layouts |
| `/photos/` | Redirects to `/` (old link) |
| `/badass/` | Dark, loud, truck-wrap energy. |
| `/refined/` | Editorial, linen and moss, for the bigger-ticket hardscape client. |

`assets/photos/` — WebP, 1600px and 800px (`-m`) versions of every shot.
Add a new job as `name_before.webp` / `name_after.webp` in both sizes and drop a
`<figure class="ba">` block into the gallery in `index.html`.

## Deploy
Vercel project `cq-landscaping` (team mpagani-adsgs-projects), domain **cqyards.com** (www redirects to apex). Push to `main` = live. No build step.
The photos layout lives at the root `index.html`; edit it there.

## Todo before launch
- [ ] Replace the three community placeholders in every layout with real examples
- [ ] Decide: contact form (wire to Formspree/Supabase) or phone/text only
- [ ] Confirm the services list matches what they actually sell
- [x] Domain (cqyards.com)

## Job posts from the crew (Telegram bot)
The crewpost bot (@SodFatherBot, `~/repos/crewpost`) commits each approved job here:
`projects/data/<slug>.json` + `projects/img/<slug>/<n>.webp` (and `<n>-m.webp`).
Vercel runs `node scripts/build.mjs`, which renders `/projects/<slug>/`, `/projects/`,
the "Fresh off the truck" strip on the homepage (`<!--RECENT-->` marker in `index.html`),
`sitemap.xml` and `robots.txt` into `dist/`. To hide a job, set `"hidden": true` in its JSON
or delete its JSON and image folder.
