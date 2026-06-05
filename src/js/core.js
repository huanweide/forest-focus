/* core.js - 阿梓的森林 v4.0 核心模块
 * 职责：全局状态管理、事件总线、存储引擎、工具函数
 * 依赖：无（所有其他模块依赖本文件）
 * 暴露：AppState, EventBus, Storage, Utils
 */

// ==================== 事件总线 ====================
const EventBus = (function() {
  const _listeners = {};

  function on(event, handler) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(handler);
    return function() { off(event, handler); }; // 返回解绑函数
  }

  function off(event, handler) {
    if (!_listeners[event]) return;
    if (handler) {
      _listeners[event] = _listeners[event].filter(function(h) { return h !== handler; });
    } else {
      _listeners[event] = [];
    }
  }

  function emit(event, data) {
    if (!_listeners[event]) return;
    _listeners[event].forEach(function(handler) {
      try { handler(data); } catch(e) { console.error('EventBus error:', event, e); }
    });
  }

  // 清除所有监听器（用于重置）
  function clear() {
    for (var key in _listeners) { delete _listeners[key]; }
  }

  return { on: on, off: off, emit: emit, clear: clear };
})();

// ==================== 存储引擎 ====================
const Storage = (function() {
  var _backupKey = '_backup_';
  var _logMax = 1000;

  function _get(k) {
    try {
      var raw = localStorage.getItem(k);
      return raw ? JSON.parse(raw) : null;
    } catch(e) {
      console.warn('Storage read error:', k, e);
      return null;
    }
  }

  function _set(k, v) {
    try {
      var json = JSON.stringify(v);
      localStorage.setItem(k, json);
      return true;
    } catch(e) {
      if (e.name === 'QuotaExceededError') {
        console.warn('localStorage 容量不足，尝试清理旧数据');
        _trimOldData();
        try { localStorage.setItem(k, json); return true; } catch(e2) {}
      }
      console.warn('Storage write error:', k, e);
      return false;
    }
  }

  function _trimOldData() {
    // 保留最近180天的sessions
    try {
      var sessions = JSON.parse(localStorage.getItem('fs') || '[]');
      var cutoff = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
      var trimmed = sessions.filter(function(s) { return s.date >= cutoff; });
      localStorage.setItem('fs', JSON.stringify(trimmed));
    } catch(e) {}
  }

  function saveState() {
    var state = {
      sessions: AppState.sessions,
      habits: AppState.habits,
      goals: AppState.goals,
      coins: AppState.coins,
      coinLog: AppState.coinLog.slice(-_logMax),
      checkinDates: AppState.checkinDates,
      habitCheckins: AppState.habitCheckins,
      unlockedAchievements: AppState.unlockedAchievements,
      dailyAchievements: AppState.dailyAchievements,
      currentOutfit: AppState.currentOutfit,
      savedOutfits: AppState.savedOutfits,
      inventory: AppState.inventory,
      activeBuffs: AppState.activeBuffs,
      betHistory: AppState.betHistory.slice(-_logMax),
      mood: AppState.mood,
      streakFreezes: AppState.streakFreezes,
      darkMode: AppState.darkMode,
      settings: AppState.settings,
      totalCompletions: AppState.totalCompletions,
      score: AppState.score,
    };

    // 先存备份，再存主数据
    var backupJson = localStorage.getItem('fs');
    if (backupJson) {
      _set(_backupKey, {
        sessions: backupJson,
        habits: localStorage.getItem('fh'),
        goals: localStorage.getItem('fg'),
        timestamp: Date.now()
      });
    }

    _set('fstate', state);
    // 兼容旧存储键
    localStorage.setItem('fs', JSON.stringify(state.sessions));
    localStorage.setItem('fh', JSON.stringify(state.habits));
    localStorage.setItem('fg', JSON.stringify(state.goals));
    localStorage.setItem('fcoin', String(state.coins));
    localStorage.setItem('fsc', String(state.score));
    localStorage.setItem('fmood', String(state.mood));
    localStorage.setItem('ffreeze', String(state.streakFreezes));
    localStorage.setItem('fdark', state.darkMode ? '1' : '0');
  }

  function loadState() {
    var state = _get('fstate');
    if (state) {
      // 校验关键字段
      if (typeof state.coins !== 'number' || typeof state.sessions !== 'object') {
        console.warn('状态数据损坏，从旧格式恢复');
        return _loadLegacy();
      }
      return {
        sessions: state.sessions || [],
        habits: state.habits || [],
        goals: state.goals || [],
        coins: state.coins || 0,
        coinLog: state.coinLog || [],
        checkinDates: state.checkinDates || [],
        habitCheckins: state.habitCheckins || {},
        unlockedAchievements: state.unlockedAchievements || [],
        dailyAchievements: state.dailyAchievements || {},
        currentOutfit: state.currentOutfit || {},
        savedOutfits: state.savedOutfits || [],
        inventory: state.inventory || [],
        activeBuffs: state.activeBuffs || [],
        betHistory: state.betHistory || [],
        mood: state.mood || 70,
        streakFreezes: state.streakFreezes || 0,
        darkMode: state.darkMode || false,
        settings: state.settings || {},
        totalCompletions: state.totalCompletions || 0,
        score: state.score || 0,
      };
    }
    return _loadLegacy();
  }

  function _loadLegacy() {
    // 从旧格式迁移
    return {
      sessions: JSON.parse(localStorage.getItem('fs') || '[]'),
      habits: JSON.parse(localStorage.getItem('fh') || '[]'),
      goals: JSON.parse(localStorage.getItem('fg') || '[]'),
      coins: parseInt(localStorage.getItem('fcoin') || '50'),
      coinLog: [],
      checkinDates: [],
      habitCheckins: {},
      unlockedAchievements: [],
      dailyAchievements: {},
      currentOutfit: {},
      savedOutfits: [],
      inventory: [],
      activeBuffs: [],
      betHistory: [],
      mood: parseInt(localStorage.getItem('fmood') || '70'),
      streakFreezes: parseInt(localStorage.getItem('ffreeze') || '0'),
      darkMode: localStorage.getItem('fdark') === '1',
      settings: {},
      totalCompletions: 0,
      score: parseInt(localStorage.getItem('fsc') || '0'),
    };
  }

  function exportJSON() {
    saveState();
    return JSON.stringify(_get('fstate') || {}, null, 2);
  }

  function importJSON(json) {
    try {
      var data = JSON.parse(json);
      if (!data || typeof data !== 'object') throw new Error('无效数据');
      _set('fstate', data);
      _set('fs', JSON.stringify(data.sessions || []));
      _set('fh', JSON.stringify(data.habits || []));
      _set('fg', JSON.stringify(data.goals || []));
      return true;
    } catch(e) {
      console.error('导入失败:', e);
      return false;
    }
  }

  return {
    saveState: saveState,
    loadState: loadState,
    exportJSON: exportJSON,
    importJSON: importJSON,
  };
})();

// ==================== 全局状态 ====================
const AppState = (function() {
  var _loaded = Storage.loadState();
  var _state = {
    sessions: _loaded.sessions,
    habits: _loaded.habits,
    goals: _loaded.goals,
    coins: _loaded.coins,
    coinLog: _loaded.coinLog,
    checkinDates: _loaded.checkinDates,
    habitCheckins: _loaded.habitCheckins,
    unlockedAchievements: _loaded.unlockedAchievements,
    dailyAchievements: _loaded.dailyAchievements,
    currentOutfit: _loaded.currentOutfit,
    savedOutfits: _loaded.savedOutfits,
    inventory: _loaded.inventory,
    activeBuffs: _loaded.activeBuffs,
    betHistory: _loaded.betHistory,
    mood: _loaded.mood,
    streakFreezes: _loaded.streakFreezes,
    darkMode: _loaded.darkMode,
    settings: _loaded.settings,
    totalCompletions: _loaded.totalCompletions || _loaded.sessions.filter(function(s) { return s.completed; }).length,
    score: _loaded.score,
  };

  function get(key) {
    return _state[key];
  }

  function set(key, value) {
    _state[key] = value;
    Storage.saveState();
  }

  function addCoins(amount, reason) {
    _state.coins = Math.max(0, _state.coins + amount);
    _state.coinLog.push({
      time: Date.now(),
      amount: amount,
      reason: reason || '',
      balance: _state.coins
    });
    if (_state.coinLog.length > 1000) _state.coinLog.shift();

    Storage.saveState();
    EventBus.emit('coin:changed', { amount: actual, reason: reason, balance: _state.coins });
    return actual;
  }

  function spendCoins(amount, reason) {
    if (_state.coins < amount) return false;
    _state.coins -= amount;
    _state.coinLog.push({
      time: Date.now(),
      amount: -amount,
      reason: reason || '',
      balance: _state.coins
    });
    if (_state.coinLog.length > 1000) _state.coinLog.shift();

    // 购买追踪（供成就系统）
    if (reason && reason.indexOf('buy_') === 0) {
      var spent = parseInt(localStorage.getItem('fshopspent') || '0');
      localStorage.setItem('fshopspent', String(spent + amount));
      var purchases = parseInt(localStorage.getItem('fshoppurchases') || '0');
      localStorage.setItem('fshoppurchases', String(purchases + 1));
    }

    Storage.saveState();
    EventBus.emit('coin:changed', { amount: -amount, reason: reason, balance: _state.coins });
    return true;
  }

  function addSession(session) {
    _state.sessions.push(session);
    if (session.completed) _state.totalCompletions++;
    Storage.saveState();
    if (session.completed) {
      EventBus.emit('focus:completed', session);
    } else {
      EventBus.emit('focus:abandoned', session);
    }
  }

  function completeHabit(habitId) {
    var h = _state.habits.find(function(x) { return x.id === habitId; });
    if (!h) return;
    h.done = true;
    h.streak = (h.streak || 0) + 1;
    h.health = Math.min(100, (h.health || 50) + 5);
    h.dates = h.dates || [];
    var today = Utils.today();
    if (!h.dates.includes(today)) h.dates.push(today);
    h.totalMins = (h.totalMins || 0) + 0;
    h.totalSessions = (h.totalSessions || 0) + 1;
    Storage.saveState();
    EventBus.emit('habit:completed', { habit: h });
  }

  function unlockAchievement(achId) {
    if (_state.unlockedAchievements.includes(achId)) return false;
    _state.unlockedAchievements.push(achId);

    // 每日成就单独记录
    var today = Utils.today();
    if (!_state.dailyAchievements[today]) _state.dailyAchievements[today] = [];
    _state.dailyAchievements[today].push(achId);

    Storage.saveState();
    EventBus.emit('achievement:unlocked', { id: achId });
    return true;
  }

  function addToInventory(itemId) {
    if (!_state.inventory.includes(itemId)) {
      _state.inventory.push(itemId);
      Storage.saveState();
      EventBus.emit('item:purchased', { id: itemId });
    }
  }

  function hasItem(itemId) {
    return _state.inventory.includes(itemId);
  }

  function useItem(itemId) {
    if (!_state.inventory.includes(itemId)) return false;
    EventBus.emit('item:used', { id: itemId });
    Storage.saveState();
    return true;
  }

  function addFreeze(n) {
    _state.streakFreezes = (_state.streakFreezes || 0) + n;
    Storage.saveState();
  }

  function useFreeze() {
    if (_state.streakFreezes <= 0) return false;
    _state.streakFreezes--;
    Storage.saveState();
    return true;
  }

  function updateMood(delta) {
    _state.mood = Math.max(0, Math.min(100, _state.mood + delta));
    Storage.saveState();
    EventBus.emit('mood:changed', { mood: _state.mood, delta: delta });
  }

  return {
    // 基础读写
    get: get,
    set: set,

    // sessions (直接暴露引用，模块可直接push)
    sessions: _state.sessions,
    habits: _state.habits,
    goals: _state.goals,
    totalCompletions: _state.totalCompletions,
    score: _state.score,

    // 币
    coins: _state.coins,
    coinLog: _state.coinLog,
    addCoins: addCoins,
    spendCoins: spendCoins,

    // 签到
    checkinDates: _state.checkinDates,
    habitCheckins: _state.habitCheckins,

    // 成就
    unlockedAchievements: _state.unlockedAchievements,
    dailyAchievements: _state.dailyAchievements,
    unlockAchievement: unlockAchievement,

    // 换装
    currentOutfit: _state.currentOutfit,
    savedOutfits: _state.savedOutfits,

    // 商城 & 背包
    inventory: _state.inventory,
    activeBuffs: _state.activeBuffs,
    addToInventory: addToInventory,
    hasItem: hasItem,
    useItem: useItem,

    // 赌博
    betHistory: _state.betHistory,

    // 其他
    mood: _state.mood,
    streakFreezes: _state.streakFreezes,
    darkMode: _state.darkMode,
    settings: _state.settings,

    addFreeze: addFreeze,
    useFreeze: useFreeze,
    updateMood: updateMood,
    addSession: addSession,
    completeHabit: completeHabit,
    save: Storage.saveState,
  };
})();

// ==================== 工具函数 ====================
const Utils = {
  uid: function() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },

  today: function() {
    return new Date().toISOString().slice(0, 10);
  },

  fmtMins: function(m) {
    if (m < 60) return m + '分钟';
    var h = Math.floor(m / 60);
    var r = m % 60;
    return h + '小时' + (r > 0 ? r + '分钟' : '');
  },

  esc: function(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  },

  daysBetween: function(d1, d2) {
    return Math.abs((new Date(d1) - new Date(d2)) / 86400000);
  },

  getWeekRange: function() {
    var now = new Date();
    var day = now.getDay() || 7; // 周日=7
    var monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    return {
      start: monday.toISOString().slice(0, 10),
      end: now.toISOString().slice(0, 10),
    };
  },

  getMonthRange: function() {
    var now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
      end: now.toISOString().slice(0, 10),
    };
  },

  getYearRange: function() {
    var now = new Date();
    return {
      start: new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10),
      end: now.toISOString().slice(0, 10),
    };
  },

  // 获取指定周期的日期范围
  getPeriodRange: function(period) {
    switch(period) {
      case 0: return { start: Utils.today(), end: Utils.today() };
      case 1: return Utils.getWeekRange();
      case 2: return Utils.getMonthRange();
      case 3: return Utils.getYearRange();
      default: return { start: '2000-01-01', end: Utils.today() };
    }
  },

  // 计算连续天数
  calcStreak: function(dates) {
    if (!dates || !dates.length) return 0;
    var sorted = dates.slice().sort();
    var cur = 1, best = 1;
    for (var i = sorted.length - 1; i > 0; i--) {
      if (Utils.daysBetween(sorted[i], sorted[i-1]) === 1) {
        cur++;
        if (cur > best) best = cur;
      } else {
        cur = 1;
      }
    }
    return cur;
  },

  // 深拷贝
  clone: function(obj) {
    try { return JSON.parse(JSON.stringify(obj)); } catch(e) { return obj; }
  },
};

// 兼容旧代码的全局函数
function toast(m) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = m;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(function() { t.classList.remove('show'); }, 2000);
}

// 兼容旧代码：直接暴露旧变量名供后续迁移
var sessions = AppState.sessions;
var habits = AppState.habits;
var goals = AppState.goals;
var score = AppState.score;
var dark = AppState.darkMode;
var azusaCoins = AppState.coins;
var currentMood = AppState.mood;
var streakFreezes = AppState.streakFreezes;

// 兼容旧addCoins
function addCoins(n) {
  if (n > 0) AppState.addCoins(n, 'legacy');
  else if (n < 0) AppState.spendCoins(-n, 'legacy');
  updateCoinDisplay();
}
function updateCoinDisplay() {
  var el = document.getElementById('coinVal');
  if (el) el.textContent = AppState.coins;
  var sel = document.getElementById('betAmount');
  if (sel) {
    for (var i = 0; i < sel.options.length; i++) {
      sel.options[i].disabled = parseInt(sel.options[i].value) > AppState.coins;
    }
  }
}

// 订阅coin:changed自动更新显示
EventBus.on('coin:changed', function() { updateCoinDisplay(); });

console.log('🌳 阿梓的森林 v4.0 · core.js 已加载');
console.log('   EventBus:', Object.keys(EventBus));
console.log('   AppState: 币=' + AppState.coins + ' 会话=' + AppState.sessions.length + ' 成就=' + AppState.unlockedAchievements.length);
