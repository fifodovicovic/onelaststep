(function () {
  'use strict';

  const svg     = document.getElementById('Layer_1');
  const wrapper = document.getElementById('window-wrapper');

  // ── Parallax ──────────────────────────────────────────────────────────────
  const PARALLAX_SCALE = 1.0;
  const P_LERP         = 0.04;

  let pCurX = 0, pCurY = 0;
  let pTargX = 0, pTargY = 0;

  // Layer 3: buttons (accept + deny)
  const acceptFill = document.getElementById('cookies-accept_x5F_button_x5F_fill');
  const acceptBody = document.getElementById('cookies-accept_x5F_button_x5F_body');
  const acceptTxt  = document.getElementById('cookies-accept_x5F_txt');
  const denyBody   = document.getElementById('cookies-deny_x5F_button_x5F_body');
  const denyTxt    = document.getElementById('cookies-deny_x5F_txt');
  const btnEls     = [acceptFill, acceptBody, denyBody].filter(Boolean);
  const txtEls     = [acceptTxt, denyTxt].filter(Boolean);

  // Layer 4: cookie character
  const cookieCharEls = [
    document.getElementById('cookies-cookie'),
    document.getElementById('cookies-cookie_x5F_chocolate'),
    document.getElementById('cookies-eye_x5F_R'),
    document.getElementById('cookies-eye_x5F_L'),
    document.getElementById('cookies-pupils_x5F_mask'),
  ].filter(Boolean);

  // ── Eye tracking ──────────────────────────────────────────────────────────
  let eyes = null;
  const EYE_INSET_X = 0.12;   // horizontálny inset — mierne väčší rozsah
  const EYE_INSET_Y = 0.0;    // vertikálny — plný rozsah, zretelne hore/dole
  const FOLLOW_DIST = 250;
  let midX = 0, midY = 0;
  let forcedTarget  = null;
  let lottieTransPts = null;  // [{x,y},{x,y}] — direct SVG world coords pre Lottie prechod
  // Glance stav
  let glanceActive  = false;
  let glancePt      = null;
  let glanceTimer   = null;
  // Smutné ústa — delay timer
  let mouthDelayTimer = null;
  // DENY hover stav — deklarujeme tu aby tick() nepískal TDZ chybu (volaný pred riadkom 355)
  let denyHovered     = false;
  let sadPlaying      = false;
  let sadTransitioning = false;  // true počas 350ms prechodu → oči smerujú do centra

  function makeEye(eyeEl, pupilEl, lerp) {
    pupilEl.setAttribute('transform', 'translate(0,0)');
    const ebb = eyeEl.getBBox();
    const pbb = pupilEl.getBBox();
    const cx  = pbb.x + pbb.width  / 2;
    const cy  = pbb.y + pbb.height / 2;
    const ix  = ebb.width  * EYE_INSET_X;
    const iy  = ebb.height * EYE_INSET_Y;
    return {
      el: pupilEl, lerp, cx, cy,
      minDX: ebb.x         + ix - cx,
      maxDX: ebb.x + ebb.width  - ix - cx,
      minDY: ebb.y         + iy - cy,
      maxDY: ebb.y + ebb.height - iy - cy,
      curX: 0, curY: 0, targX: 0, targY: 0,
    };
  }

  function initEyes() {
    eyes = [
      makeEye(document.getElementById('cookies-eye_x5F_R'), document.getElementById('cookies-pupil_x5F_R'), 0.13),
      makeEye(document.getElementById('cookies-eye_x5F_L'), document.getElementById('cookies-pupil_x5F_L'), 0.10),
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

  function setTargets(mx, my) {
    if (!eyes) return;
    let fx, fy;
    if (forcedTarget)             { fx = forcedTarget.x; fy = forcedTarget.y; }
    else if (glanceActive && glancePt) { fx = glancePt.x;   fy = glancePt.y;   }
    else                          { fx = mx;            fy = my;            }
    const dx   = fx - midX;
    const dy   = fy - midY;
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

  function tick() {
    // Parallax lerp
    pCurX += (pTargX - pCurX) * P_LERP;
    pCurY += (pTargY - pCurY) * P_LERP;

    // Layer 0: whole wrapper floats (CSS px)
    const wpX = pCurX * 25 * PARALLAX_SCALE;
    const wpY = pCurY * 12 * PARALLAX_SCALE;
    wrapper.style.transform = `translate(${wpX.toFixed(2)}px,${wpY.toFixed(2)}px)`;

    // Layer 2: text labels
    const tpX = pCurX * 3 * PARALLAX_SCALE;
    const tpY = pCurY * 2 * PARALLAX_SCALE;
    const tTf = `translate(${tpX.toFixed(2)},${tpY.toFixed(2)})`;
    txtEls.forEach(el => el.setAttribute('transform', tTf));

    // Layer 3: buttons
    const bpX = pCurX * 3.45 * PARALLAX_SCALE;
    const bpY = pCurY * 2.3  * PARALLAX_SCALE;
    const bTf = `translate(${bpX.toFixed(2)},${bpY.toFixed(2)})`;
    btnEls.forEach(el => el.setAttribute('transform', bTf));

    // Layer 4: cookie character (floats slightly more)
    const cpX = pCurX * 3.97 * PARALLAX_SCALE;
    const cpY = pCurY * 2.65 * PARALLAX_SCALE;
    const cTf = `translate(${cpX.toFixed(2)},${cpY.toFixed(2)})`;
    cookieCharEls.forEach(el => el.setAttribute('transform', cTf));

    // Eye tracking — DENY hover: tlačí oči výraznejšie dole (nie počas sad prechodu)
    const biasY = (denyHovered && !glanceActive && !forcedTarget && !sadTransitioning) ? 100 : 0;
    setTargets(mouseX, mouseY + biasY);
    if (eyes) {
      eyes.forEach(e => {
        // Počas sad prechodu: smerujeme oči do centra (0,0) — prirodzená pozícia = Lottie frame 0
        if (sadTransitioning) { e.targX = 0; e.targY = 0; }
        e.curX += (e.targX - e.curX) * e.lerp;
        e.curY += (e.targY - e.curY) * e.lerp;
        e.el.setAttribute('transform', `translate(${e.curX.toFixed(2)},${e.curY.toFixed(2)})`);
      });
    }
    requestAnimationFrame(tick);
  }

  initEyes();
  tick();

  // ── Accept center — SVG coords pre glance ─────────────────────────────────
  let acceptCenter = { x: 1100, y: 450 };  // fallback
  (function initAcceptCenter() {
    const el = acceptBody || acceptFill;
    if (!el) return;
    const bb = el.getBBox();
    acceptCenter = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
  })();

  // ── Glance funkcie ────────────────────────────────────────────────────────
  function scheduleGlance() {
    clearTimeout(glanceTimer);
    glanceTimer = setTimeout(doGlance, 2500 + Math.random() * 3500); // 2.5–6 s
  }

  function doGlance() {
    if (!denyHovered || sadPlaying) return;
    glanceActive = true;
    glancePt     = acceptCenter;
    // Pohľad na ACCEPT 1.0–1.8 s, potom naspäť k myške
    setTimeout(() => {
      glanceActive = false;
      glancePt     = null;
      if (denyHovered && !sadPlaying) scheduleGlance();
    }, 1000 + Math.random() * 800);
  }

  function clearGlance() {
    clearTimeout(glanceTimer);
    glanceActive = false;
    glancePt     = null;
  }

  // ── Lottie overlays ───────────────────────────────────────────────────────
  const VB = { x: 560, y: 378, w: 775 };

  const lottieNoEl  = document.getElementById('lottie-deny-no');
  const lottieSadEl = document.getElementById('lottie-deny-sad');

  function positionLottie(el) {
    const scale = wrapper.offsetWidth / VB.w;
    el.style.width  = (1920 * scale) + 'px';
    el.style.height = (1080 * scale) + 'px';
    el.style.left   = (-VB.x * scale) + 'px';
    el.style.top    = (-VB.y * scale) + 'px';
  }

  const lottieNo = lottie.loadAnimation({
    container: lottieNoEl,
    renderer: 'svg', loop: false, autoplay: false,
    path: '/anim/cookie_no.json',
  });
  const lottieSad = lottie.loadAnimation({
    container: lottieSadEl,
    renderer: 'svg', loop: false, autoplay: false,
    path: '/anim/cookie_sad.json',
  });

  let lottieNoReady  = false;
  let lottieSadReady = false;
  let lottieNoDir    = 1;   // 1=forward, -1=backward

  // ── Sad animation lock — blocks all interaction while sad anim plays ───────
  // (sadPlaying deklarovaný hore kvôli TDZ)

  lottieNo.addEventListener('DOMLoaded', () => {
    positionLottie(lottieNoEl);
    if (lottieNo.totalFrames > 0) lottieNoReady = true;
  });
  lottieSad.addEventListener('DOMLoaded', () => { positionLottie(lottieSadEl); lottieSadReady = true; });
  window.addEventListener('resize', () => { positionLottie(lottieNoEl); positionLottie(lottieSadEl); });

  lottieNo.addEventListener('complete', () => {
    if (lottieNoDir === -1) {
      lottieNoEl.style.display = 'none';
      lottieNo.setDirection(1);
      lottieNo.setSpeed(1);
      lottieNoDir = 1;
    }
  });

  // ── Cookie face elements ──────────────────────────────────────────────────
  const cookieFace = [
    document.getElementById('cookies-cookie'),
    document.getElementById('cookies-cookie_x5F_chocolate'),
    document.getElementById('cookies-eye_x5F_R'),
    document.getElementById('cookies-eye_x5F_L'),
    document.getElementById('cookies-pupils_x5F_mask'),
  ].filter(Boolean);

  function hideFace() {
    cookieFace.forEach(el => { el.style.transition = 'none'; el.style.opacity = '0'; });
    lottieNoEl.style.display = 'none';
  }

  // ── Cookie sad animation ──────────────────────────────────────────────────
  // Lottie cookie_sad.json — pozície zreničiek na frame 0 (1920×1080 canvas)
  // eyes[0] = cookies-pupil_x5F_R → R Outlines world: (750.456, 513.97)
  // eyes[1] = cookies-pupil_x5F_L → L Outlines world: (650.035, 509.49)
  const SAD_LOTTIE_PTS = [
    { x: 750.456, y: 513.97 },
    { x: 650.035, y: 509.49 },
  ];

  function playCookieSad() {
    if (!lottieSadReady) return;
    sadPlaying     = true;
    sadTransitioning = true;
    clearGlance();
    forcedTarget   = null;
    lottieTransPts = null;

    // Oči lerpia plynulo do centra (0,0) — to je prirodzená poloha = Lottie frame 0
    setTimeout(() => {
      sadTransitioning = false;
      // Snap na presnú strednú polohu pred odovzdaním Lottie
      if (eyes) {
        eyes.forEach(e => {
          e.curX = 0; e.curY = 0;
          e.el.setAttribute('transform', 'translate(0,0)');
        });
      }
      hideFace();
      lottieSadEl.style.transition = 'none';
      lottieSadEl.style.opacity    = '1';
      lottieSadEl.style.display    = 'block';
      lottieSad.goToAndPlay(0, true);
    }, 350);
  }

  lottieSad.addEventListener('complete', () => {
    // Reset pupil tracking state to center — they ease smoothly to mouse on reveal
    if (eyes) {
      eyes.forEach(e => { e.curX = 0; e.curY = 0; e.targX = 0; e.targY = 0; });
    }
    // Hard cut: hide Lottie, show SVG face instantly
    lottieSadEl.style.display = 'none';
    lottieSadEl.style.opacity = '';
    cookieFace.forEach(el => { el.style.transition = 'none'; el.style.opacity = '1'; });
    // Keep sad mouth visible after animation
    if (lottieNoReady) {
      lottieNoEl.style.display = 'block';
      lottieNo.goToAndStop(lottieNo.totalFrames - 1, true);
    }
    sadPlaying = false;
  });

  // ── Shared button helpers ─────────────────────────────────────────────────
  function pressButton(els, hovered, onDone) {
    const base = hovered ? 1.05 : 1.0;
    els.forEach(el => {
      el.style.transformBox    = 'fill-box';
      el.style.transformOrigin = '50% 50%';
      const a = el.animate(
        [{ transform: `scale(${base})` },
         { transform: 'scale(0.92)', offset: 0.35 },
         { transform: `scale(${base})` }],
        { duration: 240, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
      );
      if (onDone) a.addEventListener('finish', onDone, { once: true });
    });
  }

  function hoverScale(els, to) {
    els.forEach(el => {
      el.style.transformBox    = 'fill-box';
      el.style.transformOrigin = '50% 50%';
      el.animate(
        [{ transform: `scale(${to})` }],
        { duration: 160, fill: 'forwards', easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' }
      );
    });
  }

  // ── ACCEPT button ─────────────────────────────────────────────────────────
  const acceptEls = [acceptFill, acceptBody, acceptTxt].filter(Boolean);
  let acceptHovered = false;

  acceptEls.forEach(el => {
    el.addEventListener('mouseenter', () => { acceptHovered = true;  hoverScale(acceptEls, 1.05); });
    el.addEventListener('mouseleave', () => { acceptHovered = false; hoverScale(acceptEls, 1.0); });
    el.addEventListener('click', ev => {
      ev.stopPropagation();
      pressButton(acceptEls, acceptHovered, () => window.OLS.navigate('cookies'));
    });
  });

  // ── DENY button ───────────────────────────────────────────────────────────
  const denyEls = [denyBody, denyTxt].filter(Boolean);
  // (denyHovered deklarovaný hore kvôli TDZ)
  let denyClickHistory = [];  // timestamps — sad animácia len po 3× za 500ms

  function isInsideDeny(target) {
    return denyEls.some(el => el === target || el.contains(target));
  }

  function onDenyEnter() {
    if (denyHovered) return;
    denyHovered = true;
    hoverScale(denyEls, 1.05);
    // Smutné ústa sa objavia až po 1000 ms hoverovania
    mouthDelayTimer = setTimeout(() => {
      if (!lottieNoReady || !denyHovered) return;
      lottieNoEl.style.display = 'block';
      lottieNo.setSpeed(1);
      lottieNo.setDirection(1);
      lottieNoDir = 1;
      lottieNo.goToAndPlay(0, true);
    }, 1000);
    scheduleGlance();
  }

  function hideMouth() {
    if (!lottieNoReady || lottieNoEl.style.display !== 'block') return;
    if (lottieNoDir === -1) return;
    lottieNo.setSpeed(2.5);
    lottieNo.setDirection(-1);
    lottieNoDir = -1;
    lottieNo.play();
  }

  function onDenyLeave(ev) {
    if (!denyHovered) return;
    if (isInsideDeny(ev.relatedTarget)) return;
    denyHovered = false;
    hoverScale(denyEls, 1.0);
    clearTimeout(mouthDelayTimer);
    clearGlance();
    hideMouth();
  }

  denyBody.addEventListener('mouseenter', onDenyEnter);
  denyBody.addEventListener('mouseleave', onDenyLeave);

  wrapper.addEventListener('mouseleave', () => {
    if (denyHovered) {
      denyHovered = false;
      hoverScale(denyEls, 1.0);
      clearTimeout(mouthDelayTimer);
      clearGlance();
    }
    hideMouth();
  });

  denyEls.forEach(el => {
    el.addEventListener('mouseenter', onDenyEnter);
    el.addEventListener('mouseleave', onDenyLeave);
    el.addEventListener('click', ev => {
      ev.stopPropagation();
      pressButton(denyEls, denyHovered);
      // Sad animácia: 3 rýchle kliky (za 500ms) ALEBO 5 klikov kdekoľvek (za 10s)
      const now = Date.now();
      denyClickHistory.push(now);
      denyClickHistory = denyClickHistory.filter(t => now - t <= 10000); // window 10s
      const fastClicks = denyClickHistory.filter(t => now - t <= 500).length;
      const totalClicks = denyClickHistory.length;
      if ((fastClicks >= 3 || totalClicks >= 5) && !sadPlaying) {
        denyClickHistory = [];
        setTimeout(playCookieSad, 240);
      }
    });
  });

  // ── Box click squish ──────────────────────────────────────────────────────
  const bodyEl = document.getElementById('cookies-body');
  if (bodyEl) {
    bodyEl.addEventListener('click', () => {
      wrapper.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(0.988)', offset: 0.35 }, { transform: 'scale(1)' }],
        { duration: 200, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
      );
    });
  }

})();
