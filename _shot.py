from playwright.sync_api import sync_playwright
import os, time

URL = 'http://127.0.0.1:8080/index.html'
OUT = '_shots'
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 860})
    logs = []
    fails = []
    page.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
    page.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
    page.on('requestfailed', lambda r: fails.append(f'FAILED: {r.url} => {r.failure}'))
    page.goto(URL, wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(1500)
    labels = {0: 'home', 1: 'focus', 2: 'wardrobe', 3: 'habits', 4: 'goals', 5: 'profile'}
    for i in range(6):
        page.evaluate(f'goTab({i})')
        page.wait_for_timeout(900)
        page.screenshot(path=f'{OUT}/tab{i}_{labels[i]}.png')
        print('shot', i, labels[i])
    # home sprite interaction + wander (JS click to bypass unstable animation)
    page.evaluate('goTab(0)')
    page.wait_for_timeout(400)
    try:
        for _ in range(6):
            page.evaluate("""
                var img = document.getElementById('homeAzusaImg');
                if (img) img.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, clientX:0, clientY:0}));
            """)
            page.wait_for_timeout(300)
        page.wait_for_timeout(5000)
        page.screenshot(path=f'{OUT}/home_sprite.png')
        print('shot home_sprite')
    except Exception as e:
        logs.append(f'SPRITE_CLICK_ERR: {e}')
    with open(f'{OUT}/console.txt', 'w', encoding='utf-8') as f:
        f.write('--- console ---\n')
        f.write('\n'.join(logs) if logs else '(no console messages)')
        f.write('\n--- failed requests ---\n')
        f.write('\n'.join(fails) if fails else '(no failed requests)')
    browser.close()
print('shots done')
