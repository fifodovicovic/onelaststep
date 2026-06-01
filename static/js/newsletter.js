(function () {
  'use strict';

  const svg     = document.getElementById('Layer_1');
  const wrapper = document.getElementById('window-wrapper');

  // ── Eye tracking ──────────────────────────────────────────────────────────
  const pupilL = document.getElementById('newsletter-pupil_x5F_L');
  const pupilR = document.getElementById('newsletter-pupil_x5F_R');

  const LERP  = 0.1;
  const MAX_X = 28;
  const MAX_Y = 8;
  const MID_X = 970;   // midpoint between both eye centers (SVG units)
  const MID_Y = 257;

  const eyes = [
    { el: pupilL, curX: 0, curY: 0, targX: 0, targY: 0 },
    { el: pupilR, curX: 0, curY: 0, targX: 0, targY: 0 },
  ];

  let mousePt  = { x: MID_X, y: MID_Y };
  let glancePt = null;  // overrides mouse when set

  function toSVGCoords(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const vb   = svg.viewBox.baseVal;
    return {
      x: vb.x + (clientX - rect.left) * (vb.width  / rect.width),
      y: vb.y + (clientY - rect.top)  * (vb.height / rect.height),
    };
  }

  function setTargets(pt) {
    const dx   = pt.x - MID_X;
    const dy   = pt.y - MID_Y;
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
    mousePt = toSVGCoords(ev.clientX, ev.clientY);
  });

  function tick() {
    setTargets(glancePt || mousePt);
    eyes.forEach(e => {
      e.curX += (e.targX - e.curX) * LERP;
      e.curY += (e.targY - e.curY) * LERP;
      e.el.setAttribute('transform',
        `translate(${e.curX.toFixed(2)},${e.curY.toFixed(2)})`);
    });
    requestAnimationFrame(tick);
  }
  tick();

  // ── Periodic glances toward toggles ───────────────────────────────────────
  // Toggle centers in SVG coordinates (approx)
  const GLANCE_TARGETS = [
    { x: 1179, y: 551 },  // turnon toggle
    { x: 1179, y: 393 },  // signup toggle
  ];

  function scheduleGlance() {
    setTimeout(() => {
      const pt = GLANCE_TARGETS[Math.floor(Math.random() * GLANCE_TARGETS.length)];
      glancePt = pt;
      setTimeout(() => { glancePt = null; scheduleGlance(); }, 650 + Math.random() * 450);
    }, 2500 + Math.random() * 4000);
  }
  scheduleGlance();

  // ── Toggle switches ───────────────────────────────────────────────────────
  // The ON switch element is the pink one at the right position.
  // The OFF switch element is the white one at the left position.
  // TOGGLE_DX: x distance in SVG units from OFF position to ON position.
  const TOGGLE_DX = 58;

  const TOGGLES = [
    {
      name:     'turnon',
      body:     document.getElementById('newsletter-turnon_x5F_toggle_x5F_body'),
      swOn:     document.getElementById('newsletter-turnon_x5F_toggle_x5F_switch_x5F_on'),
      swOff:    document.getElementById('newsletter-turnon_x5F_toggle_x5F_switch_x5F_off'),
      isOn:     true,
      busy:     false,
    },
    {
      name:     'signup',
      body:     document.getElementById('newsletter-signup_x5F_toggle_x5F_body'),
      swOn:     document.getElementById('newsletter-signup_x5F_toggle_x5F_switch_x5F_on'),
      swOff:    document.getElementById('newsletter-signup_x5F_toggle_x5F_switch_x5F_off'),
      isOn:     true,
      busy:     false,
    },
  ];

  // Total system flip-backs before giving up (per the brief: 3–4 times)
  let totalFlipsBack = 0;
  const MAX_FLIPS    = 3 + Math.floor(Math.random() * 2);

  // ── rAF-based SVG translate animation ────────────────────────────────────
  function animateSVGTranslateX(el, fromX, toX, duration, done) {
    const t0 = performance.now();
    function frame(ts) {
      const progress = Math.min((ts - t0) / duration, 1);
      const ease     = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;
      el.setAttribute('transform', `translate(${(fromX + (toX - fromX) * ease).toFixed(3)},0)`);
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else if (done) {
        done();
      }
    }
    requestAnimationFrame(frame);
  }

  // ── Red circle placeholder: stands in for the hand animation ─────────────
  // Blue = JSON animation in the PDF. Hand JSON not yet available.
  const handDot = (function () {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('r', '16');
    c.setAttribute('fill', 'red');
    c.setAttribute('pointer-events', 'none');
    c.style.opacity = '0';
    svg.appendChild(c);
    return c;
  }());

  const HAND_POSITIONS = {
    turnon: { x: 1230, y: 551 },
    signup: { x: 1230, y: 393 },
  };

  function showHandDot(name) {
    const pos = HAND_POSITIONS[name];
    handDot.setAttribute('cx', pos.x);
    handDot.setAttribute('cy', pos.y);
    handDot.animate(
      [{ opacity: 0 }, { opacity: 0.9, offset: 0.2 }, { opacity: 0 }],
      { duration: 700, easing: 'ease-in-out' }
    );
    // Eyes glance at the toggle while "hand" acts
    glancePt = { x: pos.x, y: pos.y };
    setTimeout(() => { glancePt = null; }, 900);
  }

  // ── Flip toggle to OFF ────────────────────────────────────────────────────
  function flipOff(toggle, done) {
    const { swOn, swOff } = toggle;

    // Reveal swOff at left position, faded out
    swOff.style.display   = 'block';
    swOff.style.transition = 'opacity 0.18s ease';
    swOff.style.opacity   = '0';
    // Force reflow
    swOff.getBoundingClientRect(); // eslint-disable-line
    swOff.style.opacity = '1';

    // Slide swOn from right (0) to left (-TOGGLE_DX)
    animateSVGTranslateX(swOn, 0, -TOGGLE_DX, 200, () => {
      swOn.style.display = 'none';
      if (done) done();
    });
  }

  // ── Flip toggle to ON ─────────────────────────────────────────────────────
  function flipOn(toggle, done) {
    const { swOn, swOff } = toggle;

    // Position swOn at left, hidden
    swOn.setAttribute('transform', `translate(${-TOGGLE_DX},0)`);
    swOn.style.display = 'block';

    // Fade swOff out
    swOff.style.transition = 'opacity 0.18s ease';
    swOff.style.opacity    = '0';
    setTimeout(() => { swOff.style.display = 'none'; }, 190);

    // Slide swOn from left (-TOGGLE_DX) to right (0)
    animateSVGTranslateX(swOn, -TOGGLE_DX, 0, 200, () => {
      swOn.setAttribute('transform', 'translate(0,0)');
      if (done) done();
    });
  }

  // ── Toggle click handler ──────────────────────────────────────────────────
  function handleToggle(toggle) {
    if (toggle.busy) return;
    toggle.busy = true;

    if (toggle.isOn) {
      // User turns OFF
      toggle.isOn = false;
      flipOff(toggle, () => {
        toggle.busy = false;

        if (totalFlipsBack < MAX_FLIPS) {
          // System fights back: flip back ON after short delay
          const delay = 550 + Math.random() * 500;
          setTimeout(() => {
            if (!toggle.isOn && !toggle.busy) {
              toggle.busy = true;
              totalFlipsBack++;
              showHandDot(toggle.name);
              setTimeout(() => {
                toggle.isOn = true;
                flipOn(toggle, () => { toggle.busy = false; });
              }, 250);
            }
          }, delay);
        }
      });

    } else {
      // User turns ON
      toggle.isOn = true;
      flipOn(toggle, () => { toggle.busy = false; });
    }
  }

  // ── Initialise toggle state: both ON, swOff hidden ────────────────────────
  TOGGLES.forEach(t => {
    if (t.swOff) t.swOff.style.display = 'none';
    [t.body, t.swOn, t.swOff].forEach(el => {
      if (el) el.addEventListener('click', () => handleToggle(t));
    });
  });

  // ── CONTINUE button ───────────────────────────────────────────────────────
  const contEls = [
    document.getElementById('newsletter-continue_x5F_button_x5F_body'),
    document.getElementById('newsletter-continue_x5F_button_x5F_fill'),
    document.getElementById('newsletter-continue_x5F_txt'),
  ].filter(Boolean);

  let contHovered = false;

  function animContScale(to, dur) {
    contEls.forEach(el => {
      el.style.transformBox    = 'fill-box';
      el.style.transformOrigin = '50% 50%';
      el.animate(
        [{ transform: `scale(${to})` }],
        { duration: dur, fill: 'forwards', easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' }
      );
    });
  }

  contEls.forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('mouseenter', () => { contHovered = true;  animContScale(1.05, 180); });
    el.addEventListener('mouseleave', () => { contHovered = false; animContScale(1.00, 200); });
    el.addEventListener('click', () => {
      const base = contHovered ? 1.05 : 1.0;
      contEls.forEach(e => {
        e.style.transformBox    = 'fill-box';
        e.style.transformOrigin = '50% 50%';
        e.animate(
          [{ transform: `scale(${base})` },
           { transform: 'scale(0.92)', offset: 0.35 },
           { transform: `scale(${base})` }],
          { duration: 260, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
        );
      });
      setTimeout(() => window.OLS.navigate('newsletter'), 300);
    });
  });

})();
