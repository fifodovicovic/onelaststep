# ONE LAST STEP — Implementačný plán

Vytvorený: 2026-06-04  
Stav: V PROGRESE

---

## Prehľad úloh

| # | Scéna | Súbor | Typ | Stav |
|---|-------|-------|-----|------|
| 1 | loading | loading.js | Bugfix | ☐ |
| 2 | app.py | app.py | Config | ☐ |
| 3 | location | location.html + location.css + location.js | Nová scéna | ☐ |
| 4 | captcha | captcha.js | Rewrite | ☐ |
| 5 | update | update.js + update.html | Extend | ☐ |
| 6 | newsletter | newsletter.js + newsletter.html | Extend | ☐ |
| 7 | ok | ok.js | Extend | ☐ |

---

## 1 — LOADING: Fix mad face bug (2 riadky)

**Problém:** Po skončení out-animácie (frame 30→50) ostáva Lottie overlay viditeľný a SVG ústa zostanú schované navždy.

**Root cause:** V `startOutAnimation()` complete handler chýbajú 2 riadky.

**Fix v `loading.js` — funkcia `startOutAnimation()`:**
```javascript
lottieAnim.addEventListener('complete', () => {
  playingOut = false;
  recentlySpammed = false;
  lottieEl.style.display = 'none';       // ← TOTO CHÝBA
  if (mouth) mouth.style.display = '';   // ← TOTO CHÝBA
}, { once: true });
```

**Poznámka:** `mad_face_out.json` neexistuje a nikdy neexistoval — out segment sú frames 30–50 toho istého `mad_face.json`. Nie je to chyba v JSON, chyba je len v JS handleri.

---

## 2 — APP.PY: Location route + viewBox + LOOP_SCENES

**Zmeny:**
```python
# Pridaj do VIEWBOXES:
'location': '565 320 820 415',

# Oprav route /scene/location — načítaj SVG:
@app.route('/scene/location')
def scene_location():
    svg = load_svg('location.svg', viewbox=VIEWBOXES['location'])
    svg = inject_colors(svg, COLORS)
    return render_template('scenes/location.html', svg=svg)

# Pridaj 'location' do LOOP_SCENES (aj 'dead' a 'ok' treba):
LOOP_SCENES = ['loading', 'dead', 'ok', 'newsletter', 'cookies', 'captcha', 'update', 'location']
```

---

## 3 — LOCATION: Nová scéna

### SVG IDs (z location.svg)
```
#Layer_1                              — SVG root
#location-body                        — okno outline (klikateľné → body squish)
#location-allow_x5F_button_x5F_fill   — ALLOW fill (pink)
#location-allow_x5F_button_x5F_body   — ALLOW outline
#location-allow_x5F_txt               — ALLOW text
#location-block_x5F_txt               — BLOCK text (žiadna fill/body)
#location-dontshow_x5F_checkbox_x5F_body — checkbox outline
#location-dontshow_x5F_checkmark      — checkmark (skrytý, display:none)
#location-dontshow_x5F_txt            — "don't show this again" text
#location-eye_x5F_R / L              — biele plochy očí
#location-pupils_x5F_mask            — pupil mask group
#location-pupil_x5F_R / L           — zreničky
#location-txt                         — titulok
```

**BLOCK button nemá fill/body** — hover sa detekuje na `#location-block_x5F_txt`.

### location.html
- Extend base.html
- Loaduje location.css, Lottie CDN, location.js
- `#window-wrapper` obsahuje `{{ svg | safe }}`
- Dva Lottie divy: `#lottie-ruka-tu` (idle → ALLOW) + `#lottie-ruka-dontshow` (checkbox interaction)

### location.css
- `.window-wrapper { width: min(66vw, 620px); }`
- SVG: `width:100%; height:auto; display:block; overflow:visible;`
- Color overrides pre triedy st0–st8 (podľa vzoru update.css)
- Lottie overlay CSS: `display:none; position:absolute; overflow:hidden; pointer-events:none !important`
- Pupil groups: `transform-box:fill-box; transform-origin:50% 50%`
- Cursor classes: allow button, block txt, checkbox

### location.js — mechaniky

**Eye tracking:**  
Štandardný getBBox pattern. FOLLOW_DIST=350, lerp Right=0.13 Left=0.10, EYE_INSET=0.18.

**Parallax:**
- Wrapper: CSS `translate` (25/12 px)
- Layer 2 (txtEls = `#location-txt`, `#location-dontshow_x5F_txt`): SVG units (3/2)
- Layer 3 (allowEls + blockTxt + checkboxEls): SVG units (3.45/2.3)

**ALLOW button:**
- hover → scale(1.05), leave → scale(1.0)
- click → ev.stopPropagation(), pressButton → navigate
- resetIdleTimer() on mouseenter + click

**BLOCK button hover → scared eyes:**
- enterScaredMode(): pupils animate scale(1→0.55) + eyes.forEach → targY = minDY (hore)
- exitScaredMode(): pupils animate scale(0.55→1)
- click → exitScaredMode() + pressButton → navigate (rovnaký výsledok ako ALLOW — hostile design)
- resetIdleTimer() on mouseenter

**Body squish:**
- `#location-body` click → `wrapper.animate(scale 1→0.988→1, 200ms)`

**"Don't show this again" checkbox:**
- Click → toggle checkmark (scale pop-in animácia)
- Ak zaškrtnuté: po 500ms sa spustí `lottie-ruka-dontshow` (ruka_tu.json, ip=8, loop=false)
- Po dokončení Lottie: odškrtne checkbox + `.disabled` class na checkbox + txt (opacity 0.35, pointer-events:none)
- Toto je permanentné — checkbox nefunguje po disable

**ruka_tu idle (ukazuje na ALLOW):**
- `rukaTuEl.style.transform = 'scaleX(-1)'` — ruka ide z ĽAVEJ strany smerom doprava (na ALLOW)
- Trigger: 5000ms idle (žiadny mouseenter/click na žiadnom buttone)
- showRukaTu(): display block + lottieRukaTu.goToAndPlay(8, true) — loop:true
- hideRukaTu(): display none + lottieRukaTu.stop()
- resetIdleTimer() volať: pri init + mouseenter ALLOW + mouseenter BLOCK + mouseenter checkbox

**Lottie positioning formula (obe inštancie):**
```javascript
const VB = { x: 565, y: 320, w: 820 };
function positionLottie(el) {
  const scale = wrapper.offsetWidth / VB.w;
  el.style.width  = (1920 * scale) + 'px';
  el.style.height = (1080 * scale) + 'px';
  el.style.left   = (-VB.x * scale) + 'px';
  el.style.top    = (-VB.y * scale) + 'px';
}
```

---

## 4 — CAPTCHA: Rewrite

**Čo ostáva z pôvodného kódu:**
- `makeEye`, `initEyes`, `toSVGCoords` — ok, len zmeniť lerp hodnoty
- Checkbox interaction (failCount, FAILS_TO_PASS, checkmark pop-in/pop-out) — ok
- Odstrániť: červený `dot` placeholder

**Čo sa pridáva:**

### Parallax
- wrapper: CSS translate (25/12)
- `#captcha-uhuman_x5F_txt`: SVG translate (3/2)
- `#captcha-checkbox`: SVG translate (3.45/2.3)
- mousemove: pTargX/Y update (+ existujúci toSVGCoords pre myš)

### Eye lerp — zmena
```javascript
// Bol 0.13 / 0.10 — zmeníme na ultra-smooth paranoid:
Right eye lerp: 0.06
Left eye lerp:  0.04
```

### Paranoid eye state machine
```javascript
let eyeState = 'FOLLOW_MOUSE';
let forcedEyeTarget = null;  // {x, y} v SVG súradniciach, null = sleduj myš
let eyeStateTimer = null;

function scheduleNextState() {
  clearTimeout(eyeStateTimer);
  eyeStateTimer = setTimeout(pickNewState, 2000 + Math.random() * 3000);
}

function pickNewState() {
  // FOLLOW_MOUSE má dvojnásobnú váhu
  const pool = ['FOLLOW_MOUSE', 'FOLLOW_MOUSE', 'LOOK_LEFT', 'LOOK_RIGHT', 'LOOK_AT_VIEWER', 'LOOK_AT_CHECKBOX'];
  const next = pool[Math.floor(Math.random() * pool.length)];
  eyeState = next;

  if (next === 'LOOK_LEFT') {
    forcedEyeTarget = { x: midX - 700, y: midY };
    setTimeout(() => { forcedEyeTarget = null; eyeState = 'FOLLOW_MOUSE'; scheduleNextState(); }, 800 + Math.random() * 700);
    return;
  }
  if (next === 'LOOK_RIGHT') {
    forcedEyeTarget = { x: midX + 700, y: midY };
    setTimeout(() => { forcedEyeTarget = null; eyeState = 'FOLLOW_MOUSE'; scheduleNextState(); }, 800 + Math.random() * 700);
    return;
  }
  if (next === 'LOOK_AT_VIEWER') {
    forcedEyeTarget = { x: midX, y: midY + 180 };
    setTimeout(() => { forcedEyeTarget = null; eyeState = 'FOLLOW_MOUSE'; scheduleNextState(); }, 500 + Math.random() * 600);
    return;
  }
  if (next === 'LOOK_AT_CHECKBOX') {
    const cb = document.getElementById('captcha-checkbox');
    const bb = cb ? cb.getBBox() : null;
    if (bb) forcedEyeTarget = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
    setTimeout(() => { forcedEyeTarget = null; eyeState = 'FOLLOW_MOUSE'; scheduleNextState(); }, 400 + Math.random() * 400);
    return;
  }
  // FOLLOW_MOUSE
  forcedEyeTarget = null;
  scheduleNextState();
}
```

**V setTargets:** použiť `forcedEyeTarget` ak existuje, inak mouseX/mouseY.

### Body squish
```javascript
const bodyEl = document.getElementById('captcha-body');
bodyEl?.addEventListener('click', () => {
  wrapper.animate(
    [{ transform:'scale(1)' }, { transform:'scale(0.988)', offset:0.35 }, { transform:'scale(1)' }],
    { duration: 200, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
  );
});
```

### Checkbox squish — iba checkbox, nie wrapper
- Existujúci checkbox click handler: pridaj `ev.stopPropagation()` — click neprebubláva na body

### Tick() štruktúra
```
tick():
  1. parallax lerp
  2. wrapper translate
  3. uhuman_txt transform
  4. checkbox transform (vrátane aktuálnej hover scale)
  5. setTargets(forcedEyeTarget?.x ?? mouseX, forcedEyeTarget?.y ?? mouseY)
  6. eyes lerp + setAttribute
  7. requestAnimationFrame(tick)
```

---

## 5 — UPDATE: Extend

**Čo ostáva:** makeEye, initEyes, toSVGCoords, setTargets, hoverScale, pressButton, obe tlačidlá (hover + click).

**Čo sa pridáva:**

### Parallax
- wrapper: CSS translate (25/12) — použiť `style.translate` nie `style.transform` (kvôli budúcim scale animáciám)
- `#update-update_x5F_txt`: SVG translate (3/2)
- nowEls + laterEls: SVG translate (3.45/2.3) — **POZOR: tieto elementy už majú button scale animácie, translate musí byť súčasťou `applyBtnTransform()` nie priamo v tick()**

### Body squish
```javascript
const bodyEl = document.getElementById('update-body');
bodyEl?.addEventListener('click', () => {
  wrapper.animate([...], { duration:200, ... });
});
// + ev.stopPropagation() v nowEls a laterEls click handlers
```

### ruka_tu idle (ukazuje na NOW button)
- ruka_tu.json, ip=8, loop=true
- Trigger: 4000ms idle (žiadny click na žiadnom buttone)
- resetIdleTimer() pri init + mouseenter NOW + mouseenter LATER + každom click
- hideRukaTu() pred navigate v oboch buttonoch

### Eye roll na LATER klik
```javascript
let eyeRollActive = false;  // MUSÍ byť deklarovaný pred tick() volaním!

function triggerEyeRoll() {
  if (eyeRollActive || !eyes) return;
  eyeRollActive = true;
  eyes.forEach(e => { e.targX = e.minDX; e.targY = 0; });
  setTimeout(() => {
    eyes.forEach(e => { e.targX = e.maxDX; e.targY = 0; });
    setTimeout(() => { eyeRollActive = false; }, 320);
  }, 280);
}

// V LATER click: triggerEyeRoll() + pressButton → navigate
// V tick() setTargets: if (!eyeRollActive) setTargets(mouseX, mouseY);
```

### Button click zmeny
- NOW click → `window.location.href = '/scene/loading'` (vždy priamo na loading, nie cez navigate)
- LATER click → triggerEyeRoll() + hideRukaTu() + pressButton → window.OLS.navigate('update')

### update.html
Pridaj pred `</div>` (window-wrapper):
```html
<div id="lottie-ruka-tu" class="lottie-overlay"></div>
```
A Lottie CDN script do `{% block scripts %}`.

---

## 6 — NEWSLETTER: ruka_tu + eye roll

**Čo ostáva:** všetko existujúce.

**Čo sa pridáva:**

### ruka_tu idle (ukazuje na Continue button)
- Trigger: 5000ms bez kliknutia NA ŽIADNOM ELEMENTE, AK SÚ OBA TOGGLEY ON (t.isOn === true pre oba)
- `resetIdleTimer()` volať: pri každom toggle click + contEl click + pri init
- `showRukaTu()`: ak nie sú oba on → nespúšťaj, iba reschedule
- ruka_tu.json, ip=8, loop=true

**Lottie positioning:**
```javascript
const VB_HAND2 = { x: 600, y: 225, w: 720 };
```

### Eye roll na spam
- Trigger: 3+ kliknutia na HOCIJAKÝ button (toggle alebo continue) za 400ms
- Štandardný triggerEyeRoll() pattern (min → max → release, 280ms + 320ms)
- `eyeRollActive` deklarovať na TOP IIFE (pred tick())
- V tick() setTargets: `if (!eyeRollActive) setTargets(mousePt);`

### newsletter.html
Pridaj:
```html
<div id="lottie-ruka-tu" class="lottie-overlay"></div>
```

---

## 7 — OK: 2-click mechanic + whole-box dodge + fix body squish

### Fix body squish
Aktuálny kód animuje `svg` root — to je CHYBA (rozbíja toSVGCoords / eye tracking).

```javascript
// ZAMEŇ:
svg.addEventListener('click', () => { svg.animate(...) });

// ZA:
svg.addEventListener('click', () => {
  wrapper.animate(
    [{ transform:'scale(1)' }, { transform:'scale(0.988)', offset:0.35 }, { transform:'scale(1)' }],
    { duration:200, easing:'cubic-bezier(0.34,1.56,0.64,1)' }
  );
});
```

### 2-click state machine

**Nové premenné:**
```javascript
let clicksOnCatchable = 0;   // 0=nevykliknuté, 1=prvý klik done
let wholeBoxMode      = false;
let boxTargDx         = 0;
let boxFleeCurX       = 0;
const BOX_LERP        = 0.08;
```

**State flow:**
```
DODGING (dodgesLeft > 0):
  → button uteká od kurzora
  → 45% šanca smiech

CATCHABLE (dodgesLeft === 0, po 1200ms settle):
  → hover scale animácia povolená

1. KLIK (clicksOnCatchable === 0):
  → iba jiggle animácia (scale 1 → 0.92 → 1.04 → 1, 300ms)
  → clicksOnCatchable = 1

2. KLIK (clicksOnCatchable === 1):
  → 50%: navigate → koniec scény
  → 50%: reštart dodging:
         - 20%: wholeBoxMode = true (celý wrapper uteká)
         - 80%: normálny button-only flee
         - clicksOnCatchable = 0, catchable = false
         - dodgesLeft = 5 + rand(6)
```

**Whole-box mode v tick():**
```javascript
boxFleeCurX += (boxTargDx - boxFleeCurX) * BOX_LERP;
const wpX = pCurX * 25 * PARALLAX_SCALE + boxFleeCurX;
const wpY = pCurY * 12 * PARALLAX_SCALE;
wrapper.style.transform = `translate(${wpX.toFixed(2)}px,${wpY.toFixed(2)}px)`;
```

**flee() — rozdiel:**
```javascript
if (wholeBoxMode) {
  boxTargDx = dir * MAX_DX * fraction * 1.5;  // väčší pohyb
} else {
  targetDx = dir * MAX_DX * fraction;
}
```

**Proximity detection — wholeBoxMode používa wrapper nie btnBody:**
```javascript
const hitEl = wholeBoxMode ? wrapper : btnBody;
const br = hitEl.getBoundingClientRect();
const near = wholeBoxMode
  ? (ev.clientX >= br.left - 10 && ev.clientX <= br.right + 10
     && ev.clientY >= br.top  - 10 && ev.clientY <= br.bottom + 10)
  : (ev.clientX >= br.left - 5 && ev.clientX <= br.right + 5);
```

**Po vyčerpaní dodgesLeft v whole-box mode:**
```javascript
if (dodgesLeft === 0) {
  setTimeout(() => { if (wholeBoxMode) boxTargDx = 0; else targetDx = 0; }, 500);
  setTimeout(() => { catchable = true; wholeBoxMode = false; }, 1200);
}
```

---

## Architektonické pravidlá (nikdy nerozbij)

1. **Nikdy neanimuj SVG root** (`#Layer_1`) — rozbíja `toSVGCoords()`. Body squish vždy na `wrapper`.
2. **wrapper.style.translate vs style.transform** — newsletter + loading používajú `style.translate` (bezpečné vedľa `wrapper.animate({scale})`). ok + update môžu použiť `style.transform` ak nemajú scale animácie na wrapper.
3. **TDZ rule** — premenné referencované v `tick()` musia byť deklarované PRED `tick()` volaním (nie len pred definíciou).
4. **Cursor** — iba `scene-nav.js`, nikdy v scene JS súboroch.
5. **Navigation** — `window.OLS.navigate('scene-name')` okrem UPDATE NOW (priamo `/scene/loading`).
6. **Farby** — iba CSS premenné `var(--c-bg/fill/outline)`, nikdy hardcoded hex v CSS.
7. **ev.stopPropagation()** — každý button click handler, aby neprebubblal na body squish.

---

## Assets (všetky dostupné)

```
assety/anim/ruka_tu.json    — ip:8, op:100, 30fps — pointing hand, loop
assety/anim/ruka_kyv.json   — ip:16, op:97, 30fps — waving hand (nevyužitý v tomto plane)
assety/location.svg         — location scene SVG
```

---

## Postup implementácie

Implementovať v tomto poradí (každý krok je nezávislý a testovateľný):

1. ☐ `loading.js` — 2 riadky fix
2. ☐ `app.py` — location route + viewBox + LOOP_SCENES
3. ☐ `templates/scenes/location.html` + `static/css/location.css`
4. ☐ `static/js/location.js`
5. ☐ `static/js/captcha.js`
6. ☐ `static/js/update.js` + `templates/scenes/update.html`
7. ☐ `static/js/newsletter.js` + `templates/scenes/newsletter.html`
8. ☐ `static/js/ok.js`
