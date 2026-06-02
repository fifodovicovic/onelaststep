(function () {
  'use strict';

  const svg = document.getElementById('Layer_1');

  // ── Eye tracking — getBBox approach ───────────────────────────────────────
  // Each pupil moves to the closest point to the cursor within its own EYE shape.
  // getBBox() reads actual DOM geometry — zero hardcoded coordinates.
  // Note: captcha SVG has a double-dash on the left eye ID (captcha--eye_x5F_L).

  let eyes = null;

  // How much to shrink the EYE boundary inward on each side (0 = full range, 0.5 = no movement).
  // Tune this to taste — 0.18 keeps pupils clearly inside the eye white.
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

  // Cursor must travel this many SVG units from eye midpoint to reach full displacement.
  // Higher = wider response zone, more gradual. Lower = snappier.
  const FOLLOW_DIST = 350;

  let midX = 0, midY = 0;

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

  // ── Checkbox interaction ──────────────────────────────────────────────────
  const checkbox  = document.getElementById('captcha-checkbox');
  const checkmark = document.getElementById('captcha-dontshow_x5F_checkmark');

  let failCount = 0;
  const FAILS_TO_PASS = 3 + Math.floor(Math.random() * 3); // 3–5 fails then proceed
  let busy = false;

  // Placeholder: red dot where a "suspicion" reaction animation would appear
  const dot = (function () {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('r', '16');
    c.setAttribute('fill', 'red');
    c.setAttribute('pointer-events', 'none');
    c.setAttribute('cx', '1200');
    c.setAttribute('cy', '520');
    c.style.opacity = '0';
    svg.appendChild(c);
    return c;
  }());

  function showDot() {
    dot.animate(
      [{ opacity: 0 }, { opacity: 0.85, offset: 0.2 }, { opacity: 0 }],
      { duration: 700, easing: 'ease-in-out' }
    );
  }

  if (checkbox) {
    checkbox.addEventListener('mouseenter', () => {
      checkbox.style.transformBox    = 'fill-box';
      checkbox.style.transformOrigin = '50% 50%';
      checkbox.animate(
        [{ transform: 'scale(1.06)' }],
        { duration: 160, fill: 'forwards', easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' }
      );
    });
    checkbox.addEventListener('mouseleave', () => {
      checkbox.animate(
        [{ transform: 'scale(1)' }],
        { duration: 180, fill: 'forwards', easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' }
      );
    });

    checkbox.addEventListener('click', () => {
      if (busy) return;
      busy = true;

      checkbox.style.transformBox    = 'fill-box';
      checkbox.style.transformOrigin = '50% 50%';
      checkbox.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(0.9)', offset: 0.3 }, { transform: 'scale(1)' }],
        { duration: 220, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
      );

      if (checkmark) {
        checkmark.style.display = 'block';
        checkmark.animate(
          [{ opacity: 0, transform: 'scale(0.3)' }, { opacity: 1, transform: 'scale(1)' }],
          { duration: 200, fill: 'forwards' }
        );
      }

      failCount++;

      if (failCount >= FAILS_TO_PASS) {
        setTimeout(() => { window.OLS.navigate('captcha'); }, 600);
        return;
      }

      setTimeout(() => {
        showDot();
        if (checkmark) {
          checkmark.animate(
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 300, easing: 'ease-in', fill: 'forwards' }
          ).addEventListener('finish', () => {
            checkmark.style.display = 'none';
            busy = false;
          });
        } else {
          busy = false;
        }
      }, 800);
    });
  }

})();
