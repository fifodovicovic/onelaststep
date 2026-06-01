(function () {
  'use strict';

  const svg     = document.getElementById('loading');
  const wrapper = document.getElementById('window-wrapper');

  // ── Progress bar ──────────────────────────────────────────────────────────
  const progressStart = document.getElementById('loading-progress_x5F_start');
  const progressEnd   = document.getElementById('loading-progress_x5F_end');

  const defs     = svg.querySelector('defs');
  const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
  clipPath.id    = 'progress-clip';
  const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  clipRect.setAttribute('x',      '460');
  clipRect.setAttribute('y',      '478');
  clipRect.setAttribute('height', '125');
  clipRect.setAttribute('width',  '40');
  clipPath.appendChild(clipRect);
  defs.appendChild(clipPath);

  progressStart.style.display = 'none';
  progressEnd.setAttribute('clip-path', 'url(#progress-clip)');

  const MAX_WIDTH = 1002;
  let barWidth  = 40;
  let barDone   = false;

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  // Build a list of waypoint segments from a starting bar-width to MAX_WIDTH.
  // Each segment: {to, duration (ms), pause (ms after arriving)}
  function buildSegments(fromWidth) {
    const N    = 5 + Math.floor(Math.random() * 6); // 5–10 waypoints
    const segs = [];
    let prev   = fromWidth;

    for (let i = 0; i < N - 1; i++) {
      const remaining = MAX_WIDTH - prev;
      if (remaining < 5) break;
      const chunk = remaining / (N - i);
      const to    = prev + chunk * (0.35 + Math.random() * 0.75);
      segs.push({
        to:       Math.min(to, MAX_WIDTH * 0.93),
        duration: 350 + Math.random() * 1100,
        pause:    100 + Math.random() * 400,
      });
      prev = segs[segs.length - 1].to;
    }
    // Final segment always reaches MAX_WIDTH
    segs.push({ to: MAX_WIDTH, duration: 300 + Math.random() * 700, pause: 0 });
    return segs;
  }

  let segQueue    = buildSegments(40);
  let currentSeg  = null;
  let segFrom     = 40;
  let segStart    = null;
  let phase       = 'moving'; // 'moving' | 'pausing'
  let pauseUntil  = 0;

  function barFrame(ts) {
    if (barDone) return;

    // ── Pausing between waypoints ────────────────────────────────────────
    if (phase === 'pausing') {
      if (ts >= pauseUntil) {
        phase      = 'moving';
        currentSeg = null;
      } else {
        requestAnimationFrame(barFrame);
        return;
      }
    }

    // ── Pick next segment ────────────────────────────────────────────────
    if (!currentSeg) {
      if (segQueue.length === 0) {
        barDone = true;
        setTimeout(() => { window.OLS.navigate('loading'); }, 900);
        return;
      }
      currentSeg = segQueue.shift();
      segFrom    = barWidth;
      segStart   = ts;
    }

    // ── Animate toward waypoint ──────────────────────────────────────────
    const elapsed = ts - segStart;
    const t       = Math.min(elapsed / currentSeg.duration, 1);
    barWidth      = segFrom + (currentSeg.to - segFrom) * easeInOut(t);
    clipRect.setAttribute('width', barWidth.toFixed(2));

    if (t >= 1) {
      barWidth = currentSeg.to;
      clipRect.setAttribute('width', barWidth.toFixed(2));

      if (barWidth >= MAX_WIDTH) {
        barDone = true;
        setTimeout(() => { window.OLS.navigate('loading'); }, 900);
        return;
      }
      phase      = 'pausing';
      pauseUntil = ts + currentSeg.pause;
      currentSeg = null;
    }

    requestAnimationFrame(barFrame);
  }

  requestAnimationFrame(barFrame);

  // ── Eye tracking — per-eye, prevents cross-socket escape ─────────────────
  const pupilL = document.getElementById('pupil_x5F_L');
  const pupilR = document.getElementById('pupil_x5F_R');

  const LERP  = 0.1;
  const MAX_X = 25;  // reduced to keep pupils inside sockets
  const MAX_Y = 7;

  // Eye-socket centers in SVG user-unit space (estimated from paths)
  const eyes = [
    { el: pupilL, cx: 896, cy: 521, curX: 0, curY: 0, targX: 0, targY: 0 },
    { el: pupilR, cx: 1018, cy: 521, curX: 0, curY: 0, targX: 0, targY: 0 },
  ];

  function toSVGCoords(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const vb   = svg.viewBox.baseVal;
    return {
      x: vb.x + (clientX - rect.left) * (vb.width  / rect.width),
      y: vb.y + (clientY - rect.top)  * (vb.height / rect.height),
    };
  }

  function setTargets(mx, my) {
    eyes.forEach(eye => {
      const dx   = mx - eye.cx;
      const dy   = my - eye.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.5) { eye.targX = 0; eye.targY = 0; return; }
      const t     = Math.min(dist / 260, 1);
      const angle = Math.atan2(dy, dx);
      eye.targX   = Math.cos(angle) * MAX_X * t;
      eye.targY   = Math.sin(angle) * MAX_Y * t;
    });
  }

  document.addEventListener('mousemove', ev => {
    const pos = toSVGCoords(ev.clientX, ev.clientY);
    setTargets(pos.x, pos.y);
  });

  function tick() {
    eyes.forEach(e => {
      e.curX += (e.targX - e.curX) * LERP;
      e.curY += (e.targY - e.curY) * LERP;
      e.el.setAttribute('transform',
        `translate(${e.curX.toFixed(2)},${e.curY.toFixed(2)})`);
    });
    requestAnimationFrame(tick);
  }
  tick();

  // ── Mad-face Lottie overlay ───────────────────────────────────────────────
  const VB       = { x: 440, y: 455, w: 1050 };
  const mouth    = svg.querySelector('path.st2');
  const lottieEl = document.getElementById('lottie-mad');

  function positionLottie() {
    const scale           = wrapper.offsetWidth / VB.w;
    lottieEl.style.width  = (1920 * scale) + 'px';
    lottieEl.style.height = (1080 * scale) + 'px';
    lottieEl.style.left   = (-VB.x * scale) + 'px';
    lottieEl.style.top    = (-VB.y * scale) + 'px';
  }

  const lottieAnim = lottie.loadAnimation({
    container: lottieEl,
    renderer:  'svg',
    loop:      false,
    autoplay:  false,
    path:      '/anim/mad_face.json',
  });

  let lottieReady = false;
  lottieAnim.addEventListener('DOMLoaded', () => { positionLottie(); lottieReady = true; });
  lottieAnim.addEventListener('complete',  () => {
    // Angry animation done — restore mouth, bar keeps going
    lottieEl.style.display = 'none';
    if (mouth) mouth.style.display = '';
  });
  window.addEventListener('resize', positionLottie);

  // ── Invisible hit rect over loading bar ───────────────────────────────────
  const hitRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  hitRect.setAttribute('x',      '460');
  hitRect.setAttribute('y',      '468');
  hitRect.setAttribute('width',  '1010');
  hitRect.setAttribute('height', '135');
  hitRect.setAttribute('fill',   'transparent');
  hitRect.style.cursor = 'pointer';
  svg.appendChild(hitRect);

  hitRect.addEventListener('click', () => {
    // ── Squish animation on click (whole window) ─────────────────────────
    svg.style.transformBox    = 'fill-box';
    svg.style.transformOrigin = 'center center';
    svg.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scaleY(0.88)', offset: 0.3 },
        { transform: 'scale(1)' },
      ],
      { duration: 260, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
    );

    if (barDone) return;

    // ── Show angry face — restarts every click ───────────────────────────
    if (mouth) mouth.style.display = 'none';
    lottieEl.style.display = 'block';
    if (lottieReady) {
      lottieAnim.goToAndPlay(0, true);
    } else {
      lottieAnim.addEventListener('DOMLoaded',
        () => lottieAnim.goToAndPlay(0, true), { once: true });
    }

    // ── Reverse bar 25 % every click, rebuild path to end ───────────────
    const reverseBy    = 0.25 * MAX_WIDTH;
    const targetWidth  = Math.max(40, barWidth - reverseBy);
    const reverseSeg   = { to: targetWidth, duration: 600, pause: 200 };
    const continueSegs = buildSegments(targetWidth);

    segQueue   = [reverseSeg, ...continueSegs];
    currentSeg = null;
    phase      = 'moving';
  });

  // ── Custom cursor ─────────────────────────────────────────────────────────
  fetch('/cursor/mys.svg?v=' + Date.now())
    .then(r => r.text())
    .then(text => {
      const uri = 'data:image/svg+xml,' + encodeURIComponent(text);
      document.body.style.cursor = `url("${uri}") 2 2, auto`;
    });

})();
