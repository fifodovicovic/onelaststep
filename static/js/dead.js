(function () {
  'use strict';

  const container = document.getElementById('layers-container');

  // ViewBox for Lottie positioning: "625 400 690 260"
  const VB = { x: 625, y: 400, w: 690 };

  // Total windows to spawn (3–6), including the initial one
  const totalWindows = 3 + Math.floor(Math.random() * 4);
  let windowsCreated = 1; // layer-0 already in HTML

  let layers        = [];
  let animRunning   = false;
  let reloadEnabled = false;

  // Fixed offset per layer index: -60 px left, +60 px down
  const STEP_X   = -60;
  const STEP_Y   =  60;
  const SLIDE_PX =  40; // how far each window slides down after its animation

  // ── Lottie positioning ────────────────────────────────────────────────────

  function positionLottie(layer) {
    const scale           = layer.wrapper.offsetWidth / VB.w;
    layer.lottieEl.style.width  = (1920 * scale) + 'px';
    layer.lottieEl.style.height = (1080 * scale) + 'px';
    layer.lottieEl.style.left   = (-VB.x * scale) + 'px';
    layer.lottieEl.style.top    = (-VB.y * scale) + 'px';
  }

  window.addEventListener('resize', () => layers.forEach(positionLottie));

  // ── Play animation forward or reverse on a layer ──────────────────────────

  function playLayerAnim(layer, direction, onComplete) {
    if (animRunning) return;
    animRunning = true;

    const { lottieAnim, lottieEl } = layer;

    function onFinish() {
      lottieAnim.removeEventListener('complete', onFinish);
      lottieEl.style.display = 'none';
      animRunning = false;
      if (onComplete) onComplete();
    }

    function doPlay() {
      lottieEl.style.display = 'block';
      lottieAnim.addEventListener('complete', onFinish);
      if (direction === 1) {
        lottieAnim.setDirection(1);
        lottieAnim.goToAndPlay(0, true);
      } else {
        lottieAnim.setDirection(-1);
        lottieAnim.goToAndPlay(lottieAnim.totalFrames - 1, true);
      }
    }

    if (layer.lottieReady) {
      doPlay();
    } else {
      lottieAnim.addEventListener('DOMLoaded', doPlay);
    }
  }

  // ── Slide layer down by SLIDE_PX ──────────────────────────────────────────

  function slideLayerDown(layer, onComplete) {
    layer.slideY += SLIDE_PX;
    layer.wrapper.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    layer.wrapper.style.transform  =
      `translate(${layer.baseX}px, ${layer.baseY + layer.slideY}px)`;

    setTimeout(() => {
      layer.wrapper.style.transition = '';
      if (onComplete) onComplete();
    }, 560);
  }

  // ── Spawn the next window ─────────────────────────────────────────────────

  function spawnNext() {
    if (windowsCreated >= totalWindows) {
      reloadEnabled = true;
      return;
    }

    const idx = windowsCreated; // 1, 2, 3 …
    windowsCreated++;

    const ox = STEP_X * idx;
    const oy = STEP_Y * idx;

    const layer = makeLayer(ox, oy);
    layers.push(layer);
    attachClickHandler(layer);

    setTimeout(() => {
      playLayerAnim(layer, 1, () => {
        slideLayerDown(layer, spawnNext);
      });
    }, 180);
  }

  // ── Create a new absolute-positioned layer (clones base SVG) ─────────────

  function makeLayer(offsetX, offsetY) {
    const clonedSVG = document.querySelector('#layer-0 svg').cloneNode(true);

    const lottieDiv = document.createElement('div');
    lottieDiv.className = 'lottie-overlay';

    const wrapper = document.createElement('div');
    wrapper.className = 'dead-layer absolute-layer';
    wrapper.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

    wrapper.appendChild(clonedSVG);
    wrapper.appendChild(lottieDiv);
    container.appendChild(wrapper);

    const lottieAnim = lottie.loadAnimation({
      container: lottieDiv,
      renderer:  'svg',
      loop:      false,
      autoplay:  false,
      path:      '/anim/dead.json',
    });

    const layer = {
      wrapper,
      svg:         clonedSVG,
      lottieEl:    lottieDiv,
      lottieAnim,
      lottieReady: false,
      baseX:       offsetX,
      baseY:       offsetY,
      slideY:      0,
      active:      true,
    };

    lottieAnim.addEventListener('DOMLoaded', () => {
      positionLottie(layer);
      layer.lottieReady = true;
    });

    return layer;
  }

  // ── RELOAD button click handler ───────────────────────────────────────────

  function attachClickHandler(layer) {
    const btnBody = layer.svg.querySelector('#dead-button_x5F_body');
    const btnFill = layer.svg.querySelector('#dead-button_x5F_fill');

    function onBtnClick(ev) {
      ev.stopPropagation();

      // Always squish the SVG visually
      layer.svg.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(0.93)', offset: 0.35 },
          { transform: 'scale(1)' },
        ],
        { duration: 280, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
      );

      if (!reloadEnabled || animRunning || !layer.active) return;
      layer.active = false;

      playLayerAnim(layer, -1, () => {
        // Slide up + fade out
        layer.wrapper.style.transition =
          'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.38s ease';
        layer.wrapper.style.transform =
          `translate(${layer.baseX}px, ${layer.baseY + layer.slideY - 50}px)`;
        layer.wrapper.style.opacity = '0';

        setTimeout(() => {
          layer.wrapper.remove();
          layers = layers.filter(l => l !== layer);

          if (layers.length === 0) {
            setTimeout(() => { window.location.href = '/scene/ok'; }, 400);
          }
        }, 500);
      });
    }

    if (btnBody) { btnBody.style.cursor = 'pointer'; btnBody.addEventListener('click', onBtnClick); }
    if (btnFill) { btnFill.style.cursor = 'pointer'; btnFill.addEventListener('click', onBtnClick); }
  }

  // ── Bootstrap: wire up layer-0 (already in HTML) ─────────────────────────

  const layer0 = {
    wrapper:     document.getElementById('layer-0'),
    svg:         document.querySelector('#layer-0 svg'),
    lottieEl:    document.getElementById('lottie-dead-0'),
    lottieAnim:  null,
    lottieReady: false,
    baseX:       0,
    baseY:       0,
    slideY:      0,
    active:      true,
  };
  layers.push(layer0);

  layer0.lottieAnim = lottie.loadAnimation({
    container: layer0.lottieEl,
    renderer:  'svg',
    loop:      false,
    autoplay:  false,
    path:      '/anim/dead.json',
  });

  layer0.lottieAnim.addEventListener('DOMLoaded', () => {
    positionLottie(layer0);
    layer0.lottieReady = true;

    playLayerAnim(layer0, 1, () => {
      slideLayerDown(layer0, spawnNext);
    });
  });

  attachClickHandler(layer0);

  // ── Custom cursor ─────────────────────────────────────────────────────────
  fetch('/cursor/mys.svg?v=' + Date.now())
    .then(r => r.text())
    .then(text => {
      const uri = 'data:image/svg+xml,' + encodeURIComponent(text);
      document.body.style.cursor = `url("${uri}") 2 2, auto`;
    });

})();
