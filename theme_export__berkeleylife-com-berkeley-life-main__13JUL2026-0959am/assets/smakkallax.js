export async function smakkallax() {

  const timelinePolyfill = await import('https://rawcdn.githack.com/flackr/scroll-timeline/94866999efe41b3ccba846be7ed37c9313dd880e/dist/scroll-timeline.js');

  // check if the user is OK with motion
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mediaQuery.matches) {
    return;
  }

  const parallax = document.querySelectorAll('[data-parallax]')

  parallax.forEach( (item) => {
    let pre = item.dataset?.parallaxPre || '15vh'
    let post = item.dataset?.parallaxPost || '-15vh'
    let paraParent = item.closest('[data-parallax-parent]') || item.parentElement
    item.animate(
      {
        transform: [`translateY(${pre})`, `translateY(${post})`]
      },
      {
        duration: 1,
        fill: "both",
        timeline: new ScrollTimeline({
          source: document.scrollingElement,
          scrollSource: document.scrollingElement, // For legacy implementations
          timeRange: 1,
          fill: "forwards",
          orientation: "block",
          scrollOffsets: [
            { target: paraParent, edge: 'end' },
            { target: paraParent, edge: 'start' },
          ],
        })
      }
    );
  })
}