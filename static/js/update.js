(function () {
  'use strict';

  const svg = document.getElementById('Layer_1');

  // ── Eye tracking ──────────────────────────────────────────────────────────
  // Eye socket centers (approx SVG coords):
  // R eye: x≈1024, y≈345   L eye: x≈896, y≈345   mid: (960, 345)
  const pupilR = document.getElementById('update-pupil_x5F_R');
  const pupilL = document.getElementById('update-pupil_x5F_L');

  const LERP  = 0.1;
  const MAX_X = 22;
  const MAX_Y = 7;
  const MID_X = 960;
  const MID_Y = 345;

  const eyes = [
    { el: pupilR, curX: 0, curY: 0, targX: 0, targY: 0 },
    { el: pupilL, curX: 0, curY: 0, targX: 0, targY: 0 },
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
    if (dist < 0.5) { eyes.forEach(e => { e.targX = 0; e.targY = 0; }); return; }
    const t     = Math.min(dist / 280, 1);
    const angle = Math.atan2(dy, dx);
    eyes.forEach(e => {
      e.targX = Math.cos(angle) * MAX_X * t;
      e.targY = Math.sin(angle) * MAX_Y * t;
    });
  }

  document.addEventListener('mousemove', ev => {
    const p = toSVGCoords(ev.clientX, ev.clientY);
    setTargets(p.x, p.y);
  });

  function tick() {
    eyes.forEach(e => {
      e.curX += (e.targX - e.curX) * LERP;
      e.curY += (e.targY - e.curY) * LERP;
      e.el.setAttribute('transform',
        `translate(${e.curX.toFixed(2)},${e.curY.toFixed(2)})`);
    });
    requestAnimationFrame(tick);
  }
  tick();

  // ── Shared button helpers ─────────────────────────────────────────────────
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

  // ── RESTART NOW button ────────────────────────────────────────────────────
  const nowEls = [
    document.getElementById('update-now_x5F_button_x5F_fill'),
    document.getElementById('update-now_x5F_button_x5F_body'),
    document.getElementById('update-now_x5F_txt'),
  ].filter(Boolean);

  let nowHovered = false;

  nowEls.forEach(el => {
    el.addEventListener('mouseenter', () => { nowHovered = true;  hoverScale(nowEls, 1.05); });
    el.addEventListener('mouseleave', () => { nowHovered = false; hoverScale(nowEls, 1.0); });
    el.addEventListener('click', () => {
      pressButton(nowEls, nowHovered, () => { window.OLS.navigate('update'); });
    });
  });

  // ── RESTART LATER button ──────────────────────────────────────────────────
  // Brief: placeholder — same navigate for now, no final gag yet defined.
  const laterEls = [
    document.getElementById('update-later_x5F_button_x5F_body'),
    document.getElementById('update-later_x5F_txt'),
  ].filter(Boolean);

  let laterHovered = false;

  laterEls.forEach(el => {
    el.addEventListener('mouseenter', () => { laterHovered = true;  hoverScale(laterEls, 1.05); });
    el.addEventListener('mouseleave', () => { laterHovered = false; hoverScale(laterEls, 1.0); });
    el.addEventListener('click', () => {
      pressButton(laterEls, laterHovered, () => { window.OLS.navigate('update'); });
    });
  });

})();
