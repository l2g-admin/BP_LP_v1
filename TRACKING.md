# How tracking works on this landing page

A plain-English guide to the ad tracking setup. No prior knowledge assumed. Last updated: July 2026.

## The big picture

This page's job is to warm people up, then send them to the Shopify store to buy. So tracking has two halves:

1. **The landing page** notes which ad each visitor came from and hands that info along when they click through to the store.
2. **The Shopify store** does the heavy lifting: it already tracks add to carts, checkouts and purchases through the Facebook & Instagram app, and reports them to Meta.

Think of it like a nightclub stamp: the landing page stamps the visitor's hand on the way in, and the store reads the stamp at the register. Meta then connects the dots: this ad > this visit > this purchase. That is what lets you see cost per sale for every ad you run.

## The decisions, and why

### We use the store's existing pixel, not a new one

A pixel is a small ID number that tells Meta "these events belong to this business". The store already has one ("BerkeleyShopify", ID `1047150816801806`) with months of purchase history.

**Why not a dedicated pixel for the LP?** Because Meta can only connect the funnel if every step reports to the same pixel. With two pixels, the LP visit and the purchase land in separate buckets, Meta cannot link them, and your ads look like they produce clicks but no sales. A second pixel also starts with zero history, so Meta's ad optimization would be learning from scratch instead of using years of purchase data. There is an old pixel in Events Manager literally named "LP2-Jun24 (Disconnected)", which suggests this mistake was made before.

### The page lives on a subdomain of berkeleylife.com, not its own domain

When someone clicks an ad, Meta remembers who they are using cookies saved under `berkeleylife.com`. Subdomains like `try.berkeleylife.com` share those cookies with the main store, so the visitor stays "recognized" when they hop from the LP to the product page.

**Why not a separate domain?** Cookies cannot cross from one domain to another. The moment the visitor left the LP, Meta would lose the trail and the sale would not be credited to the ad.

### The pixel code is pasted into the page, not injected by Cloudflare

The code sits in `index.html` (the `<head>` section). This is the standard way Meta documents, the easiest to debug, and it works on any host. Cloudflare offers a fancier injection method (Zaraz), but it adds setup complexity for benefits that only matter at much higher traffic.

### The pixel refuses to run outside berkeleylife.com

A small check in the code keeps the pixel silent on localhost and preview links.

**Why?** Every time we open the page while testing, we would otherwise send fake visits into the store's live data. This also means tracking can only be truly tested on the real subdomain, not on previews. That is intentional.

## What the page reports to Meta

| What Meta sees | When it happens | What it tells you |
|---|---|---|
| PageView | someone opens the page | the ad click became a real visit |
| ViewContent | same moment | they saw the Nitric Oxide product pitch |
| LPCTAClick | they tap the buy button | they engaged instead of bouncing |

Everything after that (add to cart, checkout, purchase) is reported by the store automatically. That includes a server-to-server backup channel (the "Conversions API") that still counts purchases when ad blockers eat the browser-side tracking. It is already set up; nothing to do.

## UTMs: the labels on your ad links

UTMs are tags added to the end of a URL that say where a visitor came from. They change nothing on the page; they are just labels for analytics. Every ad should point to a URL like:

```
https://try.berkeleylife.com/?utm_source=facebook&utm_medium=paid&utm_campaign=YOUR_CAMPAIGN_NAME
```

**Why, if Meta already tracks everything?** Meta only reports inside Meta. Shopify's own analytics cannot see into Ads Manager, so without labels every LP visitor shows up in Shopify as "Direct traffic, source unknown". The labels fix that.

The page automatically copies these labels onto the buy button link (code at the bottom of `app.js`), so they survive the hop to the store and Shopify credits the order to your ad.

## PostHog

Added July 2026 on client request: the standard PostHog snippet (project
`phc_mKHE...`, US cloud) loads in both A/B variants' `<head>`, behind the same
domain guard as the pixel, so localhost and previews stay silent. Every
PostHog event automatically carries a `variant` property (`guided-demo` /
`scroll-demo`), so its dashboards can be split per variant like everything
else.

## The A/B test: how to read the results

Every visitor is randomly assigned to the guided deck or the natural-scroll page (see CLAUDE.md for the mechanics). Same URL, same campaign, same pixel — only the page differs, so any difference in results is caused by the page. The variant name follows the visitor through every system:

| Where to look | What to check | What it tells you |
|---|---|---|
| Meta Events Manager → ViewContent → parameter `variant` | views per variant | the split is landing ~50/50 |
| Meta Events Manager → LPCTAClick → parameter `variant` | clicks ÷ views per variant | which page gets more people to the store (early signal, significant fastest) |
| Shopify → Analytics → Sessions/Sales by UTM content | orders where utm_content contains `guided-demo` vs `scroll-demo` | which page actually sells (the deciding metric) |
| Clarity → Filters → Custom tags → `variant` | recordings, scroll funnel per variant | *why* one page wins |

If the ad already sets its own utm_content, the variant is suffixed onto it (`{ad-content}__scroll-demo`) so ad-level labels survive; filter Shopify by "contains".

Two rules for a clean test: do not stop it early because one side jumps ahead in the first days (wait for a few hundred orders total, or agree a fixed run length up front), and do not edit either page's content mid-test.

## Checking it all works (launch day)

1. Install the free "Meta Pixel Helper" Chrome extension.
2. Open the live page. The extension should show PageView and ViewContent firing on pixel `1047150816801806`.
3. Tap the buy button. The extension should show LPCTAClick, and the store page you land on should have your utm tags in its URL.
4. For a live feed, open Meta Events Manager > Data Sources > BerkeleyShopify > Test Events.

Remember: this only works on the real subdomain. On localhost, silence is correct.

## Open to-dos

- Events Manager shows a "confirm custom events" notice. Click "Review events" and confirm; LPCTAClick will need the same one-time confirmation before it can be used to build audiences.
- Optional later: add Microsoft Clarity (free) to the LP and store to watch session recordings of LP visitors, filterable by utm_source.
