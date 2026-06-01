(function () {
  'use strict';

  const svg     = document.getElementById('Layer_1');
  const wrapper = document.getElementById('window-wrapper');

  // ── Eye tracking ──────────────────────────────────────────────────────────
  // Cookie face eyes are at approx SVG coords (on the cookie character):
  // R eye center: (730, 528)  L eye center: (636, 528)  mid: (683, 528)
  const pupilR = document.getElementById('cookies-pupil_x5F_R');
  const pupilL = document.getElementById('cookies-pupil_x5F_L');

  const LERP  = 0.1;
  const MAX_X = 14;
  const MAX_Y = 5;
  const MID_X = 683;
  const MID_Y = 528;

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
    const t     = Math.min(dist / 200, 1);
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

  // ── Red-circle placeholder — stands in for smile/angry/headshake Lottie ──
  // Blue = JSON animation in design PDF. Assets not yet available.
  const placeholder = (function () {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('r', '20');
    c.setAttribute('fill', 'red');
    c.setAttribute('pointer-events', 'none');
    c.style.opacity = '0';
    svg.appendChild(c);
    return c;
  }());

  function showPlaceholder(cx, cy) {
    placeholder.setAttribute('cx', cx);
    placeholder.setAttribute('cy', cy);
    placeholder.animate(
      [{ opacity: 0 }, { opacity: 0.9, offset: 0.15 }, { opacity: 0 }],
      { duration: 800, easing: 'ease-in-out' }
    );
  }

  // ── Cookie face elements (hide on DENY) ────────────────────────────────────
  const cookieFace = [
    document.getElementById('cookies-cookie'),
    document.getElementById('cookies-cookie_x5F_chocolate'),
    document.getElementById('cookies-eye_x5F_R'),
    document.getElementById('cookies-eye_x5F_L'),
    document.getElementById('cookies-pupils_x5F_mask'),
  ].filter(Boolean);

  let faceVisible = true;
  let denyCount   = 0;

  function hideFace() {
    faceVisible = false;
    cookieFace.forEach(el => { el.style.transition = 'opacity 0.3s ease'; el.style.opacity = '0'; });
  }

  function showFace() {
    faceVisible = true;
    cookieFace.forEach(el => { el.style.opacity = '1'; });
  }

  // ── Shared button press helper ─────────────────────────────────────────────
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

  // ── ACCEPT button ─────────────────────────────────────────────────────────
  const acceptEls = [
    document.getElementById('cookies-accept_x5F_button_x5F_fill'),
    document.getElementById('cookies-accept_x5F_button_x5F_body'),
    document.getElementById('cookies-accept_x5F_txt'),
  ].filter(Boolean);

  let acceptHovered = false;

  acceptEls.forEach(el => {
    el.addEventListener('mouseenter', () => {
      acceptHovered = true;
      hoverScale(acceptEls, 1.05);
      // Smile placeholder at cookie mouth area (approx SVG center of cookie face)
      showPlaceholder(680, 570);
    });
    el.addEventListener('mouseleave', () => {
      acceptHovered = false;
      hoverScale(acceptEls, 1.0);
    });
    el.addEventListener('click', () => {
      pressButton(acceptEls, acceptHovered, () => {
        window.OLS.navigate('cookies');
      });
    });
  });

  // ── DENY button ───────────────────────────────────────────────────────────
  const denyEls = [
    document.getElementById('cookies-deny_x5F_button_x5F_body'),
    document.getElementById('cookies-deny_x5F_txt'),
  ].filter(Boolean);

  let denyHovered = false;

  denyEls.forEach(el => {
    el.addEventListener('mouseenter', () => {
      denyHovered = true;
      hoverScale(denyEls, 1.05);
      // Angry placeholder at cookie face
      showPlaceholder(680, 540);
    });
    el.addEventListener('mouseleave', () => {
      denyHovered = false;
      hoverScale(denyEls, 1.0);
    });
    el.addEventListener('click', () => {
      denyCount++;
      pressButton(denyEls, denyHovered);

      // Hide face, show headshake placeholder
      hideFace();
      showPlaceholder(680, 528);

      // After headshake, show face again
      setTimeout(showFace, 1200);
    });
  });

})();
