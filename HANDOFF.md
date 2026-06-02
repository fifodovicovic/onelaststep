# ONE LAST STEP — Handoff Document (updated June 2026)

## Project overview
Interactive gallery web installation. Hostile interface — loops the visitor through annoying popups. Built in Flask with inline SVGs. Every scene is a separate HTML page. Navigation via `window.OLS.navigate('scene-name')`.

**Start server:**
```
cd /Users/fifo/CLAUDE/hku_design_project
.venv/bin/python app.py
# → http://127.0.0.1:5001/scene/loading
```
Port 5001 (5000 is taken by macOS AirPlay).

---

## Scene list & status

| Scene | Route | JS file | Status |
|-------|-------|---------|--------|
| loading | `/scene/loading` | `loading.js` | ✅ Done |
| dead | `/scene/dead` | `dead.js` | ✅ Done |
| ok | `/scene/ok` | `ok.js` | ✅ Done |
| newsletter | `/scene/newsletter` | `newsletter.js` | ✅ Done |
| cookies | `/scene/cookies` | `cookies.js` | ✅ Done (see notes) |
| captcha | `/scene/captcha` | `captcha.js` | ✅ Done |
| update | `/scene/update` | `update.js` | ✅ Done |
| location | `/scene/location` | — | ❌ Not implemented (empty template, no SVG) |
| checkbox | `/scene/checkbox` | `checkbox.js` | ✅ Done (demo scene, not in main loop) |

**Navigation loop order** (`DEBUG_SEQUENTIAL=true` in scene-nav.js):
`loading → dead → ok → newsletter → cookies → captcha → update → location → (repeat)`

Set `DEBUG_SEQUENTIAL = false` in `scene-nav.js` for random order.

---

## Architecture rules — NEVER break these

### SVG transform rule (CRITICAL)
**Never apply CSS `transform` directly to the `<svg>` element.** It breaks `toSVGCoords()` which uses `svg.getBoundingClientRect()`. Eye tracking stops working.
- Parallax goes on `#window-wrapper` (CSS px) — wrapper is PARENT of SVG
- Inner SVG elements get `setAttribute('transform', 'translate(...)')` for parallax/movement

### Color system
All colors come from `COLORS` dict in `app.py`:
```python
COLORS = { 'bg': '#ffffff', 'fill': '#ffa4f6', 'outline': '#ff007a' }
```
Flask injects them:
- Into HTML as CSS variables: `--c-bg`, `--c-fill`, `--c-outline`
- Into SVG via `inject_colors()` (regex replace of hardcoded hex)
- **Exception:** Lottie JSON files are NOT color-injected — colors are hardcoded from AE export
- **Exception:** `cookies.css` has `#Layer_1 .st10 { fill: #ffe1fe; }` hardcoded to match Lottie chocolate color

### Cursor
Handled GLOBALLY by `scene-nav.js` via `window.OLS.loadCursor()` on every `DOMContentLoaded`. **Individual scene JS files must NOT fetch the cursor separately.** The cursor is served via Flask at `/cursor/mys.svg` with color injection.

### Navigation
```javascript
window.OLS.navigate('current-scene-name');  // goes to next scene
```

### Eye tracking pattern (all scenes use this)
```javascript
const EYE_INSET  = 0.18;
const FOLLOW_DIST = 350;  // (cookies uses 250 — compact face)

function makeEye(eyeEl, pupilEl, lerp) { ... }
// Right eye lerp: 0.13, Left eye lerp: 0.10
```

### SVG transform for knob/button scale (CRITICAL — CSS vs SVG)
CSS `transform-origin: 50% 50%; transform-box: fill-box` on SVG elements is processed by browser CSS engine. The SVG `transform` attribute IS also affected by `transform-origin`. **Do NOT manually compute translate(cx,cy) scale translate(-cx,-cy)** — the browser doubles it. Just use `translate(dx,dy) scale(s)` and let CSS `transform-origin` handle centering.

### Box click squish
Bind to specific body element, NOT `svg` root. Animate `wrapper` (the HTML div), NOT `svg` — animating SVG root breaks `toSVGCoords()` / eye tracking. Use `ev.stopPropagation()` on all interactive elements (buttons, toggles) so their clicks don't bubble to the body squish handler.

---

## Flask routes & viewBoxes

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
```

Special routes:
- `/` → random scene from `LOOP_SCENES` (in app.py: `['loading', 'cookies', 'newsletter', 'captcha', 'update']`)
- `/anim/<filename>` → serves from `assety/anim/` (no-cache)
- `/cursor/mys.svg` → serves cursor with color injection (no-cache)

**Note:** `LOOP_SCENES` in `app.py` (for `/` redirect) and `LOOP_SCENES` in `scene-nav.js` (for sequential navigation) are separate and currently out of sync. `scene-nav.js` includes `dead`, `ok`, `location` which `app.py` does not.

---

## Lottie animations — assety/anim/

| File | Layers | Frames | Used in |
|------|--------|--------|---------|
| `cookie_no.json` | 1 (usta Outlines) | 58 @30fps | cookies.js — DENY hover (sad mouth) |
| `cookie_sad.json` | 7 layers | 58 @30fps | cookies.js — loaded but currently unused in flow |
| `dead.json` | 6 layers | 48 @30fps | dead.js |
| `gulanieocami.json` | 4 layers | 42 @30fps | checkbox.js — eye-roll |
| `laugh.json` | 4 layers | 60 @30fps | ok.js — dodge laugh |
| `mad_face.json` | 1 layer | 50 @30fps | loading.js — progress face |
| `rukatoggle.json` | 4 layers | 34 @30fps (trimmed from 44) | newsletter.js — hand flipping toggles |

### Lottie positioning formula (use for every scene)
```javascript
const VB = { x: ..., y: ..., w: ... };  // scene viewBox origin and width
function positionLottie(el) {
  const scale = wrapper.offsetWidth / VB.w;
  el.style.width  = (1920 * scale) + 'px';
  el.style.height = (1080 * scale) + 'px';
  el.style.left   = (-VB.x * scale) + 'px';
  el.style.top    = (-VB.y * scale) + 'px';
}
window.addEventListener('resize', () => positionLottie(el));
```

### Lottie overlay CSS rules
Always include on overlay containers:
```css
#lottie-xxx, #lottie-xxx * { pointer-events: none !important; }
#lottie-xxx { display: none; position: absolute; overflow: hidden; }
```
`overflow: hidden` clips artifacts. `pointer-events: none !important` on both container AND all children prevents Lottie SVG from blocking mouse events on scene elements.

---

## Newsletter scene — implemented mechanics

- **Eye tracking** — getBBox approach, no hardcoded coordinates, follows mouse only
- **Parallax** — wrapper(25,12) + text labels(3,2) + toggle bodies/button(3.45,2.3) + knobs(3.97,2.65)
- **Toggle slide** — lerp-based, `TOGGLE_SPEED=0.16`, `TOGGLE_DX=58` SVG units
- **Toggle fill fade** — `OFF_OPACITY=0` (fill transparent when OFF)
- **Toggle hover scale** — CSS `transform-origin:50%/fill-box` handles centering. Use `translate(dx,dy) scale(s)` only
- **Auto-flip-back** — INFINITE (no MAX_FLIPS anymore), hand animates IMMEDIATELY on flip-off
- **Lottie hand** (`rukatoggle.json`) — `HAND_PEAK_MS=700`. Two instances: `#lottie-hand` (signup/top toggle) and `#lottie-hand-2` (turnon/bottom toggle). Bottom hand offset by `SVG_TOGGLE_DY=157.5` SVG units × scale
- **rukatoggle.json modifications:** Shape Layer 1 fill changed to white (was red — was track matte cover), layers trimmed to ip=5/op=34, exit frames and transition layers removed
- **Continue button** — hover scale 1.05, click bounce → navigate

---

## Cookies scene — implemented mechanics

- **Eye tracking** — getBBox, FOLLOW_DIST=250 (compact face), `forcedTarget` variable available to override mouse (currently unused — prep for future mechanic)
- **ACCEPT button** — hover scale 1.05, click pressButton → navigate
- **DENY button hover** — `cookie_no.json` Lottie plays forward from frame 0 on mouseenter (animated appearance). Plays backward at 2.5× speed on mouseleave (fast disappear). Speed resets to 1 after complete. Hover detection uses `isInsideDeny(relatedTarget)` + `el.contains()` to prevent jitter. `pointer-events: all` on body path. **Mouth stays visible when cursor moves within popup** — only hides on `wrapper` mouseleave (backup) or DENY mouseleave
- **DENY button click** — pressButton bounce, then after 240ms plays `cookie_sad.json`. After sad anim ends, sad mouth (`cookie_no` at last frame) is restored and stays visible
- **cookie_sad flow:**
  1. `hideFace()` — fades out `cookieFace` elements (incl. `#cookies-body` border!) + hides `lottieNoEl`
  2. `lottieSadEl` shown, `goToAndPlay(0, true)`
  3. On `complete`: `goToAndStop(totalFrames-1)` to freeze last frame, then 0.3s crossfade (Lottie fades out, SVG fades in simultaneously)
  4. After crossfade: `lottieNoEl` shown at last frame — sad mouth stays on cookie face
- **`cookieFace` array includes `#cookies-body`** — border fades with face to prevent stacking artifact (border visible through transparent cookie during crossfade)
- **Chocolate chip color** — `#ffe1fe` hardcoded in CSS (matches Lottie animation colors)
- **Box squish** — click on `#cookies-body` → `wrapper.animate(scale)` — NOT on SVG root (would break toSVGCoords)

---

## ok.js — notable mechanics (reference)
- **Button dodge:** 5–10 times, flees cursor within 5px. After all dodges: `targetDx=0`, catchable after 1.2s
- **Lottie laugh:** 45% of dodges, 1.4s cooldown
- **ok.svg L/R naming:** character perspective (opposite viewer). `pupil_R` is in `eye_L` socket

---

## File structure
```
app.py                       ← Flask server, COLORS, VIEWBOXES, routes
assety/
  *.svg                      ← Illustrator exports (source of truth for scenes)
  mys.svg                    ← custom cursor SVG
  anim/
    cookie_no.json           ← cookies hover: sad mouth (1 layer, 58fr)
    cookie_sad.json          ← cookies: DENY click sad animation (7 layers, 58fr) ✅ connected
    laugh.json               ← ok.js Lottie
    mad_face.json            ← loading.js Lottie
    rukatoggle.json          ← newsletter.js hand (MODIFIED: trimmed, color fixed)
    gulanieocami.json        ← checkbox.js eye-roll
    dead.json                ← dead.js
static/
  js/
    scene-nav.js             ← shared nav + cursor (loaded on every page via base.html)
    newsletter.js            ← ✅ parallax, toggles, hand Lottie
    cookies.js               ← ✅ cookie_no hover anim, DENY click → cookie_sad → mouth stays
    ok.js                    ← ✅ dodge button, Lottie laugh
    loading.js               ← ✅ progress bar, angry face
    captcha.js               ← ✅ eye tracking only
    update.js                ← ✅ two buttons
    dead.js                  ← ✅
    checkbox.js              ← ✅ demo scene
    location.js              ← ❌ empty / not implemented
  css/
    *.css                    ← per-scene styles
templates/
  base.html                  ← injects COLORS as CSS vars, loads scene-nav.js
  scenes/*.html              ← per-scene templates, extend base.html
parallax.md                  ← parallax + interaction pattern reference
HANDOFF.md                   ← this file
```

---

## Known issues & risky areas

1. **`location` scene** — completely unimplemented. Route exists, empty template, no SVG, no JS
2. **rukatoggle.json modifications** — Shape Layer 1 fill changed to white (from red) to act as invisible cover for bad animation frames at start/end. ip=5, op=34 (trimmed). If animation is re-exported from AE, these JSON modifications are lost
3. **Lottie colors** — all Lottie JSONs have hardcoded AE colors. They do not respond to the COLORS system. If brand colors change, Lottie files need manual re-export
4. **LOOP_SCENES mismatch** — `app.py` LOOP_SCENES (for random `/` redirect) and `scene-nav.js` LOOP_SCENES (for sequential order) differ. scene-nav.js includes `dead`, `ok`, `location` which app.py does not
5. **`location` in nav sequence** — scene-nav.js will try to navigate to `/scene/location` which renders an empty template. Navigation won't crash but user sees blank screen
6. **cookies.js uncommitted** — changes from this session not yet committed to git (same for newsletter.js box squish fix)

---

## Parallax layers reference

| Layer | Element | X mult | Y mult | Type |
|-------|---------|--------|--------|------|
| 0 | `#window-wrapper` | 25 | 12 | CSS px |
| 2 | Texts/labels | 3 | 2 | SVG units |
| 3 | Buttons, toggle bodies | 3.45 | 2.3 | SVG units |
| 4 | Toggle knobs (swOn) | 3.97 | 2.65 | SVG units |

`PARALLAX_SCALE = 1.0` (was 5.0 during testing).

---

## Button hover/click pattern (all scenes)

```javascript
// hover: scale(1.05) fill:forwards — stays scaled
// leave: scale(1.0)  fill:forwards
function hoverScale(els, to) {
  els.forEach(el => {
    el.style.transformBox    = 'fill-box';
    el.style.transformOrigin = '50% 50%';
    el.animate([{ transform: `scale(${to})` }],
      { duration: 160, fill: 'forwards', easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' });
  });
}

// click: bounce (base → 0.92 → base), then navigate
function pressButton(els, hovered, onDone) {
  const base = hovered ? 1.05 : 1.0;
  els.forEach(el => {
    el.style.transformBox = 'fill-box';
    el.style.transformOrigin = '50% 50%';
    const a = el.animate(
      [{ transform: `scale(${base})` }, { transform: 'scale(0.92)', offset: 0.35 }, { transform: `scale(${base})` }],
      { duration: 240, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
    );
    if (onDone) a.addEventListener('finish', onDone, { once: true });
  });
}
```

**Multi-element hover jitter fix** — when multiple elements share hover zone, use `relatedTarget` + `el.contains()` to ignore leave events that move between sibling elements:
```javascript
function onLeave(ev) {
  if (groupEls.some(el => el === ev.relatedTarget || el.contains(ev.relatedTarget))) return;
  // actually leaving the group
}
```

---

## Best next implementation step

**Implement `location` scene** — it's the only missing scene blocking a complete loop:
1. Create `assety/location.svg` in Illustrator (1920×1080 artboard)
2. Add `'location'` viewBox to `VIEWBOXES` in app.py
3. Update `scene_location()` route to load + inject SVG (pattern from other scenes)
4. Create `templates/scenes/location.html` (extend base.html)
5. Create `static/css/location.css` and `static/js/location.js`
6. Decide what the location scene hostile mechanic is

After that: decide what clicking DENY in cookies actually does (cookie_sad animation is loaded and ready — just needs to be connected to the click flow).
