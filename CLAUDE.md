# Berkeley Life landing page (BP_LP_v1)

Static one-page LP served by Cloudflare Pages at take.berkeleylife.com.
Repo: https://github.com/l2g-admin/BP_LP_v1

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
