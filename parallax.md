# Parallax + spoločné interakcie — ONE LAST STEP

Tento súbor dokumentuje všetky vzory ktoré sa opakujú naprieč scénami.
Pri pisaní novej scény skopíruj čo treba odtiaľto.

---

## 1 — Parallax (floating 3D efekt)

### Princíp

Kurzor sa normalizuje na **-1 až +1** voči stredu obrazovky:

```javascript
pTargX = (ev.clientX / window.innerWidth  - 0.5) * 2;
pTargY = (ev.clientY / window.innerHeight - 0.5) * 2;
```

Hodnoty sa cez **lerp** plynulo sledujú — `P_LERP = 0.04` dáva Apple-like pomalosť:

```javascript
pCurX += (pTargX - pCurX) * P_LERP;
pCurY += (pTargY - pCurY) * P_LERP;
```

### Vrstvy

| Vrstva | Čo | Multiplikátor X | Multiplikátor Y | Typ |
|--------|-----|-----------------|-----------------|-----|
| 0 | `#window-wrapper` | `25` | `12` | CSS `px` |
| 2 | Texty, labely | `3` | `2` | SVG units |
| 3 | **Všetky interaktívne prvky** | `3.45` | `2.3` | SVG units |

**Pravidlo:** Layer 3 = Layer 2 × 1.15. Platí pre **všetko klikateľné** — buttony, toggle switche, checkboxy, akékoľvek interaktívne SVG elementy.

### Kód — do každej scény

```javascript
// ── Parallax ──────────────────────────────────────────────────────────────
const PARALLAX_SCALE = 1.0;  // 5.0 na testovanie, 1.0 na produkciu
const P_LERP         = 0.04;

let pCurX = 0, pCurY = 0;
let pTargX = 0, pTargY = 0;

document.addEventListener('mousemove', ev => {
  // ... ostatné mousemove veci (SVG coords pre eye tracking) ...
  pTargX = (ev.clientX / window.innerWidth  - 0.5) * 2;
  pTargY = (ev.clientY / window.innerHeight - 0.5) * 2;
});

// V tick():
pCurX += (pTargX - pCurX) * P_LERP;
pCurY += (pTargY - pCurY) * P_LERP;

// Layer 0 — wrapper (CSS px)
const wpX = pCurX * 25 * PARALLAX_SCALE;
const wpY = pCurY * 12 * PARALLAX_SCALE;
wrapper.style.transform = `translate(${wpX.toFixed(2)}px,${wpY.toFixed(2)}px)`;

// Layer 2 — texty (SVG units)
const tpX = pCurX * 3 * PARALLAX_SCALE;
const tpY = pCurY * 2 * PARALLAX_SCALE;
txtEl.setAttribute('transform', `translate(${tpX.toFixed(2)},${tpY.toFixed(2)})`);

// Layer 3 — interaktívne prvky (SVG units, 115% of Layer 2)
const bpX = pCurX * 3.45 * PARALLAX_SCALE;
const bpY = pCurY * 2.3  * PARALLAX_SCALE;
const bTf = `translate(${bpX.toFixed(2)},${bpY.toFixed(2)})`;
buttonEls.forEach(el => el.setAttribute('transform', bTf));
```

### Dôležité — SVG element nesmie dostať CSS transform

`svg.style.transform = ...` **ZAKÁZANÉ.** Rozbíja `toSVGCoords()` a eye tracking.
Parallax na wrapper funguje lebo wrapper je rodič SVG — pohybuje celým elementom.

### Toggle knob — Layer 4 (115% z Layer 3)

Toggle body je Layer 3. Toggle knob (swOn) je **Layer 4** — bližšie k divákovi, pohybuje sa viac.
Má dva pohyby naraz — slide offset z animácie + parallax. Musia sa sčítať:

```javascript
function updateKnob(t) {
  // Layer 4 = Layer 3 × 1.15
  const bpX = pCurX * 3.97 * PARALLAX_SCALE;   // 3.45 × 1.15
  const bpY = pCurY * 2.65 * PARALLAX_SCALE;   // 2.30 × 1.15
  t.swOn.setAttribute('transform',
    `translate(${(t.curX + bpX).toFixed(3)},${bpY.toFixed(3)})`);
}
```

---

## 2 — Box click squish

Klik kdekoľvek na SVG okno → celé okno sa jemne stlačí a vráti.
Animácia beží na `svg` elemente (nie `wrapper`) — wrapper má inline `style.transform` z parallaxu, Web Animations by ho prepísalo.

```javascript
svg.addEventListener('click', () => {
  svg.style.transformBox    = 'fill-box';
  svg.style.transformOrigin = 'center center';
  svg.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(0.988)', offset: 0.35 }, { transform: 'scale(1)' }],
    { duration: 200, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
  );
});
```

Intenzita: `scale(0.988)` = 1.2% stlačenie. Pôvodné `scale(0.94)` bolo príliš dramatické.

---

## 3 — Button hover + click animácia

Štandardný pattern pre každé tlačidlo (body + fill + txt elementy):

```javascript
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

// Použitie:
els.forEach(el => {
  el.addEventListener('mouseenter', () => { hovered = true;  hoverScale(els, 1.05); });
  el.addEventListener('mouseleave', () => { hovered = false; hoverScale(els, 1.00); });
  el.addEventListener('click', () => pressButton(els, hovered, () => window.OLS.navigate('...')));
});
```

---

## 4 — Eye tracking (getBBox)

Každá scéna má rovnaké eye tracking jadro. Parametre sa líšia len v ID elementov a `FOLLOW_DIST`.

```javascript
const EYE_INSET  = 0.18;   // ako ďaleko od okraja EYE sa môže pohybovať stred pupily
const FOLLOW_DIST = 350;   // SVG units — vzdialenosť kurzora pre plné vychýlenie

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
    minDX: ebb.x + ix - cx,          maxDX: ebb.x + ebb.width  - ix - cx,
    minDY: ebb.y + iy - cy,          maxDY: ebb.y + ebb.height - iy - cy,
    curX: 0, curY: 0, targX: 0, targY: 0,
  };
}
```

Lerp hodnoty: pravé oko `0.13`, ľavé `0.10` — mierne rôzne = prirodzenejší pohyb.

`FOLLOW_DIST = 250` pre kompaktnejšie tváre (cookies), `350` pre štandardné.

---

## 5 — Custom cursor (každá scéna)

Cursor sa musí načítať v **každej scéne** samostatne — nie len v loading.js.
Fetch obchádza agresívne cachovanie prehliadača cez data URI.

```javascript
fetch('/cursor/mys.svg?v=' + Date.now())
  .then(r => r.text())
  .then(text => {
    const uri = 'data:image/svg+xml,' + encodeURIComponent(text);
    document.body.style.cursor = `url("${uri}") 2 2, auto`;
  });
```

---

## 6 — Nastavenie intenzity parallaxu

```javascript
const PARALLAX_SCALE = 1.0;   // produkcia
// const PARALLAX_SCALE = 5.0; // testovanie — všetko 5× silnejšie
```

Jedna premenná škáluje všetky vrstvy naraz.
