"""Prova automatica di Fiato Sospeso (richiede Playwright). Uso: python3 tests/test_sensore.py"""
from playwright.sync_api import sync_playwright
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").as_uri() + "?debug"
SH = str(ROOT / "screenshot") + "/"
Path(SH).mkdir(exist_ok=True)
errors = []
GEN = """
if (typeof DeviceMotionEvent !== "undefined") { window.__amp = 0.02; window.__tilt = 0;
setInterval(() => {
  const a = window.__amp, r = () => (Math.random() - 0.5) * 2 * a, tz = window.__tilt * Math.PI / 180;
  window.dispatchEvent(new DeviceMotionEvent('devicemotion', {
    acceleration: { x: r(), y: r(), z: r() },
    accelerationIncludingGravity: { x: 9.81 * Math.sin(tz) + r(), y: r(), z: 9.81 * Math.cos(tz) + r() },
    rotationRate: { alpha: r() * 20, beta: r() * 20, gamma: r() * 20 }, interval: 16 }));
}, 16); }
"""
def wait_active(page, name, timeout=9000):
    page.wait_for_function(f"document.getElementById('s-{name}').classList.contains('active')", timeout=timeout)
def phase(page): return page.evaluate("window.__fs.P.phase")

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, color_scheme='light')
    ctx.add_init_script(GEN)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL); page.wait_for_timeout(800)

    # prova la fiala
    page.click('text=Prova la fiala'); wait_active(page, 'test')
    page.click('#test-on'); page.wait_for_timeout(1500)
    page.evaluate("window.__amp = 1.6"); page.wait_for_timeout(600)
    page.screenshot(path=SH + 'm01_test.png')
    page.evaluate("window.__amp = 0.02")
    page.click('#s-test [data-go="home"]'); wait_active(page, 'home')

    page.click('text=Nuova partita'); wait_active(page, 'setup')
    for n in ['Olivia', 'Stellina']:
        page.fill('#name-in', n); page.press('#name-in', 'Enter')
    page.click('#rounds [data-val="2"]'); page.click('#levels [data-val="soft"]')
    page.click('#start-btn'); wait_active(page, 'turn')
    print('mode:', page.evaluate("window.__fs.G.mode"))

    # turno 1: incasso
    page.click('#turn-go'); wait_active(page, 'play'); page.wait_for_timeout(1000)
    page.screenshot(path=SH + 'm02_calib.png')
    page.wait_for_function("window.__fs.P.phase === 'armed'", timeout=8000)
    page.wait_for_timeout(6000)
    page.evaluate("window.__amp = 0.9"); page.wait_for_timeout(700)
    page.screenshot(path=SH + 'm03_armed_shaky.png')
    page.evaluate("window.__amp = 0.02"); page.wait_for_timeout(500)
    print('phase before bank:', phase(page))
    page.click('#bank-btn'); wait_active(page, 'next'); page.wait_for_timeout(300)
    page.screenshot(path=SH + 'm04_next.png')

    # consegna in movimento
    page.evaluate("window.__tilt = 50")   # telefono ancora inclinato mentre scelgo
    page.locator('#pick-list button').first.click(); wait_active(page, 'play'); page.wait_for_timeout(900)
    print('transit live while tilted?', page.evaluate("window.__fs.P.live"), phase(page))
    page.screenshot(path=SH + 'm05_transit_prep.png')
    page.evaluate("window.__tilt = 5"); page.wait_for_timeout(1200)
    print('transit live when flat?', page.evaluate("window.__fs.P.live"))
    page.screenshot(path=SH + 'm06_transit_live.png')
    page.click('#take-btn'); page.wait_for_timeout(300)
    print('after Presa:', phase(page))
    page.wait_for_function("window.__fs.P.phase === 'armed'", timeout=8000)
    page.wait_for_timeout(2500)
    page.evaluate("window.__amp = 14"); wait_active(page, 'boom'); page.wait_for_timeout(250)
    page.screenshot(path=SH + 'm07_boom_mid.png')
    page.wait_for_timeout(900)
    page.screenshot(path=SH + 'm08_boom.png')
    page.evaluate("window.__amp = 0.02")
    page.click('#boom-next'); wait_active(page, 'next')
    page.click('text=Vedi la classifica'); wait_active(page, 'round')
    page.screenshot(path=SH + 'm09_round.png')
    page.click('#round-go'); wait_active(page, 'turn')

    # giro 2: esplosione per inclinazione, poi incidente in consegna
    page.click('#turn-go'); page.wait_for_function("window.__fs.P.phase === 'armed'", timeout=8000)
    page.wait_for_timeout(1500); page.evaluate("window.__tilt = 70"); wait_active(page, 'boom'); page.wait_for_timeout(1000)
    print('boom cause:', page.inner_text('#boom-cause'))
    page.evaluate("window.__tilt = 3"); page.click('#boom-next'); wait_active(page, 'next')
    page.locator('#pick-list button').first.click(); page.wait_for_function("window.__fs.P.live === true", timeout=6000)
    page.evaluate("window.__amp = 14"); wait_active(page, 'boom'); page.wait_for_timeout(1000)
    page.screenshot(path=SH + 'm10_transit_boom.png')
    print('transit boom:', page.inner_text('#boom-cause'), '|', page.inner_text('#boom-lost'))
    page.evaluate("window.__amp = 0.02"); page.click('#boom-next'); wait_active(page, 'turn')
    page.click('#turn-go'); page.wait_for_function("window.__fs.P.phase === 'armed'", timeout=8000)
    page.wait_for_timeout(5600); page.click('#bank-btn'); wait_active(page, 'next')
    page.click('text=Vedi la classifica'); wait_active(page, 'final'); page.wait_for_timeout(400)
    page.screenshot(path=SH + 'm11_final.png', full_page=True)

    # orizzontale
    page.set_viewport_size({'width': 844, 'height': 390})
    page.click('#again-btn'); wait_active(page, 'turn'); page.click('#turn-go')
    page.wait_for_function("window.__fs.P.phase === 'armed'", timeout=8000); page.wait_for_timeout(1200)
    page.screenshot(path=SH + 'm12_landscape.png')
    b.close()
print('ERRORS:', errors or 'none')
