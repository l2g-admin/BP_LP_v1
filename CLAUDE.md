# Berkeley Life landing page (BP_LP_v1)

Static one-page LP served by Cloudflare Pages at take.berkeleylife.com.
Repo: https://github.com/l2g-admin/BP_LP_v1

## A/B test: guided deck vs natural scroll

Two page variants ship behind the same URL. `functions/_middleware.js`
(Cloudflare Pages Functions, deployed automatically from that directory)
coin-flips each new visitor, pins the choice in a `bl_ab` cookie, and
rewrites — never redirects — bucketed visitors to the scroll build. Visitors
always see `take.berkeleylife.com/`, so the ad campaign needs no changes.

- Repo root (`index.html`, `app.js`, `styles.css`) → `dist/` — **guided
  deck** (variant B, the control, live since c6a45ce).
- `scroll/` → `dist/s/` — **natural scroll** (variant A, resurrected from
  commit 73a01aa with tracking intact). Its build rewrites asset/css/js
  references to absolute `/s/` paths since the page is served at `/`.

QA: `?v=guided` / `?v=scroll` forces a bucket (and re-pins the cookie).
Analytics per variant: see TRACKING.md. Test rules, reading results, and
how to end the test: see AB_TEST.md. A change that applies to both
variants must be made in both source trees.

## Source vs. dist

`index.html`, `styles.css`, and `app.js` at the repo root are the **source**
files — they carry extensive design-note comments (slide choreography, ad
strategy, browser workarounds). Those comments must never ship to visitors.

`dist/` is the **published** site: comments stripped, whitespace minified,
and only the assets the page actually references (unused drafts in `assets/`
stay private). Cloudflare serves `dist/`, not the repo root.

## Workflow

After editing any source file, always rebuild before committing:

```
npm run build
```

Commit `dist/` together with the source change. Never edit files in `dist/`
by hand, and never point Cloudflare at the repo root — that would expose
`TRACKING.md`, the theme export, and every comment.

`build.js` stamps `<meta name="build" content="...">` into dist/index.html —
compare it against the live page to verify a deploy landed.

## Cloudflare Pages settings

- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`
