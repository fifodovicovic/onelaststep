import os
import re
import random
from flask import Flask, render_template, send_from_directory, make_response, redirect

app = Flask(__name__)

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

# ── FARBY — zmeň tu, zmení sa všade (CSS aj cursor SVG) ──
COLORS = {
    'bg':      '#ffffff',
    'fill':    '#ffa4f6',
    'outline': '#ff007a',
}


def load_svg(filename, viewbox=None):
    path = os.path.join(app.root_path, 'assety', filename)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if viewbox:
        content = re.sub(r'viewBox="[^"]*"', f'viewBox="{viewbox}"', content, count=1)
    return content


def inject_colors(svg, colors):
    """Replace hardcoded hex colors in SVG with values from COLORS."""
    # Map any hex color in the SVG to the correct role
    color_map = {
        '#ff007a': colors['outline'],
        '#FF007A': colors['outline'],
        '#ffa4f6': colors['fill'],
        '#FFA4F6': colors['fill'],
        '#ffffff': colors['bg'],
        '#FFFFFF': colors['bg'],
        '#fff':    colors['bg'],
        '#FFF':    colors['bg'],
    }
    for old, new in color_map.items():
        svg = svg.replace(old, new)
    return svg


@app.context_processor
def inject_theme():
    return {'colors': COLORS}


@app.route('/anim/<path:filename>')
def anim(filename):
    resp = make_response(send_from_directory('assety/anim', filename))
    resp.headers['Cache-Control'] = 'no-store'
    return resp


@app.route('/cursor/mys.svg')
def cursor_mys():
    content = load_svg('mys.svg', viewbox=VIEWBOXES['mys'])
    content = inject_colors(content, COLORS)
    content = re.sub(r'<svg ', '<svg width="124" height="124" ', content, count=1)
    resp = make_response(content)
    resp.headers['Content-Type'] = 'image/svg+xml'
    resp.headers['Cache-Control'] = 'no-store'
    return resp


LOOP_SCENES = ['loading', 'dead', 'ok', 'newsletter', 'cookies', 'captcha', 'update']

@app.route('/')
def index():
    return redirect('/scene/' + random.choice(LOOP_SCENES))


@app.route('/scene/checkbox')
def scene_checkbox():
    svg = load_svg('demo_01_checkbox.svg', viewbox=VIEWBOXES['checkbox'])
    svg = inject_colors(svg, COLORS)
    return render_template('scenes/checkbox.html', svg=svg)


@app.route('/scene/loading')
def scene_loading():
    svg = load_svg('loading.svg', viewbox=VIEWBOXES['loading'])
    svg = inject_colors(svg, COLORS)
    return render_template('scenes/loading.html', svg=svg)


@app.route('/scene/dead')
def scene_dead():
    svg = load_svg('dead.svg', viewbox=VIEWBOXES['dead'])
    svg = inject_colors(svg, COLORS)
    return render_template('scenes/dead.html', svg=svg)


@app.route('/scene/ok')
def scene_ok():
    svg = load_svg('ok.svg', viewbox=VIEWBOXES['ok'])
    svg = inject_colors(svg, COLORS)
    return render_template('scenes/ok.html', svg=svg)


@app.route('/scene/newsletter')
def scene_newsletter():
    svg = load_svg('newsletter.svg', viewbox=VIEWBOXES['newsletter'])
    svg = inject_colors(svg, COLORS)
    return render_template('scenes/newsletter.html', svg=svg)


@app.route('/scene/cookies')
def scene_cookies():
    svg = load_svg('cookies.svg', viewbox=VIEWBOXES['cookies'])
    svg = inject_colors(svg, COLORS)
    return render_template('scenes/cookies.html', svg=svg)


@app.route('/scene/captcha')
def scene_captcha():
    svg = load_svg('captcha.svg', viewbox=VIEWBOXES['captcha'])
    svg = inject_colors(svg, COLORS)
    return render_template('scenes/captcha.html', svg=svg)


@app.route('/scene/update')
def scene_update():
    svg = load_svg('update.svg', viewbox=VIEWBOXES['update'])
    svg = inject_colors(svg, COLORS)
    return render_template('scenes/update.html', svg=svg)



if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, port=port)
