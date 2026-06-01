(function () {
  'use strict';

  const svg     = document.getElementById('Layer_1');
  const wrapper = document.getElementById('window-wrapper');

  // ── Eye tracking ──────────────────────────────────────────────────────────
  const pupilL = document.getElementById('ok-pupil_x5F_L');
  const pupilR = document.getElementById('ok-pupil_x5F_R');

  const LERP  = 0.1;
  const MAX_X = 30;
  const MAX_Y = 7;
  const MID_X = 960;
  const MID_Y = 428;

  const eyes = [
    { el: pupilL, curX: 0, curY: 0, targX: 0, targY: 0 },
    { el: pupilR, curX: 0, curY: 0, targX: 0, targY: 0 },
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
    const dx   = mx - MID_X;
    const dy   = my - MID_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.5) {
      eyes.forEach(e => { e.targX = 0; e.targY = 0; });
      return;
    }
    const t     = Math.min(dist / 280, 1);
    const angle = Math.atan2(dy, dx);
    eyes.forEach(e => {
      e.targX = Math.cos(angle) * MAX_X * t;
      e.targY = Math.sin(angle) * MAX_Y * t;
    });
  }

  document.addEventListener('mousemove', ev => {
    const pos = toSVGCoords(ev.clientX, ev.clientY);
    setTargets(pos.x, pos.y);
  });

  // ── OK button X-only dodge ────────────────────────────────────────────────
  const btnBody = document.getElementById('ok-button_x5F_body');
  const btnFill = document.getElementById('ok-button_x5F_fill');
  const btnTxt  = document.getElementById('ok-ok_x5F_txt');

  // 5–10 dodges before button becomes catchable
  let dodgesLeft  = 5 + Math.floor(Math.random() * 6);
  let targetDx    = 0;   // SVG user-unit X offset target
  let curDx       = 0;   // lerped current offset
  let lastDodgeMs = 0;
  const BTN_LERP  = 0.08; // leisurely smooth movement
  const MAX_DX    = 200;  // SVG unit range left/right

  function applyBtnTransform() {
    curDx += (targetDx - curDx) * BTN_LERP;
    const t = `translate(${curDx.toFixed(2)},0)`;
    if (btnBody) btnBody.setAttribute('transform', t);
    if (btnFill) btnFill.setAttribute('transform', t);
    if (btnTxt)  btnTxt.setAttribute('transform', t);
  }

  // ── Animation loop — eyes + button lerp ──────────────────────────────────
  // Declared here so all let/const vars above are initialised before first call.
  function tick() {
    eyes.forEach(e => {
      e.curX += (e.targX - e.curX) * LERP;
      e.curY += (e.targY - e.curY) * LERP;
      e.el.setAttribute('transform',
        `translate(${e.curX.toFixed(2)},${e.curY.toFixed(2)})`);
    });
    applyBtnTransform();
    requestAnimationFrame(tick);
  }
  tick();

  function dodge() {
    let newDx, attempts = 0;
    do {
      newDx    = (Math.random() - 0.5) * 2 * MAX_DX;
      attempts++;
    } while (Math.abs(newDx - targetDx) < 60 && attempts < 12);

    targetDx = newDx;

    if (Math.random() < 0.6) playLaugh();
  }

  function tryDodge() {
    const now = Date.now();
    if (dodgesLeft > 0 && now - lastDodgeMs > 350) {
      dodgesLeft--;
      lastDodgeMs = now;
      dodge();
    }
  }

  [btnBody, btnFill].forEach(el => {
    if (el) el.addEventListener('mouseenter', tryDodge);
  });

  // ── Click: squish + navigate (only when catchable) ────────────────────────
  [btnBody, btnFill].forEach(el => {
    if (el) el.addEventListener('click', ev => {
      if (dodgesLeft > 0) return; // still dodging

      ev.stopPropagation();

      // Squish animation on the whole SVG window
      svg.style.transformBox    = 'fill-box';
      svg.style.transformOrigin = 'center center';
      const anim = svg.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(0.93)', offset: 0.35 },
          { transform: 'scale(1)' },
        ],
        { duration: 280, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
      );
      anim.addEventListener('finish', () => {
        window.location.href = '/scene/loading';
      });
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

  // ── Custom cursor ─────────────────────────────────────────────────────────
  fetch('/cursor/mys.svg?v=' + Date.now())
    .then(r => r.text())
    .then(text => {
      const uri = 'data:image/svg+xml,' + encodeURIComponent(text);
      document.body.style.cursor = `url("${uri}") 2 2, auto`;
    });

})();
