(function () {
  'use strict';

  // ── Scenes that participate in the main random loop ──────────────────────
  // loading→dead→ok is a fixed sub-sequence; loading enters here as one unit.
  // dead and ok are always reached through that sub-sequence, not directly.
  const LOOP_SCENES = ['loading', 'dead', 'ok', 'newsletter', 'cookies', 'captcha', 'update', 'location'];

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

  // Returns the URL of the next scene. Builds/manages a shuffled queue so
  // the same scene doesn't repeat consecutively.
  window.OLS = window.OLS || {};

  window.OLS.nextScene = function (currentScene) {
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

  // ── Shared cursor loader — called once per page ───────────────────────────
  window.OLS.loadCursor = function () {
    fetch('/cursor/mys.svg?v=' + Date.now())
      .then(function (r) { return r.text(); })
      .then(function (svgText) {
        var uri = 'data:image/svg+xml,' + encodeURIComponent(svgText);
        document.body.style.cursor = 'url("' + uri + '") 2 2, auto';
      });
  };

  // Auto-load cursor for every page that includes this script
  document.addEventListener('DOMContentLoaded', window.OLS.loadCursor);

})();
