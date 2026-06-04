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
        document.getElementById('captcha-eye_x5F_R'),
        document.getElementById('captcha-pupil_x5F_R'),
        0.13
      ),
      makeEye(
        document.getElementById('captcha--eye_x5F_L'),
        document.getElementById('captcha-pupil_x5F_L'),
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

  const uhuman   = document.getElementById('captcha-uhuman_x5F_txt');
  const checkbox = document.getElementById('captcha-checkbox');

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
    eyes.forEach(e => {
      const tx = ux * (ux >= 0 ? e.maxDX : -e.minDX);
      const ty = uy * (uy >= 0 ? e.maxDY : -e.minDY);
      e.targX  = Math.max(e.minDX, Math.min(e.maxDX, tx));
      e.targY  = Math.max(e.minDY, Math.min(e.maxDY, ty));
    });
  }

  let eyeLookOverride = null;

  // ── Tick ──────────────────────────────────────────────────────────────────
  function tick() {
    pCurX += (pTargX - pCurX) * P_LERP;
    pCurY += (pTargY - pCurY) * P_LERP;

    const wpX = pCurX * 25 * PARALLAX_SCALE;
    const wpY = pCurY * 12 * PARALLAX_SCALE;
    wrapper.style.translate = `${wpX.toFixed(2)}px ${wpY.toFixed(2)}px`;

    if (uhuman) {
      const tpX = pCurX * 3 * PARALLAX_SCALE;
      const tpY = pCurY * 2 * PARALLAX_SCALE;
      uhuman.setAttribute('transform', `translate(${tpX.toFixed(2)},${tpY.toFixed(2)})`);
    }

    if (checkbox) {
      const bpX = pCurX * 3.45 * PARALLAX_SCALE;
      const bpY = pCurY * 2.3  * PARALLAX_SCALE;
      checkbox.setAttribute('transform', `translate(${bpX.toFixed(2)},${bpY.toFixed(2)})`);
    }

    if (eyeLookOverride) {
      setTargets(eyeLookOverride.x, eyeLookOverride.y);
    } else {
      setTargets(mouseX, mouseY);
    }

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

  // ── Body squish ───────────────────────────────────────────────────────────
  const bodyEl = document.getElementById('captcha-body');
  if (bodyEl) {
    bodyEl.addEventListener('click', () => {
      wrapper.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(0.988)', offset: 0.35 }, { transform: 'scale(1)' }],
        { duration: 200, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
      );
    });
  }

  // ── Checkmark ─────────────────────────────────────────────────────────────
  const checkmark = document.getElementById('captcha-dontshow_x5F_checkmark');
  let isChecked   = false;

  function showCheckmark() {
    if (!checkmark) return;
    checkmark.getAnimations().forEach(a => a.cancel());
    checkmark.style.display = 'block';
    checkmark.style.opacity = '1';
    checkmark.animate(
      [{ transform: 'scale(0.3)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }],
      { duration: 220, easing: 'cubic-bezier(0.34,1.56,0.64,1)', fill: 'forwards' }
    );
  }

  function hideCheckmark() {
    if (!checkmark) return;
    checkmark.getAnimations().forEach(a => a.cancel());
    checkmark.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(0)' }],
      { duration: 150, easing: 'ease-in', fill: 'forwards' }
    ).addEventListener('finish', () => { checkmark.style.display = 'none'; });
  }

  // ── Hand Lottie (rukatoggle) ──────────────────────────────────────────────
  const VB_CAPTCHA   = { x: 608, y: 425, w: 695 };
  const lottieHandEl = document.getElementById('lottie-hand');
  let lottieHandReady    = false;
  let lottieHandAnim     = null;
  let handTimer          = null;
  let navigateOnComplete = false;
  let failCount          = 0;
  const FAILS_TO_PASS    = 2 + Math.floor(Math.random() * 4); // 2–5

  function randomHandDelay() {
    return 500 + Math.random() * 2000; // 500–2500ms
  }

  function positionLottieHand() {
    if (!lottieHandEl) return;
    const scale = wrapper.offsetWidth / VB_CAPTCHA.w;
    lottieHandEl.style.width  = (1920 * scale) + 'px';
    lottieHandEl.style.height = (1080 * scale) + 'px';
    lottieHandEl.style.left   = (-VB_CAPTCHA.x * scale) + 'px';
    // ruka 20px vyššie oproti pôvodnému (199 → offset -20px)
    lottieHandEl.style.top    = ((-VB_CAPTCHA.y + 199) * scale - 20) + 'px';
  }

  function playHand() {
    if (!lottieHandReady || !lottieHandEl) return;
    lottieHandEl.style.display = 'block';
    lottieHandAnim.goToAndPlay(5, true);

    // Fajka sa trochu pohne keď ruka "dosiahne" na ňu (~350ms po štarte)
    if (isChecked && checkmark) {
      setTimeout(() => {
        if (!isChecked || !checkmark) return;
        checkmark.animate(
          [
            { transform: 'scale(1) rotate(0deg)' },
            { transform: 'scale(0.82) rotate(-10deg)' },
            { transform: 'scale(1.08) rotate(5deg)' },
            { transform: 'scale(1) rotate(0deg)' },
          ],
          { duration: 400, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
        );
      }, 350);
    }
  }

  if (lottieHandEl) {
    lottieHandAnim = lottie.loadAnimation({
      container: lottieHandEl,
      renderer: 'svg', loop: false, autoplay: false,
      path: '/anim/rukatoggle.json',
    });
    lottieHandAnim.addEventListener('DOMLoaded', () => { positionLottieHand(); lottieHandReady = true; });
    lottieHandAnim.addEventListener('complete', () => {
      lottieHandEl.style.display = 'none';
      failCount++;
      if (failCount >= FAILS_TO_PASS) navigateOnComplete = true;

      if (isChecked && checkmark) {
        // Fajka sa zmenší a zmizne
        isChecked = false;
        checkmark.getAnimations().forEach(a => a.cancel());
        const shrink = checkmark.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(0)' }],
          { duration: 90, easing: 'ease-in', fill: 'forwards' }
        );
        if (navigateOnComplete) {
          navigateOnComplete = false;
          shrink.addEventListener('finish', () => {
            checkmark.style.display = 'none';
            setTimeout(() => window.OLS.navigate('captcha'), 120);
          });
        } else {
          shrink.addEventListener('finish', () => { checkmark.style.display = 'none'; });
        }
      } else if (navigateOnComplete) {
        navigateOnComplete = false;
        setTimeout(() => window.OLS.navigate('captcha'), 350);
      }
    });
    window.addEventListener('resize', positionLottieHand);
  }

  // ── Checkbox interaction ──────────────────────────────────────────────────
  if (checkbox) {
    checkbox.style.transformBox    = 'fill-box';
    checkbox.style.transformOrigin = '50% 50%';

    checkbox.addEventListener('mouseenter', () => {
      checkbox.animate([{ transform: 'scale(1.06)' }],
        { duration: 160, fill: 'forwards', easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' });
    });
    checkbox.addEventListener('mouseleave', () => {
      checkbox.animate([{ transform: 'scale(1)' }],
        { duration: 180, fill: 'forwards', easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' });
    });

    checkbox.addEventListener('click', ev => {
      ev.stopPropagation();

      // Toggle stav
      isChecked = !isChecked;

      // Checkbox bounce
      checkbox.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(0.9)', offset: 0.3 }, { transform: 'scale(1)' }],
        { duration: 220, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
      );

      // Oči sa pozrú na checkbox
      const bbr = checkbox.getBoundingClientRect();
      eyeLookOverride = toSVGCoords(bbr.left + bbr.width / 2, bbr.top + bbr.height / 2);
      setTimeout(() => { eyeLookOverride = null; }, 1200);

      // Fajka instantne
      if (isChecked) {
        showCheckmark();
      } else {
        hideCheckmark();
      }

      // Posledný klik — žiadna ruka, rovno koniec (BAM)
      if (navigateOnComplete && isChecked) {
        clearTimeout(handTimer);
        navigateOnComplete = false;
        setTimeout(() => window.OLS.navigate('captcha'), 80);
        return;
      }

      // Ruka príde po náhodnom čase 500–2500ms (reset timera ak klikneš znova)
      clearTimeout(handTimer);
      handTimer = setTimeout(playHand, randomHandDelay());
    });
  }

})();
