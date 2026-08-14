#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
windows-focus-lock.py — 阿梓的专注锁 · Windows 端软锁原型

全屏专注计时 + 低层键盘钩子拦截分心快捷键，把注意力留在当前窗口：
  - 拦截：Win 键、Alt+Tab、Ctrl+Esc、Alt+Esc
  - 放行（逃生口）：Esc、Alt+F4、界面「停止专注」按钮、鼠标点击
纯标准库（ctypes + tkinter），无需第三方依赖。仅 Windows 运行。

用法：
  python windows-focus-lock.py            # 默认 25 分钟
  python windows-focus-lock.py 50         # 50 分钟

说明：
  - 钩子随进程退出自动卸载（Windows 在进程结束时移除其钩子），不会造成永久锁死。
  - 这是「软锁」：保留逃生口，符合「电脑端就是一个专注」的定位。
  - 若要真正不可退出（kiosk），见 会议/专注模式锁机调研/05-Windows思路.md 的 Assigned Access 方案。
"""

import sys
import threading


def main():
    if sys.platform != "win32":
        print("本原型仅支持 Windows。其他平台请用 PWA / Android 版。")
        return

    import tkinter as tk
    import ctypes
    import ctypes.wintypes as wt

    # ---------- 低层键盘钩子 ----------
    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32

    WH_KEYBOARD_LL = 13
    WM_KEYDOWN = 0x0100
    VK_TAB = 0x09
    VK_ESCAPE = 0x1B
    VK_LWIN = 0x5B
    VK_RWIN = 0x5C
    VK_MENU = 0x12      # Alt
    VK_CONTROL = 0x11

    HOOKPROC = ctypes.WINFUNCTYPE(ctypes.c_int, ctypes.c_int, wt.WPARAM, wt.LPARAM)

    class KBDLLHOOKSTRUCT(ctypes.Structure):
        _fields_ = [
            ("vkCode", ctypes.c_int),
            ("scanCode", ctypes.c_int),
            ("flags", ctypes.c_int),
            ("time", ctypes.c_int),
            ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong)),
        ]

    user32.SetWindowsHookExW.argtypes = (ctypes.c_int, HOOKPROC, wt.HINSTANCE, ctypes.c_uint)
    user32.SetWindowsHookExW.restype = wt.HHOOK
    user32.CallNextHookEx.argtypes = (wt.HHOOK, ctypes.c_int, wt.WPARAM, wt.LPARAM)
    user32.CallNextHookEx.restype = ctypes.c_int
    user32.UnhookWindowsHookEx.argtypes = (wt.HHOOK,)
    user32.UnhookWindowsHookEx.restype = ctypes.c_int
    user32.GetAsyncKeyState.argtypes = (ctypes.c_int,)
    user32.GetAsyncKeyState.restype = ctypes.c_short
    kernel32.GetModuleHandleW.argtypes = (ctypes.c_wchar_p,)
    kernel32.GetModuleHandleW.restype = wt.HINSTANCE

    hook = None

    def is_down(vk):
        return bool(user32.GetAsyncKeyState(vk) & 0x8000)

    def low_level_keyboard_proc(nCode, wParam, lParam):
        if nCode >= 0 and wParam == WM_KEYDOWN:
            kb = ctypes.cast(lParam, ctypes.POINTER(KBDLLHOOKSTRUCT)).contents
            vk = kb.vkCode
            alt = is_down(VK_MENU)
            ctrl = is_down(VK_CONTROL)
            # 吞掉分心快捷键，其余放行
            if (
                vk in (VK_LWIN, VK_RWIN)        # Win 键
                or (vk == VK_TAB and alt)        # Alt+Tab
                or (vk == VK_ESCAPE and ctrl)    # Ctrl+Esc
                or (vk == VK_ESCAPE and alt)     # Alt+Esc
            ):
                return 1
        return user32.CallNextHookEx(hook, nCode, wParam, lParam)

    callback = HOOKPROC(low_level_keyboard_proc)

    def install_hook():
        nonlocal hook
        hook = user32.SetWindowsHookExW(WH_KEYBOARD_LL, callback,
                                        kernel32.GetModuleHandleW(None), 0)

    def uninstall_hook():
        nonlocal hook
        if hook:
            user32.UnhookWindowsHookEx(hook)
            hook = None

    # ---------- UI ----------
    root = tk.Tk()
    root.title("阿梓的专注锁 · Windows")
    root.configure(bg="#0F1B14")
    try:
        root.state("zoomed")
        root.attributes("-fullscreen", True)
    except Exception:
        pass
    root.protocol("WM_DELETE_WINDOW", lambda: stop())

    big_font = ("Microsoft YaHei", 90, "bold")
    sub_font = ("Microsoft YaHei", 16)
    btn_font = ("Microsoft YaHei", 18, "bold")

    title = tk.Label(root, text="🌳 专注中 · 软锁", bg="#0F1B14",
                     fg="#5BD6A0", font=sub_font)
    title.pack(pady=(60, 10))

    time_label = tk.Label(root, text="25:00", bg="#0F1B14", fg="#EAF6EF",
                          font=big_font)
    time_label.pack(pady=10)

    hint = tk.Label(root, text="Win / Alt+Tab / Ctrl+Esc 已拦截 · 按 Esc 或点按钮退出",
                    bg="#0F1B14", fg="#9DB7A8", font=sub_font)
    hint.pack(pady=(10, 30))

    stop_btn = tk.Button(root, text="停止专注", command=lambda: stop(),
                         bg="#E07A5F", fg="#fff", font=btn_font,
                         width=14, height=1, relief="flat")
    stop_btn.pack()

    total_min = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 25
    remaining = total_min * 60
    running = {"on": True}

    def tick():
        if not running["on"]:
            return
        m, s = divmod(remaining, 60)
        time_label.config(text="%02d:%02d" % (m, s))
        root.after(1000, tick)

    def stop():
        if not running["on"]:
            return
        running["on"] = False
        try:
            uninstall_hook()
        except Exception:
            pass
        try:
            root.destroy()
        except Exception:
            pass

    # Esc 退出（钩子不拦截单独 Esc，Tkinter 收到后停止）
    root.bind("<Escape>", lambda e: stop())

    install_hook()
    import atexit
    atexit.register(uninstall_hook)

    tick()
    root.mainloop()


if __name__ == "__main__":
    main()
