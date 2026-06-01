(function () {
  'use strict';

  // ── Location scene — placeholder until location.svg is ready ─────────────
  // Brief: permission scene, fake memory/"DON'T SHOW THIS AGAIN" betrayal.
  // SVG asset not yet available. HTML placeholder used instead.

  const btnAllow     = document.getElementById('loc-allow');
  const btnBlock     = document.getElementById('loc-block');
  const btnDontShow  = document.getElementById('loc-dontshow');

  // ALLOW → proceed
  if (btnAllow) {
    btnAllow.addEventListener('click', () => {
      window.OLS.navigate('location');
    });
  }

  // BLOCK → hostile: do nothing visually meaningful, loop back anyway
  if (btnBlock) {
    btnBlock.addEventListener('click', () => {
      // Shake the button to signal refusal
      btnBlock.animate(
        [{ transform: 'translateX(0)' },
         { transform: 'translateX(-8px)' },
         { transform: 'translateX(8px)' },
         { transform: 'translateX(-6px)' },
         { transform: 'translateX(6px)' },
         { transform: 'translateX(0)' }],
        { duration: 320, easing: 'ease-in-out' }
      );
    });
  }

  // "DON'T SHOW THIS AGAIN" — betrayal: shows this again anyway (navigate)
  if (btnDontShow) {
    btnDontShow.addEventListener('click', () => {
      window.OLS.navigate('location');
    });
  }

})();
