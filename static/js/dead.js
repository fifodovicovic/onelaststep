(function () {
  'use strict';

  const wrapper  = document.getElementById('window-wrapper');
  const lottieEl = document.getElementById('lottie-dead');

  // ViewBox for dead scene: "625 400 690 260"
  const VB = { x: 625, y: 400, w: 690 };

  // How many times window dies before navigating away (2–5)
  const MAX_DEATHS = 2 + Math.floor(Math.random() * 4);
  let deathCount   = 0;
  let busy         = false;

  // ── Scale-in pop on entry ─────────────────────────────────────────────────
  wrapper.style.transformBox    = 'fill-box';
  wrapper.style.transformOrigin = '50% 50%';
  wrapper.style.opacity = '0';
  wrapper.animate(
    [
      { transform: 'scale(0.08)', opacity: 0 },
      { transform: 'scale(1.07)', opacity: 1, offset: 0.65 },
      { transform: 'scale(1)',    opacity: 1 },
    ],
    { duration: 440, easing: 'ease-out', fill: 'forwards' }
  );

  // ── Lottie setup ──────────────────────────────────────────────────────────
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

  lottieAnim.addEventListener('DOMLoaded', () => {
    positionLottie();
    // Start dying immediately after entry pop
    setTimeout(die, 360);
  });

  // ── State machine ─────────────────────────────────────────────────────────

  function die() {
    if (busy) return;
    busy = true;
    deathCount++;
    disableReload();

    lottieEl.style.display = 'block';
    lottieAnim.setDirection(1);
    lottieAnim.goToAndPlay(0, true);

    lottieAnim.addEventListener('complete', onDeathComplete, { once: true });
  }

  function onDeathComplete() {
    // Frozen on last frame — character is dead. Enable RELOAD.
    busy = false;
    enableReload();
  }

  function revive() {
    busy = true;
    disableReload();

    lottieAnim.setDirection(-1);
    lottieAnim.goToAndPlay(lottieAnim.totalFrames - 1, true);

    lottieAnim.addEventListener('complete', onReviveComplete, { once: true });
  }

  function onReviveComplete() {
    // Frozen on frame 0 — character is "alive".
    busy = false;

    if (deathCount >= MAX_DEATHS) {
      // Done — navigate after a beat
      setTimeout(() => { window.OLS.navigate('dead'); }, 480);
      return;
    }

    // Look around for 0.3–2 s, then die again
    const lookTime = 300 + Math.random() * 1700;
    setTimeout(die, lookTime);
  }

  // ── RELOAD button ─────────────────────────────────────────────────────────
  const btnBody = document.getElementById('dead-button_x5F_body');
  const btnFill = document.getElementById('dead-button_x5F_fill');
  let reloadEnabled = false;

  function enableReload() {
    reloadEnabled = true;
    [btnBody, btnFill].forEach(el => { if (el) el.style.cursor = 'pointer'; });
  }

  function disableReload() {
    reloadEnabled = false;
    [btnBody, btnFill].forEach(el => { if (el) el.style.cursor = 'default'; });
  }

  function onReloadClick(ev) {
    ev.stopPropagation();
    if (!reloadEnabled || busy) return;

    // Squish the whole wrapper
    wrapper.style.transformBox    = 'fill-box';
    wrapper.style.transformOrigin = '50% 50%';
    const anim = wrapper.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(0.93)', offset: 0.35 },
        { transform: 'scale(1)' },
      ],
      { duration: 260, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
    );

    anim.addEventListener('finish', revive, { once: true });
  }

  // Hover polish on RELOAD button
  function hoverReload(scale) {
    [btnBody, btnFill].forEach(el => {
      if (!el) return;
      el.style.transformBox    = 'fill-box';
      el.style.transformOrigin = '50% 50%';
      el.animate(
        [{ transform: `scale(${scale})` }],
        { duration: 160, fill: 'forwards', easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
      );
    });
  }

  [btnBody, btnFill].forEach(el => {
    if (!el) return;
    el.addEventListener('mouseenter', () => { if (reloadEnabled) hoverReload(1.05); });
    el.addEventListener('mouseleave', () => { hoverReload(1.0); });
    el.addEventListener('click', onReloadClick);
  });

})();
