// --------------------------------------------------------------------------
// Shared helper: split a line into word spans (keeping styled <em>s
// intact) so its words can rise in one after another. Used by slide 1's
// hook/lede and slide 2's headline.
// --------------------------------------------------------------------------
const splitWords = (root) => {
  const out = [];
  const walk = (node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const piece of child.textContent.split(/(\s+)/)) {
          if (!piece) continue;
          if (/\s/.test(piece)) {
            frag.appendChild(document.createTextNode(piece));
          } else {
            const span = document.createElement('span');
            span.className = 'w';
            span.textContent = piece;
            frag.appendChild(span);
            out.push(span);
          }
        }
        child.replaceWith(frag);
      } else {
        walk(child);
      }
    }
  };
  walk(root);
  return out;
};

// --------------------------------------------------------------------------
// Slide 2 choreography: "the bond" (beats live in styles.css as
// transition delays). One class on the fold conducts the whole slide,
// added only once the screen has mostly settled into view; the 0.6
// ratio keeps the beats from starting mid-snap, half off screen.
// Like slide 1, the scene resets while off screen and replays on
// return; .is-resetting makes the teardown instant so a quick
// scroll-back never catches the atoms mid-fade.
//
// The headline borrows slide 1's word-rise: each word starts blurred
// and low, rising in on its own stagger, rather than landing as one
// block — the same opening gesture that starts the page, echoed here.
// --------------------------------------------------------------------------
const moleculeFold = document.getElementById('the-molecule');
if (moleculeFold) {
  const headlineWords = splitWords(moleculeFold.querySelector('.hero__headline'));
  const HEADLINE_WORD_MS = 90;

  let wordTimers = [];
  const clearWordTimers = () => {
    wordTimers.forEach(clearTimeout);
    wordTimers = [];
  };
  const riseHeadline = () => {
    headlineWords.forEach((w, i) =>
      wordTimers.push(setTimeout(() => w.classList.add('is-on'), i * HEADLINE_WORD_MS))
    );
  };

  new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.intersectionRatio >= 0.6) {
        moleculeFold.classList.add('is-visible');
        clearWordTimers();
        riseHeadline();
      } else if (!entry.isIntersecting) {
        moleculeFold.classList.add('is-resetting');
        moleculeFold.classList.remove('is-visible');
        clearWordTimers();
        headlineWords.forEach((w) => w.classList.remove('is-on'));
        requestAnimationFrame(() =>
          requestAnimationFrame(() => moleculeFold.classList.remove('is-resetting'))
        );
      }
    }
  }, { threshold: [0, 0.6] }).observe(moleculeFold);
}

// --------------------------------------------------------------------------
// Slide 3 choreography: "the demonstration". The beat classes and the
// copy/markup-pair motion are CSS (see styles.css); this block owns
// what CSS can't: the vessel itself. Walls, the pale-red interior
// (the blood, its gradient drifting), and cells all render from one
// half-gap function, so the space the cells swim in is always exactly
// the space the walls enclose. The release morphs the walls open
// while the flow ramps from a trickle (few, slow, single-file through
// the pinch) to a stream (many, fast, spread wide); after that, the
// breath cycle keeps re-enacting the mechanism (see below). The rAF
// loop runs only while the slide is on screen and never stops while
// it is — continuous flow is the message. Cells speed up through the
// pinch (flow does), which makes the trickle read as strained.
// --------------------------------------------------------------------------
const vesselFold = document.getElementById('the-vessel');
if (vesselFold) {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const wallTop = vesselFold.querySelector('.vessel__wall--top');
  const wallBottom = vesselFold.querySelector('.vessel__wall--bottom');
  const vesselFill = vesselFold.querySelector('.vessel__fill');
  const vesselSheen = vesselFold.querySelector('.vessel__sheen');
  const tagLine = vesselFold.querySelector('.vessel__tag-line');
  const tagDot = vesselFold.querySelector('.vessel__tag-dot');
  const flowGrad = vesselFold.querySelector('#vesFlow');
  const cellLayer = vesselFold.querySelector('.vessel__cells');

  // Headline word-rise, like slides 1 and 2.
  const vesselHeadlineWords = splitWords(vesselFold.querySelector('.vessel-scene__headline'));
  const HEADLINE_WORD_MS = 90;
  let headlineTimers = [];
  const clearHeadlineTimers = () => {
    headlineTimers.forEach(clearTimeout);
    headlineTimers = [];
  };
  const riseHeadline = () => {
    vesselHeadlineWords.forEach((w, i) =>
      headlineTimers.push(setTimeout(() => w.classList.add('is-on'), i * HEADLINE_WORD_MS))
    );
  };

  // Geometry, in viewBox units. The vessel is a horizontal channel
  // around y=130; openness 0 pinches the middle to a 36-unit gap,
  // openness 1 relaxes it to the full 116.
  const MID = 130;
  const HALF_OPEN = 58;
  const PINCH = 40;
  const halfGap = (x, openness) =>
    HALF_OPEN - PINCH * (1 - openness) * Math.exp(-(((x - 400) / 150) ** 2));

  // 8-unit sampling: at this curvature the polyline's corner angles
  // are well under a degree, so the walls read as continuous curves.
  // (30-unit sampling looked hand-drawn.)
  const renderWalls = (openness) => {
    let top = '';
    let bottom = '';
    let bottomReversed = '';
    for (let x = -20; x <= 820; x += 8) {
      const gap = halfGap(x, openness);
      top += `${top ? 'L' : 'M'} ${x} ${(MID - gap).toFixed(1)} `;
      bottom += `${bottom ? 'L' : 'M'} ${x} ${(MID + gap).toFixed(1)} `;
      bottomReversed = `L ${x} ${(MID + gap).toFixed(1)} ` + bottomReversed;
    }
    wallTop.setAttribute('d', top);
    wallBottom.setAttribute('d', bottom);
    // The blood: the enclosed interior — cylinder-shaded base plus
    // the drifting sheen layer above it, same geometry.
    const interior = `${top}${bottomReversed}Z`;
    vesselFill.setAttribute('d', interior);
    vesselSheen.setAttribute('d', interior);
    // The callout rides the lower wall: dot pinned on the wall
    // line, leader tip just beneath it.
    const wallY = MID + halfGap(300, openness);
    tagDot.setAttribute('cy', wallY.toFixed(1));
    tagLine.setAttribute('y1', (wallY + 2).toFixed(1));
  };

  // The flow. A fixed pool of cells; the trickle uses a few, the
  // surge activates the rest, streaming in from the left edge.
  const CELL_COUNT = 12;
  const TRICKLE = 6;
  const cells = Array.from({ length: CELL_COUNT }, () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    el.setAttribute('class', 'vessel__cell');
    el.setAttribute('cx', -40);
    cellLayer.appendChild(el);
    return { el, live: false, x: 0, lane: 0, v: 0, r: 0 };
  });

  const seedCell = (cell, x) => {
    cell.live = true;
    cell.x = x;
    cell.lane = Math.random() * 1.7 - 0.85; // -1..1 across the channel
    cell.v = 48 + Math.random() * 18;       // viewBox units / second
    // Near-uniform size: wide variance read as confetti, not cells.
    cell.r = 5 + Math.random() * 1.2;
    cell.el.setAttribute('r', cell.r);
  };

  const seedTrickle = () => {
    cells.forEach((cell, i) => {
      cell.live = false;
      cell.el.setAttribute('cx', -40);
      if (i < TRICKLE) seedCell(cell, Math.random() * 840 - 20);
    });
  };

  let openness = 0;

  // The breath. After the first release settles, the vessel slowly
  // begins to contract again — this is what it does when the signal
  // fades — and a fresh NO pair drifts in just in time, docks at the
  // bottom of the contraction, and rides the wall back out as it
  // stretches open. One reusable pair in the scene's flat 2D style;
  // entry side and point vary deterministically per cycle, so the
  // loop is seamless but never reads as a repeating GIF.
  const ambientPair = document.createElementNS(SVG_NS, 'g');
  [['-9', '11', 'no-mol__n'], ['11', '12', 'no-mol__o']].forEach(([cx, r, cls]) => {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('class', cls);
    c.setAttribute('cx', cx);
    c.setAttribute('cy', '0');
    c.setAttribute('r', r);
    ambientPair.appendChild(c);
  });
  [['-9', 'N'], ['11', 'O']].forEach(([x, letter]) => {
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('class', 'no-mol__symbol');
    t.setAttribute('x', x);
    t.setAttribute('y', '0');
    t.textContent = letter;
    ambientPair.appendChild(t);
  });
  ambientPair.setAttribute('opacity', '0');
  cellLayer.parentNode.appendChild(ambientPair);

  const BREATHE = { contract: 2600, dwell: 350, restore: 1100, rest: 1800 };
  const BREATHE_CYCLE = BREATHE.contract + BREATHE.dwell + BREATHE.restore + BREATHE.rest;
  const BREATHE_DEPTH = 0.5;  // narrows visibly, never back to the full pinch
  const FIRST_BREATH = 2600;  // let the payoff land before the first contraction
  let breatheEpoch = null;

  const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2);

  const breathe = (now) => {
    const since = now - breatheEpoch;
    const cycle = Math.floor(since / BREATHE_CYCLE);
    const e = since % BREATHE_CYCLE;
    const { contract, dwell, restore } = BREATHE;

    if (e < contract) {
      openness = 1 - BREATHE_DEPTH * easeInOutQuad(e / contract);
    } else if (e < contract + dwell) {
      openness = 1 - BREATHE_DEPTH;
    } else if (e < contract + dwell + restore) {
      openness = 1 - BREATHE_DEPTH
        + BREATHE_DEPTH * easeOutCubic((e - contract - dwell) / restore);
    } else {
      openness = 1;
    }
    renderWalls(openness);

    // The rescuer, synced to the cycle: drifts in while the vessel
    // narrows, lands at the bottom of the contraction, rides the
    // wall back out (docked y tracks the live wall), then dissolves.
    const fromTop = cycle % 2 === 0;
    // Entry band starts right of the callout's leader and label
    // (they occupy ~300-450 below the lower wall), so the rescuer
    // never docks on top of them.
    const x = fromTop
      ? 330 + ((cycle * 149) % 220)
      : 460 + ((cycle * 67) % 100);
    const dockY = fromTop
      ? MID - halfGap(x, openness) - 15
      : MID + halfGap(x, openness) + 15;
    const appearAt = contract - 1500;
    const dockAt = contract + dwell;
    const fadeAt = dockAt + restore;
    const FADE_MS = 500;

    let y = dockY;
    let alpha = 0;
    if (e >= appearAt && e < dockAt) {
      const p = easeOutCubic((e - appearAt) / (dockAt - appearAt));
      const yFrom = fromTop ? 16 : 244;
      y = yFrom + (dockY - yFrom) * p;
      alpha = Math.min(1, p * 2.5);
    } else if (e >= dockAt && e < fadeAt) {
      alpha = 1;
    } else if (e >= fadeAt && e < fadeAt + FADE_MS) {
      alpha = 1 - (e - fadeAt) / FADE_MS;
    }
    ambientPair.setAttribute('opacity', alpha.toFixed(3));
    ambientPair.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  };

  const drawCells = () => {
    for (const cell of cells) {
      if (!cell.live) continue;
      const room = Math.max(halfGap(cell.x, openness) - 8 - cell.r, 0);
      cell.el.setAttribute('cx', cell.x.toFixed(1));
      cell.el.setAttribute('cy', (MID + cell.lane * room).toFixed(1));
    }
  };

  const RELEASE_MS = 1400;
  const easeOutCubic = (t) => 1 - (1 - t) ** 3;
  let releaseStart = null;

  let vesselRaf = null;
  let lastNow = null;
  let flowShift = 0;
  const tick = (now) => {
    if (lastNow === null) lastNow = now;
    const dt = Math.min((now - lastNow) / 1000, 0.05);
    lastNow = now;

    if (releaseStart !== null) {
      const t = Math.min((now - releaseStart) / RELEASE_MS, 1);
      openness = easeOutCubic(t);
      renderWalls(openness);
      // The surge streams in from the left as the walls give way.
      const target = TRICKLE + Math.round(openness * (CELL_COUNT - TRICKLE));
      let live = cells.filter((c) => c.live).length;
      for (const cell of cells) {
        if (live >= target) break;
        if (!cell.live) {
          seedCell(cell, -20 - Math.random() * 260);
          live += 1;
        }
      }
      if (t >= 1) {
        releaseStart = null;
        breatheEpoch = now + FIRST_BREATH;
      }
    } else if (breatheEpoch !== null && now >= breatheEpoch) {
      breathe(now);
    }

    // The light drifts: the sheen slides slowly along the blood,
    // slower than the cells riding it.
    flowShift = (flowShift + 38 * dt) % 260;
    flowGrad.setAttribute('gradientTransform', `translate(${flowShift.toFixed(1)} 0)`);

    const surge = 1 + 1.9 * openness;
    for (const cell of cells) {
      if (!cell.live) continue;
      // Continuity: the narrower the channel, the faster the fluid.
      const squeeze = 1 + 0.6 * (1 - halfGap(cell.x, openness) / HALF_OPEN);
      cell.x += cell.v * surge * squeeze * dt;
      if (cell.x > 840) seedCell(cell, -20 - Math.random() * 60);
    }
    drawCells();
    vesselRaf = requestAnimationFrame(tick);
  };

  const startLoop = () => {
    if (vesselRaf === null) {
      lastNow = null;
      vesselRaf = requestAnimationFrame(tick);
    }
  };
  const stopLoop = () => {
    cancelAnimationFrame(vesselRaf);
    vesselRaf = null;
  };

  // Beat classes accumulate; CSS keys the copy and molecule motion
  // off them (times from .is-visible, see styles.css). Two beats:
  // the copy lines ride them as transition delays.
  const BEATS = [
    ['is-docking', 1200],
    ['is-releasing', 2700],
  ];
  const SCENE_CLASSES = ['is-visible', ...BEATS.map(([cls]) => cls)];
  let beatTimers = [];
  const clearBeats = () => {
    beatTimers.forEach(clearTimeout);
    beatTimers = [];
  };

  const resetScene = () => {
    clearBeats();
    clearHeadlineTimers();
    vesselHeadlineWords.forEach((w) => w.classList.remove('is-on'));
    releaseStart = null;
    breatheEpoch = null;
    openness = 0;
    ambientPair.setAttribute('opacity', '0');
    renderWalls(0);
    seedTrickle();
    drawCells();
  };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Settled end state: open vessel, cells spread mid-stream, no
    // motion; base CSS already shows the payoff and caption.
    openness = 1;
    renderWalls(1);
    cells.forEach((cell) => seedCell(cell, Math.random() * 840 - 20));
    drawCells();
  } else {
    resetScene();

    new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.intersectionRatio >= 0.6) {
          resetScene();
          vesselFold.classList.add('is-visible');
          riseHeadline();
          BEATS.forEach(([cls, at]) =>
            beatTimers.push(setTimeout(() => {
              vesselFold.classList.add(cls);
              if (cls === 'is-releasing') releaseStart = performance.now();
            }, at))
          );
          startLoop();
        } else if (!entry.isIntersecting) {
          stopLoop();
          vesselFold.classList.add('is-resetting');
          vesselFold.classList.remove(...SCENE_CLASSES);
          resetScene();
          requestAnimationFrame(() =>
            requestAnimationFrame(() => vesselFold.classList.remove('is-resetting'))
          );
        }
      }
    }, { threshold: [0, 0.6] }).observe(vesselFold);
  }
}

// --------------------------------------------------------------------------
// Slide 4 choreography: "the supply" (v5, the lifespan chart). The fold
// rides the same .is-visible / .is-resetting conductor as slides 2-3;
// this block draws the whole chart on one rAF clock. As the age sweeps
// 20 -> 70, the cream supply line falls from 100% to ~25%. From age 40 a
// second, blue series enters — the pill: brief spikes of blood flow that
// rise off the cream line and fall straight back to it, short-term and
// local, and SHRINKING as the line drops. That shrink is the argument:
// the pill only prolongs the Nitric Oxide you still have (it makes none),
// so its help is proportional to what's left and fades with the supply.
// The two series never sum — the spikes ride on the supply, never lift
// it. is-pill fires when the spikes begin (the lede keys off it in
// styles.css). Resets off screen and replays on return. Reduced motion
// gets the settled chart: full decline, every shrinking spike, copy.
// --------------------------------------------------------------------------
const supplyFold = document.getElementById('the-supply');
if (supplyFold) {
  const creamLine = supplyFold.querySelector('.chart__cream-line');
  const creamArea = supplyFold.querySelector('.chart__cream-area');
  const blueLine = supplyFold.querySelector('.chart__blue-line');
  const blueArea = supplyFold.querySelector('.chart__blue-area');
  const blueGlow = supplyFold.querySelector('.chart__blue-glow');
  const marker = supplyFold.querySelector('.chart__marker');

  // Headline word-rise, like slides 1-3.
  const supplyHeadlineWords = splitWords(supplyFold.querySelector('.hero__headline'));
  const HEADLINE_WORD_MS = 90;
  let headlineTimers = [];
  const clearHeadlineTimers = () => {
    headlineTimers.forEach(clearTimeout);
    headlineTimers = [];
  };
  const riseHeadline = () => {
    supplyHeadlineWords.forEach((w, i) =>
      headlineTimers.push(setTimeout(() => w.classList.add('is-on'), i * HEADLINE_WORD_MS))
    );
  };

  // Plot geometry, matching the SVG's gridlines and axis.
  const LX = 46, RX = 360, TY = 34, BY = 248;
  const A0 = 20, A1 = 70;
  const ageToX = (a) => LX + ((a - A0) / (A1 - A0)) * (RX - LX);
  const pctToY = (p) => BY - (p / 100) * (BY - TY);

  // The supply, in % left by age — the same defensible figures as the
  // battery before it (20s peak = 100%, ~50% by 40, ~25% by the 70s;
  // see the slide's HTML comment for citations). Catmull-Rom through the
  // anchors (rather than joining them with straight segments) so the
  // curve decelerates smoothly instead of elbowing at each one.
  const ANCHORS = [[20, 100], [30, 75], [40, 50], [50, 38], [60, 30], [70, 25]];
  const catmullRom = (p0, p1, p2, p3, t) => {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (
      2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
  };
  const supplyAt = (age) => {
    const last = ANCHORS.length - 1;
    for (let i = 0; i < last; i += 1) {
      const [a1, p1] = ANCHORS[i];
      const [a2, p2] = ANCHORS[i + 1];
      if (age <= a2 || i === last - 1) {
        const p0 = ANCHORS[Math.max(i - 1, 0)][1];
        const p3 = ANCHORS[Math.min(i + 2, last)][1];
        const t = (age - a1) / (a2 - a1);
        return catmullRom(p0, p1, p2, p3, t);
      }
    }
    return ANCHORS[last][1];
  };

  // The pill: doses from age 40 on, each a narrow bump above the supply
  // line. Its height rides supplyAt(dose), so the spikes shrink as the
  // supply falls — the pill's benefit is proportional to the Nitric
  // Oxide still present. The bumps add only to the blue series.
  const PILL_AGE = 40;
  const DOSES = [42, 48, 54, 60, 66];
  const SIGMA = 1.7;
  const SPIKE = 30;
  const bumpAt = (age) => {
    let b = 0;
    for (const d of DOSES) {
      b += (SPIKE * supplyAt(d) / 100) * Math.exp(-(((age - d) / SIGMA) ** 2));
    }
    return b;
  };

  const STEP = 0.5;
  const agesTo = (from, to) => {
    const out = [];
    for (let a = from; a < to; a += STEP) out.push(a);
    out.push(to);
    return out;
  };
  const linePath = (ages, yOf) =>
    ages.map((a, i) => `${i ? 'L' : 'M'} ${ageToX(a).toFixed(1)} ${yOf(a).toFixed(1)}`).join(' ');

  const supplyY = (a) => pctToY(supplyAt(a));

  // The marker's fill tracks the line's own gradient (orange at 20,
  // cream by 70) so the leading dot always reads as part of the line
  // it's riding, not a separate color.
  const LINE_FROM = [0xd5, 0x4f, 0x2f];
  const LINE_TO = [0xf6, 0xf4, 0xf0];
  const lineColorAt = (age) => {
    const t = Math.min(1, Math.max(0, (age - A0) / (A1 - A0)));
    const [r, g, b] = LINE_FROM.map((c, i) => Math.round(c + (LINE_TO[i] - c) * t));
    return `rgb(${r}, ${g}, ${b})`;
  };

  const render = (cur) => {
    const ages = agesTo(A0, cur);
    const cream = linePath(ages, supplyY);
    creamLine.setAttribute('d', cream);
    creamArea.setAttribute('d',
      `${cream} L ${ageToX(cur).toFixed(1)} ${BY} L ${ageToX(A0).toFixed(1)} ${BY} Z`);

    // The pill series: the spike top forward, the supply line back —
    // the lobe between them is the pill's temporary contribution.
    if (cur > PILL_AGE) {
      const dAges = agesTo(PILL_AGE, cur);
      const top = linePath(dAges, (a) => pctToY(supplyAt(a) + bumpAt(a)));
      const back = [...dAges].reverse()
        .map((a) => `L ${ageToX(a).toFixed(1)} ${supplyY(a).toFixed(1)}`).join(' ');
      blueLine.setAttribute('d', top);
      blueGlow.setAttribute('d', top);
      blueArea.setAttribute('d', `${top} ${back} Z`);
    } else {
      blueLine.setAttribute('d', '');
      blueGlow.setAttribute('d', '');
      blueArea.setAttribute('d', '');
    }

    marker.setAttribute('cx', ageToX(cur).toFixed(1));
    marker.setAttribute('cy', supplyY(cur).toFixed(1));
    marker.style.fill = lineColorAt(cur);
  };

  const DRAW_MS = 6000;    // the sweep, age 20 -> 70
  const DRAW_DELAY = 800;  // after .is-visible, once the chart is up
  const PILL_T = ((PILL_AGE - A0) / (A1 - A0)) * DRAW_MS;

  let raf = null;
  let delayTimer = null;
  let dosed = false;

  const stop = () => {
    cancelAnimationFrame(raf);
    clearTimeout(delayTimer);
  };

  const resetScene = () => {
    clearHeadlineTimers();
    supplyHeadlineWords.forEach((w) => w.classList.remove('is-on'));
    dosed = false;
    render(A0);
  };

  const play = () => {
    let start = null;
    const step = (now) => {
      if (start === null) start = now;
      const elapsed = now - start;
      const t = Math.min(elapsed / DRAW_MS, 1);
      render(A0 + (A1 - A0) * t);

      // The spikes begin as the age passes 40; the lede keys off this.
      if (!dosed && elapsed >= PILL_T) {
        dosed = true;
        supplyFold.classList.add('is-pill');
      }

      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Settled chart: full decline, every shrinking spike; the copy
    // shows via the base CSS (choreography is in the no-preference
    // query, so the lede is not hidden here).
    render(A1);
  } else {
    resetScene();

    new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.intersectionRatio >= 0.6) {
          stop();
          resetScene();
          supplyFold.classList.add('is-visible');
          riseHeadline();
          delayTimer = setTimeout(play, DRAW_DELAY);
        } else if (!entry.isIntersecting) {
          stop();
          supplyFold.classList.add('is-resetting');
          supplyFold.classList.remove('is-visible', 'is-pill');
          resetScene();
          requestAnimationFrame(() =>
            requestAnimationFrame(() => supplyFold.classList.remove('is-resetting'))
          );
        }
      }
    }, { threshold: [0, 0.6] }).observe(supplyFold);
  }
}

// --------------------------------------------------------------------------
// Slide 5 choreography: "the source". Same conductor as slides 2-3, but
// this scene loops while it is on screen. Each pass: rewind the label to
// "DIETARY NITRATE", add step-nitrite (one oxygen peels off), then
// step-no + is-made (the second peels, the N and O settle into the pair,
// the halo blooms and the lede lands). After a hold, step-exit drifts the
// finished pair up and off; we silently rewind to nitrate below the stage
// (step-enter, under is-resetting) and play the pass again — the body
// keeps making it. is-made stays on across passes so the lede lands once
// and holds. The atom motion, halo and seam are all CSS — here we just
// swap the label text and flip classes. Resets off screen and replays on
// return. Reduced motion rests on the finished NO pair (base CSS shows
// it), so this whole block is skipped in that case.
// --------------------------------------------------------------------------
const sourceFold = document.getElementById('the-source');
if (sourceFold && matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  const label = sourceFold.querySelector('.conv__label');
  const headlineWords = splitWords(sourceFold.querySelector('.hero__headline'));
  const HEADLINE_WORD_MS = 90;
  const NITRITE_AT = 1200;
  const NO_AT = 2500;
  const HOLD_MS = 2400;  // rest on the finished pair before it drifts off
  const EXIT_MS = 800;   // covers the 0.7s step-exit fade

  let wordTimers = [];
  let beatTimers = [];
  let gen = 0; // bumped on every reset so a stale loop callback dies
  const clearTimers = () => {
    wordTimers.forEach(clearTimeout);
    beatTimers.forEach(clearTimeout);
    wordTimers = [];
    beatTimers = [];
  };
  const riseHeadline = () => {
    headlineWords.forEach((w, i) =>
      wordTimers.push(setTimeout(() => w.classList.add('is-on'), i * HEADLINE_WORD_MS))
    );
  };

  const rewindMolecule = () => {
    sourceFold.classList.remove('step-nitrite', 'step-no', 'step-exit', 'step-enter');
    label.textContent = 'DIETARY NITRATE';
  };

  const resetScene = () => {
    gen++;
    clearTimers();
    headlineWords.forEach((w) => w.classList.remove('is-on'));
    sourceFold.classList.remove('is-made');
    rewindMolecule();
  };

  // One pass of the conversion, then around again: exit, silent rewind,
  // re-enter on the same transition the first pass rode in on.
  const playCycle = () => {
    const myGen = gen;
    beatTimers.push(setTimeout(() => {
      sourceFold.classList.add('step-nitrite');
      label.textContent = 'NITRITE';
    }, NITRITE_AT));
    beatTimers.push(setTimeout(() => {
      sourceFold.classList.add('step-no', 'is-made');
      label.textContent = 'NITRIC OXIDE';
    }, NO_AT));
    beatTimers.push(setTimeout(() => {
      sourceFold.classList.add('step-exit');
    }, NO_AT + HOLD_MS));
    beatTimers.push(setTimeout(() => {
      rewindMolecule();
      sourceFold.classList.add('is-resetting', 'step-enter');
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (myGen !== gen) return;
          sourceFold.classList.remove('is-resetting', 'step-enter');
          playCycle();
        })
      );
    }, NO_AT + HOLD_MS + EXIT_MS));
  };

  resetScene();

  new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.intersectionRatio >= 0.6) {
        resetScene();
        sourceFold.classList.add('is-visible');
        riseHeadline();
        playCycle();
      } else if (!entry.isIntersecting) {
        sourceFold.classList.add('is-resetting');
        sourceFold.classList.remove('is-visible');
        resetScene();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => sourceFold.classList.remove('is-resetting'))
        );
      }
    }
  }, { threshold: [0, 0.6] }).observe(sourceFold);
}

// --------------------------------------------------------------------------
// Slide 6 choreography: "the reveal". Slide 2's conductor verbatim:
// one .is-visible class once the slide settles (0.6 ratio), the beats
// live in styles.css as transition delays (bottle, ring, lede, review
// pill + cards), and the ring's slow turn is a CSS animation. Resets
// off screen, replays on return; .is-resetting keeps a quick
// scroll-back from catching the bottle mid-fade.
//
// The stamp ring's text must fill its circle exactly — the phrase
// repeats around the loop and the ring spins, so any shortfall shows
// as a dead arc and any overflow clips at the seam. Metrics depend on
// the loaded font, so once fonts are in we measure the real length
// and absorb the difference into letter-spacing (a fraction of a unit
// per character; SVG user units, resolution-independent, so one fit
// serves every screen size).
// --------------------------------------------------------------------------
const capsuleFold = document.getElementById('the-capsule');
if (capsuleFold) {
  const ringText = capsuleFold.querySelector('.reveal__ring-text');
  const RING_C = 2 * Math.PI * 186; // circumference of #revealRing
  const fitRing = () => {
    const chars = ringText.textContent.length;
    const spacing = parseFloat(getComputedStyle(ringText).letterSpacing) || 0;
    const length = ringText.getComputedTextLength();
    ringText.style.letterSpacing =
      `${(spacing + (RING_C - length) / chars).toFixed(3)}px`;
  };
  fitRing();
  document.fonts.ready.then(fitRing);

  const headlineWords = splitWords(capsuleFold.querySelector('.hero__headline'));
  const HEADLINE_WORD_MS = 90;

  let wordTimers = [];
  const clearWordTimers = () => {
    wordTimers.forEach(clearTimeout);
    wordTimers = [];
  };
  const riseHeadline = () => {
    headlineWords.forEach((w, i) =>
      wordTimers.push(setTimeout(() => w.classList.add('is-on'), i * HEADLINE_WORD_MS))
    );
  };

  new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.intersectionRatio >= 0.6) {
        capsuleFold.classList.add('is-visible');
        clearWordTimers();
        riseHeadline();
      } else if (!entry.isIntersecting) {
        capsuleFold.classList.add('is-resetting');
        capsuleFold.classList.remove('is-visible');
        clearWordTimers();
        headlineWords.forEach((w) => w.classList.remove('is-on'));
        requestAnimationFrame(() =>
          requestAnimationFrame(() => capsuleFold.classList.remove('is-resetting'))
        );
      }
    }
  }, { threshold: [0, 0.6] }).observe(capsuleFold);
}

// --------------------------------------------------------------------------
// Optional peeks: the Nobel proof on slide 2. (Slide 4's "what about
// the pill?" peek retired Jul 8 — slide 4's scene answers the
// objection itself.) Tap the trigger to open a small card; scroll,
// tap-out, Escape (and the close button where present) dismiss it.
// A peek, never a modal — the page never stops moving under it.
// --------------------------------------------------------------------------
for (const block of ['nobel-pop']) {
  const pop = document.querySelector(`.${block}`);
  if (!pop) continue;

  const trigger = pop.querySelector(`.${block}__trigger`);
  const card = pop.querySelector(`.${block}__card`);
  const closeBtn = pop.querySelector(`.${block}__close`);

  const setOpen = (open) => {
    pop.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', open);
    card.setAttribute('aria-hidden', !open);
  };

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!pop.classList.contains('is-open'));
  });

  if (closeBtn) closeBtn.addEventListener('click', () => setOpen(false));

  document.addEventListener('click', (e) => {
    if (pop.classList.contains('is-open') && !pop.contains(e.target)) setOpen(false);
  });

  // The peek never blocks the page: scrolling on dismisses it.
  window.addEventListener('scroll', () => {
    if (pop.classList.contains('is-open')) setOpen(false);
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}

// --------------------------------------------------------------------------
// Doctor full-quote peeks on slide 6: each review card's byline button
// opens its doctor's whole quote (.doc-pop) centered over the stage.
// Same peek grammar as the Nobel pop above — tap-out, scroll, Escape
// and the X all dismiss, never a modal — but trigger and card live in
// different subtrees (byline in the review card, pop over the stage),
// so aria-controls carries the pairing. Only one pop open at a time.
// --------------------------------------------------------------------------
const docPops = [];
document.querySelectorAll('.reveal__card-byline[aria-controls]').forEach((btn) => {
  const pop = document.getElementById(btn.getAttribute('aria-controls'));
  if (!pop) return;

  const setOpen = (open) => {
    if (open) docPops.forEach((d) => { if (d.pop !== pop) d.setOpen(false); });
    pop.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open);
    pop.setAttribute('aria-hidden', !open);
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!pop.classList.contains('is-open'));
  });
  pop.addEventListener('click', (e) => e.stopPropagation());
  pop.querySelector('.doc-pop__close')?.addEventListener('click', () => setOpen(false));

  docPops.push({ pop, setOpen });
});

if (docPops.length) {
  const closeAll = () => docPops.forEach(({ pop, setOpen }) => {
    if (pop.classList.contains('is-open')) setOpen(false);
  });
  document.addEventListener('click', closeAll);
  window.addEventListener('scroll', closeAll, { passive: true });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });
}

// --------------------------------------------------------------------------
// Dot rail (+ the sticky CTA, which rides the same active-slide signal).
// One dot per .fold, built here so future slides join the map without
// touching the markup. The same 0.6 settle ratio the choreography uses
// marks the active dot; the rail itself only shows once the visitor
// has moved past slide 1, so the opening scene stays chrome-free
// (returning to slide 1 tucks it away again).
//
// The sticky bar piggybacks on this same observer rather than running
// a second one: it turns on from slide 6 (#the-capsule, "the reveal")
// onward — the first slide with a product to buy — and off again on
// the way back up. proofIndex looks up a slide with id="the-proof" —
// none exists (the Jul 9 proof room was cut; its receipts moved onto
// slide 6 as the stats band), so the escalation hook stays dormant:
// if a proof slide ever returns with that id, the bar escalates there
// with no other code change.
// --------------------------------------------------------------------------
const dotrail = document.querySelector('.dotrail');
const stickyCta = document.querySelector('.sticky-cta');
const folds = Array.from(document.querySelectorAll('.fold'));
if (dotrail && folds.length > 1) {
  const dots = folds.map(() => {
    const dot = document.createElement('span');
    dot.className = 'dotrail__dot';
    dotrail.appendChild(dot);
    return dot;
  });

  const revealIndex = folds.findIndex((fold) => fold.id === 'the-capsule');
  const proofIndex = folds.findIndex((fold) => fold.id === 'the-proof');

  const railObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.intersectionRatio >= 0.6) {
        const active = folds.indexOf(entry.target);
        dots.forEach((dot, i) => dot.classList.toggle('is-active', i === active));
        dotrail.classList.toggle('is-on', active > 0);
        // Ink dots vanish on the dark slide; flip the rail to cream there.
        dotrail.classList.toggle(
          'dotrail--dark',
          folds[active].classList.contains('fold--dark')
        );
        if (stickyCta) {
          stickyCta.classList.toggle('is-on', revealIndex !== -1 && active >= revealIndex);
          if (proofIndex !== -1) {
            stickyCta.classList.toggle('is-escalated', active >= proofIndex);
          }
        }
      }
    }
  }, { threshold: 0.6 });
  folds.forEach((fold) => railObserver.observe(fold));
}

// --------------------------------------------------------------------------
// Keep-scrolling cue. After each middle slide's choreography settles, a
// text-less chevron fades in at the slide's foot to nudge the visitor on
// — slide 1 has its own labelled cue, and the last slide gets none
// (nothing below it yet). Built per-fold like the dot rail, so new slides
// inherit it; each delay is tuned to land just as that slide's motion
// finishes. The cue re-arms with the slide, so a scroll-back shows it
// again.
// --------------------------------------------------------------------------
const KEEP_CUE_DELAY = {
  'the-molecule': 3600, // lede + Nobel line have landed
  'the-vessel': 4800,   // release + payoff line done (breath is ambient)
  'the-supply': 7000,   // the chart has finished drawing to age 70
  'the-source': 3800,   // the NO pair has formed and the lede has landed
};
folds.slice(1, -1).forEach((fold) => {
  const cue = document.createElement('div');
  cue.className = 'keepcue';
  cue.setAttribute('aria-hidden', 'true');
  cue.innerHTML =
    '<svg viewBox="0 0 16 9" class="keepcue__chevron"><path d="M1.5 1 L8 7.5 L14.5 1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  fold.appendChild(cue);

  let cueTimer = null;
  new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.intersectionRatio >= 0.6) {
        clearTimeout(cueTimer);
        cueTimer = setTimeout(
          () => fold.classList.add('is-cue'),
          KEEP_CUE_DELAY[fold.id] ?? 3800
        );
      } else if (!entry.isIntersecting) {
        clearTimeout(cueTimer);
        fold.classList.remove('is-cue');
      }
    }
  }, { threshold: [0, 0.6] }).observe(fold);
});

// --------------------------------------------------------------------------
// Slide 1 choreography. The video plays from the moment the slide is
// on screen; its own opening ~1.5s of near-stillness is the quiet the
// hook rises over, so motion never "suddenly starts". Text events ride
// the video clock, so nothing drifts even on a stalling connection:
//   ~0-1.3s  hook words rise in over the idling pill;
//   ~1.7s    scroll cue follows the hook;
//   ~2.2s    pill deforms  -> hook dissolves with it;
//   ~3.3s    capsules form -> claim rises in, lede words follow.
// Plays once: scrolling away and back leaves the scene as it was, no
// restart.
// --------------------------------------------------------------------------
const morph = document.querySelector('.morph__video');
if (morph) {
  const hero = morph.closest('.hero');
  const hook = hero.querySelector('.morph-hook');
  const claim = hero.querySelector('.headline-claim');
  const lede = hero.querySelector('.hero__lede');
  const cue = hero.querySelector('.scrollcue');

  const WORD_MS = 110;      // stagger between hook words
  const LEDE_WORD_MS = 80;  // stagger between lede words (a touch quicker)
  const START_DELAY = 250;  // before the hook begins
  const CUE_LAG = 450;      // cue after the hook's last word
  const HOOK_OUT_AT = 0.44; // video fraction: pill visibly deforming
  const CLAIM_IN_AT = 0.66; // video fraction: capsules taking shape
  const LEDE_LAG = 500;     // after the claim

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // No motion: the settled end state, immediately. Final frame,
    // claim, lede, cue; no word-rise, no video. (The lede is never
    // split into word spans on this path, so it is simply visible.)
    hook.style.display = 'none';
    claim.classList.add('is-in');
    cue.classList.add('is-in');
    const holdEnd = () => { morph.currentTime = morph.duration; };
    if (morph.readyState >= 1) holdEnd();
    else morph.addEventListener('loadedmetadata', holdEnd, { once: true });
  } else {
    const hookWords = splitWords(hook);
    const ledeWords = splitWords(lede);

    let timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const clearTimers = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };

    let hookGone = false;
    let claimIn = false;

    const reset = () => {
      clearTimers();
      hookGone = false;
      claimIn = false;
      hook.classList.remove('is-out');
      hookWords.forEach((w) => w.classList.remove('is-on'));
      ledeWords.forEach((w) => w.classList.remove('is-on'));
      claim.classList.remove('is-in');
      cue.classList.remove('is-in');
      morph.pause();
      morph.currentTime = 0;
    };

    const rise = (words, step) => {
      words.forEach((w, i) => later(() => w.classList.add('is-on'), i * step));
    };

    morph.addEventListener('timeupdate', () => {
      if (!morph.duration) return;
      const f = morph.currentTime / morph.duration;
      if (!hookGone && f >= HOOK_OUT_AT) {
        hookGone = true;
        hook.classList.add('is-out');
      }
      if (!claimIn && f >= CLAIM_IN_AT) {
        claimIn = true;
        claim.classList.add('is-in');
        later(() => rise(ledeWords, LEDE_WORD_MS), LEDE_LAG);
      }
    });

    // Plays once per visit: scrolling back up to slide 1 later should
    // find the scene exactly as it was left, not restarted.
    let played = false;

    new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (played) continue;
          played = true;
          reset();
          morph.play();
          later(() => rise(hookWords, WORD_MS), START_DELAY);
          later(
            () => cue.classList.add('is-in'),
            START_DELAY + hookWords.length * WORD_MS + CUE_LAG
          );
        } else if (!played) {
          clearTimers();
          morph.pause();
        }
      }
    }, { threshold: 0.35 }).observe(morph);
  }
}
