"""Prova automatica di Fiato Sospeso (richiede Playwright). Uso: python3 tests/test_modalita_dito.py"""
from playwright.sync_api import sync_playwright
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").as_uri() + "?debug"
SH = str(ROOT / "screenshot") + "/"
Path(SH).mkdir(exist_ok=True)
errors = []
def wait_active(page, name, timeout=8000):
    page.wait_for_function(f"document.getElementById('s-{name}').classList.contains('active')", timeout=timeout)
def box(page): return page.locator('#cv-play').bounding_box()

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, color_scheme='dark')
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL); page.wait_for_timeout(1200)
    page.screenshot(path=SH + 'd01_home_dark.png')
    page.click('text=Nuova partita'); wait_active(page, 'setup')
    for n in ['Marta', 'Luca', 'Giò']:
        page.fill('#name-in', n); page.press('#name-in', 'Enter')
    page.click('[data-key="forceTouch"]')
    page.click('#start-btn'); wait_active(page, 'turn')
    page.click('#turn-go'); wait_active(page, 'play'); page.wait_for_timeout(300)
    b1 = box(page)
    page.screenshot(path=SH + 'd02_calib_touch.png')
    x, y = b1['x'] + b1['width']/2, b1['y'] + b1['height']/2
    page.mouse.move(x, y); page.mouse.down()
    page.wait_for_function("window.__fs.P.phase === 'armed'", timeout=8000)
    b2 = box(page)
    print('canvas calib', b1, '\ncanvas armed', b2)
    # seguo il bersaglio per 17 secondi
    boomed = False
    for i in range(170):
        st = page.evaluate("(() => { const P = window.__fs.P, V = window.__fs.V; return { ph: P.phase, t: P.vp.target, d: V.play.dpr, held: P.held }; })()")
        if st['ph'] != 'armed': boomed = True; break
        bb = box(page)
        tx = bb['x'] + st['t']['x'] / st['d']; ty = bb['y'] + st['t']['y'] / st['d']
        page.mouse.move(tx, ty)
        if i == 60: page.screenshot(path=SH + 'd03_armed_touch.png')
        page.wait_for_timeout(100)
    b3 = box(page)
    print('canvas after complication', b3, 'boomed', boomed)
    page.screenshot(path=SH + 'd04_complication_touch.png')
    page.keyboard.press('Space'); page.mouse.up()
    wait_active(page, 'next'); page.wait_for_timeout(400)
    page.screenshot(path=SH + 'd05_next_dark.png')
    b.close()
print('ERRORS:', errors or 'none')
