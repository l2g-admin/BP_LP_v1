# The A/B test: guided deck vs natural scroll

Running on take.berkeleylife.com since 22 July 2026. Plain-English runbook for
everyone touching the page, the ads, or the results while the test is live.
The tracking fundamentals (pixel, UTMs, Clarity) live in TRACKING.md; this doc
is only about the test.

## What is running

Two versions of the landing page share the one URL:

- **Guided deck** ("guided-demo") — the snap-slide version that was live
  before the test. This is the control. Source: repo root.
- **Natural scroll** ("scroll-demo") — the same content as a normal scrolling
  page. Source: `scroll/`, served from `dist/s/`.

Every new visitor is randomly assigned 50/50 at Cloudflare's edge
(`functions/_middleware.js`), gets a `bl_ab` cookie so they always see the
same version for 30 days, and never sees the URL change. The ad campaign
points at the same URL as before and needs no changes.

## How to look at each variant

Append `?v=guided` or `?v=scroll` to the live URL. This also re-pins your
cookie, so switch back (or clear cookies) when you are done. Ordinary
reloading always shows your own assigned variant; that is the point.

Testing on the live domain sends real pixel events (TRACKING.md explains why
previews stay silent), so keep casual clicking to a minimum and do not tap
the buy button unless you are actually QA-ing the click event.

## Rules while the test runs

1. **Do not edit either page's content.** A mid-test change makes the
   comparison meaningless. Genuine emergencies aside, changes wait until a
   winner is called. A change that must ship (legal, broken asset) has to go
   into **both** source trees (repo root and `scroll/`) in the same commit.
2. **Do not stop early because one side is ahead.** Early leads flip. Call
   the winner only per the criteria below.
3. **Keep the split at 50/50.** Changing weights mid-test skews everything.
4. **Do not pause or restructure the ad campaign around the test.** Campaign
   changes hit both variants equally, which is fine; just avoid pointing new
   campaigns at variant-forcing URLs (`?v=...`).

## Where the results live

| Question | Where | How |
|---|---|---|
| Is the split landing ~50/50? | Meta Events Manager > BerkeleyShopify pixel | ViewContent event, `variant` parameter |
| Which page gets more people to the store? | Same place | LPCTAClick ÷ ViewContent per `variant` (the early signal, readable within days) |
| Which page sells? | Shopify > Analytics > Reports, UTM content breakdown | orders whose utm_content **contains** `guided-demo` vs `scroll-demo` (the deciding metric) |
| Why is one winning? | Clarity > Filters > Custom tags > `variant` | recordings, heatmaps, `reached-N` funnel, `cta-click` |

The variant is suffixed onto any utm_content the ad already set
(`{ad-label}__scroll-demo`), so ad-level reporting survives; always filter
with "contains", not "equals".

## Calling the winner

- **Metric**: purchases attributed per variant in Shopify. CTA click rate is
  the early signal only; a page that wins clicks but not checkouts loses.
- **Sample**: wait for a few hundred total orders through the test, or a
  pre-agreed run length, whichever was set with the client. If in doubt, more
  data.
- **Sanity check before trusting a result**: ViewContent counts per variant
  should be within a few percent of each other. If they are not, something is
  broken; investigate before concluding anything.

## Ending the test

Winner is the guided deck: delete `scroll/` and `functions/`, remove the
scroll build call at the bottom of `build.js`, rebuild, commit, push. The
`bl_ab` cookie becomes inert and expires on its own.

Winner is the scroll page: promote `scroll/` sources to the repo root
(replacing the guided sources), delete `functions/` and the scroll build
call, rebuild, push. Keep the `variant` tagging in place for the first days
after the swap; it makes before/after comparison easy.

Either way, drop the variant suffix from utm_content once reporting on the
test is finished, and update CLAUDE.md + this doc.

## If a deploy fails

Every push builds twice in Cloudflare right now: the real Pages project
(`bp-lp-v1`) and a stray Worker (`noisy-sun-05f7`) that someone connected to
the same repo and that fails every build. The Worker's red badge is noise;
delete that project when convenient.

On the real project, a build once died at "clone repo" (could not reach
github.com) — a Cloudflare hiccup, not a code problem. Fix: open the failed
deployment in the dashboard and press **Retry deployment**.

To confirm any deploy actually landed: `view-source` on the live page and
compare `<meta name="build" ...>` against the freshly built
`dist/index.html`. A visitor bucketed to scroll sees the same stamp; both
variants are stamped by the same build.
