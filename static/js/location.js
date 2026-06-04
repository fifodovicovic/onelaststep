(function () {
  'use strict';

  const svg     = document.getElementById('Layer_1');
  const wrapper = document.getElementById('window-wrapper');

  const VB = { x: 565, y: 320, w: 820 };

  // ── Eye tracking ──────────────────────────────────────────────────────────
  const EYE_INSET   = 0.18;
  const FOLLOW_DIST = 350;
  let eyes = null;
  let midX = 0, midY = 0;
  let scaredMode = false;

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
      minDX: ebb.x           + ix - cx,
      maxDX: ebb.x + ebb.width  - ix - cx,
      minDY: ebb.y           + iy - cy,
      maxDY: ebb.y + ebb.height - iy - cy,
      curX: 0, curY: 0, targX: 0, targY: 0,
    };
  }

  function initEyes() {
    eyes = [
      makeEye(
        document.getElementById('location-eye_x5F_R'),
        document.getElementById('location-pupil_x5F_R'),
        0.13
      ),
      makeEye(
        document.getElementById('location-eye_x5F_L'),
        document.getElementById('location-pupil_x5F_L'),
        0.10
      ),
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

  // ── Parallax ──────────────────────────────────────────────────────────────
  const PARALLAX_SCALE = 1.0;
  const P_LERP         = 0.04;
  let pCurX = 0, pCurY = 0, pTargX = 0, pTargY = 0;
  let mouseX = 0, mouseY = 0;

  const txtEls = [
    document.getElementById('location-txt'),
    document.getElementById('location-dontshow_x5F_txt'),
  ].filter(Boolean);

  const allowEls = [
    document.getElementById('location-allow_x5F_button_x5F_fill'),
    document.getElementById('location-allow_x5F_button_x5F_body'),
    document.getElementById('location-allow_x5F_txt'),
  ].filter(Boolean);

  const blockTxt     = document.getElementById('location-block_x5F_txt');
  const dontShowBody = document.getElementById('location-dontshow_x5F_checkbox_x5F_body');
  const dontShowMark = document.getElementById('location-dontshow_x5F_checkmark');
  const dontShowTxt  = document.getElementById('location-dontshow_x5F_txt');

  // ── Scared eyes ───────────────────────────────────────────────────────────
  const pupilR = document.getElementById('location-pupil_x5F_R');
  const pupilL = document.getElementById('location-pupil_x5F_L');

  function enterScaredMode() {
    if (scaredMode) return;
    scaredMode = true;
    [pupilR, pupilL].forEach(el => {
      if (!el) return;
      el.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.45)' }],
        { duration: 180, fill: 'forwards', easing: 'ease-out' });
    });
    if (eyes) eyes.forEach(e => {
      e.targX = 0;
      e.targY = e.minDY;
    });
  }

  function exitScaredMode() {
    if (!scaredMode) return;
    scaredMode = false;
    [pupilR, pupilL].forEach(el => {
      if (!el) return;
      el.animate([{ transform: 'scale(0.45)' }, { transform: 'scale(1)' }],
        { duration: 220, fill: 'forwards', easing: 'cubic-bezier(0.34,1.56,0.64,1)' });
    });
  }

  // ── Button helpers ────────────────────────────────────────────────────────
  function hoverScale(els, to) {
    els.forEach(el => {
      el.style.transformBox    = 'fill-box';
      el.style.transformOrigin = '50% 50%';
      el.animate([{ transform: `scale(${to})` }],
        { duration: 160, fill: 'forwards', easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' });
    });
  }

  function pressButton(els, hovered, onDone) {
    const base = hovered ? 1.05 : 1.0;
    els.forEach(el => {
      el.style.transformBox    = 'fill-box';
      el.style.transformOrigin = '50% 50%';
      const a = el.animate(
        [{ transform: `scale(${base})` }, { transform: 'scale(0.92)', offset: 0.35 }, { transform: `scale(${base})` }],
        { duration: 240, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
      );
      if (onDone) a.addEventListener('finish', onDone, { once: true });
    });
  }

  // ── ruka_tu idle ──────────────────────────────────────────────────────────
  const rukaTuEl = document.getElementById('lottie-ruka-tu');
  rukaTuEl.style.transform = 'scaleX(-1)';

  let rukaTuReady   = false;
  let rukaTuShowing = false;
  let idleTimer     = null;

  const lottieRukaTu = lottie.loadAnimation({
    container: rukaTuEl, renderer: 'svg', loop: true, autoplay: false,
    path: '/anim/ruka_tu.json',
  });

  lottieRukaTu.addEventListener('DOMLoaded', () => {
    positionLottie(rukaTuEl);
    rukaTuReady = true;
  });

  function showRukaTu() {
    if (!rukaTuReady) return;
    rukaTuShowing = true;
    rukaTuEl.style.display = 'block';
    lottieRukaTu.goToAndPlay(8, true);
  }

  function hideRukaTu() {
    if (!rukaTuShowing) return;
    rukaTuShowing = false;
    rukaTuEl.style.display = 'none';
    lottieRukaTu.stop();
  }

  function resetIdleTimer() {
    clearTimeout(idleTimer);
    if (rukaTuShowing) hideRukaTu();
    idleTimer = setTimeout(showRukaTu, 5000);
  }

  // ── ALLOW button ──────────────────────────────────────────────────────────
  let allowHovered = false;

  allowEls.forEach(el => {
    el.addEventListener('mouseenter', () => {
      allowHovered = true;
      hoverScale(allowEls, 1.05);
      resetIdleTimer();
    });
    el.addEventListener('mouseleave', ev => {
      if (allowEls.some(e => e === ev.relatedTarget || e.contains(ev.relatedTarget))) return;
      allowHovered = false;
      hoverScale(allowEls, 1.0);
    });
    el.addEventListener('click', ev => {
      ev.stopPropagation();
      hideRukaTu();
      pressButton(allowEls, allowHovered, () => window.OLS.navigate('location'));
    });
  });

  // ── BLOCK button ──────────────────────────────────────────────────────────
  let blockHovered = false;

  if (blockTxt) {
    blockTxt.addEventListener('mouseenter', () => {
      blockHovered = true;
      hoverScale([blockTxt], 1.05);
      enterScaredMode();
      resetIdleTimer();
    });
    blockTxt.addEventListener('mouseleave', () => {
      blockHovered = false;
      hoverScale([blockTxt], 1.0);
      exitScaredMode();
    });
    blockTxt.addEventListener('click', ev => {
      ev.stopPropagation();
      exitScaredMode();
      hideRukaTu();
      pressButton([blockTxt], blockHovered, () => window.OLS.navigate('location'));
    });
  }

  // ── Body squish ───────────────────────────────────────────────────────────
  const bodyEl = document.getElementById('location-body');
  if (bodyEl) {
    bodyEl.addEventListener('click', () => {
      wrapper.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(0.988)', offset: 0.35 }, { transform: 'scale(1)' }],
        { duration: 200, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
      );
    });
  }

  // ── Don't show this again ─────────────────────────────────────────────────
  let dontShowDisabled = false;
  let dontShowChecked  = false;

  const lottieDontShowEl = document.getElementById('lottie-ruka-dontshow');
  const lottieDontShow   = lottie.loadAnimation({
    container: lottieDontShowEl,
    renderer: 'svg', loop: false, autoplay: false,
    path: '/anim/ruka_tu.json',
  });

  lottieDontShow.addEventListener('DOMLoaded', () => positionLottie(lottieDontShowEl));

  lottieDontShow.addEventListener('complete', () => {
    lottieDontShowEl.style.display = 'none';
    if (dontShowMark) {
      dontShowMark.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
      setTimeout(() => { if (dontShowMark) dontShowMark.style.display = 'none'; }, 200);
    }
    if (dontShowBody) dontShowBody.classList.add('disabled');
    if (dontShowTxt)  dontShowTxt.classList.add('disabled');
    dontShowDisabled = true;
    dontShowChecked  = false;
  });

  if (dontShowBody) {
    dontShowBody.addEventListener('click', ev => {
      ev.stopPropagation();
      if (dontShowDisabled) return;

      dontShowChecked = !dontShowChecked;
      dontShowBody.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(0.92)', offset: 0.3 }, { transform: 'scale(1)' }],
        { duration: 200, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
      );

      if (dontShowChecked) {
        if (dontShowMark) {
          dontShowMark.style.display = 'block';
          dontShowMark.animate(
            [{ opacity: 0, transform: 'scale(0.3)' }, { opacity: 1, transform: 'scale(1)' }],
            { duration: 200, fill: 'forwards' }
          );
        }
        setTimeout(() => {
          positionLottie(lottieDontShowEl);
          lottieDontShowEl.style.display = 'block';
          lottieDontShow.goToAndPlay(8, true);
        }, 500);
      } else {
        if (dontShowMark) {
          dontShowMark.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
          setTimeout(() => { if (dontShowMark) dontShowMark.style.display = 'none'; }, 200);
        }
      }
    });
  }

  if (dontShowTxt) {
    dontShowTxt.addEventListener('mouseenter', () => resetIdleTimer());
    dontShowTxt.addEventListener('click', ev => {
      ev.stopPropagation();
      if (!dontShowDisabled && dontShowBody) {
        dontShowBody.dispatchEvent(new MouseEvent('click', { bubbles: false }));
      }
    });
  }

  // ── Lottie positioning ────────────────────────────────────────────────────
  function positionLottie(el) {
    const scale   = wrapper.offsetWidth / VB.w;
    el.style.width  = (1920 * scale) + 'px';
    el.style.height = (1080 * scale) + 'px';
    el.style.left   = (-VB.x * scale) + 'px';
    el.style.top    = (-VB.y * scale) + 'px';
  }

  window.addEventListener('resize', () => {
    positionLottie(rukaTuEl);
    positionLottie(lottieDontShowEl);
  });

  // ── Mouse + parallax ──────────────────────────────────────────────────────
  document.addEventListener('mousemove', ev => {
    const p = toSVGCoords(ev.clientX, ev.clientY);
    mouseX  = p.x;
    mouseY  = p.y;
    pTargX  = (ev.clientX / window.innerWidth  - 0.5) * 2;
    pTargY  = (ev.clientY / window.innerHeight - 0.5) * 2;
  });

  function setTargets(mx, my) {
    if (!eyes || scaredMode) return;
    const dx   = mx - midX;
    const dy   = my - midY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) { eyes.forEach(e => { e.targX = 0; e.targY = 0; }); return; }
    const t     = Math.min(dist / FOLLOW_DIST, 1);
    const angle = Math.atan2(dy, dx);
    const ux    = Math.cos(angle) * t;
    const uy    = Math.sin(angle) * t;
    eyes.forEach(e => {
      const tx = ux * (ux >= 0 ? e.maxDX : -e.minDX);
      const ty = uy * (uy >= 0 ? e.maxDY : -e.minDY);
      e.targX  = Math.max(e.minDX, Math.min(e.maxDX, tx));
      e.targY  = Math.max(e.minDY, Math.min(e.maxDY, ty));
    });
  }

  // ── Tick ──────────────────────────────────────────────────────────────────
  function tick() {
    pCurX += (pTargX - pCurX) * P_LERP;
    pCurY += (pTargY - pCurY) * P_LERP;

    const wpX = pCurX * 25 * PARALLAX_SCALE;
    const wpY = pCurY * 12 * PARALLAX_SCALE;
    wrapper.style.translate = `${wpX.toFixed(2)}px ${wpY.toFixed(2)}px`;

    const tpX = pCurX * 3 * PARALLAX_SCALE;
    const tpY = pCurY * 2 * PARALLAX_SCALE;
    txtEls.forEach(el => el.setAttribute('transform', `translate(${tpX.toFixed(2)},${tpY.toFixed(2)})`));

    const bpX = pCurX * 3.45 * PARALLAX_SCALE;
    const bpY = pCurY * 2.3  * PARALLAX_SCALE;
    const bTf = `translate(${bpX.toFixed(2)},${bpY.toFixed(2)})`;
    allowEls.forEach(el => el.setAttribute('transform', bTf));
    if (blockTxt)     blockTxt.setAttribute('transform', bTf);
    if (dontShowBody) dontShowBody.setAttribute('transform', bTf);

    if (!scaredMode) setTargets(mouseX, mouseY);
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
  resetIdleTimer();
  tick();

})();
