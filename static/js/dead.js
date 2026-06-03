(function () {
  'use strict';

  const wrapper  = document.getElementById('window-wrapper');
  const lottieEl = document.getElementById('lottie-dead');

  // ViewBox for dead scene: "625 400 690 260"
  const VB = { x: 625, y: 400, w: 690 };

  // Random clicks needed to wake up (3–10, set once per page load)
  const CLICKS_TO_WAKE = 3 + Math.floor(Math.random() * 8);
  let reloadClicks  = 0;
  let reloadEnabled = false;
  let busy          = false;

  // ── Parallax ─────────────────────────────────────────────────────────────
  const P_LERP = 0.06;
  let pCurX = 0, pCurY = 0, pTargX = 0, pTargY = 0;

  document.addEventListener('mousemove', ev => {
    pTargX = (ev.clientX / window.innerWidth  - 0.5) * 2;
    pTargY = (ev.clientY / window.innerHeight - 0.5) * 2;
  });

  (function tick() {
    pCurX += (pTargX - pCurX) * P_LERP;
    pCurY += (pTargY - pCurY) * P_LERP;
    wrapper.style.translate = `${(pCurX * 20).toFixed(2)}px ${(pCurY * 11).toFixed(2)}px`;
    requestAnimationFrame(tick);
  })();

  // ── Lottie setup ─────────────────────────────────────────────────────────
  function positionLottie() {
    const scale           = wrapper.offsetWidth / VB.w;
    lottieEl.style.width  = (1920 * scale) + 'px';
    lottieEl.style.height = (1080 * scale) + 'px';
    lottieEl.style.left   = (-VB.x * scale) + 'px';
    lottieEl.style.top    = (-VB.y * scale) + 'px';
  }
  window.addEventListener('resize', positionLottie);

  const lottieAnim = lottie.loadAnimation({
    container: lottieEl,
    renderer:  'svg',
    loop:      false,
    autoplay:  false,
    path:      '/anim/dead.json',
  });

  // ── State machine ─────────────────────────────────────────────────────────

  function popIn() {
    wrapper.getAnimations().forEach(a => a.cancel());
    wrapper.animate(
      [
        { scale: '0.06', opacity: '0' },
        { scale: '1.08', opacity: '1', offset: 0.65 },
        { scale: '1',    opacity: '1' },
      ],
      { duration: 420, easing: 'ease-out', fill: 'forwards' }
    ).addEventListener('finish', die);
  }

  function die() {
    busy = true;
    disableReload();
    lottieEl.style.display = 'block';
    lottieAnim.setDirection(1);
    lottieAnim.setSpeed(1);
    lottieAnim.goToAndPlay(0, true);
    lottieAnim.addEventListener('complete', onDeathComplete, { once: true });
  }

  function onDeathComplete() {
    busy         = false;
    reloadClicks = 0;
    enableReload();
  }

  function wakeUp() {
    busy = true;
    disableReload();
    lottieAnim.setDirection(-1);
    lottieAnim.setSpeed(2);   // 2× rýchlejšie
    lottieAnim.goToAndPlay(lottieAnim.totalFrames - 1, true);
    lottieAnim.addEventListener('complete', onWakeComplete, { once: true });
  }

  function onWakeComplete() {
    // Okno zmizne
    wrapper.getAnimations().forEach(a => a.cancel());
    wrapper.animate(
      [
        { scale: '1',    opacity: '1' },
        { scale: '0.06', opacity: '0' },
      ],
      { duration: 300, easing: 'ease-in', fill: 'forwards' }
    ).addEventListener('finish', () => {
      if (Math.random() < 0.3) {
        // 30 % šanca: celé sa zopakuje
        setTimeout(startOver, 260);
      } else {
        setTimeout(() => window.OLS.navigate('dead'), 300);
      }
    });
  }

  function startOver() {
    busy          = false;
    reloadEnabled = false;
    reloadClicks  = 0;
    lottieEl.style.display = 'none';
    lottieAnim.setSpeed(1);
    lottieAnim.goToAndStop(0, true);
    popIn();
  }

  // ── RELOAD button + text ──────────────────────────────────────────────────
  const btnBody = document.getElementById('dead-button_x5F_body');
  const btnFill = document.getElementById('dead-button_x5F_fill');
  const btnTxt  = document.getElementById('dead-TXT_x5F_RELOAD');
  const btnEls  = [btnBody, btnFill, btnTxt].filter(Boolean);
  let btnHovered = false;

  function enableReload() {
    reloadEnabled = true;
    btnEls.forEach(el => { el.style.cursor = 'pointer'; });
  }

  function disableReload() {
    reloadEnabled = false;
    btnEls.forEach(el => { el.style.cursor = 'default'; });
  }

  function hoverBtn(to) {
    btnEls.forEach(el => {
      el.style.transformBox    = 'fill-box';
      el.style.transformOrigin = '50% 50%';
      el.animate(
        [{ transform: `scale(${to})` }],
        { duration: 160, fill: 'forwards', easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
      );
    });
  }

  function pressBtn() {
    const base = btnHovered ? 1.06 : 1.0;
    btnEls.forEach(el => {
      el.style.transformBox    = 'fill-box';
      el.style.transformOrigin = '50% 50%';
      el.animate(
        [{ transform: `scale(${base})` },
         { transform: 'scale(0.88)', offset: 0.35 },
         { transform: `scale(${base})` }],
        { duration: 240, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
      );
    });
  }

  function onReloadClick(ev) {
    ev.stopPropagation();
    if (!reloadEnabled || busy) return;
    reloadClicks++;
    pressBtn();
    if (reloadClicks >= CLICKS_TO_WAKE) wakeUp();
  }

  btnEls.forEach(el => {
    el.addEventListener('mouseenter', () => { if (!btnHovered) { btnHovered = true;  if (reloadEnabled) hoverBtn(1.06); } });
    el.addEventListener('mouseleave', () => { btnHovered = false; hoverBtn(1.0); });
    el.addEventListener('click', onReloadClick);
  });

  // ── Body klik — celý window box reaguje ───────────────────────────────────
  wrapper.addEventListener('click', () => {
    if (busy) return;
    wrapper.animate(
      [
        { scale: '1' },
        { scale: '0.965', offset: 0.3 },
        { scale: '1' },
      ],
      { duration: 200, easing: 'ease-out' }
    );
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  // opacity: 0 je nastavené v CSS — wrapper je skrytý od prvého renderu
  lottieEl.style.display = 'none';

  lottieAnim.addEventListener('DOMLoaded', () => {
    positionLottie();
    setTimeout(popIn, 120);
  });

})();
