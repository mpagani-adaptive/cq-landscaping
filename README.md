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
GitHub Pages from `main` at `/`, custom domain **cqyards.com** (`CNAME` file). Push to `main` = live.
The photos layout lives at the root `index.html`; edit it there.

## Todo before launch
- [ ] Replace the three community placeholders in every layout with real examples
- [ ] Decide: contact form (wire to Formspree/Supabase) or phone/text only
- [ ] Confirm the services list matches what they actually sell
- [x] Domain (cqyards.com)
