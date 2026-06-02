(function () {
  'use strict';

  // ── Scenes that participate in the main loop ──────────────────────────────
  const LOOP_SCENES = ['loading', 'dead', 'ok', 'newsletter', 'cookies', 'captcha', 'update', 'location'];

  // ── DEBUG: set true for sequential 1–8 order, false for random ───────────
  const DEBUG_SEQUENTIAL = true;

  function getQueue() {
    try { return JSON.parse(sessionStorage.getItem('ols_queue') || '[]'); } catch (e) { return []; }
  }

  function setQueue(q) {
    try { sessionStorage.setItem('ols_queue', JSON.stringify(q)); } catch (e) {}
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  window.OLS = window.OLS || {};

  window.OLS.nextScene = function (currentScene) {
    if (DEBUG_SEQUENTIAL) {
      const idx  = LOOP_SCENES.indexOf(currentScene);
      const next = LOOP_SCENES[(idx + 1) % LOOP_SCENES.length];
      return '/scene/' + next;
    }
    // Random shuffled queue — never repeats consecutively
    let queue = getQueue().filter(s => s !== currentScene);
    if (queue.length === 0) {
      queue = shuffle(LOOP_SCENES).filter(s => s !== currentScene);
    }
    const next = queue.shift();
    setQueue(queue);
    return '/scene/' + next;
  };

  window.OLS.navigate = function (currentScene) {
    window.location.href = window.OLS.nextScene(currentScene);
  };

  // ── Space bar — skip immediately to next scene ────────────────────────────
  document.addEventListener('keydown', function (ev) {
    if (ev.code === 'Space' || ev.key === ' ') {
      ev.preventDefault();
      const match = window.location.pathname.match(/\/scene\/([^/]+)/);
      const currentScene = match ? match[1] : '';
      window.OLS.navigate(currentScene);
    }
  });

  // ── Shared cursor loader — called once per page ───────────────────────────
  // Injects a <style> with !important so the custom cursor is ALWAYS shown —
  // even when the browser would normally switch to the native pointer cursor
  // on interactive elements (SVG shapes with cursor:pointer, buttons, etc.).
  window.OLS.loadCursor = function () {
    fetch('/cursor/mys.svg?v=' + Date.now())
      .then(function (r) { return r.text(); })
      .then(function (svgText) {
        var uri = 'data:image/svg+xml,' + encodeURIComponent(svgText);
        var rule = 'url("' + uri + '") 2 2, auto';

        // Apply to body (fallback)
        document.body.style.cursor = rule;

        // Inject global override so no element can revert to native pointer
        var style = document.getElementById('ols-cursor-override');
        if (!style) {
          style = document.createElement('style');
          style.id = 'ols-cursor-override';
          document.head.appendChild(style);
        }
        style.textContent = '*, *::before, *::after { cursor: ' + rule + ' !important; }';
      });
  };

  // Auto-load cursor for every page that includes this script
  document.addEventListener('DOMContentLoaded', window.OLS.loadCursor);

})();
