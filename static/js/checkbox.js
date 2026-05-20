(function () {
  'use strict';

  // ── Element refs ──────────────────────────────────────────────────────────
  const svg    = document.getElementById('demo');
  const box    = document.getElementById('demo-box');
  const mark   = document.getElementById('demo-checkmark');
  const pupilL = document.getElementById('pupil_x5F_L');
  const pupilR = document.getElementById('pupil_x5F_R');

  // ── Checkbox ──────────────────────────────────────────────────────────────
  let checked     = false;
  let currentAnim = null;
  let isHovered   = false;
  let boxAnim     = null;

  function setBoxScale(to, duration = 160) {
    if (boxAnim) {
      try { boxAnim.commitStyles(); } catch (e) {}
      boxAnim.cancel();
    }
    boxAnim = box.animate(
      [{ transform: `scale(${to})` }],
      { duration, fill: 'forwards', easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
    );
  }

  box.addEventListener('mouseenter', () => { isHovered = true;  setBoxScale(1.06, 180); });
  box.addEventListener('mouseleave', () => { isHovered = false; setBoxScale(1.00, 200); });

  function toggle() {
    checked = !checked;
    animateBox();
    checked ? animateIn() : animateOut();
  }

  box.addEventListener('click', toggle);
  mark.addEventListener('click', toggle);

  function animateBox() {
    const end = isHovered ? 1.06 : 1.0;
    if (boxAnim) boxAnim.cancel();
    boxAnim = box.animate(
      [
        { transform: `scale(${end})` },
        { transform: 'scale(0.91)', offset: 0.35 },
        { transform: `scale(${end})` }
      ],
      { duration: 280, fill: 'forwards', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
    );
  }

  function animateIn() {
    if (currentAnim) currentAnim.cancel();
    mark.style.display = 'block';
    currentAnim = mark.animate(
      [
        { transform: 'scale(0.2)', opacity: 0 },
        { transform: 'scale(1.12)', opacity: 1, offset: 0.65 },
        { transform: 'scale(1)', opacity: 1 }
      ],
      { duration: 220, fill: 'forwards' }
    );
  }

  function animateOut() {
    if (currentAnim) currentAnim.cancel();
    currentAnim = mark.animate(
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(0.2)', opacity: 0 }
      ],
      { duration: 160, easing: 'ease-in', fill: 'forwards' }
    );
    currentAnim.addEventListener('finish', () => {
      mark.style.display = 'none';
    });
  }

  // ── Eye tracking ──────────────────────────────────────────────────────────
  //
  // Geometric centers of the eye clip-mask shapes (measured from SVG path data).
  // The clip mask spans x≈814–943 (left) and x≈977–1107 (right), y≈439–473 both.
  // cy=456 is the vertical center of that clip region.
  // The clip mask handles any overflow at the edges naturally.
  //
  const eyes = [
    { el: pupilL, cx: 880, cy: 456, curX: 880, curY: 456, targX: 880, targY: 456 },
    { el: pupilR, cx: 1041, cy: 456, curX: 1041, curY: 456, targX: 1041, targY: 456 },
  ];

  // How far pupils travel from eye center (SVG units).
  // Clip mask handles cutoff at edges naturally.
  const MAX_X = 55;
  const MAX_Y = 15;

  // How fast pupils catch up to target (0–1, lower = smoother/lazier)
  const LERP = 0.1;
  let activeLERP = LERP;

  // Convert screen mouse coords → SVG internal coordinate space
  function toSVGCoords(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const vb   = svg.viewBox.baseVal;
    return {
      x: vb.x + (clientX - rect.left) * (vb.width  / rect.width),
      y: vb.y + (clientY - rect.top)  * (vb.height / rect.height),
    };
  }

  // Single reference point between both eyes — both pupils share the same
  // look-direction so they never cross-eye when mouse is between them.
  const midX = (eyes[0].cx + eyes[1].cx) / 2;  // 960.5
  const midY = (eyes[0].cy + eyes[1].cy) / 2;  // 456

  function setTargets(mx, my) {
    const dx   = mx - midX;
    const dy   = my - midY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.5) {
      eyes.forEach(eye => { eye.targX = eye.cx; eye.targY = eye.cy; });
      return;
    }

    const t     = Math.min(dist / 280, 1);
    const angle = Math.atan2(dy, dx);
    eyes.forEach(eye => {
      eye.targX = eye.cx + Math.cos(angle) * MAX_X * t;
      eye.targY = eye.cy + Math.sin(angle) * MAX_Y * t;
    });
  }

  document.addEventListener('mousemove', (e) => {
    const pos = toSVGCoords(e.clientX, e.clientY);
    setTargets(pos.x, pos.y);
  });

  // Animation loop — smoothly lerp current position toward target each frame
  function tick() {
    eyes.forEach(eye => {
      eye.curX += (eye.targX - eye.curX) * activeLERP;
      eye.curY += (eye.targY - eye.curY) * activeLERP;
      eye.el.setAttribute('cx', eye.curX);
      eye.el.setAttribute('cy', eye.curY);
    });
    requestAnimationFrame(tick);
  }
  tick();

  // ── Custom cursor ─────────────────────────────────────────────────────────
  fetch('/cursor/mys.svg?v=' + Date.now())
    .then(r => r.text())
    .then(svgText => {
      const uri = 'data:image/svg+xml,' + encodeURIComponent(svgText);
      document.body.style.cursor = `url("${uri}") 2 2, auto`;
    });

  // ── Eye-roll Lottie animation ─────────────────────────────────────────────
  const LOTTIE_START = { l: { x: 926.552, y: 466.9 }, r: { x: 1088.3, y: 466.9 } };
  const LOTTIE_END   = { l: { x: 926.552, y: 466.9 }, r: { x: 1088.3, y: 466.9 } };

  const eyeWhiteL = document.getElementById('demo-eye_x5F_L');
  const eyeWhiteR = document.getElementById('demo-eye_x5F_R');
  const pupilMask = document.getElementById('demo-pupils_x5F_mask');
  const lottieDiv = document.getElementById('lottie-eyes');

  let lottieReady     = false;
  let lottieIsPlaying = false;
  let lottieAnim      = null;

  function positionLottie() {
    const W     = document.getElementById('window-wrapper').offsetWidth;
    const scale = W / 710;
    lottieDiv.style.width  = (1920 * scale) + 'px';
    lottieDiv.style.height = (1080 * scale) + 'px';
    lottieDiv.style.left   = (-605 * scale) + 'px';
    lottieDiv.style.top    = (-480 * scale) + 'px';
  }

  lottieAnim = lottie.loadAnimation({
    container: lottieDiv,
    renderer:  'svg',
    loop:      false,
    autoplay:  false,
    path:      '/anim/gulanieocami.json',
  });

  lottieAnim.addEventListener('DOMLoaded', () => { positionLottie(); lottieReady = true; });

  lottieAnim.addEventListener('complete', () => {
    lottieIsPlaying = false;
    // Place JS pupils exactly at Lottie end position — no jump
    eyes[0].curX = LOTTIE_END.l.x; eyes[0].curY = LOTTIE_END.l.y;
    eyes[1].curX = LOTTIE_END.r.x; eyes[1].curY = LOTTIE_END.r.y;
    lottieDiv.style.display = 'none';
    if (eyeWhiteL) eyeWhiteL.style.display = '';
    if (eyeWhiteR) eyeWhiteR.style.display = '';
    if (pupilMask) pupilMask.style.display = '';
  });

  window.addEventListener('resize', positionLottie);

  // ── 5 clicks on checkbox within 5 s → eye-roll ───────────────────────────
  const clickTimes = [];

  function triggerEyeRoll() {
    if (!lottieReady || lottieIsPlaying) return;
    lottieIsPlaying = true;
    activeLERP = 0.22;
    eyes[0].targX = LOTTIE_START.l.x; eyes[0].targY = LOTTIE_START.l.y;
    eyes[1].targX = LOTTIE_START.r.x; eyes[1].targY = LOTTIE_START.r.y;

    function awaitAlign() {
      const dx = eyes[0].curX - LOTTIE_START.l.x;
      const dy = eyes[0].curY - LOTTIE_START.l.y;
      if (Math.sqrt(dx * dx + dy * dy) > 4) { requestAnimationFrame(awaitAlign); return; }
      activeLERP = LERP;
      if (eyeWhiteL) eyeWhiteL.style.display = 'none';
      if (eyeWhiteR) eyeWhiteR.style.display = 'none';
      if (pupilMask) pupilMask.style.display = 'none';
      lottieDiv.style.display = 'block';
      lottieAnim.goToAndPlay(0, true);
    }
    requestAnimationFrame(awaitAlign);
  }

  function onCheckboxClick() {
    const now = Date.now();
    clickTimes.push(now);
    while (clickTimes.length && now - clickTimes[0] > 5000) clickTimes.shift();
    if (clickTimes.length >= 5) {
      clickTimes.length = 0;
      triggerEyeRoll();
    }
  }

  box.addEventListener('click', onCheckboxClick);
  mark.addEventListener('click', onCheckboxClick);

})();
