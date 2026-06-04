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
        0.06
      ),
      makeEye(
        document.getElementById('captcha--eye_x5F_L'),
        document.getElementById('captcha-pupil_x5F_L'),
        0.04
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

  // ── Paranoid eye state machine ────────────────────────────────────────────
  let forcedEyeTarget = null;
  let eyeStateTimer   = null;

  function scheduleNextState() {
    clearTimeout(eyeStateTimer);
    eyeStateTimer = setTimeout(pickNewState, 2000 + Math.random() * 3000);
  }

  function pickNewState() {
    const pool = ['FOLLOW_MOUSE', 'FOLLOW_MOUSE', 'LOOK_LEFT', 'LOOK_RIGHT', 'LOOK_AT_VIEWER', 'LOOK_AT_CHECKBOX'];
    const next = pool[Math.floor(Math.random() * pool.length)];

    if (next === 'LOOK_LEFT') {
      forcedEyeTarget = { x: midX - 700, y: midY };
      setTimeout(() => { forcedEyeTarget = null; scheduleNextState(); }, 800 + Math.random() * 700);
      return;
    }
    if (next === 'LOOK_RIGHT') {
      forcedEyeTarget = { x: midX + 700, y: midY };
      setTimeout(() => { forcedEyeTarget = null; scheduleNextState(); }, 800 + Math.random() * 700);
      return;
    }
    if (next === 'LOOK_AT_VIEWER') {
      forcedEyeTarget = { x: midX, y: midY + 180 };
      setTimeout(() => { forcedEyeTarget = null; scheduleNextState(); }, 500 + Math.random() * 600);
      return;
    }
    if (next === 'LOOK_AT_CHECKBOX') {
      const cb = document.getElementById('captcha-checkbox');
      if (cb) {
        const bb = cb.getBBox();
        forcedEyeTarget = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
      }
      setTimeout(() => { forcedEyeTarget = null; scheduleNextState(); }, 400 + Math.random() * 400);
      return;
    }
    // FOLLOW_MOUSE
    forcedEyeTarget = null;
    scheduleNextState();
  }

  // ── Parallax ──────────────────────────────────────────────────────────────
  const PARALLAX_SCALE = 1.0;
  const P_LERP         = 0.04;
  let pCurX = 0, pCurY = 0, pTargX = 0, pTargY = 0;
  let mouseX = 0, mouseY = 0;

  const uhuman = document.getElementById('captcha-uhuman_x5F_txt');
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

    const tx = forcedEyeTarget ? forcedEyeTarget.x : mouseX;
    const ty = forcedEyeTarget ? forcedEyeTarget.y : mouseY;
    setTargets(tx, ty);

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
  scheduleNextState();
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

  // ── Checkbox interaction ──────────────────────────────────────────────────
  const checkmark   = document.getElementById('captcha-dontshow_x5F_checkmark');
  let failCount     = 0;
  const FAILS_TO_PASS = 3 + Math.floor(Math.random() * 3);
  let busy = false;

  if (checkbox) {
    checkbox.addEventListener('mouseenter', () => {
      checkbox.style.transformBox    = 'fill-box';
      checkbox.style.transformOrigin = '50% 50%';
      checkbox.animate([{ transform: 'scale(1.06)' }],
        { duration: 160, fill: 'forwards', easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' });
    });
    checkbox.addEventListener('mouseleave', () => {
      checkbox.animate([{ transform: 'scale(1)' }],
        { duration: 180, fill: 'forwards', easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' });
    });
    checkbox.addEventListener('click', ev => {
      ev.stopPropagation();
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
        setTimeout(() => window.OLS.navigate('captcha'), 600);
        return;
      }

      setTimeout(() => {
        if (checkmark) {
          checkmark.animate([{ opacity: 1 }, { opacity: 0 }],
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
