(function () {
  'use strict';

  const svg     = document.getElementById('Layer_1');
  const wrapper = document.getElementById('window-wrapper');

  // ── Eye tracking — getBBox approach ───────────────────────────────────────
  // Each pupil moves to the closest point to the cursor within its own EYE shape.
  // getBBox() reads actual DOM geometry — zero hardcoded coordinates.

  let eyes = null;

  const EYE_INSET = 0.18;

  function makeEye(eyeEl, pupilEl, lerp) {
    pupilEl.setAttribute('transform', 'translate(0,0)');
    const ebb  = eyeEl.getBBox();
    const pbb  = pupilEl.getBBox();
    const cx   = pbb.x + pbb.width  / 2;
    const cy   = pbb.y + pbb.height / 2;
    const ix   = ebb.width  * EYE_INSET;
    const iy   = ebb.height * EYE_INSET;
    return {
      el: pupilEl, lerp, cx, cy,
      minDX: ebb.x          + ix - cx,
      maxDX: ebb.x + ebb.width  - ix - cx,
      minDY: ebb.y          + iy - cy,
      maxDY: ebb.y + ebb.height - iy - cy,
      curX: 0, curY: 0, targX: 0, targY: 0,
    };
  }

  function initEyes() {
    eyes = [
      makeEye(
        document.getElementById('newsletter-eye_x5F_R'),
        document.getElementById('newsletter-pupil_x5F_R'),
        0.13
      ),
      makeEye(
        document.getElementById('newsletter-eye_x5F_L'),
        document.getElementById('newsletter-pupil_x5F_L'),
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

  const FOLLOW_DIST = 350;
  let midX = 0, midY = 0;

  let mousePt = { x: 960, y: 260 };

  // ── Parallax ──────────────────────────────────────────────────────────────
  const PARALLAX_SCALE = 1.0;
  const P_LERP         = 0.04;

  let pCurX = 0, pCurY = 0;
  let pTargX = 0, pTargY = 0;

  const turnOnTxt = document.getElementById('newsletter-turnon_x5F_txt');
  const signupTxt = document.getElementById('newsletter-signup_x5F_txt');

  // Defined early so tick() can reference them for parallax
  const contEls = [
    document.getElementById('newsletter-continue_x5F_button_x5F_body'),
    document.getElementById('newsletter-continue_x5F_button_x5F_fill'),
    document.getElementById('newsletter-continue_x5F_txt'),
  ].filter(Boolean);

  // Toggle data — declared before tick() so tick() can iterate them
  const TOGGLE_DX    = 58;
  const TOGGLE_SPEED = 0.16;
  const OFF_OPACITY  = 0;

  const TOGGLES = [
    {
      name: 'turnon',
      body:  document.getElementById('newsletter-turnon_x5F_toggle_x5F_body'),
      swOn:  document.getElementById('newsletter-turnon_x5F_toggle_x5F_switch_x5F_on'),
      swOff: document.getElementById('newsletter-turnon_x5F_toggle_x5F_switch_x5F_off'),
      isOn: true, curX: 0, targetX: 0, raf: null,
      hoverScale: 1.0, hoverScaleTarget: 1.0, isHovered: false,
    },
    {
      name: 'signup',
      body:  document.getElementById('newsletter-signup_x5F_toggle_x5F_body'),
      swOn:  document.getElementById('newsletter-signup_x5F_toggle_x5F_switch_x5F_on'),
      swOff: document.getElementById('newsletter-signup_x5F_toggle_x5F_switch_x5F_off'),
      isOn: true, curX: 0, targetX: 0, raf: null,
      hoverScale: 1.0, hoverScaleTarget: 1.0, isHovered: false,
    },
  ];

  document.addEventListener('mousemove', ev => {
    mousePt = toSVGCoords(ev.clientX, ev.clientY);
    pTargX  = (ev.clientX / window.innerWidth  - 0.5) * 2;
    pTargY  = (ev.clientY / window.innerHeight - 0.5) * 2;
  });

  function setTargets(pt) {
    if (!eyes) return;
    const dx    = pt.x - midX;
    const dy    = pt.y - midY;
    const dist  = Math.sqrt(dx * dx + dy * dy);
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

  // updateKnob — CSS transform-origin:50%/fill-box handles scale centering, we just translate + scale
  function updateKnob(t) {
    t.hoverScale += (t.hoverScaleTarget - t.hoverScale) * 0.18;

    const progress = 1 + t.curX / TOGGLE_DX;
    const bpX = pCurX * 3.97 * PARALLAX_SCALE;
    const bpY = pCurY * 2.65 * PARALLAX_SCALE;

    t.swOn.setAttribute('transform',
      `translate(${(t.curX + bpX).toFixed(3)},${bpY.toFixed(3)}) ` +
      `scale(${t.hoverScale.toFixed(4)})`);

    t.swOn.style.fillOpacity = (OFF_OPACITY + (1 - OFF_OPACITY) * progress).toFixed(3);
  }

  function tick() {
    // Parallax lerp
    pCurX += (pTargX - pCurX) * P_LERP;
    pCurY += (pTargY - pCurY) * P_LERP;

    // Layer 0: whole wrapper floats
    const wpX = pCurX * 25 * PARALLAX_SCALE;
    const wpY = pCurY * 12 * PARALLAX_SCALE;
    wrapper.style.transform = `translate(${wpX.toFixed(2)}px,${wpY.toFixed(2)}px)`;

    // Layer 2: toggle labels
    const tpX = pCurX * 3 * PARALLAX_SCALE;
    const tpY = pCurY * 2 * PARALLAX_SCALE;
    const tTf = `translate(${tpX.toFixed(2)},${tpY.toFixed(2)})`;
    if (turnOnTxt) turnOnTxt.setAttribute('transform', tTf);
    if (signupTxt) signupTxt.setAttribute('transform', tTf);

    // Layer 3: continue button + toggle bodies
    const bpX = pCurX * 3.45 * PARALLAX_SCALE;
    const bpY = pCurY * 2.3  * PARALLAX_SCALE;
    const bTf = `translate(${bpX.toFixed(2)},${bpY.toFixed(2)})`;
    contEls.forEach(el => el.setAttribute('transform', bTf));
    TOGGLES.forEach(t => {
      if (t.body) t.body.setAttribute('transform', bTf);
      updateKnob(t);  // Layer 4: knob always live, even when idle
    });

    // Eye tracking
    setTargets(mousePt);
    if (eyes) {
      eyes.forEach(e => {
        e.curX += (e.targX - e.curX) * e.lerp;
        e.curY += (e.targY - e.curY) * e.lerp;
        e.el.setAttribute('transform',
          `translate(${e.curX.toFixed(2)},${e.curY.toFixed(2)})`);
      });
    }
    requestAnimationFrame(tick);
  }

  initEyes();
  tick();


  // ── Ruka Lottie ───────────────────────────────────────────────────────────
  // Newsletter viewBox: x=600, y=225, w=720 (z 1920×1080 canvasu)
  const HAND_VB     = { x: 600, y: 225, w: 720 };
  const HAND_PEAK_MS   = 700;    // timing for toggle flip
  const SVG_TOGGLE_DY  = 157.5;  // SVG units between signup (top) and turnon (bottom)
  const lottieHandEl   = document.getElementById('lottie-hand');
  const lottieHandEl2  = document.getElementById('lottie-hand-2');

  function positionLottieHand() {
    const scale   = wrapper.offsetWidth / HAND_VB.w;
    const baseTop = -HAND_VB.y * scale + 20;
    const baseLeft = -HAND_VB.x * scale;
    const w = (1920 * scale) + 'px';
    const h = (1080 * scale) + 'px';
    lottieHandEl.style.width  = w;
    lottieHandEl.style.height = h;
    lottieHandEl.style.left   = baseLeft + 'px';
    lottieHandEl.style.top    = baseTop + 'px';
    lottieHandEl2.style.width  = w;
    lottieHandEl2.style.height = h;
    lottieHandEl2.style.left   = baseLeft + 'px';
    lottieHandEl2.style.top    = (baseTop + SVG_TOGGLE_DY * scale) + 'px';
  }

  const lottieHandAnim = lottie.loadAnimation({
    container: lottieHandEl,
    renderer: 'svg', loop: false, autoplay: false,
    path: '/anim/rukatoggle.json',
  });
  const lottieHandAnim2 = lottie.loadAnimation({
    container: lottieHandEl2,
    renderer: 'svg', loop: false, autoplay: false,
    path: '/anim/rukatoggle.json',
  });

  let lottieHandReady = false, lottieHandReady2 = false;
  lottieHandAnim.addEventListener('DOMLoaded',  () => { positionLottieHand(); lottieHandReady  = true; });
  lottieHandAnim2.addEventListener('DOMLoaded', () => { lottieHandReady2 = true; });
  lottieHandAnim.addEventListener('complete',  () => { lottieHandEl.style.display  = 'none'; });
  lottieHandAnim2.addEventListener('complete', () => { lottieHandEl2.style.display = 'none'; });
  window.addEventListener('resize', positionLottieHand);

  function playHandAnim(toggle, onPeak) {
    const isTop = toggle.name === 'signup';
    const el    = isTop ? lottieHandEl   : lottieHandEl2;
    const anim  = isTop ? lottieHandAnim : lottieHandAnim2;
    const ready = isTop ? lottieHandReady : lottieHandReady2;
    if (!ready) return;
    el.style.display = 'block';
    anim.goToAndPlay(5, true);
    setTimeout(onPeak, HAND_PEAK_MS);
  }

  function tickToggle(t) {
    const diff = t.targetX - t.curX;
    if (Math.abs(diff) < 0.15) {
      t.curX = t.targetX;
      t.raf  = null;
      return;
    }
    t.curX += diff * TOGGLE_SPEED;
    t.raf = requestAnimationFrame(() => tickToggle(t));
  }

  function handleToggle(t) {
    t.isOn    = !t.isOn;
    t.targetX = t.isOn ? 0 : -TOGGLE_DX;
    if (t.raf === null) t.raf = requestAnimationFrame(() => tickToggle(t));

    if (!t.isOn) {
      playHandAnim(t, () => {
        if (!t.isOn) {
          t.isOn    = true;
          t.targetX = 0;
          if (t.raf === null) t.raf = requestAnimationFrame(() => tickToggle(t));
        }
      });
    }
  }

  TOGGLES.forEach(t => {
    // Remove swOff from DOM permanently
    if (t.swOff && t.swOff.parentNode) t.swOff.parentNode.removeChild(t.swOff);

    updateKnob(t);

    [t.body, t.swOn].filter(Boolean).forEach(el => {
      el.addEventListener('mouseenter', () => {
        t.isHovered = true;
        t.hoverScaleTarget = 1.06;   // scale UP on hover
      });
      el.addEventListener('mouseleave', () => {
        t.isHovered = false;
        t.hoverScaleTarget = 1.0;
      });
      el.addEventListener('click', ev => {
        ev.stopPropagation();
        t.hoverScaleTarget = 0.84;
        setTimeout(() => { t.hoverScaleTarget = t.isHovered ? 1.06 : 1.0; }, 160);
        handleToggle(t);
      });
    });
  });

  // ── Box click — squish whole window on every click ────────────────────────
  svg.addEventListener('click', () => {
    wrapper.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(0.988)', offset: 0.35 }, { transform: 'scale(1)' }],
      { duration: 200, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
    );
  });

  // ── CONTINUE button ───────────────────────────────────────────────────────

  let contHovered = false;

  function animContScale(to, dur) {
    contEls.forEach(el => {
      el.style.transformBox    = 'fill-box';
      el.style.transformOrigin = '50% 50%';
      el.animate(
        [{ transform: `scale(${to})` }],
        { duration: dur, fill: 'forwards', easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' }
      );
    });
  }

  contEls.forEach(el => {
    el.addEventListener('mouseenter', () => { contHovered = true;  animContScale(1.05, 180); });
    el.addEventListener('mouseleave', () => { contHovered = false; animContScale(1.00, 200); });
    el.addEventListener('click', ev => {
      ev.stopPropagation();
      const base = contHovered ? 1.05 : 1.0;
      contEls.forEach(e => {
        e.style.transformBox    = 'fill-box';
        e.style.transformOrigin = '50% 50%';
        e.animate(
          [{ transform: `scale(${base})` },
           { transform: 'scale(0.92)', offset: 0.35 },
           { transform: `scale(${base})` }],
          { duration: 260, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
        );
      });
      setTimeout(() => window.OLS.navigate('newsletter'), 300);
    });
  });


})();
