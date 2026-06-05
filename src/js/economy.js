/* economy.js - 阿梓币经济系统 (Phase 2 增强)
 * 依赖：core.js (AppState, EventBus)
 * 增强：赚取规则、消费追踪、上限管理
 */

// 每日赚取追踪
var dailyEarned = 0;
var dailyEarnedDate = '';
var DAILY_CAP = 200;

function _checkDailyReset() {
  var today = Utils.today();
  if (dailyEarnedDate !== today) {
    dailyEarned = 0;
    dailyEarnedDate = today;
  }
}

// 增强版赚币（带上限检查）
function earnCoins(amount, reason) {
  _checkDailyReset();
  var actual = amount;
  if (dailyEarned + amount > DAILY_CAP) {
    actual = Math.max(0, DAILY_CAP - dailyEarned);
    if (actual <= 0) return 0;
  }
  dailyEarned += actual;
  AppState.addCoins(actual, reason);
  return actual;
}

// 专注完成奖励（按分钟计算）
function calcFocusReward(minutes) {
  var base = 5;
  var bonus = Math.floor(minutes / 25) * 2;
  return base + bonus;
}

// 获取今日还可赚取的数量
function getRemainingDailyCap() {
  _checkDailyReset();
  return Math.max(0, DAILY_CAP - dailyEarned);
}

// 获取今日已赚取
function getTodayEarned() {
  _checkDailyReset();
  return dailyEarned;
}

// 防刷日志查询
function getCoinLog(filter) {
  var log = AppState.coinLog || [];
  if (filter === 'today') {
    var todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return log.filter(function(e) { return e.time >= todayStart.getTime(); });
  }
  return log.slice(-50); // 最近50条
}

// 消费追踪（供成就系统使用）
function trackPurchase(amount) {
  var prev = parseInt(localStorage.getItem('fshopspent') || '0');
  localStorage.setItem('fshopspent', String(prev + amount));
  var purchases = parseInt(localStorage.getItem('fshoppurchases') || '0');
  localStorage.setItem('fshoppurchases', String(purchases + 1));
}

// 重写核心addCoins以纳入上限
var _origAddCoins = AppState.addCoins;
AppState.addCoins = function(amount, reason) {
  _checkDailyReset();
  // 成就奖励和签到不计入上限
  var bypassCap = (reason && (reason.indexOf('ach_') === 0 || reason === 'checkin' || reason === 'checkin_bonus'));
  if (bypassCap) {
    return _origAddCoins.call(AppState, amount, reason);
  }
  return earnCoins(amount, reason);
};

console.log('🪙 经济系统已加载: 每日上限' + DAILY_CAP + '币');
