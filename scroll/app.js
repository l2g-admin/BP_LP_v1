// ==========================================================================
// NATURAL-SCROLL DEMO build. The choreography conductor (word-rise
// headlines, beat timers, reset/replay observers, keep-cues, dot rail)
// is gone: every slide rests in its settled poster state and is fully
// readable the moment it scrolls into view. What remains here:
//   - slide 3's ambient vessel loop (open vessel, flowing cells, the
//     slow breath + rescuer molecule) — motion that IS the content,
//     and never gates the copy;
//   - slide 4's chart, rendered complete at load;
//   - slide 6's ring text fit, marquee sizing, and quote peeks;
//   - the sticky CTA toggle, tracking, and the UTM passthrough.
// ==========================================================================

// --------------------------------------------------------------------------
// Slide 3: the vessel, resting open with continuous flow. The breath
// cycle keeps re-enacting the mechanism: the vessel slowly narrows, a
// fresh NO pair rides in with the blood, lands as the contraction
// peaks, signals the wall with a quiet ring, and rides it back open.
// Walls, blood, cells and molecule all render from one half-gap
// function on one rAF clock; the loop runs only while on screen.
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

  // Geometry, in viewBox units: a horizontal channel around y=130;
  // openness 1 is the relaxed full gap, 0 the tight pinch.
  const MID = 130;
  const HALF_OPEN = 58;
  const PINCH = 40;
  const halfGap = (x, openness) =>
    HALF_OPEN - PINCH * (1 - openness) * Math.exp(-(((x - 400) / 150) ** 2));

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
    const interior = `${top}${bottomReversed}Z`;
    vesselFill.setAttribute('d', interior);
    vesselSheen.setAttribute('d', interior);
    const wallY = MID + halfGap(300, openness);
    tagDot.setAttribute('cy', wallY.toFixed(1));
    tagLine.setAttribute('y1', (wallY + 2).toFixed(1));
  };

  const CELL_COUNT = 12;
  const cells = Array.from({ length: CELL_COUNT }, () => {
    const el = document.createElementNS(SVG_NS, 'circle');
    el.setAttribute('class', 'vessel__cell');
    el.setAttribute('cx', -40);
    cellLayer.appendChild(el);
    return { el, x: 0, lane: 0, v: 0, r: 0 };
  });

  const seedCell = (cell, x) => {
    cell.x = x;
    cell.lane = Math.random() * 1.7 - 0.85;
    cell.v = 48 + Math.random() * 18;
    cell.r = 5 + Math.random() * 1.2;
    cell.el.setAttribute('r', cell.r);
  };

  let openness = 1;

  // The rescuer NO pair, in the scene's flat 2D style.
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

  const easeOutCubic = (t) => 1 - (1 - t) ** 3;
  const smooth01 = (t) => {
    const c = Math.min(Math.max(t, 0), 1);
    return c * c * (3 - 2 * c);
  };

  const innerWallY = (x, fromTop) => fromTop
    ? MID - halfGap(x, openness) + 12
    : MID + halfGap(x, openness) - 12;

  // Signal pulses: one ring per delivery, expanding into the wall.
  const PULSE_MS = 700;
  const pulses = [];
  const spawnPulse = (x, y) => {
    const ring = document.createElementNS(SVG_NS, 'circle');
    ring.setAttribute('class', 'vessel__pulse');
    ring.setAttribute('cx', x.toFixed(1));
    ring.setAttribute('cy', y.toFixed(1));
    cellLayer.parentNode.insertBefore(ring, ambientPair);
    pulses.push({ el: ring, born: performance.now() });
  };
  const drawPulses = (now) => {
    for (let i = pulses.length - 1; i >= 0; i -= 1) {
      const t = (now - pulses[i].born) / PULSE_MS;
      if (t >= 1) {
        pulses[i].el.remove();
        pulses.splice(i, 1);
        continue;
      }
      pulses[i].el.setAttribute('r', (7 + 22 * easeOutCubic(t)).toFixed(1));
      pulses[i].el.setAttribute('opacity', (0.55 * (1 - t)).toFixed(3));
    }
  };

  // e is ms since the flight began; negative means not yet departed.
  const drawFlight = (f, e) => {
    if (!f || e < 0 || e >= f.rideMs + f.dwellMs + f.exitMs) {
      if (f) f.el.style.opacity = '0';
      return;
    }
    let x;
    let y;
    let alpha;
    if (e < f.rideMs) {
      const p = e / f.rideMs;
      x = f.startX + (f.dockX - f.startX) * p;
      const stream = MID + f.lane + 2.5 * Math.sin(e / 260 + f.bob);
      const settle = smooth01((p - 0.62) / 0.38);
      y = stream + (innerWallY(x, f.fromTop) - stream) * settle;
      alpha = Math.min(1, p / 0.15);
    } else if (e < f.rideMs + f.dwellMs) {
      if (!f.pulsed) {
        f.pulsed = true;
        spawnPulse(f.dockX, innerWallY(f.dockX, f.fromTop));
      }
      x = f.dockX;
      y = innerWallY(x, f.fromTop);
      alpha = 1;
    } else {
      const q = (e - f.rideMs - f.dwellMs) / f.exitMs;
      x = f.dockX + f.exitDist * q;
      y = innerWallY(x, f.fromTop);
      alpha = q < 0.6 ? 1 : 1 - (q - 0.6) / 0.4;
    }
    f.el.style.opacity = alpha.toFixed(3);
    f.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  };

  let ambientFlight = null;
  let ambientCycle = -1;

  const BREATHE = { contract: 2600, dwell: 350, restore: 1100, rest: 1800 };
  const BREATHE_CYCLE = BREATHE.contract + BREATHE.dwell + BREATHE.restore + BREATHE.rest;
  const BREATHE_DEPTH = 0.5;
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

    if (cycle !== ambientCycle) {
      ambientCycle = cycle;
      const fromTop = cycle % 2 === 0;
      const pinchX = 380 + ((cycle * 53) % 70);
      ambientFlight = {
        el: ambientPair, fromTop,
        startX: pinchX - 285, dockX: pinchX,
        lane: fromTop ? -8 : 8, bob: (cycle % 5) * 1.3,
        rideMs: 1500, dwellMs: dwell, exitMs: restore + 250, exitDist: 280,
        pulsed: false,
      };
    }
    drawFlight(ambientFlight, e - (contract - 1500));
  };

  const drawCells = () => {
    for (const cell of cells) {
      const room = Math.max(halfGap(cell.x, openness) - 8 - cell.r, 0);
      cell.el.setAttribute('cx', cell.x.toFixed(1));
      cell.el.setAttribute('cy', (MID + cell.lane * room).toFixed(1));
    }
  };

  // The settled poster, immediately: open vessel, cells mid-stream.
  renderWalls(1);
  cells.forEach((cell) => seedCell(cell, Math.random() * 840 - 20));
  drawCells();

  if (matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    let vesselRaf = null;
    let lastNow = null;
    let flowShift = 0;
    let pausedAt = null;

    const tick = (now) => {
      if (lastNow === null) lastNow = now;
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;

      if (breatheEpoch === null) breatheEpoch = now + 1500;
      if (now >= breatheEpoch) breathe(now);
      drawPulses(now);

      flowShift = (flowShift + 38 * dt) % 260;
      flowGrad.setAttribute('gradientTransform', `translate(${flowShift.toFixed(1)} 0)`);

      const surge = 1 + 1.9 * openness;
      for (const cell of cells) {
        const squeeze = 1 + 0.6 * (1 - halfGap(cell.x, openness) / HALF_OPEN);
        cell.x += cell.v * surge * squeeze * dt;
        if (cell.x > 840) seedCell(cell, -20 - Math.random() * 60);
      }
      drawCells();
      vesselRaf = requestAnimationFrame(tick);
    };

    // Run only while on screen; pausing shifts the breath clock so a
    // return never jumps mid-cycle.
    new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && vesselRaf === null) {
          if (pausedAt !== null && breatheEpoch !== null) {
            breatheEpoch += performance.now() - pausedAt;
          }
          pausedAt = null;
          lastNow = null;
          vesselRaf = requestAnimationFrame(tick);
        } else if (!entry.isIntersecting && vesselRaf !== null) {
          cancelAnimationFrame(vesselRaf);
          vesselRaf = null;
          pausedAt = performance.now();
        }
      }
    }, { threshold: 0 }).observe(vesselFold);
  }
}

// --------------------------------------------------------------------------
// Slide 4: the lifespan chart. Draws itself once, quickly, as it
// scrolls into view — the sweep from 20 to 70 is what teaches the
// decline — then stays drawn for good. Never loops (a redrawing
// chart reads as a glitch, not a fact) and never gates the copy.
// Reduced motion gets the settled chart immediately.
// --------------------------------------------------------------------------
const supplyFold = document.getElementById('the-supply');
if (supplyFold) {
  const creamLine = supplyFold.querySelector('.chart__cream-line');
  const creamArea = supplyFold.querySelector('.chart__cream-area');
  const blueLine = supplyFold.querySelector('.chart__blue-line');
  const blueArea = supplyFold.querySelector('.chart__blue-area');
  const blueGlow = supplyFold.querySelector('.chart__blue-glow');
  const marker = supplyFold.querySelector('.chart__marker');

  const LX = 46, RX = 360, TY = 34, BY = 248;
  const A0 = 20, A1 = 70;
  const ageToX = (a) => LX + ((a - A0) / (A1 - A0)) * (RX - LX);
  const pctToY = (p) => BY - (p / 100) * (BY - TY);

  // Same defensible anchors as the choreographed build (20s peak =
  // 100%, ~50% by 40, ~25% by the 70s; citations in the slide's HTML).
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

  // The leading marker's fill tracks the line's own gradient (orange
  // at 20, cream by 70) so it always reads as part of the line.
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

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    render(A1);
  } else {
    // The loop, while the chart is on screen: sweep 20 -> 70, rest on
    // the finished picture, dip the series out (CSS seam above the
    // marker styles), redraw. Same grammar as slide 1's video loop.
    const chartEl = supplyFold.querySelector('.no-chart');
    const DRAW_MS = 2400;
    const HOLD_MS = 2600;
    const DIP_MS = 550;   // covers the 0.5s series fade
    const REARM_MS = 250; // small beat after the series fade back in

    let raf = null;
    let timers = [];
    let gen = 0; // bumped on visibility flips so stale callbacks die
    const clear = () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      timers = [];
    };

    const draw = (myGen) => {
      let start = null;
      const step = (now) => {
        if (gen !== myGen) return;
        if (start === null) start = now;
        const t = Math.min((now - start) / DRAW_MS, 1);
        render(A0 + (A1 - A0) * t);
        if (t < 1) {
          raf = requestAnimationFrame(step);
        } else {
          timers.push(setTimeout(() => dip(myGen), HOLD_MS));
        }
      };
      raf = requestAnimationFrame(step);
    };

    const dip = (myGen) => {
      chartEl.classList.add('is-dipped');
      timers.push(setTimeout(() => {
        if (gen !== myGen) return;
        render(A0);
        chartEl.classList.remove('is-dipped');
        timers.push(setTimeout(() => draw(myGen), REARM_MS));
      }, DIP_MS));
    };

    render(A0);
    new IntersectionObserver((entries) => {
      for (const entry of entries) {
        gen++;
        clear();
        chartEl.classList.remove('is-dipped');
        if (entry.isIntersecting) {
          render(A0);
          draw(gen);
        } else {
          // Off screen: rest settled, ready to redraw on return.
          render(A1);
        }
      }
    }, { threshold: 0.5 }).observe(chartEl);
  }
}

// --------------------------------------------------------------------------
// Slide 5: the conversion loop, restored — nitrate sheds an oxygen to
// become nitrite, sheds another to become the NO pair, holds, drifts
// off into circulation, and a fresh nitrate rides back in. The body
// keeps making it. Copy and label are never gated (the label text
// just tracks the current molecule); reduced motion rests on the
// finished pair via the base CSS, so this whole block is skipped.
// --------------------------------------------------------------------------
const sourceFold = document.getElementById('the-source');
if (sourceFold && matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  const label = sourceFold.querySelector('.conv__label');
  const NITRITE_AT = 900;
  const NO_AT = 1800;
  const HOLD_MS = 2200;  // rest on the finished pair before it drifts off
  const EXIT_MS = 650;   // covers the 0.55s step-exit fade

  let timers = [];
  let gen = 0; // bumped on every reset so a stale loop callback dies
  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  const rewindMolecule = () => {
    sourceFold.classList.remove('step-nitrite', 'step-no', 'step-exit', 'step-enter');
    label.textContent = 'DIETARY NITRATE';
  };

  const resetScene = () => {
    gen++;
    clearTimers();
    sourceFold.classList.add('is-resetting');
    rewindMolecule();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => sourceFold.classList.remove('is-resetting'))
    );
  };

  const playCycle = () => {
    const myGen = gen;
    timers.push(setTimeout(() => {
      sourceFold.classList.add('step-nitrite');
      label.textContent = 'NITRITE';
    }, NITRITE_AT));
    timers.push(setTimeout(() => {
      sourceFold.classList.add('step-no');
      label.textContent = 'NITRIC OXIDE';
    }, NO_AT));
    timers.push(setTimeout(() => {
      sourceFold.classList.add('step-exit');
    }, NO_AT + HOLD_MS));
    timers.push(setTimeout(() => {
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

  // Loop only while on screen; a fresh entry starts a fresh pass.
  new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        resetScene();
        playCycle();
      } else {
        resetScene();
      }
    }
  }, { threshold: 0.35 }).observe(sourceFold);
}

// --------------------------------------------------------------------------
// Slide 1: the opening loops as one complete thought. The hook rides
// the idling blue pill and dissolves with it; the claim lands as the
// capsules take shape; the scene rests a beat; then video and claim
// dip out together, the hook returns, and the pass runs again. Text
// events ride the video clock (timeupdate fractions), so nothing
// drifts even on a stalling connection. Reduced motion rests on the
// settled end state: capsules, claim, no cycling.
// --------------------------------------------------------------------------
const morph = document.querySelector('.morph__video');
if (morph) {
  const hero = morph.closest('.hero');
  const hook = hero.querySelector('.morph-hook');
  const claim = hero.querySelector('.headline-claim');

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    hook.style.display = 'none';
    const holdEnd = () => {
      morph.pause();
      if (morph.duration) morph.currentTime = morph.duration;
    };
    if (morph.readyState >= 1) holdEnd();
    else morph.addEventListener('loadedmetadata', holdEnd, { once: true });
  } else {
    const HOOK_OUT_AT = 0.44; // video fraction: pill visibly deforming
    const CLAIM_IN_AT = 0.66; // video fraction: capsules taking shape
    const HOLD_MS = 1500;     // rest on capsules + claim before the seam
    const DIP_MS = 600;       // covers the 0.55s opacity dip

    let hookGone = false;
    let claimIn = false;

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
      }
    });

    morph.addEventListener('ended', () => {
      setTimeout(() => {
        // The seam: video and claim dip out together...
        morph.classList.add('is-dipped');
        claim.classList.remove('is-in');
        setTimeout(() => {
          // ...and the rewound scene fades back in under the hook.
          hookGone = false;
          claimIn = false;
          hook.classList.remove('is-out');
          morph.currentTime = 0;
          morph.play();
          morph.classList.remove('is-dipped');
        }, DIP_MS);
      }, HOLD_MS);
    });
  }
}

// --------------------------------------------------------------------------
// Slide 6: the stamp ring's text must fill its circle exactly — the
// phrase repeats around the loop and the ring spins, so any shortfall
// shows as a dead arc. Once fonts are in, measure and absorb the
// difference into letter-spacing.
// --------------------------------------------------------------------------
const capsuleFold = document.getElementById('the-capsule');
if (capsuleFold) {
  const ringText = capsuleFold.querySelector('.reveal__ring-text');
  const RING_C = 2 * Math.PI * 186;
  const fitRing = () => {
    const chars = ringText.textContent.length;
    const spacing = parseFloat(getComputedStyle(ringText).letterSpacing) || 0;
    const length = ringText.getComputedTextLength();
    ringText.style.letterSpacing =
      `${(spacing + (RING_C - length) / chars).toFixed(3)}px`;
  };
  fitRing();
  document.fonts.ready.then(fitRing);
}

// --------------------------------------------------------------------------
// Optional peeks: the Nobel proof on slide 2. Tap to open; scroll,
// tap-out, Escape (and the close button) dismiss. Never a modal.
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

  window.addEventListener('scroll', () => {
    if (pop.classList.contains('is-open')) setOpen(false);
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}

// --------------------------------------------------------------------------
// Doctor full-quote peeks on slide 6: same peek grammar as the Nobel
// pop; trigger (byline in the strip) and pop (over the stage) live in
// different subtrees, so aria-controls carries the pairing. The
// ticker's duplicate run is inert and stays unwired.
// --------------------------------------------------------------------------
const docPops = [];
document.querySelectorAll('.reveal__strip-byline[aria-controls]').forEach((btn) => {
  if (btn.closest('[inert]')) return;
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
// Review-ticker coverage: the CSS marquee shifts the track by -50%,
// gapless only while half the track is at least a viewport wide.
// Clone inert runs until it is, +1 run of slack.
// --------------------------------------------------------------------------
const stripTrack = document.querySelector('.reveal__strip-track');
if (stripTrack && matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  const growTrack = () => {
    const [realRun, dupRun] = stripTrack.children;
    const runWidth = realRun?.getBoundingClientRect().width;
    if (!runWidth || !dupRun) return;
    const runsNeeded = 2 * (Math.ceil(window.innerWidth / runWidth) + 1);
    while (stripTrack.children.length < runsNeeded) {
      stripTrack.appendChild(dupRun.cloneNode(true));
    }
  };
  growTrack();
  window.addEventListener('load', growTrack);
}

// --------------------------------------------------------------------------
// Sticky CTA: on once the reveal slide (#the-capsule) has entered the
// top two-thirds of the viewport, off again on the way back up. Folds
// are no longer exactly viewport-sized, so this keys off the fold's
// edge crossing in rather than a coverage ratio.
// --------------------------------------------------------------------------
const stickyCta = document.querySelector('.sticky-cta');
if (stickyCta && vesselFold) {
  // On from the end of "Meet the molecule" (Milan, Jul 20): the bar
  // rises as the vessel section arrives and stays for the rest of the
  // page. Synchronous geometry, not an IntersectionObserver — the
  // observer's async initial callback could catch the layout
  // mid-settle on load and flash the bar for a beat.
  const update = () => {
    const top = vesselFold.getBoundingClientRect().top;
    stickyCta.classList.toggle('is-on', top < window.innerHeight * 0.65);
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
}

// --------------------------------------------------------------------------
// Ad-traffic plumbing: carry the visitor's campaign tags (utm_*) and
// Meta's click id (fbclid) through the sticky CTA to the store, so
// Shopify's own analytics credit the eventual order to the ad that
// started it. Also tell the pixel when the CTA is actually used —
// LPCTAClick separates visitors who engaged from those who bounced.
// A/B test: the variant tag rides along as utm_content (suffixed onto
// whatever the ad already set, so ad-level labels survive) — that is
// what lets Shopify attribute each purchase to guided vs scroll.
// --------------------------------------------------------------------------
{
  const VARIANT = 'scroll-demo';
  const cta = document.querySelector('.sticky-cta__link');
  if (cta) {
    const inbound = new URLSearchParams(location.search);
    const dest = new URL(cta.href);
    for (const [key, value] of inbound) {
      if (/^utm_/i.test(key) || key === 'fbclid') dest.searchParams.set(key, value);
    }
    const adContent = dest.searchParams.get('utm_content');
    dest.searchParams.set('utm_content', adContent ? `${adContent}__${VARIANT}` : VARIANT);
    cta.href = dest.toString();
    cta.addEventListener('click', () => {
      if (window.fbq) fbq('trackCustom', 'LPCTAClick', { variant: VARIANT });
      if (window.clarity) clarity('event', 'cta-click');
    });
  }
}

// --------------------------------------------------------------------------
// Slide funnel for Clarity, same event names as the snap-deck build so
// the dashboard's history carries over: "reached-1-the-better-way",
// "reached-2-the-molecule", ... one per section, once per visit. The
// old 0.6-coverage trigger assumed viewport-sized slides; with
// content-height sections a tall section might never cover 60% of a
// small screen, so a section now counts as reached when its top
// crosses the 60% line of the viewport (the same geometry the sticky
// CTA uses). Note when comparing against snap-deck data: free scroll
// reaches these marks more easily, so CTA clicks and slide-6 reach
// are the honest comparison metrics.
// --------------------------------------------------------------------------
{
  const folds = Array.from(document.querySelectorAll('.fold'));
  const seen = new Set();
  const report = () => {
    folds.forEach((fold, i) => {
      if (seen.has(fold)) return;
      if (fold.getBoundingClientRect().top < window.innerHeight * 0.6) {
        seen.add(fold);
        if (window.clarity) {
          clarity('event', `reached-${i + 1}-${fold.id || 'slide'}`);
          if (seen.size === folds.length) clarity('event', 'reached-all-slides');
        }
      }
    });
  };
  report();
  window.addEventListener('scroll', report, { passive: true });
}
