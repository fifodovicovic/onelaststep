(function () {
  'use strict';

  const svg = document.getElementById('Layer_1');

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

  const FOLLOW_DIST = 350;
  let midX = 0, midY = 0;

  function initEyes() {
    eyes = [
      makeEye(
        document.getElementById('update-eye_x5F_R'),
        document.getElementById('update-pupil_x5F_R'),
        0.13
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

  let mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', ev => {
    const p = toSVGCoords(ev.clientX, ev.clientY);
    mouseX = p.x;
    mouseY = p.y;
  });

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

  function tick() {
    setTargets(mouseX, mouseY);
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
