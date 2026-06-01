(function () {
  'use strict';

  const svg = document.getElementById('Layer_1');

  // ── Eye tracking ──────────────────────────────────────────────────────────
  // Eye socket centers (approx SVG coords):
  // R eye: x≈1024, y≈448   L eye: x≈896, y≈448   mid: (960, 448)
  const pupilR = document.getElementById('captcha-pupil_x5F_R');
  const pupilL = document.getElementById('captcha-pupil_x5F_L');

  const LERP  = 0.1;
  const MAX_X = 22;
  const MAX_Y = 7;
  const MID_X = 960;
  const MID_Y = 448;

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

  // ── Checkbox interaction ──────────────────────────────────────────────────
  // Brief: suspicion / mistrust — placeholder behaviour.
  // Checkbox click shows checkmark, then "fails" after a moment.
  // After enough fails, allow passage.
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
    // Hover polish
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

      // Press squish
      checkbox.style.transformBox    = 'fill-box';
      checkbox.style.transformOrigin = '50% 50%';
      checkbox.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(0.9)', offset: 0.3 }, { transform: 'scale(1)' }],
        { duration: 220, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
      );

      // Show checkmark briefly
      if (checkmark) {
        checkmark.style.display = 'block';
        checkmark.animate(
          [{ opacity: 0, transform: 'scale(0.3)' }, { opacity: 1, transform: 'scale(1)' }],
          { duration: 200, fill: 'forwards' }
        );
      }

      failCount++;

      if (failCount >= FAILS_TO_PASS) {
        // Pass — navigate after checkmark settles
        setTimeout(() => { window.OLS.navigate('captcha'); }, 600);
        return;
      }

      // Fail — hide checkmark after short pause, show suspicion dot
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
