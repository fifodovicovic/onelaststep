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

  // Slow start → peak speed → elastic finish (ease-in-out-elastic)
  function easeInOutElastic(t) {
    const c5 = (2 * Math.PI) / 4.5;
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) {
      return -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2;
    }
    return (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  }

  const NEAR_END = MAX_WIDTH * 0.99;  // 99% mark — bar pauses here

  function buildSegments(fromWidth) {
    if (fromWidth >= NEAR_END) {
      // Already past 99%, just finish
      return [{ to: MAX_WIDTH, duration: 250, pause: 0 }];
    }

    const N    = 4 + Math.floor(Math.random() * 5);
    const segs = [];
    let prev   = fromWidth;
    for (let i = 0; i < N - 1; i++) {
      const remaining = NEAR_END - prev;
      if (remaining < 5) break;
      const chunk = remaining / (N - i);
      const to    = prev + chunk * (0.35 + Math.random() * 0.75);
      segs.push({
        to:       Math.min(to, NEAR_END * 0.97),
        duration: 350 + Math.random() * 1100,
        pause:    100 + Math.random() * 400,
      });
      prev = segs[segs.length - 1].to;
    }
    // Reach 99%, pause 1500ms — viewer thinks it's almost done
    segs.push({ to: NEAR_END, duration: 300 + Math.random() * 500, pause: 1500 });
    // Quick final push to 100%
    segs.push({ to: MAX_WIDTH, duration: 200 + Math.random() * 300, pause: 0 });
    return segs;
  }

  let segQueue   = buildSegments(40);
  let currentSeg = null;
  let segFrom    = 40;
  let segStart   = null;
  let phase      = 'moving';
  let pauseUntil = 0;

  function resetBar() {
    barWidth   = 40;
    barDone    = false;
    segQueue   = buildSegments(40);
    currentSeg = null;
    segFrom    = 40;
    segStart   = null;
    phase      = 'moving';
    clipRect.setAttribute('width', '40');
    requestAnimationFrame(barFrame);
  }

  // lastClickMs: timestamp of last click — used to freeze FORWARD movement only
  let lastClickMs = 0;

  function barFrame(ts) {
    if (barDone) return;

    // Freeze forward movement while clicking or while out-animation plays
    const goingForward = currentSeg
      ? currentSeg.to > segFrom
      : (segQueue.length > 0 && segQueue[0].to > barWidth);

    if (playingOut || (goingForward && ts - lastClickMs < FREEZE_DURATION)) {
      if (currentSeg && segStart !== null) segStart = ts; // don't accumulate time
      if (phase === 'pausing') pauseUntil = Math.max(pauseUntil, ts + 16);
      requestAnimationFrame(barFrame);
      return;
    }

    if (phase === 'pausing') {
      if (ts >= pauseUntil) { phase = 'moving'; currentSeg = null; }
      else { requestAnimationFrame(barFrame); return; }
    }

    if (!currentSeg) {
      if (segQueue.length === 0) {
        barDone = true;
        setTimeout(resetBar, 900);
        return;
      }
      currentSeg = segQueue.shift();
      segFrom    = barWidth;
      segStart   = ts;
    }

    const elapsed = ts - segStart;
    const t       = Math.min(elapsed / currentSeg.duration, 1);
    const easing  = currentSeg.ease || easeInOut;
    barWidth      = Math.max(40, Math.min(MAX_WIDTH, segFrom + (currentSeg.to - segFrom) * easing(t)));
    clipRect.setAttribute('width', barWidth.toFixed(2));

    if (t >= 1) {
      barWidth = currentSeg.to;
      clipRect.setAttribute('width', barWidth.toFixed(2));
      if (currentSeg.onComplete) currentSeg.onComplete();
      if (barWidth >= MAX_WIDTH) {
        barDone = true;
        setTimeout(resetBar, 900);
        return;
      }
      phase      = 'pausing';
      pauseUntil = ts + currentSeg.pause;
      currentSeg = null;
    }

    requestAnimationFrame(barFrame);
  }

  requestAnimationFrame(barFrame);

  // Spacebar → manual navigate
  document.addEventListener('keydown', ev => {
    if (ev.code === 'Space') window.OLS.navigate('loading');
  });

  // ── Parallax ──────────────────────────────────────────────────────────────
  const PARALLAX_SCALE = 1.0;
  const P_LERP         = 0.04;

  let pCurX = 0, pCurY = 0;
  let pTargX = 0, pTargY = 0;

  const faceEls = [
    document.getElementById('loading-body'),
    document.getElementById('loading-eye_x5F_R'),
    document.getElementById('loading-eye_x5F_L'),
    svg.querySelector('.st6'),
    svg.querySelector('path.st2'),
  ].filter(Boolean);

  // ── Eye tracking ──────────────────────────────────────────────────────────
  const EYE_INSET   = 0.08;
  const FOLLOW_DIST = 350;
  const BAR_Y       = 540.5;

  let eyes = null;
  let midX = 0, midY = 0;

  // Blend: 0 = watch bar, 1 = watch mouse. Linear transition back to bar.
  let lookMouse  = 0;
  let returnStart = null;  // performance.now() when return-to-bar begins

  function makeEye(eyeEl, pupilEl, lerp) {
    pupilEl.setAttribute('transform', 'translate(0,0)');
    const ebb = eyeEl.getBBox();
    const pbb = pupilEl.getBBox();
    const cx  = pbb.x + pbb.width  / 2;
    const cy  = pbb.y + pbb.height / 2;
    const ix  = ebb.width  * EYE_INSET;
    const iy  = ebb.height * EYE_INSET;
    return {
      el: pupilEl, lerp, cx, cy,
      minDX: ebb.x             + ix - cx,
      maxDX: ebb.x + ebb.width - ix - cx,
      minDY: ebb.y             + iy - cy,
      maxDY: ebb.y + ebb.height - iy - cy,
      curX: 0, curY: 0, targX: 0, targY: 0,
    };
  }

  function initEyes() {
    eyes = [
      makeEye(document.getElementById('loading-eye_x5F_R'), document.getElementById('pupil_x5F_R'), 0.04),
      makeEye(document.getElementById('loading-eye_x5F_L'), document.getElementById('pupil_x5F_L'), 0.04),
    ];
    midX = (eyes[0].cx + eyes[1].cx) / 2;
    midY = (eyes[0].cy + eyes[1].cy) / 2;
  }

  function toSVGCoords(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const vb   = svg.viewBox.baseVal;
    return {
      x: vb.x + (clientX - rect.left) * (vb.width  / rect.width),
      y: vb.y + (clientY - rect.top)  * (vb.height / rect.height),
    };
  }

  let mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', ev => {
    const p = toSVGCoords(ev.clientX, ev.clientY);
    mouseX  = p.x;
    mouseY  = p.y;
    pTargX  = (ev.clientX / window.innerWidth  - 0.5) * 2;
    pTargY  = (ev.clientY / window.innerHeight - 0.5) * 2;
  });

  function setTargets(tx, ty) {
    if (!eyes) return;
    const dx   = tx - midX;
    const dy   = ty - midY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) { eyes.forEach(e => { e.targX = 0; e.targY = 0; }); return; }
    const t     = Math.min(dist / FOLLOW_DIST, 1);
    const angle = Math.atan2(dy, dx);
    const ux    = Math.cos(angle) * t;
    const uy    = Math.sin(angle) * t;
    eyes.forEach(e => {
      const etx = ux * (ux >= 0 ? e.maxDX : -e.minDX);
      const ety = uy * (uy >= 0 ? e.maxDY : -e.minDY);
      e.targX   = Math.max(e.minDX, Math.min(e.maxDX, etx));
      e.targY   = Math.max(e.minDY, Math.min(e.maxDY, ety));
    });
  }

  function tick() {
    // Parallax lerp
    pCurX += (pTargX - pCurX) * P_LERP;
    pCurY += (pTargY - pCurY) * P_LERP;

    // Layer 0: wrapper CSS translate — separate from scale (no conflict with squish)
    const wpX = pCurX * 25 * PARALLAX_SCALE;
    const wpY = pCurY * 12 * PARALLAX_SCALE;
    wrapper.style.translate = `${wpX.toFixed(2)}px ${wpY.toFixed(2)}px`;

    // Layer 3: face elements float together
    const fpX = pCurX * 3.45 * PARALLAX_SCALE;
    const fpY = pCurY * 2.3  * PARALLAX_SCALE;
    const fTf = `translate(${fpX.toFixed(2)},${fpY.toFixed(2)})`;
    faceEls.forEach(el => el.setAttribute('transform', fTf));

    // Eye blend: update lookMouse if returning to bar
    if (returnStart !== null) {
      const elapsed = performance.now() - returnStart;
      lookMouse = Math.max(0, 1 - elapsed / 1200);
      if (lookMouse <= 0) { lookMouse = 0; returnStart = null; }
    }

    // Blend target between bar end and mouse
    const barTargetX = 460 + barWidth;
    const tx = lookMouse * mouseX + (1 - lookMouse) * barTargetX;
    const ty = lookMouse * mouseY + (1 - lookMouse) * BAR_Y;
    setTargets(tx, ty);

    if (eyes) {
      eyes.forEach(e => {
        e.curX += (e.targX - e.curX) * e.lerp;
        e.curY += (e.targY - e.curY) * e.lerp;
        e.el.setAttribute('transform', `translate(${e.curX.toFixed(2)},${e.curY.toFixed(2)})`);
      });
    }

    requestAnimationFrame(tick);
  }

  initEyes();
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
    container: lottieEl, renderer: 'svg', loop: false, autoplay: false,
    path: '/anim/mad_face.json',
  });

  // mad_face.json: 50 frames @30fps. Frame 30 = 1s = peak angry.
  const PEAK_FRAME = 30;
  let playingOut   = false;

  let lottieReady = false;
  lottieAnim.addEventListener('DOMLoaded', () => { positionLottie(); lottieReady = true; });
  lottieAnim.addEventListener('complete',  () => {
    if (playingOut) return;  // out animation handled separately
    // Hold at peak angry frame while user is still clicking
    if (lottieEl.style.display === 'block') {
      lottieAnim.goToAndStop(PEAK_FRAME, true);
    } else {
      if (mouth) mouth.style.display = '';
    }
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

  // ── Click logic ───────────────────────────────────────────────────────────
  const CLICK_WINDOW    = 500;
  const FREEZE_DURATION = 1000;
  const SPAM_THRESHOLD  = 3;

  let clickHistory   = [];
  let recentlySpammed = false;
  let angryHideTimer  = null;
  let lottieTimer     = null;

  function triggerReversal(target) {
    segQueue = [{
      to:       target,
      duration: 1800,
      pause:    300,
      ease:     easeInOutElastic,
      onComplete: () => { setTimeout(() => { returnStart = performance.now(); }, 200); },
    }, ...buildSegments(target)];
    currentSeg = null;
    phase      = 'moving';
  }

  function showAngryFace() {
    if (mouth) mouth.style.display = 'none';
    lottieEl.style.display = 'block';
    // Play only 0 → PEAK_FRAME so it arrives smoothly at peak and holds
    if (lottieReady) lottieAnim.playSegments([0, PEAK_FRAME], true);
    else lottieAnim.addEventListener('DOMLoaded', () => lottieAnim.playSegments([0, PEAK_FRAME], true), { once: true });
  }

  hitRect.addEventListener('click', () => {
    if (barDone) return;

    const now = performance.now();
    lastClickMs = now;  // freeze forward bar movement from this moment

    // Squish
    wrapper.animate(
      [{ scale: '1 1' }, { scale: '1 0.88', offset: 0.3 }, { scale: '1 1' }],
      { duration: 260, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
    );

    // Eyes snap to mouse
    lookMouse   = 1.0;
    returnStart = null;

    // Spam detection
    clickHistory.push(now);
    clickHistory = clickHistory.filter(t => now - t <= CLICK_WINDOW);
    const isSpam = clickHistory.length >= SPAM_THRESHOLD;

    // ── Angry face ────────────────────────────────────────────────────────
    if (isSpam) {
      // Show immediately on spam
      if (lottieEl.style.display !== 'block') {
        clearTimeout(lottieTimer);
        showAngryFace();
      }
    } else {
      // Throttled 500ms on single clicks
      clearTimeout(lottieTimer);
      lottieTimer = setTimeout(() => { if (!barDone) showAngryFace(); }, 500);
    }

    // If mid-out-animation when user clicks again — cancel out, snap back to peak
    if (playingOut) {
      playingOut = false;
      lottieAnim.goToAndStop(PEAK_FRAME, true);
    }

    // Play mad-face-out 1000ms after last click
    clearTimeout(angryHideTimer);
    angryHideTimer = setTimeout(() => {
      angryHideTimer = null;
      playingOut = true;
      lottieAnim.playSegments([PEAK_FRAME, lottieAnim.totalFrames], true);
      lottieAnim.addEventListener('complete', () => {
        playingOut = false;
        recentlySpammed = false;  // reset only after out animation fully done
        lottieEl.style.display = 'none';
        if (mouth) mouth.style.display = '';
      }, { once: true });
    }, FREEZE_DURATION);

    // ── Bar reversal ──────────────────────────────────────────────────────
    if (isSpam && !recentlySpammed) {
      // First spam burst: immediate reversal to minimum
      recentlySpammed = true;
      triggerReversal(40);
    } else if (!isSpam && !recentlySpammed) {
      // Single click: immediate reversal by 25% (or 80% near end)
      const isNearEnd = barWidth >= NEAR_END * 0.95;
      const reverseBy = (isNearEnd ? 0.80 : 0.25) * MAX_WIDTH;
      triggerReversal(Math.max(40, barWidth - reverseBy));
    }
    // During spam (recentlySpammed): additional clicks just extend freeze + angry
  });

})();
