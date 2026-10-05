/**
 * app.test.mjs —— 阿梓的森林 · 核心逻辑单元测试
 *
 * 运行：node --test tests/
 *
 * 背景：本项目是「一个 index.html + 若干全局 <script>」的零构建单页应用，
 * 模块之间靠全局变量通信，没有 import/export，因此无法直接 import 进来测。
 * 这里用 node:vm 造一个带 localStorage 的最小运行环境，按生产顺序把
 * core.js / betting.js 灌进去，再从沙箱里把需要测的对象取出来断言。
 * 这样既不用改造线上代码，也能让核心状态机在 CI 里被真正验证。
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 造一个隔离的浏览器环境沙箱 */
function makeSandbox() {
  const store = new Map();
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    },
    Date, JSON, Math, setTimeout, clearTimeout, setInterval, clearInterval,
    parseInt, parseFloat, isNaN, String, Number, Boolean, Array, Object,
    RegExp, Error, Promise, encodeURIComponent, decodeURIComponent,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  return sandbox;
}

/** 按生产加载顺序灌入脚本，返回沙箱句柄 */
function loadApp(files = ['src/js/core.js', 'src/js/betting.js']) {
  const ctx = vm.createContext(makeSandbox());
  for (const f of files) {
    vm.runInContext(readFileSync(join(ROOT, f), 'utf-8'), ctx, { filename: f });
  }
  vm.runInContext(
    'globalThis.__t = { AppState, Storage, Utils, EventBus, calcBetReturn, addCoins };',
    ctx
  );
  return ctx.__t;
}

describe('Utils', () => {
  test('today() 返回 YYYY-MM-DD', () => {
    const { Utils } = loadApp();
    assert.match(Utils.today(), /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('AppState 金币收支', () => {
  test('addCoins 正确累加并记录流水', () => {
    const { AppState } = loadApp();
    const before = AppState.coins;
    AppState.addCoins(100, 'test_add');
    assert.equal(AppState.coins, before + 100);
    const last = AppState.coinLog[AppState.coinLog.length - 1];
    assert.equal(last.amount, 100);
    assert.equal(last.reason, 'test_add');
  });

  test('金币余额不会被扣成负数', () => {
    const { AppState } = loadApp();
    AppState.set('coins', 10);
    AppState.addCoins(-999, 'test_negative');
    assert.equal(AppState.coins, 0, 'addCoins 负数时应钳到 0，不能出现负余额');
  });

  test('spendCoins 余额不足时返回 false 且不改变余额', () => {
    const { AppState } = loadApp();
    AppState.set('coins', 30);
    assert.equal(AppState.spendCoins(50, 'test_fail'), false);
    assert.equal(AppState.coins, 30, '失败的扣款不应该改动余额');
  });

  test('spendCoins 成功时扣减并记负流水', () => {
    const { AppState } = loadApp();
    AppState.set('coins', 100);
    assert.equal(AppState.spendCoins(40, 'test_ok'), true);
    assert.equal(AppState.coins, 60);
    const last = AppState.coinLog[AppState.coinLog.length - 1];
    assert.equal(last.amount, -40);
  });
});

describe('AppState 专注记录', () => {
  test('完成一次专注会累加 totalCompletions 并派发 focus:completed', () => {
    const { AppState, EventBus } = loadApp();
    let fired = null;
    EventBus.on('focus:completed', (s) => { fired = s; });

    const before = AppState.totalCompletions;
    const session = { date: '2026-10-06', minutes: 25, completed: true };
    AppState.addSession(session);

    assert.equal(AppState.totalCompletions, before + 1);
    assert.ok(fired, '应派发 focus:completed，衣装解锁与成就依赖该事件');
    assert.equal(fired.minutes, 25);
  });

  test('放弃的专注不计入 totalCompletions', () => {
    const { AppState } = loadApp();
    const before = AppState.totalCompletions;
    AppState.addSession({ date: '2026-10-06', minutes: 5, completed: false });
    assert.equal(AppState.totalCompletions, before);
  });
});

describe('习惯打卡', () => {
  test('completeHabit 递增连续天数，健康值上限 100', () => {
    const { AppState } = loadApp();
    AppState.set('habits', [{ id: 'h1', name: '早起', done: false, streak: 0, health: 98 }]);
    AppState.completeHabit('h1');
    const h = AppState.habits.find((x) => x.id === 'h1');
    assert.equal(h.streak, 1);
    assert.equal(h.health, 100, '健康值不能超过 100');
    assert.equal(h.done, true);
  });

  test('完成不存在的习惯不应抛错', () => {
    const { AppState } = loadApp();
    assert.doesNotThrow(() => AppState.completeHabit('not_exist'));
  });
});

describe('押注倍率', () => {
  test('各档时长倍率与时长的对应关系正确', () => {
    const { calcBetReturn } = loadApp();
    // 押注 100 金币、不同时长的预期回报
    assert.equal(calcBetReturn(100, 20), 120);
    assert.equal(calcBetReturn(100, 25), 150);
    assert.equal(calcBetReturn(100, 30), 180);
    assert.equal(calcBetReturn(100, 45), 200);
    assert.equal(calcBetReturn(100, 60), 250);
  });

  test('未列出的时长回落到 1.5 倍，押注额为 0 时回报为 0', () => {
    const { calcBetReturn } = loadApp();
    assert.equal(calcBetReturn(100, 999), 150);
    assert.equal(calcBetReturn(0, 25), 0);
  });
});

describe('存储持久化', () => {
  test('saveState 后重新加载能还原金币与专注记录', () => {
    const ctx1 = vm.createContext(makeSandbox());
    vm.runInContext(readFileSync(join(ROOT, 'src/js/core.js'), 'utf-8'), ctx1);
    vm.runInContext('globalThis.__t = { AppState };', ctx1);
    ctx1.__t.AppState.set('coins', 777);
    const saved = ctx1.localStorage.getItem('fstate');

    assert.ok(saved, '应写入 fstate');

    // 用同一份 localStorage 内容造新沙箱，模拟刷新页面
    const store = new Map([['fstate', saved]]);
    const sb = makeSandbox();
    sb.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
    const ctx2 = vm.createContext(sb);
    vm.runInContext(readFileSync(join(ROOT, 'src/js/core.js'), 'utf-8'), ctx2);
    vm.runInContext('globalThis.__t = { AppState };', ctx2);

    assert.equal(ctx2.__t.AppState.coins, 777, '刷新后金币应还原');
  });
});
