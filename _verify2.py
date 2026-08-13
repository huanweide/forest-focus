# -*- coding: utf-8 -*-
"""forest-focus 专项验证 v3：精灵位置/越界 + 跨刷新持久化 + 金币联动UI"""
import http.server, socketserver, threading, os, functools
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 8099
OUT = os.path.join(ROOT, "_shots")
os.makedirs(OUT, exist_ok=True)
socketserver.TCPServer.allow_reuse_address = True
Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
httpd = socketserver.TCPServer(("127.0.0.1", PORT), Handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{PORT}/index.html"
print("server up:", URL)

results = []
def log(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS " if ok else "FAIL ") + "| " + name + " | " + str(detail))

try:
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)
        pg = b.new_page(viewport={"width": 1280, "height": 860})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("dialog", lambda d: d.accept("测试项"))
        pg.goto(URL, wait_until="networkidle", timeout=30000)
        pg.wait_for_timeout(1200)

        # ===== Part A: 精灵居中 + 物理越界 =====
        pg.evaluate("() => { goTab(0); }")
        pg.wait_for_timeout(800)
        init = pg.evaluate("""() => {
          var w=document.getElementById('homeAzusaWrap'), s=document.getElementById('homeScene');
          var wr=w.getBoundingClientRect(), sr=s.getBoundingClientRect();
          return {wcx:wr.left+wr.width/2, wcy:wr.top+wr.height/2,
                  scx:sr.left+sr.width/2, scy:sr.top+sr.height/2,
                  tf:getComputedStyle(w).transform};
        }""")
        init_offset = abs(init['wcx']-init['scx']) + abs(init['wcy']-init['scy'])
        log("精灵初始居中", init_offset < 60, f"offset={init_offset:.0f}px tf={init['tf']}")

        pg.evaluate("""() => { chibiState.oldX = chibiState.x - 22; chibiState.oldY = chibiState.y - 8; chibiState.flying=true; chibiState.settled=false; startChibiPhysics(); }""")
        pg.wait_for_timeout(4500)
        fin = pg.evaluate("""() => {
          var w=document.getElementById('homeAzusaWrap'), s=document.getElementById('homeScene');
          var wr=w.getBoundingClientRect(), sr=s.getBoundingClientRect();
          return {wl:wr.left, wt:wr.top, wr2:wr.right, wb:wr.bottom,
                  sl:sr.left, st:sr.top, sr2:sr.right, sb:sr.bottom,
                  tf:getComputedStyle(w).transform};
        }""")
        oob = fin['wl'] < fin['sl']-8 or fin['wt'] < fin['st']-8 or fin['wr2'] > fin['sr2']+8 or fin['wb'] > fin['sb']+8
        log("精灵物理后不越界", not oob, f"final_rect={fin}")

        # ===== Part B: 跨刷新持久化 + 金币联动UI =====
        pg.evaluate("() => { localStorage.clear(); }")
        pg.reload(wait_until="networkidle"); pg.wait_for_timeout(1200)
        pg.wait_for_selector('#coinVal', timeout=5000)
        pg.evaluate("() => { goTab(3); }"); pg.wait_for_timeout(400)
        coins0 = pg.evaluate("() => AppState.coins")
        disp0 = pg.evaluate("() => document.getElementById('coinVal').textContent")
        pg.evaluate("() => { addHabit(); }"); pg.wait_for_timeout(400)
        pg.evaluate("""() => { var el=document.querySelector('#habitsList .ht-ck'); if(el) el.click(); }"""); pg.wait_for_timeout(500)
        h_len = pg.evaluate("() => (window.habits||[]).length")
        h_dates = pg.evaluate("() => { var h=(window.habits||[]).find(function(x){return !x.archived}); return h?(h.dates||[]).length:0; }")
        coins1 = pg.evaluate("() => AppState.coins")
        disp1 = pg.evaluate("() => document.getElementById('coinVal').textContent")
        log("习惯打卡金币联动UI", coins1 > coins0 and disp1 == str(coins1), f"coins {coins0}->{coins1} disp {disp0}->{disp1}")

        pg.reload(wait_until="networkidle"); pg.wait_for_timeout(1200)
        h_len2 = pg.evaluate("() => (window.habits||[]).length")
        h_dates2 = pg.evaluate("() => { var h=(window.habits||[]).find(function(x){return !x.archived}); return h?(h.dates||[]).length:0; }")
        coins2 = pg.evaluate("() => AppState.coins")
        log("持久化-习惯跨刷新", h_len2 == h_len and h_dates2 == h_dates, f"len {h_len}->{h_len2} dates {h_dates}->{h_dates2}")
        log("持久化-金币跨刷新", coins2 == coins1, f"coins {coins1}->{coins2}")

        print("\n=== PAGEERRORS ===")
        for e in errs: print("  ", e)
        print("=== SUMMARY ===")
        for n, o, d in results: print(("PASS" if o else "FAIL"), n, d)
        nf = sum(1 for _, o, _ in results if not o)
        print(f"\nTOTAL: {len(results)} tests, {nf} failed")
        b.close()
finally:
    httpd.shutdown()
    print("server stopped")
