# ONE LAST STEP — Live State Handoff
## Session 2026-06-04 — Captcha tuning + body fixes

This document captures the **exact current state** of the project as of this session.
Reference this file when continuing work. The main HANDOFF.md still holds the full
architectural reference — this file captures what changed TODAY and what is still pending.

---

## Running the project right now

```bash
cd /Users/fifo/CLAUDE/hku_design_project
lsof -ti :5001 | xargs kill -9 2>/dev/null; .venv/bin/python app.py
# → http://127.0.0.1:5001/scene/captcha
```

Transfer package (for deployment): `/Users/fifo/CLAUDE/ONE_LAST_STEP_TRANSFER/`

---

## What changed this session

### 1. Location scene — completely removed
- Deleted: `assety/location.svg`, `static/css/location.css`, `static/js/location.js`, `templates/scenes/location.html`
- Removed from `app.py`: viewbox, LOOP_SCENES, route
- Removed from `scene-nav.js`: LOOP_SCENES
- Loop is now: `loading → dead → ok → newsletter → cookies → captcha → update → (repeat)`

### 2. All scene bodies are now white
- `loading-body`, `ok-body`, `newsletter-body`, `cookies-body` had `fill:none` → now white
- Fix: ID override with 2× specificity `#Layer_1 #xxx-body { fill: var(--c-bg); }`
- SVG document order fixed: body paths moved to FIRST element (after `</defs>`) in
  `loading.svg`, `newsletter.svg`, `cookies.svg` so white fill doesn't cover content

### 3. OK scene — wholeBoxMode removed
- Removed: `wholeBoxMode`, `boxTargDx`, `boxFleeCurX`, `BOX_LERP`
- Only the button dodges now, wrapper/body stays in place
- Hover: `groupHovered` guard added, scale 1.05, covers body+fill+txt as one zone

### 4. Captcha scene — rukatoggle.json restored + tuned

**What it does:**
- Click checkbox → hand (rukatoggle.json) plays in from right
- At 700ms (HAND_PEAK_MS): checkmark pops in — instant scale bounce, no opacity fade
- Hand completes → checkmark always removed (fade 280ms → display:none)
- Spammable: click again while hand playing → hand replays from frame 5 immediately
- After 2–5 clicks (FAILS_TO_PASS = 2 + rand(4)): navigateOnComplete=true → navigate when hand exits

**Hand position calculation (PRECISE):**
```
rukatoggle.json artboard: 1920×1080
Hand shape bottom (finger tip) in artboard: y ≈ 348
Captcha checkbox center in artboard: y ≈ 547
Required downward shift: 547 - 348 = 199 artboard units

Formula in positionLottieHand():
  top = (-VB_CAPTCHA.y + 199) * scale
      = (-425 + 199) * scale
      = -226 * scale

At 620px wrapper: scale = 620/695 = 0.892 → top = -201.6px
At 596px wrapper: scale = 596/695 = 0.858 → top = -193.8px  ✓
```

**Key constants in captcha.js:**
```javascript
const VB_CAPTCHA   = { x: 608, y: 425, w: 695 };
const HAND_PEAK_MS = 700;       // ms after click when checkmark appears
const FAILS_TO_PASS = 2 + Math.floor(Math.random() * 4);  // 2–5 clicks
```

**Checkmark element:** `#captcha-dontshow_x5F_checkmark` (CSS: `display:none; transform-box:fill-box;`)

**Lottie file:** `assety/anim/rukatoggle.json` — ip=5, op=34, 30fps
Play call: `lottieHandAnim.goToAndPlay(5, true)` — starts at frame 5 every time

### 5. Offline — Lottie bundled locally
- `static/vendor/lottie.min.js` (v5.12.2, 305KB)
- All 7 templates updated — zero CDN dependencies

---

## What still needs attention (captcha hand tuning)

The hand position formula is calculated precisely from artboard coordinates.
However, **the exact visual alignment should be verified by eye** in a real browser
on the gallery screen at full resolution.

**If the hand is still slightly off:**
- Too high → increase the `199` constant in `positionLottieHand()` (captcha.js line ~154)
- Too low → decrease it
- Each 10 artboard units ≈ 9px CSS at 620px wrapper width

**If the hand timing feels off:**
- Hand arrives too late: decrease `HAND_PEAK_MS` (currently 700ms)
- Hand stays too long: the animation is frames 5–34 = 29 frames = 967ms — not adjustable without changing the JSON
- Checkmark shows too briefly: the window is HAND_PEAK_MS to ~967ms = ~267ms visible

**If fail count is wrong:**
- `FAILS_TO_PASS = 2 + Math.floor(Math.random() * 4)` → 2, 3, 4, or 5 clicks
- Change the `2` to increase minimum, change `4` to change range

---

## File locations — what matters

```
hku_design_project/
  app.py                     ← server, COLORS, LOOP_SCENES, routes
  static/
    vendor/lottie.min.js     ← bundled lottie (offline)
    js/
      captcha.js             ← captcha logic (hand + checkbox)
      ok.js                  ← OK button dodge (no wholeBoxMode)
      scene-nav.js           ← LOOP_SCENES (no location)
    css/
      captcha.css            ← body white override
      ok.css                 ← body white override
      loading.css            ← body white override  
      newsletter.css         ← body white override
      cookies.css            ← body white override
  assety/
    captcha.svg              ← unchanged
    loading.svg              ← body path moved to first layer
    newsletter.svg           ← body path moved to first layer
    cookies.svg              ← body path moved to first layer
    anim/rukatoggle.json     ← used in captcha (hand click)

ONE_LAST_STEP_TRANSFER/      ← deployment package (in sync with above)
```

---

## COLORS (current)
```python
COLORS = {
    'bg':      '#ffffff',
    'fill':    '#ffa4f6',
    'outline': '#ff007a',
}
```
Change only in `app.py`. Restart server after change.
