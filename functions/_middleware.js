// A/B split for take.berkeleylife.com, run by Cloudflare at the edge
// (Pages Functions middleware — this directory deploys automatically,
// it is not part of dist/).
//
// Every visitor keeps the same URL, "/": the coin flip happens here and
// the losing variant is never fetched, so there is no client-side
// redirect, flicker, or LCP cost. dist/index.html is the guided deck
// (control); dist/s/index.html is the natural-scroll variant. A cookie
// pins each visitor to their bucket so returning visitors never see the
// page morph between visits — and so conversion counts stay clean.
//
// QA: append ?v=guided or ?v=scroll to force a bucket (also re-pins the
// cookie, so remember to switch back or clear cookies when done).

const COOKIE = 'bl_ab';
const VARIANTS = ['guided', 'scroll'];

export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);

  // Only the landing page is split; /s/*, assets, everything else passes
  // straight through to the static files.
  if (url.pathname !== '/' && url.pathname !== '/index.html') return next();

  const forced = url.searchParams.get('v');
  const match = (request.headers.get('Cookie') || '').match(
    new RegExp(`(?:^|;\\s*)${COOKIE}=(${VARIANTS.join('|')})`)
  );
  let variant = VARIANTS.includes(forced) ? forced : match && match[1];
  const setCookie = !match || (forced && variant !== match[1]);
  if (!variant) variant = Math.random() < 0.5 ? VARIANTS[0] : VARIANTS[1];

  // "/s/" not "/s/index.html": Pages 308-redirects the explicit filename,
  // and we want the asset body, not a redirect to chase.
  let res =
    variant === 'scroll'
      ? await env.ASSETS.fetch(new URL('/s/', url.origin))
      : await next();

  if (setCookie) {
    res = new Response(res.body, res); // static-asset responses are immutable
    res.headers.append(
      'Set-Cookie',
      `${COOKIE}=${variant}; Path=/; Max-Age=2592000; SameSite=Lax; Secure`
    );
  }
  return res;
}
