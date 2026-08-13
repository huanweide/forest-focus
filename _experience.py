# -*- coding: utf-8 -*-
"""
forest-focus 真机体验测试 v2（严格可见性验证）
- 自起静态服务器 + playwright + 系统 chrome 真浏览器
- 每个功能：操作前/后断言，并对关键 UI 做"真实可见性"检查（尺寸>0 / display!=none / visibility!=hidden / opacity>0）
- 修正 v1 的两个误报：签到查 #checkinOverlay（非 #checkinCard）；换装查 .tg-card 树装备 + outfitList/equipList 容器
- 截图存 _shots/；控制台/PAGEERROR/失败请求一并收集
"""
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

VIS = """(sel) => {
  var el = sel ? document.querySelector(sel) : null;
  if (!el) return {exists:false};
  var r = el.getBoundingClientRect();
  var cs = getComputedStyle(el);
  return {exists:true, w:Math.round(r.width), h:Math.round(r.height), disp:cs.display, vis:cs.visibility, op:parseFloat(cs.opacity)};
}"""

try:
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)
        pg = b.new_page(viewport={"width": 1280, "height": 860})
        logs, errs, fails = [], [], []
        pg.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("requestfailed", lambda r: fails.append(r.url))
        pg.on("dialog", lambda d: d.accept("测试项"))

        pg.goto(URL, wait_until="networkidle", timeout=30000)
        pg.wait_for_timeout(1500)

        # ===== 1. 首页 + 点题（精灵点击） =====
        pg.evaluate("() => { goTab(0); }")
        pg.wait_for_timeout(700)
        pg.screenshot(path=f"{OUT}/01_home.png")
        home_on = pg.evaluate("() => { var el=document.getElementById('pg5'); return el?getComputedStyle(el).display:'none'; }")
        box = pg.locator("#homeAzusaWrap").bounding_box()
        tapped = False; err = ""
        if box:
            try:
                pg.locator("#homeAzusaWrap").click(force=True, timeout=5000); tapped = True
            except Exception as e:
                err = str(e)
        pg.wait_for_timeout(600)
        info = pg.evaluate("() => { var b=document.getElementById('homeAzusaBubble'); return {disp:(b?b.style.display:'none'), txt:(b?b.textContent:'')}; }")
        particles = pg.evaluate("() => { return document.querySelectorAll('.chibi-emoji-particle').length; }")
        pg.screenshot(path=f"{OUT}/02_sprite_tap.png")
        ok = home_on != "none" and tapped and info["disp"] == "block" and len(info["txt"]) > 0
        log("首页可见+点题(精灵→气泡)", ok, f"homeDisp={home_on} tapped={tapped} bubble={info['disp']!r} txt={info['txt']!r} particles={particles} {err}")

        # ===== 2. 专注计时-开始 =====
        pg.evaluate("() => { goTab(1); }")
        pg.wait_for_timeout(500)
        focus_on = pg.evaluate("() => { var el=document.getElementById('pg0'); return el?getComputedStyle(el).display:'none'; }")
        pg.screenshot(path=f"{OUT}/03_focus.png")
        pg.click("#btnGo"); pg.wait_for_timeout(2500)
        fs = pg.evaluate("() => { return { btnGo:getComputedStyle(document.getElementById('btnGo')).display, btnStop:getComputedStyle(document.getElementById('btnStop')).display, time:(document.getElementById('time')||{}).textContent, status:(document.getElementById('status')||{}).textContent }; }")
        pg.screenshot(path=f"{OUT}/04_focus_running.png")
        ok = focus_on != "none" and fs["btnStop"] != "none" and fs["btnGo"] == "none"
        log("专注计时-开始种树", ok, f"focusDisp={focus_on} time={fs['time']!r} status={fs['status']!r}")
        pg.evaluate("() => { if(typeof timerId!=='undefined' && timerId) abort(); }")
        pg.wait_for_timeout(400)

        # ===== 3. 习惯-新增+打卡（含可见性） =====
        pg.evaluate("() => { goTab(3); }")
        pg.wait_for_timeout(500)
        habits_on = pg.evaluate("() => { var el=document.getElementById('pg2'); return el?getComputedStyle(el).display:'none'; }")
        before = pg.evaluate("() => { return (window.habits||[]).length; }")
        pg.evaluate("() => { addHabit(); }")
        pg.wait_for_timeout(600)
        after_add = pg.evaluate("() => { return (window.habits||[]).length; }")
        card_vis = pg.evaluate(VIS, "#habitsList .ht-ck")
        pg.screenshot(path=f"{OUT}/05_habits_add.png")
        if after_add > before:
            pg.evaluate("() => { var el=document.querySelector('#habitsList .ht-ck'); if(el) el.click(); }")
            pg.wait_for_timeout(500)
        tog = pg.evaluate("() => { var h=(window.habits||[]).find(function(x){return !x.archived}); return h?{dates:(h.dates||[]).length,streak:h.streak,health:h.health,done:h.done}:null; }")
        pg.screenshot(path=f"{OUT}/06_habits_toggle.png")
        ok = habits_on != "none" and (after_add == before + 1) and (card_vis.get("exists") and card_vis.get("w",0)>0 and card_vis.get("disp")!="none") and tog and tog["dates"] >= 1
        log("习惯-新增+打卡(可见)", ok, f"habitsDisp={habits_on} before={before} after={after_add} cardVis={card_vis} toggle={tog}")

        # ===== 4. 目标-新增+tick（含可见性） =====
        pg.evaluate("() => { goTab(4); }")
        pg.wait_for_timeout(500)
        goals_on = pg.evaluate("() => { var el=document.getElementById('pg3'); return el?getComputedStyle(el).display:'none'; }")
        before_g = pg.evaluate("() => { return (window.goals||[]).length; }")
        pg.evaluate("() => { addGoal(); }")
        pg.wait_for_timeout(600)
        after_g = pg.evaluate("() => { return (window.goals||[]).length; }")
        g_card_vis = pg.evaluate(VIS, "#goalsList button")
        pg.screenshot(path=f"{OUT}/07_goals_add.png")
        pg.evaluate("() => { var g=(window.goals||[]).find(function(x){return !x.archived}); if(g) tickGoal(g.id); }")
        pg.wait_for_timeout(500)
        tk = pg.evaluate("() => { var g=(window.goals||[]).find(function(x){return !x.archived}); return g?{done:g.done,tomatoes:g.tomatoes}:null; }")
        pg.screenshot(path=f"{OUT}/08_goals_tick.png")
        ok = goals_on != "none" and (after_g == before_g + 1) and (g_card_vis.get("exists") and g_card_vis.get("w",0)>0) and tk and tk["done"] >= 1
        log("目标-新增+番茄tick(可见)", ok, f"goalsDisp={goals_on} before={before_g} after={after_g} cardVis={g_card_vis} tick={tk}")

        # ===== 5. 换装衣柜（树装备 .tg-card + 穿搭/商城容器） =====
        pg.evaluate("() => { goTab(2); }")
        pg.wait_for_timeout(700)
        dress_on = pg.evaluate("() => { var el=document.getElementById('pg1'); return el?getComputedStyle(el).display:'none'; }")
        tg = pg.evaluate("() => { return document.querySelectorAll('#treeGallery .tg-card').length; }")
        first_tg_vis = pg.evaluate(VIS, "#treeGallery .tg-card")
        outfit_len = pg.evaluate("() => { var el=document.getElementById('outfitList'); return el?el.innerHTML.length:0; }")
        equip_len = pg.evaluate("() => { var el=document.getElementById('equipList'); return el?el.innerHTML.length:0; }")
        pg.screenshot(path=f"{OUT}/09_dressup.png")
        ok = dress_on != "none" and tg > 0 and (first_tg_vis.get("exists") and first_tg_vis.get("w",0)>0 and first_tg_vis.get("disp")!="none") and outfit_len > 10 and equip_len > 10
        log("换装衣柜-树装备+穿搭UI渲染", ok, f"dressDisp={dress_on} tg_cards={tg} firstTgVis={first_tg_vis} outfitLen={outfit_len} equipLen={equip_len}")

        # ===== 6. 签到弹卡（#checkinOverlay） =====
        pg.evaluate("() => { goTab(5); }")
        pg.wait_for_timeout(500)
        profile_on = pg.evaluate("() => { var el=document.getElementById('pg4'); return el?getComputedStyle(el).display:'none'; }")
        pg.evaluate("() => { showCheckinCard(); }")
        pg.wait_for_timeout(500)
        ck = pg.evaluate("() => { var el=document.getElementById('checkinOverlay'); if(!el) return {disp:'none',len:0}; return {disp:getComputedStyle(el).display, len:el.innerHTML.length}; }")
        ck_vis = pg.evaluate(VIS, "#checkinOverlay .checkin-card")
        pg.screenshot(path=f"{OUT}/10_checkin.png")
        ok = profile_on != "none" and ck.get("disp") not in ("none","") and ck.get("len",0) > 50 and (ck_vis.get("exists") and ck_vis.get("w",0)>0)
        log("签到-弹卡(可见)", ok, f"profileDisp={profile_on} overlayDisp={ck.get('disp')!r} len={ck.get('len')} cardVis={ck_vis}")

        # ===== 汇总 =====
        print("\n=== PAGEERRORS ===")
        for e in errs: print("  ", e)
        print("=== FAILED REQUESTS ===")
        for f in fails: print("  ", f)
        print("=== SUMMARY ===")
        for n, o, d in results: print(("PASS" if o else "FAIL"), n, d)
        nf = sum(1 for _, o, _ in results if not o)
        print(f"\nTOTAL: {len(results)} tests, {nf} failed")
        pg.screenshot(path=f"{OUT}/11_final.png")
        b.close()
finally:
    httpd.shutdown()
    print("server stopped")
