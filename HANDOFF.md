# ONE LAST STEP — Handoff Document (updated 2026-06-04, rev 2)

Interactive gallery web installation. Hostile interface — loops the visitor through annoying popups. Built in Flask with inline SVGs. Every scene is a separate HTML page.

**Start server:**
```
cd /Users/fifo/CLAUDE/hku_design_project
lsof -ti :5001 | xargs kill -9 2>/dev/null; .venv/bin/python app.py
# → http://127.0.0.1:5001/scene/loading
```
Port 5001 (5000 is taken by macOS AirPlay).

---

## Scene status

| Scene | Route | Status | Kľúčové mechaniky |
|-------|-------|--------|-------------------|
| loading | `/scene/loading` | ✅ | Parallax, oči sledujú bar, reversal, mad face Lottie (in/hold/out fixed), navigate on complete |
| dead | `/scene/dead` | ✅ | Pop-in, parallax, die/wake Lottie, 3–10 RELOAD kliknutí, 30% repeat |
| ok | `/scene/ok` | ✅ | 2-click mechanic, 20% whole-box mode, laugh Lottie |
| newsletter | `/scene/newsletter` | ✅ | Parallax, toggles, rukatoggle Lottie, eye roll spam — BEZ ruka_tu idle |
| cookies | `/scene/cookies` | ✅ | Parallax, oči s bias/glance, sad/no Lottie, ruka_tu idle |
| captcha | `/scene/captcha` | ✅ | Parallax, simple eye tracking, body squish, rukatoggle hand→checkbox, checkmark fade |
| update | `/scene/update` | ✅ | Parallax, body squish, ruka_tu in/hold/out, eye roll LATER, NOW→vždy /loading, per-eye tracking |
| checkbox | `/scene/checkbox` | ✅ | Demo scene, nie v main loop |

**Nav loop** (`DEBUG_SEQUENTIAL=true` v scene-nav.js):
`loading → dead → ok → newsletter → cookies → captcha → update → (repeat)`

Zmeniť na random: `DEBUG_SEQUENTIAL = false` v `scene-nav.js`.

---

## Architektúra — NIKDY neporušuj

### SVG transform (KRITICKÉ)
**Nikdy neanimuj `<svg>` root** — rozbíja `toSVGCoords()` (eye tracking). Parallax a squish animácie IDÚ NA `#window-wrapper` (HTML div), nie na SVG.

```javascript
// SPRÁVNE — body squish
wrapper.animate([{ transform:'scale(1)' }, { transform:'scale(0.988)',offset:0.35 }, { transform:'scale(1)' }],
  { duration:200, easing:'cubic-bezier(0.34,1.56,0.64,1)' });

// CHYBA — nikdy toto
svg.animate([...]);
```

### Parallax conflict rule
- `wrapper.style.translate` + `wrapper.animate({scale})` = **SAFE** (rôzne CSS properties)
- `wrapper.style.transform` + `wrapper.animate({transform})` = **CONFLICT** (teleport bug)

Scény s body squish animáciami musia používať `style.translate` pre parallax:
- loading, dead, newsletter, captcha, update: `style.translate` ✓
- cookies, ok: `style.transform` — OK (nemajú scale animácie na wrapper)

### TDZ rule
Premenné referencované v `tick()` musia byť deklarované **PRED volaním tick()**, nielen pred definíciou. `tick()` sa volá synchrónne v IIFE.

```javascript
let eyeRollActive = false;  // ← MUSÍ byť pred tick()
function tick() { ... if (!eyeRollActive) setTargets(...); ... }
tick();  // ← tu sa spustí
```

### Navigácia
```javascript
window.OLS.navigate('scene-name');        // ďalšia scéna v loop
window.location.href = '/scene/loading';  // priamo na konkrétnu (iba update NOW)
```

### Farby
Len v `app.py` COLORS dict. CSS používa `var(--c-bg/fill/outline)`.
Lottie JSON majú farby hardcoded z AE — nereagujú na COLORS.

### Cursor
Globálne v `scene-nav.js`. Scene JS súbory nesmú fetchovať cursor samy.

---

## Flask — routes, viewBoxy, assets

```python
VIEWBOXES = {
  'checkbox':   '605 480 710 235',
  'mys':        '893 475 133 131',
  'loading':    '440 455 1050 165',
  'dead':       '625 400 690 260',
  'ok':         '625 385 690 270',
  'newsletter': '600 225 720 560',
  'cookies':    '560 378 775 322',
  'captcha':    '608 425 695 220',
  'update':     '608 315 695 428',
}
COLORS = { 'bg': '#ffffff', 'fill': '#ffa4f6', 'outline': '#ff007a' }
LOOP_SCENES = ['loading', 'dead', 'ok', 'newsletter', 'cookies', 'captcha', 'update']
```

Special routes: `/` → random z LOOP_SCENES, `/anim/<file>` → assety/anim/ (no-cache), `/cursor/mys.svg` → color injection.

---

## Lottie animácie — assety/anim/

| Súbor | ip | op | fps | Použitie |
|-------|----|----|-----|---------|
| `mad_face.json` | 0 | 50 | 30 | loading — angry face (0→30 in, 30→50 out) |
| `dead.json` | — | 48 | 30 | dead — die/wake |
| `laugh.json` | 0 | 60 | 30 | ok — dodge laugh |
| `rukatoggle.json` | 5 | 34 | 30 | newsletter — toggle flip (MODIFIED: ip=5, op=34, white fill) |
| `cookie_no.json` | 0 | 58 | 30 | cookies — DENY hover sad mouth |
| `cookie_sad.json` | 0 | 58 | 30 | cookies — DENY click sad animation |
| `gulanieocami.json` | 0 | 42 | 30 | checkbox — eye roll |
| `ruka_tu.json` | 8 | 100 | 30 | cookies/update/newsletter/location — pointing hand |
| `ruka_kyv.json` | 16 | 97 | 30 | captcha — waving hand (nevyužité v aktuálnych scénach) |

### Lottie positioning formula (každá scéna)
```javascript
const VB = { x: ..., y: ..., w: ... };  // scene viewBox
function positionLottie(el) {
  const scale = wrapper.offsetWidth / VB.w;
  el.style.width  = (1920 * scale) + 'px';
  el.style.height = (1080 * scale) + 'px';
  el.style.left   = (-VB.x * scale) + 'px';
  el.style.top    = (-VB.y * scale) + 'px';
}
window.addEventListener('resize', () => positionLottie(el));
```

### ruka_tu — in/hold/out pattern (update, ostatné loop:true)
**Update** používa 3-fázový pattern:
```javascript
const RUKA_MID = 50;   // frame kde je ruka plne dnu
// Phase: 'hidden' | 'entering' | 'holding' | 'exiting'
// showRukaTu():  playSegments([0, RUKA_MID])
// complete entering: goToAndStop(RUKA_MID) + hold timer 2800ms → startRukaExit()
// startRukaExit(): playSegments([RUKA_MID, 100])
// complete exiting: display:none, phase='hidden'
```
**Ostatné scény** (cookies, newsletter, location): `loop:true, goToAndPlay(8)` — loopuje kým nie je hideRukaTu().

### Lottie overlay CSS pravidlá
```css
#lottie-xxx { display:none; position:absolute; overflow:hidden; }
#lottie-xxx, #lottie-xxx * { pointer-events:none !important; }
```

---

## Parallax layers (všetky scény)

| Layer | Element | X mult | Y mult | CSS/SVG |
|-------|---------|--------|--------|---------|
| 0 | `#window-wrapper` | 25 | 12 | CSS px via `style.translate` |
| 2 | Texty, labely | 3 | 2 | SVG `setAttribute('transform')` |
| 3 | Tlačidlá, toggle bodies | 3.45 | 2.3 | SVG `setAttribute('transform')` |
| 4 | Toggle knobs (newsletter) | 3.97 | 2.65 | SVG `setAttribute('transform')` |

`PARALLAX_SCALE = 1.0`, `P_LERP = 0.04`

---

## Eye tracking pattern (všetky scény)

```javascript
const EYE_INSET = 0.18;   // inset do eye socket
const FOLLOW_DIST = 350;  // SVG units pre full displacement
// lerp: štandard Right=0.13, Left=0.10
//       update (previazané): Right=0.10, Left=0.10
//       captcha (paranoid): Right=0.06, Left=0.04
```

**Zdieľaný offset (update)** — obe zreničky sa hýbu o rovnaký absolútny SVG offset (nie % vlastného rozsahu). Výsledok: pohybujú sa presne spolu.

```javascript
const sharedMaxDX = Math.min(...eyes.map(e => e.maxDX));
const sharedMinDX = Math.min(...eyes.map(e => Math.abs(e.minDX)));
// ... rovnaké pre Y
const rawX = ux * (ux >= 0 ? sharedMaxDX : sharedMinDX);
eyes.forEach(e => { e.targX = Math.max(e.minDX, Math.min(e.maxDX, rawX)); });
```

---

## Scéna po scéne — mechaniky

### LOADING
- Bar: segmented progress, NEAR_END (99%) pause 1–3s, random reversal na klik
- Oči: sledujú bar (blending `lookMouse`), po kliku sa pozrú na myš, plynulo sa vracajú na bar
- Mad face: klik → `showAngryFace()` (0→30), 1s po poslednom kliku → `startOutAnimation()` (30→50), po complete: `lottie.display=none + mouth.display=''`
- `pendingOut` flag: out-animácia čaká na dokončenie in-animácie

### DEAD
- `#window-wrapper { opacity:0 }` v CSS → no FOUC
- Pop-in: scale 0.06→1.08→1 (420ms), potom die Lottie
- RELOAD: hover-aware, `CLICKS_TO_WAKE = 3+rand(8)`, wake = 2× speed, 30% repeat

### OK
- Dodge: button uteká, 5–10 dodges, 45% laugh Lottie
- **2-click mechanic:** 1. klik = jiggle (scale 1→0.92→1.04→1), 2. klik = 50% navigate / 50% reštart
- **Whole-box mode (20%):** celý wrapper uteká (nie len button), `boxFleeCurX` k parallax offsetu
- Body squish: `wrapper.animate(scale)` — NIE `svg.animate()`
- `clicksOnCatchable`, `wholeBoxMode`, `boxTargDx` deklarované pred `tick()`

### NEWSLETTER
- Toggles: lerp slide, fill opacity, hover scale, auto-flip-back (ruka pri flip-off)
- **BEZ ruka_tu idle** — idle timer a celá ruka_tu sekcia boli odstránené
- **Eye roll spam:** 3+ kliky za 400ms → min→max→release (280ms+320ms)
- `eyeRollActive` deklarovaný pred `tick()`

### COOKIES
- Oči: `FOLLOW_DIST=250`, `EYE_INSET_X=0.12`, bias DENY hover (`biasY=+100`), glance na ACCEPT každé 2.5–6s
- DENY hover 1s → `cookie_no.json` forward, leave → 2.5× reverse
- 3 rýchle kliky (500ms) ALEBO 5 celkovo (10s) → `cookie_sad.json`
- `sadTransitioning` (350ms): oči lerpia do (0,0) pred Lottie štartom
- `ruka_tu idle`: 5s, ukazuje na ACCEPT
- Eye roll: 3+ kliky/400ms

### CAPTCHA
- **Oči:** štandardný simple tracking (lerp 0.13/0.10), BEZ paranoidného state machine
- SVG IDs: `captcha-eye_x5F_R` (single dash), `captcha--eye_x5F_L` (**DOUBLE DASH** — tak je v SVG!), `captcha-pupil_x5F_R/L`
- Body squish: `#captcha-body` → `wrapper.animate`, `ev.stopPropagation()` na checkbox
- **Ruka na checkbox:** `rukatoggle.json` plays na klik → `HAND_PEAK_MS=700ms` → checkmark pop-in → fade po 800ms
- **Checkmark iba fade** (opacity 0→1 pop, potom 1→0 fade, nie instant remove)
- Checkbox: fail counter, `FAILS_TO_PASS = 3+rand(3)`, navigate po dosiahnutí
- VB_CAPTCHA: `{ x: 608, y: 425, w: 695 }` pre lottie pozicionovanie

### UPDATE
- Parallax + oči (per-eye štandardný tracking, lerp 0.13/0.10 — ako ok scene)
- Body squish: `#update-body`
- **ruka_tu in/hold/out:** playSegments([0,50]) → goToAndStop(50) → hold 2.8s → playSegments([50,100]) → hide
- **Kozmetika vstupu:** `transform: translateY(-18px) rotate(-2deg); transform-origin: 98% 55%` v CSS
- Eye roll na LATER click (pred navigate)
- **NOW button:** vždy `window.location.href = '/scene/loading'` (nie cez OLS.navigate)
- **Button hitbox fix:** `#Layer_1 #update-later_x5F_button_x5F_body { fill: transparent; }` + `#update-now_x5F_button_x5F_body { fill: transparent; }` — klikateľná celá plocha, nie len outline
- **Hover guard:** `if (nowHovered) return;` zabraňuje re-triggerovaniu scale pri prechode medzi sub-elementmi

---

## Button hover/click pattern (štandard pre všetky scény)

```javascript
function hoverScale(els, to) {
  els.forEach(el => {
    el.style.transformBox    = 'fill-box';
    el.style.transformOrigin = '50% 50%';
    el.animate([{ transform: `scale(${to})` }],
      { duration:160, fill:'forwards', easing:'cubic-bezier(0.25,0.46,0.45,0.94)' });
  });
}

function pressButton(els, hovered, onDone) {
  const base = hovered ? 1.05 : 1.0;
  els.forEach(el => {
    el.style.transformBox = 'fill-box';
    el.style.transformOrigin = '50% 50%';
    const a = el.animate(
      [{ transform:`scale(${base})` }, { transform:'scale(0.92)',offset:0.35 }, { transform:`scale(${base})` }],
      { duration:240, easing:'cubic-bezier(0.34,1.56,0.64,1)' }
    );
    if (onDone) a.addEventListener('finish', onDone, { once:true });
  });
}
```

**Multi-element hover jitter fix:**
```javascript
el.addEventListener('mouseenter', () => {
  if (groupHovered) return;  // guard — nespúšťaj znova ak už dnu
  groupHovered = true; hoverScale(els, 1.05);
});
el.addEventListener('mouseleave', ev => {
  if (els.some(e => e === ev.relatedTarget || e.contains(ev.relatedTarget))) return;
  groupHovered = false; hoverScale(els, 1.0);
});
```

---

## ruka_tu idle timer pattern (cookies, newsletter)

```javascript
let rukaTuShowing = false, idleTimer = null;

function showRukaTu() {
  if (!rukaTuReady) return;
  rukaTuShowing = true;
  rukaTuEl.style.display = 'block';
  lottieRukaTu.goToAndPlay(8, true);   // ip=8, loop:true
}
function hideRukaTu() {
  if (!rukaTuShowing) return;
  rukaTuShowing = false;
  rukaTuEl.style.display = 'none';
  lottieRukaTu.stop();
}
function resetIdleTimer() {
  clearTimeout(idleTimer);
  if (rukaTuShowing) hideRukaTu();
  idleTimer = setTimeout(showRukaTu, 5000);  // 4000 pre update
}
// Volať resetIdleTimer() na každý button mouseenter + click + pri init
```

---

## Eye roll pattern (update, newsletter, cookies)

```javascript
let eyeRollActive = false;  // MUSÍ byť pred tick()!

function triggerEyeRoll() {
  if (eyeRollActive || !eyes) return;
  eyeRollActive = true;
  eyes.forEach(e => { e.targX = e.minDX; e.targY = 0; });
  setTimeout(() => {
    eyes.forEach(e => { e.targX = e.maxDX; e.targY = 0; });
    setTimeout(() => { eyeRollActive = false; }, 320);
  }, 280);
}
// V tick(): if (!eyeRollActive) setTargets(mx, my);
```

---

## Súborová štruktúra

```
app.py                       ← Flask, COLORS, VIEWBOXES, LOOP_SCENES, routes
assety/
  *.svg                      ← Illustrator exporty (source of truth)
  location.svg               ← location scene SVG
  mys.svg                    ← custom cursor
  anim/
    mad_face.json            ← loading (0→30 in, 30→50 out, PEAK_FRAME=30)
    dead.json                ← dead scene
    laugh.json               ← ok scene
    rukatoggle.json          ← newsletter (MODIFIED: ip=5,op=34, white fill)
    cookie_no.json           ← cookies DENY hover
    cookie_sad.json          ← cookies DENY click
    gulanieocami.json        ← checkbox eye roll
    ruka_tu.json             ← pointing hand (ip=8, op=100, 30fps)
    ruka_kyv.json            ← waving hand (ip=16, op=97, 30fps) — rezerva
static/
  css/
    buttons.css              ← global: body centering, .scene-stage, .window-wrapper, .lottie-overlay
    *.css                    ← per-scene (vždy buttons.css PRED scene.css)
  js/
    scene-nav.js             ← shared: nav queue, cursor, spacebar skip
    *.js                     ← per-scene
templates/
  base.html                  ← injectuje COLORS ako CSS vars, loaduje scene-nav.js
  scenes/*.html              ← per-scene, extend base.html
HANDOFF.md                   ← tento súbor
PLAN.md                      ← implementačný plán z 2026-06-04 session
```

---

## Known issues / poznámky

1. **Lottie farby** — hardcoded z AE, nereagujú na COLORS
2. **rukatoggle.json** — manuálne modifikovaný JSON (white fill, trimmed). Ak re-export z AE, zmeny sa stratia. Teraz používaný aj v captcha (checkbox hand)
3. **ruka_tu poloha** — hand v Lottie artboarde je na fixnej pozícii. V update je CSS `rotate(-2deg) translateY(-18px)` pre čistejší vstup
4. **cookies parallax** — používa `style.transform` (nie `style.translate`) — funkčné, len nekonzistentné
5. **`lottieTransPts`** v cookies.js — nepoužívaná premenná, safe to remove
6. **ruka_kyv.json** — načítaný ale nevyužitý
7. **captcha--eye_x5F_L double dash** — ID v SVG má dvojitú pomlčku (`captcha--eye_x5F_L`). Tak je to v AI súbore. captcha.js to správne referencuje s dvojitou pomlčkou.
