# ONE LAST STEP — projektový kontext pre Claude

## Čo je tento projekt
Interaktívna webová inštalácia pre galériu. Hostile interface — systém ktorý návštevníka dráži, nechá ho v slučkách, kladie mu zbytočné otázky. Scény A–E a W–Z (každá je samostatná "obrazovka"). Zatiaľ existuje len Demo 01 (scéna A — checkbox).

**Umelecký zámer:** návštevník nikdy nedosiahne cieľ. Interface ho trocha tresce, trocha baví.

## Spustenie projektu
```
cd /Users/fifo/CLAUDE/hku_design_project
.venv/bin/python app.py
# → http://127.0.0.1:5001/scene/checkbox
```
Port 5000 je na Macu obsadený systémom (AirPlay). Vždy používaj 5001.

Po zmene `app.py` → reštartuj Flask (Ctrl+C + znova spustiť).
Po zmene CSS/JS → len Cmd+Shift+R v prehliadači.

## Farebný systém — jediné miesto kde meniš farby
V `app.py`:
```python
COLORS = {
    'bg':      '#ffffff',
    'fill':    '#ffa4f6',
    'outline': '#ff007a',
}
```
Flask tieto farby injektuje do:
- HTML šablón (CSS premenné `--c-bg`, `--c-fill`, `--c-outline`)
- SVG súborov (replace hardcoded hex pri servovaní)
- Cursor SVG (`/cursor/mys.svg`)

CSS používa `var(--c-bg)` atď. — nikdy nepíš farby natvrdo do CSS.

## Štruktúra projektu
```
app.py                          ← Flask server, routes, COLORS, inject_colors()
assety/                         ← SVG súbory (Illustrator exporty)
  demo_01_checkbox.svg          ← hlavný SVG pre scénu checkbox
  mys.svg                       ← custom cursor (shape layers, nie stroke)
  anim/
    gulanieocami.json           ← Lottie animácia gúľania očí (42 frames, 30fps)
static/
  css/checkbox.css              ← štýly pre scénu checkbox
  js/checkbox.js                ← interakcia (checkbox, oči, cursor, Lottie)
  cursor/mys.svg                ← (ignoruj, cursor sa servuje z assety/)
templates/
  base.html                     ← base template, injektuje CSS premenné z COLORS
  scenes/checkbox.html          ← scéna checkbox, načítava Lottie.js
```

## Flask — ako funguje SVG pipeline
`load_svg(filename, viewbox)` — načíta SVG z `assety/`, orezá viewBox.
`inject_colors(svg, COLORS)` — nahradí hardcoded hex farby hodnotami z COLORS.

Každá scéna má vlastný route:
```python
@app.route('/scene/checkbox')
def scene_checkbox():
    svg = load_svg('demo_01_checkbox.svg', viewbox=VIEWBOXES['checkbox'])
    svg = inject_colors(svg, COLORS)
    return render_template('scenes/checkbox.html', svg=svg)
```
SVG je vložené inline (`{{ svg | safe }}`), takže JS môže pristupovať k SVG elementom cez DOM.

ViewBox pre checkbox: `'605 480 710 235'` — orezaný výrez z 1920×1080 artboardu.

## SVG — dôležité element IDs (demo_01_checkbox.svg)
```
#demo                   ← root SVG element
#demo-body              ← obrys okna
#demo-body_x5F_fill     ← výplň okna
#demo-box               ← checkbox box (klikateľný)
#demo-checkmark         ← fajka (skrytá, animovaná)
#demo-text              ← text "ARE YOU A HUMAN?"
#demo-eye_x5F_L/R       ← biele plochy očí
#demo-pupils_x5F_mask   ← skupina so zreničkami
#pupil_x5F_L/R          ← samotné zreničky (ellipse, pohybujú sa cez JS)
#demo-smile             ← ústa (skryté cez CSS — display:none)
```

## SVG triedy → farby (checkbox.css override)
```
st5, st3  → fill: var(--c-fill)        — výplň tela okna, fajka
st1–st4   → stroke: var(--c-outline)   — obrysy všetkých tvarov
st2, st4, st8 → fill: var(--c-bg)      — biele plochy (oči, checkbox box)
st6, st7  → fill: var(--c-outline)     — text, zreničky
```

## Eye tracking — ako funguje
Zreničky sa pohybujú cez `requestAnimationFrame` loop (lerp).
```javascript
const LERP = 0.1;        // plynulosť (nižšie = lenivejšie)
const MAX_X = 55;        // max pohyb vľavo/vpravo (SVG jednotky)
const MAX_Y = 15;        // max pohyb hore/dole
```
Stredy očí (geometrické centrum clip masky):
- Ľavé oko: cx=880, cy=456
- Pravé oko: cx=1041, cy=456

Obe zreničky sledujú rovnaký uhol od midpointu (960.5, 456) — zabraňuje škúleniu.

Clip maska (`#clippath`) orezáva zreničky na tvar oka. Oči sú nad viewBoxom (y≈456 vs viewBox y=480) — sú viditeľné vďaka `overflow: visible` na SVG.

## Cursor
Servovaný cez Flask route `/cursor/mys.svg`:
- Načíta `assety/mys.svg`
- Orezá viewBox na `893 475 133 131`
- Injektuje COLORS
- Pridá `width="124" height="124"`
- `Cache-Control: no-store`

V JS sa načíta cez `fetch()` → `encodeURIComponent()` → data URI → `document.body.style.cursor`.
Tým sa obchádza agresívne cachovanie cursorov v prehliadači.

## Lottie animácia (gúľanie očí)
Súbor: `assety/anim/gulanieocami.json` (42 frames, 30fps, 1920×1080)
Exportované cez Bodymovin plugin z After Effects.

Trigger: **5 kliknutí na checkbox za menej ako 5 sekúnd.**

Štartovacia pozícia zreničiek (frame 0):
- Ľavá: x=926.552, y=466.9
- Pravá: x=1088.3, y=466.9

Pred štartom animácie: zreničky sa rýchlo presunú na štartovaciu pozíciu (boosted LERP=0.22), potom sa SVG oči skryjú a Lottie prevezme. Po skončení sa JS zreničky objavia presne na poslednej pozícii Lottie a plynulo easingujú k myši.

Lottie overlay je pozicionovaný JS-om tak aby 1920×1080 súradnicový priestor presne sedel na SVG artboard:
```javascript
const scale = wrapperWidth / 710;
lottieDiv.style.width  = (1920 * scale) + 'px';
lottieDiv.style.left   = (-605 * scale) + 'px';
lottieDiv.style.top    = (-480 * scale) + 'px';
```

## Checkbox animácia
- Hover: scale(1.06) — riešené cez Web Animations API (nie CSS), kvôli smooth handoff
- Klik: bounce animácia (scale down → spring back na hover alebo base scale)
- Fajka: pop-in/pop-out animácia, `pointer-events: none` (kliky prepadajú na box)
- Kliknutie na fajku aj box toggleuje checkbox

## Čo nefunguje / known issues
- Farby v Lottie JSON sú hardcoded z AE (nereagujú na COLORS systém)
- Cursor sa nemení real-time — treba Cmd+Shift+R po zmene COLORS

## Pri písaní novej scény
1. Pridaj route do `app.py` (vzor podľa `scene_checkbox`)
2. Pridaj viewBox do `VIEWBOXES` dict
3. Vytvor `templates/scenes/nazov.html` (extend base.html)
4. Vytvor `static/css/nazov.css` a `static/js/nazov.js`
5. SVG vlož inline cez `{{ svg | safe }}`
6. Farby riešia CSS premenné + inject_colors — netreba nič extra
