(function () {
  'use strict';

  const svg     = document.getElementById('Layer_1');
  const wrapper = document.getElementById('window-wrapper');

  // ── Eye tracking ──────────────────────────────────────────────────────────
  let eyes = null;
  const EYE_INSET   = 0.18;
  const FOLLOW_DIST = 350;
  let midX = 0, midY = 0;

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
        document.getElementById('update-eye_x5F_R'),
        document.getElementById('update-pupil_x5F_R'),
        0.10   // rovnaký lerp = oči sa hýbu ako jedno
      ),
      makeEye(
        document.getElementById('update-eye_x5F_L'),
        document.getElementById('update-pupil_x5F_L'),
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

  // ── Eye roll — deklarácia pred tick() volaním (TDZ rule) ─────────────────
  let eyeRollActive = false;

  function triggerEyeRoll() {
    if (eyeRollActive || !eyes) return;
    eyeRollActive = true;
    eyes.forEach(e => { e.targX = e.minDX; e.targY = 0; });
    setTimeout(() => {
      eyes.forEach(e => { e.targX = e.maxDX; e.targY = 0; });
      setTimeout(() => { eyeRollActive = false; }, 320);
    }, 280);
  }

  // ── Parallax ──────────────────────────────────────────────────────────────
  const PARALLAX_SCALE = 1.0;
  const P_LERP         = 0.04;
  let pCurX = 0, pCurY = 0, pTargX = 0, pTargY = 0;
  let mouseX = 0, mouseY = 0;

  const updateTxt = document.getElementById('update-update_x5F_txt');

  const nowEls = [
    document.getElementById('update-now_x5F_button_x5F_fill'),
    document.getElementById('update-now_x5F_button_x5F_body'),
    document.getElementById('update-now_x5F_txt'),
  ].filter(Boolean);

  const laterEls = [
    document.getElementById('update-later_x5F_button_x5F_body'),
    document.getElementById('update-later_x5F_txt'),
  ].filter(Boolean);

  document.addEventListener('mousemove', ev => {
    const p = toSVGCoords(ev.clientX, ev.clientY);
    mouseX  = p.x;
    mouseY  = p.y;
    pTargX  = (ev.clientX / window.innerWidth  - 0.5) * 2;
    pTargY  = (ev.clientY / window.innerHeight - 0.5) * 2;
  });

  function setTargets(mx, my) {
    if (!eyes) return;
    const dx   = mx - midX;
    const dy   = my - midY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) { eyes.forEach(e => { e.targX = 0; e.targY = 0; }); return; }
    const t     = Math.min(dist / FOLLOW_DIST, 1);
    const angle = Math.atan2(dy, dx);
    const ux    = Math.cos(angle) * t;
    const uy    = Math.sin(angle) * t;

    // Zdieľaný offset — obe zreničky sa hýbu o rovnaké SVG jednotky,
    // nie o rovnaké % svojho vlastného rozsahu (to by ich oddeľovalo).
    const sharedMaxDX = Math.min(...eyes.map(e => e.maxDX));
    const sharedMinDX = Math.min(...eyes.map(e => Math.abs(e.minDX)));
    const sharedMaxDY = Math.min(...eyes.map(e => e.maxDY));
    const sharedMinDY = Math.min(...eyes.map(e => Math.abs(e.minDY)));
    const rawX = ux * (ux >= 0 ? sharedMaxDX : sharedMinDX);
    const rawY = uy * (uy >= 0 ? sharedMaxDY : sharedMinDY);

    eyes.forEach(e => {
      e.targX = Math.max(e.minDX, Math.min(e.maxDX, rawX));
      e.targY = Math.max(e.minDY, Math.min(e.maxDY, rawY));
    });
  }

  // ── Tick ──────────────────────────────────────────────────────────────────
  function tick() {
    pCurX += (pTargX - pCurX) * P_LERP;
    pCurY += (pTargY - pCurY) * P_LERP;

    const wpX = pCurX * 25 * PARALLAX_SCALE;
    const wpY = pCurY * 12 * PARALLAX_SCALE;
    wrapper.style.translate = `${wpX.toFixed(2)}px ${wpY.toFixed(2)}px`;

    if (updateTxt) {
      const tpX = pCurX * 3 * PARALLAX_SCALE;
      const tpY = pCurY * 2 * PARALLAX_SCALE;
      updateTxt.setAttribute('transform', `translate(${tpX.toFixed(2)},${tpY.toFixed(2)})`);
    }

    const bpX = pCurX * 3.45 * PARALLAX_SCALE;
    const bpY = pCurY * 2.3  * PARALLAX_SCALE;
    const bTf = `translate(${bpX.toFixed(2)},${bpY.toFixed(2)})`;
    nowEls.forEach(el   => el.setAttribute('transform', bTf));
    laterEls.forEach(el => el.setAttribute('transform', bTf));

    if (!eyeRollActive) setTargets(mouseX, mouseY);
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

  // ── Body squish ───────────────────────────────────────────────────────────
  const bodyEl = document.getElementById('update-body');
  if (bodyEl) {
    bodyEl.addEventListener('click', () => {
      wrapper.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(0.988)', offset: 0.35 }, { transform: 'scale(1)' }],
        { duration: 200, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
      );
    });
  }

  // ── ruka_tu idle — in/hold/out ────────────────────────────────────────────
  const VB_UPDATE     = { x: 608, y: 315, w: 695 };
  const RUKA_MID      = 50;   // frame kde je ruka plne dnu (odhadnutý stred 8–100)
  const RUKA_HOLD_MS  = 2800; // ako dlho drží polohu pred odchodom

  const rukaTuEl  = document.getElementById('lottie-ruka-tu');
  let rukaTuReady = false;
  let rukaTuPhase = 'hidden'; // 'hidden' | 'entering' | 'holding' | 'exiting'
  let rukaTuHoldTimer = null;
  let idleTimer   = null;

  const lottieRukaTu = lottie.loadAnimation({
    container: rukaTuEl, renderer: 'svg', loop: false, autoplay: false,
    path: '/anim/ruka_tu.json',
  });

  lottieRukaTu.addEventListener('DOMLoaded', () => {
    positionLottie();
    rukaTuReady = true;
  });

  lottieRukaTu.addEventListener('complete', () => {
    if (rukaTuPhase === 'entering') {
      // Ruka je dnu — zastav a drž
      rukaTuPhase = 'holding';
      lottieRukaTu.goToAndStop(RUKA_MID, true);
      rukaTuHoldTimer = setTimeout(() => {
        if (rukaTuPhase === 'holding') startRukaExit();
      }, RUKA_HOLD_MS);
    } else if (rukaTuPhase === 'exiting') {
      rukaTuPhase = 'hidden';
      rukaTuEl.style.display = 'none';
    }
  });

  function positionLottie() {
    if (!rukaTuEl) return;
    const scale = wrapper.offsetWidth / VB_UPDATE.w;
    rukaTuEl.style.width  = (1920 * scale) + 'px';
    rukaTuEl.style.height = (1080 * scale) + 'px';
    rukaTuEl.style.left   = (-VB_UPDATE.x * scale) + 'px';
    rukaTuEl.style.top    = (-VB_UPDATE.y * scale + 30) + 'px'; // +30px nižšie
  }

  window.addEventListener('resize', positionLottie);

  function startRukaExit() {
    clearTimeout(rukaTuHoldTimer);
    rukaTuPhase = 'exiting';
    lottieRukaTu.playSegments([RUKA_MID, 100], true);
  }

  function showRukaTu() {
    if (!rukaTuReady || rukaTuPhase !== 'hidden') return;
    rukaTuPhase = 'entering';
    rukaTuEl.style.display = 'block';
    lottieRukaTu.playSegments([0, RUKA_MID], true);
  }

  function hideRukaTu() {
    clearTimeout(rukaTuHoldTimer);
    if (rukaTuPhase === 'hidden') return;
    if (rukaTuPhase === 'holding') {
      startRukaExit();
    } else if (rukaTuPhase === 'entering') {
      // Prerušenie počas vstupu — skoč rovno na exit
      rukaTuPhase = 'hidden';
      rukaTuEl.style.display = 'none';
      lottieRukaTu.stop();
    }
    // 'exiting' — nechaj dohraný
  }

  function resetIdleTimer() {
    clearTimeout(idleTimer);
    hideRukaTu();
    idleTimer = setTimeout(showRukaTu, 4000);
  }

  // ── RESTART NOW button ────────────────────────────────────────────────────
  let nowHovered = false;

  nowEls.forEach(el => {
    el.addEventListener('mouseenter', () => {
      if (nowHovered) return; // už sme dnu — nespúšťaj znova
      nowHovered = true; hoverScale(nowEls, 1.05); resetIdleTimer();
    });
    el.addEventListener('mouseleave', ev => {
      if (nowEls.some(e => e === ev.relatedTarget || e.contains(ev.relatedTarget))) return;
      nowHovered = false; hoverScale(nowEls, 1.0);
    });
    el.addEventListener('click', ev => {
      ev.stopPropagation();
      hideRukaTu();
      pressButton(nowEls, nowHovered, () => { window.location.href = '/scene/loading'; });
    });
  });

  // ── RESTART LATER button ──────────────────────────────────────────────────
  let laterHovered = false;

  laterEls.forEach(el => {
    el.addEventListener('mouseenter', () => {
      if (laterHovered) return;
      laterHovered = true; hoverScale(laterEls, 1.05); resetIdleTimer();
    });
    el.addEventListener('mouseleave', ev => {
      if (laterEls.some(e => e === ev.relatedTarget || e.contains(ev.relatedTarget))) return;
      laterHovered = false; hoverScale(laterEls, 1.0);
    });
    el.addEventListener('click', ev => {
      ev.stopPropagation();
      hideRukaTu();
      triggerEyeRoll();
      pressButton(laterEls, laterHovered, () => window.OLS.navigate('update'));
    });
  });

  resetIdleTimer();

})();
