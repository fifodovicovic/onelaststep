(function () {
  'use strict';

  const svg     = document.getElementById('Layer_1');
  const wrapper = document.getElementById('window-wrapper');

  // ── Eye tracking ──────────────────────────────────────────────────────────
  // ok.svg uses character-perspective L/R naming (opposite to viewer).
  // pupil_R (x≈998) sits inside eye_L socket; pupil_L (x≈921) inside eye_R socket.

  let eyes = null;
  const EYE_INSET   = 0.18;
  const FOLLOW_DIST = 350;
  let midX = 0, midY = 0;

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
        document.getElementById('ok-eye_x5F_L'),
        document.getElementById('ok-pupil_x5F_R'),
        0.13
      ),
      makeEye(
        document.getElementById('ok-eye_x5F_R'),
        document.getElementById('ok-pupil_x5F_L'),
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
  const txtGroup       = document.getElementById('ok-press_x5F_ok_x5F_txt');

  let pCurX = 0, pCurY = 0, pTargX = 0, pTargY = 0;
  let mouseX = 0, mouseY = 0;
  let clientMouseX = window.innerWidth / 2;

  // ── OK button ─────────────────────────────────────────────────────────────
  const btnBody = document.getElementById('ok-button_x5F_body');
  const btnFill = document.getElementById('ok-button_x5F_fill');
  const btnTxt  = document.getElementById('ok-ok_x5F_txt');
  const btnEls  = [btnBody, btnFill, btnTxt].filter(Boolean);

  let dodgesLeft        = 5 + Math.floor(Math.random() * 6);
  let targetDx          = 0;
  let curDx             = 0;
  let lastDodgeMs       = 0;
  let lastLaughMs       = 0;
  let catchable         = false;
  let clicked           = false;
  let clicksOnCatchable = 0;

  const BTN_LERP = 0.15;
  const MAX_DX   = 220;

  document.addEventListener('mousemove', ev => {
    const p = toSVGCoords(ev.clientX, ev.clientY);
    mouseX   = p.x;
    mouseY   = p.y;
    clientMouseX = ev.clientX;
    pTargX   = (ev.clientX / window.innerWidth  - 0.5) * 2;
    pTargY   = (ev.clientY / window.innerHeight - 0.5) * 2;

    if (dodgesLeft > 0 && btnBody) {
      const br   = btnBody.getBoundingClientRect();
      const near = ev.clientX >= br.left - 5 && ev.clientX <= br.right + 5;
      if (near) {
        const now = Date.now();
        if (now - lastDodgeMs > 300) {
          lastDodgeMs = now;
          dodgesLeft--;
          flee();
          if (dodgesLeft === 0) {
            setTimeout(() => { targetDx = 0; }, 500);
            setTimeout(() => { catchable = true; }, 1200);
          }
        }
      }
    }
  });

  function flee() {
    const wr       = wrapper.getBoundingClientRect();
    const windowCX = wr.left + wr.width / 2;
    const dir      = clientMouseX > windowCX ? -1 : 1;
    const fraction = 0.35 + Math.random() * 0.65;
    targetDx = dir * MAX_DX * fraction;
    if (Math.random() < 0.45) {
      const now = Date.now();
      if (now - lastLaughMs > 1400) { lastLaughMs = now; playLaugh(); }
    }
  }

  function applyBtnTransform() {
    curDx += (targetDx - curDx) * BTN_LERP;
    const bpX = pCurX * 3.45 * PARALLAX_SCALE;
    const bpY = pCurY * 2.3  * PARALLAX_SCALE;
    const t   = `translate(${(curDx + bpX).toFixed(2)},${bpY.toFixed(2)})`;
    if (btnBody) btnBody.setAttribute('transform', t);
    if (btnFill) btnFill.setAttribute('transform', t);
    if (btnTxt)  btnTxt.setAttribute('transform', t);
  }

  function setTargets(mx, my) {
    if (!eyes) return;
    const dx    = mx - midX;
    const dy    = my - midY;
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

  // ── Tick ──────────────────────────────────────────────────────────────────
  function tick() {
    pCurX += (pTargX - pCurX) * P_LERP;
    pCurY += (pTargY - pCurY) * P_LERP;

    const wpX = pCurX * 25 * PARALLAX_SCALE;
    const wpY = pCurY * 12 * PARALLAX_SCALE;
    wrapper.style.transform = `translate(${wpX.toFixed(2)}px,${wpY.toFixed(2)}px)`;

    if (txtGroup) {
      const tpX = pCurX * 3 * PARALLAX_SCALE;
      const tpY = pCurY * 2 * PARALLAX_SCALE;
      txtGroup.setAttribute('transform', `translate(${tpX.toFixed(2)},${tpY.toFixed(2)})`);
    }

    setTargets(mouseX, mouseY);
    if (eyes) {
      eyes.forEach(e => {
        e.curX += (e.targX - e.curX) * e.lerp;
        e.curY += (e.targY - e.curY) * e.lerp;
        e.el.setAttribute('transform', `translate(${e.curX.toFixed(2)},${e.curY.toFixed(2)})`);
      });
    }

    applyBtnTransform();
    requestAnimationFrame(tick);
  }

  initEyes();
  tick();

  // ── Button animation helper ───────────────────────────────────────────────
  function animBtn(keyframes, opts) {
    let lastAnim = null;
    btnEls.forEach(el => {
      el.style.transformBox    = 'fill-box';
      el.style.transformOrigin = '50% 50%';
      lastAnim = el.animate(keyframes, opts);
    });
    return lastAnim;
  }

  // ── Body squish — wrapper, nie SVG root ───────────────────────────────────
  svg.addEventListener('click', () => {
    const wx = (pCurX * 25 * PARALLAX_SCALE).toFixed(2);
    const wy = (pCurY * 12 * PARALLAX_SCALE).toFixed(2);
    wrapper.animate(
      [{ transform: `translate(${wx}px,${wy}px) scale(1)` },
       { transform: `translate(${wx}px,${wy}px) scale(0.988)`, offset: 0.35 },
       { transform: `translate(${wx}px,${wy}px) scale(1)` }],
      { duration: 200, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
    );
  });

  // ── Button hover + click — 2-click state machine ─────────────────────────
  let groupHovered = false;

  btnEls.forEach(el => {
    el.addEventListener('mouseenter', () => {
      if (!catchable || groupHovered) return;
      groupHovered = true;
      animBtn([{ transform: 'scale(1.05)' }],
        { duration: 160, fill: 'forwards', easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' });
    });
    el.addEventListener('mouseleave', ev => {
      if (!catchable) return;
      if (btnEls.some(e => e === ev.relatedTarget || e.contains(ev.relatedTarget))) return;
      groupHovered = false;
      animBtn([{ transform: 'scale(1)' }],
        { duration: 180, fill: 'forwards', easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' });
    });

    el.addEventListener('click', ev => {
      if (!catchable || clicked) return;
      ev.stopPropagation();

      if (clicksOnCatchable === 0) {
        clicksOnCatchable = 1;
        const base = groupHovered ? 1.05 : 1.0;
        animBtn(
          [{ transform: `scale(${base})` }, { transform: 'scale(0.92)' }, { transform: 'scale(1.04)' }, { transform: `scale(${base})` }],
          { duration: 300, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
        );
        return;
      }

      clicked = true;
      if (Math.random() < 0.5) {
        const anim = animBtn(
          [{ transform: 'scale(1)' }, { transform: 'scale(0.82)', offset: 0.4 }, { transform: 'scale(1.08)', offset: 0.7 }, { transform: 'scale(1)' }],
          { duration: 400, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
        );
        anim.addEventListener('finish', () => window.OLS.navigate('ok'));
      } else {
        clicked           = false;
        catchable         = false;
        groupHovered      = false;
        clicksOnCatchable = 0;
        targetDx          = 0;
        dodgesLeft        = 5 + Math.floor(Math.random() * 6);
        lastDodgeMs       = 0;
        animBtn([{ transform: 'scale(1)' }], { duration: 200, fill: 'forwards' });
      }
    });
  });

  // ── Laugh Lottie overlay ──────────────────────────────────────────────────
  const VB       = { x: 625, y: 385, w: 690 };
  const lottieEl = document.getElementById('lottie-laugh');

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
    path:      '/anim/laugh.json',
  });

  let lottieReady  = false;
  let lottieActive = false;
  lottieAnim.addEventListener('DOMLoaded', () => { positionLottie(); lottieReady = true; });
  lottieAnim.addEventListener('complete',  () => {
    lottieActive = false;
    lottieEl.style.display = 'none';
  });
  window.addEventListener('resize', positionLottie);

  function playLaugh() {
    if (!lottieReady || lottieActive) return;
    lottieActive = true;
    lottieEl.style.display = 'block';
    lottieAnim.goToAndPlay(0, true);
  }

})();
