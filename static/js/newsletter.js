(function () {
  'use strict';

  const svg     = document.getElementById('Layer_1');
  const wrapper = document.getElementById('window-wrapper');

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

  function initEyes() {
    eyes = [
      makeEye(
        document.getElementById('newsletter-eye_x5F_R'),
        document.getElementById('newsletter-pupil_x5F_R'),
        0.13
      ),
      makeEye(
        document.getElementById('newsletter-eye_x5F_L'),
        document.getElementById('newsletter-pupil_x5F_L'),
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

  const FOLLOW_DIST = 350;
  let midX = 0, midY = 0;

  let mousePt  = { x: 960, y: 260 };
  let glancePt = null;  // overrides mouse when set

  document.addEventListener('mousemove', ev => {
    mousePt = toSVGCoords(ev.clientX, ev.clientY);
  });

  function setTargets(pt) {
    if (!eyes) return;
    const dx    = pt.x - midX;
    const dy    = pt.y - midY;
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
    setTargets(glancePt || mousePt);
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

  // ── Periodic glances toward toggles ───────────────────────────────────────
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
  const TOGGLE_DX = 58;

  const TOGGLES = [
    {
      name:  'turnon',
      body:  document.getElementById('newsletter-turnon_x5F_toggle_x5F_body'),
      swOn:  document.getElementById('newsletter-turnon_x5F_toggle_x5F_switch_x5F_on'),
      swOff: document.getElementById('newsletter-turnon_x5F_toggle_x5F_switch_x5F_off'),
      isOn:  true,
      busy:  false,
    },
    {
      name:  'signup',
      body:  document.getElementById('newsletter-signup_x5F_toggle_x5F_body'),
      swOn:  document.getElementById('newsletter-signup_x5F_toggle_x5F_switch_x5F_on'),
      swOff: document.getElementById('newsletter-signup_x5F_toggle_x5F_switch_x5F_off'),
      isOn:  true,
      busy:  false,
    },
  ];

  let totalFlipsBack = 0;
  const MAX_FLIPS    = 3 + Math.floor(Math.random() * 2);

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
    glancePt = { x: pos.x, y: pos.y };
    setTimeout(() => { glancePt = null; }, 900);
  }

  function flipOff(toggle, done) {
    const { swOn, swOff } = toggle;
    swOff.style.display    = 'block';
    swOff.style.transition = 'opacity 0.18s ease';
    swOff.style.opacity    = '0';
    swOff.getBoundingClientRect(); // eslint-disable-line
    swOff.style.opacity = '1';
    animateSVGTranslateX(swOn, 0, -TOGGLE_DX, 200, () => {
      swOn.style.display = 'none';
      if (done) done();
    });
  }

  function flipOn(toggle, done) {
    const { swOn, swOff } = toggle;
    swOn.setAttribute('transform', `translate(${-TOGGLE_DX},0)`);
    swOn.style.display     = 'block';
    swOff.style.transition = 'opacity 0.18s ease';
    swOff.style.opacity    = '0';
    setTimeout(() => { swOff.style.display = 'none'; }, 190);
    animateSVGTranslateX(swOn, -TOGGLE_DX, 0, 200, () => {
      swOn.setAttribute('transform', 'translate(0,0)');
      if (done) done();
    });
  }

  function handleToggle(toggle) {
    if (toggle.busy) return;
    toggle.busy = true;

    if (toggle.isOn) {
      toggle.isOn = false;
      flipOff(toggle, () => {
        toggle.busy = false;
        if (totalFlipsBack < MAX_FLIPS) {
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
      toggle.isOn = true;
      flipOn(toggle, () => { toggle.busy = false; });
    }
  }

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
