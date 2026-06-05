#!/usr/bin/env python3
"""
build.py - 阿梓的森林 v4.0 构建脚本
将模块化的 CSS/JS 文件合并打包到单一 dist/index.html
用法：python build.py
"""
import os, re, shutil, sys

# 强制 UTF-8 输出
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = os.path.dirname(os.path.abspath(__file__))
SRC_CSS = os.path.join(BASE, 'src', 'css')
SRC_JS = os.path.join(BASE, 'src', 'js')
DIST = os.path.join(BASE, 'dist')

# CSS文件合并顺序（按依赖）
CSS_FILES = [
    'variables.css',
    'base.css',
    'timer.css',
    'dressup.css',
    'stats.css',
    'chat.css',
    'effects.css',
]

# JS文件加载顺序（core.js必须第一，pwa.js必须最后）
JS_FILES = [
    'core.js',
    'timer.js',
    'habits.js',
    'goals.js',
    'stats.js',
    'achievements.js',
    'economy.js',
    'betting.js',
    'shop.js',
    'checkin.js',
    'dressup.js',
    'effects.js',
    'diary.js',
    'chat.js',
    'pwa.js',
]

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def build_css():
    """合并所有CSS文件"""
    css_parts = []
    for fname in CSS_FILES:
        fpath = os.path.join(SRC_CSS, fname)
        if os.path.exists(fpath):
            css = read_file(fpath)
            css_parts.append(f'/* === {fname} === */\n{css}')
        else:
            print(f'  ⚠ 跳过不存在的CSS: {fname}')
    return '\n'.join(css_parts)

def build_js():
    """合并所有JS文件（core.js在前面，其余按顺序）"""
    js_parts = []
    for fname in JS_FILES:
        fpath = os.path.join(SRC_JS, fname)
        if os.path.exists(fpath):
            js = read_file(fpath)
            js_parts.append(f'// === {fname} ===\n{js}')
        else:
            print(f'  ⚠ 跳过不存在的JS: {fname}')
    return '\n'.join(js_parts)

def build():
    print('🌳 阿梓的森林 v4.0 · 构建中...\n')

    # 读取模板
    template_path = os.path.join(BASE, 'index.html')
    if not os.path.exists(template_path):
        print('❌ 找不到 index.html 模板！')
        return
    html = read_file(template_path)

    # 1. 替换 CSS
    print('📦 打包 CSS...')
    css_content = build_css()
    css_pattern = r'<!-- BUILD:CSS -->.*?<!-- /BUILD:CSS -->'
    html = re.sub(css_pattern, lambda m: f'<style>\n{css_content}\n</style>', html, flags=re.DOTALL)

    # 2. 替换 JS_CORE
    core_path = os.path.join(SRC_JS, 'core.js')
    if os.path.exists(core_path):
        core_js = read_file(core_path)
        core_pattern = r'<!-- BUILD:JS_CORE -->.*?<!-- /BUILD:JS_CORE -->'
        html = re.sub(core_pattern, lambda m: f'<script>\n{core_js}\n</script>', html, flags=re.DOTALL)

    # 3. 替换 JS_MODULES（所有剩余JS合并）
    print('📦 打包 JS 模块...')
    js_content = build_js()

    # core.js 已经在 JS_CORE 中，从 JS_MODULES 合并中移除它
    js_lines = js_content.split('\n')
    filtered_lines = []
    skip = False
    for line in js_lines:
        if line.strip() == '// === core.js ===':
            skip = True
            continue
        if skip and line.startswith('// === ') and line != '// === core.js ===':
            skip = False
        if not skip:
            filtered_lines.append(line)
    js_content = '\n'.join(filtered_lines)

    modules_pattern = r'<!-- BUILD:JS_MODULES -->.*?<!-- /BUILD:JS_MODULES -->'
    html = re.sub(modules_pattern, lambda m: f'<script>\n{js_content}\n</script>', html, flags=re.DOTALL)

    # 4. 去掉 BUILD:HTML 注释标记（保留内容）
    html = html.replace('<!-- BUILD:HTML -->', '').replace('<!-- /BUILD:HTML -->', '')

    # 写入 dist
    os.makedirs(DIST, exist_ok=True)
    dist_path = os.path.join(DIST, 'index.html')
    with open(dist_path, 'w', encoding='utf-8') as f:
        f.write(html)

    # 复制静态资源
    print('📁 复制静态资源...')
    for folder in ['src/images', 'src/audio']:
        src = os.path.join(BASE, folder)
        dst = os.path.join(DIST, folder)
        if os.path.exists(src):
            if os.path.exists(dst):
                shutil.rmtree(dst)
            shutil.copytree(src, dst)

    for f in ['manifest.json', 'sw.js']:
        src = os.path.join(BASE, f)
        dst = os.path.join(DIST, f)
        if os.path.exists(src):
            shutil.copy2(src, dst)

    # 统计
    size_kb = os.path.getsize(dist_path) / 1024
    print(f'\n✅ 构建完成！')
    print(f'   📄 dist/index.html ({size_kb:.1f} KB)')
    print(f'   🌐 用浏览器打开 dist/index.html 即可使用')

if __name__ == '__main__':
    build()
