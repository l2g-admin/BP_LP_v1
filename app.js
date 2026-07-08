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
// Slide 4 choreography: "the battery" (v2, vertical). The fold rides
// the same .is-visible / .is-resetting conductor as slide 2; this block
// owns the whole scene on one rAF clock. The age climbs 20 -> 70
// (linear — years tick steadily; the front-loaded drop comes from the
// supply data itself) and the level, the split number's two clip
// rects, the fill color, and both readouts all read off it, so they
// can only ever agree. The pill is the recurring actor: at three ages
// it drops into the terminal and buys a blue buffer on top of the
// level — each one a fixed share of whatever's left, so each one
// smaller — and the buffer drains away while the supply keeps sinking
// underneath. The readout NEVER counts the buffer, and the supply
// data never reacts to the pill: the number is the supply, honestly.
// Beats fire from the clock: is-pill on the first drop (the lede keys
// off it in styles.css), is-drained when the level settles (the
// handoff); the last buffer dies after the drain has already ended —
// the closing beat. Resets off screen and replays on return. Reduced
// motion gets the settled end state: age 70, 25%, warmed fill, no
// pill in sight, copy visible via the base CSS.
// --------------------------------------------------------------------------
const supplyFold = document.getElementById('the-supply');
if (supplyFold) {
  const fill = supplyFold.querySelector('.bat__fill');
  const buffer = supplyFold.querySelector('.bat__buffer');
  const clipFill = supplyFold.querySelector('.bat__clip-fill');
  const clipEmpty = supplyFold.querySelector('.bat__clip-empty');
  const nums = supplyFold.querySelectorAll('.bat__num');
  const pill = supplyFold.querySelector('.bat-pill');
  const ageEl = supplyFold.querySelector('.bat-age');

  // Chamber geometry, matching the SVG's inner rects.
  const IN_TOP = 79;
  const IN_BOT = 441;
  const IN_H = 362;

  // The supply, in % left by age — same defensible figures as the
  // curve version (anchored to the 20s peak; ~50% gone by 40, ~75%
  // by the 70s; see the slide's HTML comment for citations).
  const ANCHORS = [[20, 100], [30, 75], [40, 50], [50, 38], [60, 30], [70, 25]];
  const supplyAt = (age) => {
    for (let i = 1; i < ANCHORS.length; i += 1) {
      const [a1, p1] = ANCHORS[i - 1];
      const [a2, p2] = ANCHORS[i];
      if (age <= a2) return p1 + ((p2 - p1) * (age - a1)) / (a2 - a1);
    }
    return ANCHORS[ANCHORS.length - 1][1];
  };

  // The charge warms from cream toward the room's low-battery orange
  // as the level falls through 50. Set as the rect's fill ATTRIBUTE —
  // there is deliberately no CSS fill rule on .bat__fill to override
  // it (a stylesheet rule froze the charge cream in v1).
  const CREAM = [246, 244, 240];
  const LOW = [231, 122, 88];

  // Returns the level's y so the frame loop can stack the buffer on it.
  const setSupply = (age) => {
    const pct = supplyAt(age);
    const levelY = IN_BOT - (IN_H * pct) / 100;
    const h = (IN_BOT - levelY).toFixed(1);
    fill.setAttribute('y', levelY.toFixed(1));
    fill.setAttribute('height', h);
    clipFill.setAttribute('y', levelY.toFixed(1));
    clipFill.setAttribute('height', h);
    clipEmpty.setAttribute('height', Math.max(levelY - IN_TOP, 0).toFixed(1));

    let warm = Math.min(Math.max((50 - pct) / 20, 0), 1);
    warm = warm * warm * (3 - 2 * warm);
    const c = CREAM.map((v, i) => Math.round(v + (LOW[i] - v) * warm));
    fill.setAttribute('fill', `rgb(${c.join(',')})`);

    const rounded = Math.round(pct);
    nums.forEach((n) => { n.textContent = rounded; });
    ageEl.textContent = Math.round(age);
    return levelY;
  };

  const AGE0 = 20;
  const AGE1 = 70;
  const DRAIN_MS = 6000;   // the drain itself
  const DRAIN_DELAY = 800; // after .is-visible, once the cell is up

  // The pill events: drop through the terminal, buffer rises, holds a
  // breath, and is spent — while the level keeps falling underneath.
  // Ages chosen so the rhythm quickens as the buffers shrink.
  const PILL_AGES = [45, 55, 65];
  const DROP_MS = 400;
  const RISE_MS = 200;
  const HOLD_MS = 150;
  const SPEND_MS = 700;
  const EVENT_MS = DROP_MS + RISE_MS + HOLD_MS + SPEND_MS;
  const BOOST = 0.3; // a buffer is 30% of what's left — never a refill

  const eventStart = (age) => ((age - AGE0) / (AGE1 - AGE0)) * DRAIN_MS;
  const LAST_EVENT_END = eventStart(PILL_AGES[PILL_AGES.length - 1]) + EVENT_MS;

  let raf = null;
  let delayTimer = null;
  let firstDrop = false;

  const stop = () => {
    cancelAnimationFrame(raf);
    clearTimeout(delayTimer);
  };

  const resetScene = () => {
    firstDrop = false;
    buffer.setAttribute('height', 0);
    pill.style.opacity = 0;
    setSupply(AGE0);
  };

  const play = () => {
    let start = null;
    const step = (now) => {
      if (start === null) start = now;
      const elapsed = now - start;
      const t = Math.min(elapsed / DRAIN_MS, 1);
      const levelY = setSupply(AGE0 + (AGE1 - AGE0) * t);

      // The pill events. One sprite serves all three drops (they never
      // overlap); overlapping buffer tails resolve to the tallest.
      let buf = 0;
      let pillY = null;
      let pillA = 0;
      for (const pillAge of PILL_AGES) {
        const e = elapsed - eventStart(pillAge);
        if (e <= 0) continue;
        if (!firstDrop) {
          firstDrop = true;
          supplyFold.classList.add('is-pill');
        }
        if (e < DROP_MS) {
          // Falls, accelerating, into the terminal; fades as it enters.
          const p = e / DROP_MS;
          pillY = 6 + 52 * p * p;
          pillA = Math.min(e / 120, 1) * Math.min((DROP_MS - e) / 90, 1);
        } else if (e < EVENT_MS) {
          // The buffer it bought: a share of what was left at swallow
          // time, so each one is smaller than the last.
          const pctThen = supplyAt(
            AGE0 + (AGE1 - AGE0) * Math.min((eventStart(pillAge) + DROP_MS) / DRAIN_MS, 1)
          );
          const B = (IN_H * BOOST * pctThen) / 100;
          const r = e - DROP_MS;
          let b;
          if (r < RISE_MS) b = B * (1 - (1 - r / RISE_MS) ** 2);
          else if (r < RISE_MS + HOLD_MS) b = B;
          else b = B * (1 - (r - RISE_MS - HOLD_MS) / SPEND_MS);
          buf = Math.max(buf, b);
        }
      }

      buffer.setAttribute('y', (levelY - buf).toFixed(1));
      buffer.setAttribute('height', Math.max(buf, 0).toFixed(1));
      if (pillY === null) {
        pill.style.opacity = 0;
      } else {
        pill.setAttribute('transform', `translate(110 ${pillY.toFixed(1)})`);
        pill.style.opacity = pillA.toFixed(3);
      }

      if (t >= 1) supplyFold.classList.add('is-drained');
      if (t < 1 || elapsed < LAST_EVENT_END) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Settled end state; the copy shows via the base CSS (the
    // choreography lives inside the no-preference query) and the
    // pill sprite stays parked hidden, so only the cell needs setting.
    setSupply(AGE1);
  } else {
    resetScene();

    new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.intersectionRatio >= 0.6) {
          stop();
          resetScene();
          supplyFold.classList.add('is-visible');
          delayTimer = setTimeout(play, DRAIN_DELAY);
        } else if (!entry.isIntersecting) {
          stop();
          supplyFold.classList.add('is-resetting');
          supplyFold.classList.remove('is-visible', 'is-pill', 'is-drained');
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
// Optional peeks: the Nobel proof on slide 2. (Slide 4's "what about
// the pill?" peek retired Jul 8 — the battery scene answers the
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
// Dot rail. One dot per .fold, built here so future slides join the
// map without touching the markup. The same 0.6 settle ratio the
// choreography uses marks the active dot; the rail itself only shows
// once the visitor has moved past slide 1, so the opening scene stays
// chrome-free (returning to slide 1 tucks it away again).
// --------------------------------------------------------------------------
const dotrail = document.querySelector('.dotrail');
const folds = Array.from(document.querySelectorAll('.fold'));
if (dotrail && folds.length > 1) {
  const dots = folds.map(() => {
    const dot = document.createElement('span');
    dot.className = 'dotrail__dot';
    dotrail.appendChild(dot);
    return dot;
  });

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
      }
    }
  }, { threshold: 0.6 });
  folds.forEach((fold) => railObserver.observe(fold));
}

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
