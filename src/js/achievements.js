/* achievements.js - 成就系统 v4.0 (Phase 2: 62成就+事件驱动)
 * 依赖：core.js (AppState, EventBus, sessions, habits, goals, totalCompletions)
 * 暴露：ACHIEVEMENTS, checkAchievements, renderAchievements, filterAch, resetDailyAch
 */

// ==================== 62个成就定义 ====================
const ACHIEVEMENTS = [
  // 基础成就 (7)
  { id:'first_focus', name:'初次专注', icon:'🌱', tier:'bronze', category:'basic', desc:'完成1次专注', target:1, reward:10, check:function(s){return s.totalCompletions>=1} },
  { id:'total_10h', name:'十小时', icon:'⏰', tier:'bronze', category:'basic', desc:'累计专注10小时', target:600, reward:20, check:function(s){return s.totalMins>=600} },
  { id:'total_50h', name:'五十小时', icon:'⏱', tier:'silver', category:'basic', desc:'累计专注50小时', target:3000, reward:50, check:function(s){return s.totalMins>=3000} },
  { id:'total_100h', name:'百小时', icon:'💯', tier:'gold', category:'basic', desc:'累计专注100小时', target:6000, reward:100, check:function(s){return s.totalMins>=6000} },
  { id:'total_500h', name:'肝帝', icon:'⚡', tier:'legend', category:'basic', desc:'累计专注500小时', target:30000, reward:300, check:function(s){return s.totalMins>=30000} },
  { id:'total_1000h', name:'传说肝帝', icon:'👑', tier:'legend', category:'basic', desc:'累计专注1000小时', target:60000, reward:500, check:function(s){return s.totalMins>=60000} },
  { id:'sessions_100', name:'百次专注', icon:'🌲', tier:'silver', category:'basic', desc:'完成100次专注', target:100, reward:50, check:function(s){return s.totalCompletions>=100} },

  // 连续成就 (5)
  { id:'streak_3', name:'三天坚持', icon:'🔥', tier:'bronze', category:'streak', desc:'连续专注3天', target:3, reward:10, check:function(s){return s.streak>=3} },
  { id:'streak_7', name:'一周之约', icon:'🔥', tier:'silver', category:'streak', desc:'连续专注7天', target:7, reward:20, check:function(s){return s.streak>=7} },
  { id:'streak_30', name:'月度修行', icon:'🔥', tier:'gold', category:'streak', desc:'连续专注30天', target:30, reward:50, check:function(s){return s.streak>=30} },
  { id:'streak_100', name:'百日筑基', icon:'💎', tier:'legend', category:'streak', desc:'连续专注100天', target:100, reward:150, check:function(s){return s.streak>=100} },
  { id:'streak_365', name:'一年之约', icon:'🏆', tier:'legend', category:'streak', desc:'连续专注365天', target:365, reward:500, check:function(s){return s.streak>=365} },

  // 习惯成就 (5)
  { id:'habit_all_day', name:'今日全勤', icon:'✅', tier:'bronze', category:'habit', desc:'今日所有习惯完成', target:1, reward:15, check:function(s){return s.habitsAllDone} },
  { id:'habit_perfect_week', name:'完美习惯周', icon:'📅', tier:'silver', category:'habit', desc:'连续7天习惯全勤', target:7, reward:30, check:function(s){return s.habitStreak>=7} },
  { id:'habit_perfect_month', name:'完美习惯月', icon:'📅', tier:'gold', category:'habit', desc:'连续30天习惯全勤', target:30, reward:100, check:function(s){return s.habitStreak>=30} },
  { id:'habit_10_streak', name:'习惯达人', icon:'⭐', tier:'bronze', category:'habit', desc:'任一习惯连续10天', target:10, reward:20, check:function(s){return s.maxHabitStreak>=10} },
  { id:'habit_50_streak', name:'习惯大师', icon:'🌟', tier:'gold', category:'habit', desc:'任一习惯连续50天', target:50, reward:80, check:function(s){return s.maxHabitStreak>=50} },

  // 皮肤成就 (5)
  { id:'skin_3', name:'衣装入门', icon:'👗', tier:'bronze', category:'skin', desc:'解锁3件衣装', target:3, reward:20, check:function(s){return s.currentTreeIdx>=3} },
  { id:'skin_7', name:'衣装收集者', icon:'👘', tier:'silver', category:'skin', desc:'解锁7件衣装', target:7, reward:50, check:function(s){return s.currentTreeIdx>=7} },
  { id:'skin_10', name:'衣装达人', icon:'👑', tier:'gold', category:'skin', desc:'解锁10件衣装', target:10, reward:100, check:function(s){return s.currentTreeIdx>=10} },
  { id:'skin_15', name:'衣装大师', icon:'💎', tier:'legend', category:'skin', desc:'解锁15件衣装', target:15, reward:200, check:function(s){return s.currentTreeIdx>=15} },
  { id:'skin_all', name:'全衣装制霸', icon:'🏆', tier:'legend', category:'skin', desc:'解锁全部衣装', target:18, reward:300, check:function(s){return s.currentTreeIdx>=17} },

  // 赌博成就 (6)
  { id:'bet_win_10', name:'赌场新手', icon:'🎲', tier:'silver', category:'bet', desc:'押注胜利10次', target:10, reward:30, check:function(s){return s.betWins>=10} },
  { id:'bet_win_50', name:'赌场常客', icon:'🎰', tier:'gold', category:'bet', desc:'押注胜利50次', target:50, reward:80, check:function(s){return s.betWins>=50} },
  { id:'bet_win_100', name:'千赌之王', icon:'👑', tier:'legend', category:'bet', desc:'押注胜利100次', target:100, reward:200, check:function(s){return s.betWins>=100} },
  { id:'bet_earn_500', name:'赌场盈利', icon:'💵', tier:'silver', category:'bet', desc:'赌博盈利500币', target:500, reward:50, check:function(s){return s.betProfit>=500} },
  { id:'bet_earn_2000', name:'赌场大亨', icon:'💰', tier:'legend', category:'bet', desc:'赌博盈利2000币', target:2000, reward:150, check:function(s){return s.betProfit>=2000} },
  { id:'bet_single_300', name:'一掷千金', icon:'💎', tier:'gold', category:'bet', desc:'单次赢得300币', target:1, reward:100, check:function(s){return s.betMaxWin>=300} },

  // 商城成就 (4)
  { id:'shop_first', name:'初次购物', icon:'🛍', tier:'bronze', category:'shop', desc:'商城购买1次', target:1, reward:5, check:function(s){return s.shopPurchases>=1} },
  { id:'shop_spend_500', name:'消费达人', icon:'💳', tier:'silver', category:'shop', desc:'累计消费500币', target:500, reward:50, check:function(s){return s.shopSpent>=500} },
  { id:'shop_own_15', name:'收藏家', icon:'🎒', tier:'gold', category:'shop', desc:'拥有15件商品', target:15, reward:100, check:function(s){return s.inventoryCount>=15} },
  { id:'shop_own_30', name:'囤货狂', icon:'🏪', tier:'legend', category:'shop', desc:'拥有30件商品', target:30, reward:200, check:function(s){return s.inventoryCount>=30} },

  // 签到成就 (4)
  { id:'signin_first', name:'初次签到', icon:'📅', tier:'bronze', category:'checkin', desc:'第一次签到', target:1, reward:10, check:function(s){return s.checkinTotal>=1} },
  { id:'signin_7', name:'签到一周', icon:'📆', tier:'bronze', category:'checkin', desc:'连续签到7天', target:7, reward:20, check:function(s){return s.checkinStreak>=7} },
  { id:'signin_30', name:'签到一月', icon:'🗓', tier:'silver', category:'checkin', desc:'连续签到30天', target:30, reward:50, check:function(s){return s.checkinStreak>=30} },
  { id:'signin_100', name:'签到百天', icon:'🎯', tier:'gold', category:'checkin', desc:'连续签到100天', target:100, reward:150, check:function(s){return s.checkinStreak>=100} },

  // 隐藏成就 (8)
  { id:'hidden_3abort', name:'放弃艺术家', icon:'😅', tier:'silver', category:'hidden', desc:'连续放弃3次专注', target:3, reward:30, check:function(s){return s.consecutiveAborts>=3} },
  { id:'hidden_midnight', name:'夜猫子', icon:'🦉', tier:'bronze', category:'hidden', desc:'凌晨0-5点完成专注', target:1, reward:20, check:function(s){return s.midnightFocus} },
  { id:'hidden_3hour', name:'耐力王', icon:'💪', tier:'gold', category:'hidden', desc:'单次专注3小时', target:1, reward:100, check:function(s){return s.singleMaxMins>=180} },
  { id:'hidden_combo_3', name:'三连押注', icon:'🎯', tier:'silver', category:'hidden', desc:'连续押注胜利3次', target:3, reward:50, check:function(s){return s.betCombo>=3} },
  { id:'hidden_1000coins', name:'万元户', icon:'🤑', tier:'legend', category:'hidden', desc:'累计赚取10000币', target:10000, reward:200, check:function(s){return s.totalEarned>=10000} },
  { id:'hidden_7day_zero', name:'七天归零', icon:'😱', tier:'silver', category:'hidden', desc:'连续7天0专注后回归', target:1, reward:25, check:function(s){return s.comebackAfter7} },
  { id:'hidden_speedrun', name:'闪电专注', icon:'⚡', tier:'bronze', category:'hidden', desc:'1分钟内完成一次专注（作弊？）', target:1, reward:5, check:function(s){return s.speedrunFocus} },
  { id:'hidden_all_goals', name:'目标终结者', icon:'🎯', tier:'gold', category:'hidden', desc:'同时完成所有活跃目标', target:1, reward:80, check:function(s){return s.allGoalsDone} },

  // 每日重置成就 (3)
  { id:'daily_4hours', name:'小孩梓徽章', icon:'🕓', tier:'silver', category:'daily', desc:'今日专注4小时', target:240, reward:30, check:function(s){return s.todayMins>=240} },
  { id:'daily_all_habits', name:'今日全勤奖', icon:'✅', tier:'bronze', category:'daily', desc:'今日完成所有习惯', target:1, reward:15, check:function(s){return s.habitsAllDone} },
  { id:'daily_90min', name:'耐力王', icon:'🔥', tier:'bronze', category:'daily', desc:'单次专注90分钟', target:90, reward:20, check:function(s){return s.singleMaxMinsToday>=90} },
];

// ==================== 成就检测引擎 ====================
var _achFilter = 'all';
var _achRarityFilter = 'all';
var consecutiveAborts = parseInt(localStorage.getItem('fconaborts') || '0');
var consecutiveBetWins = parseInt(localStorage.getItem('fcbetwins') || '0');
var betWinsTotal = parseInt(localStorage.getItem('fbetwins') || '0');
var betProfitTotal = parseInt(localStorage.getItem('fbetprofit') || '0');
var betMaxWin = parseInt(localStorage.getItem('fbetmaxwin') || '0');
var shopPurchases = parseInt(localStorage.getItem('fshoppurchases') || '0');
var shopSpent = parseInt(localStorage.getItem('fshopspent') || '0');
var totalEarned = parseInt(localStorage.getItem('ftotalearned') || '0');
var singleMaxMins = parseInt(localStorage.getItem('fsinglemax') || '0');
var singleMaxMinsToday = 0;
var midnightFocus = false;
var speedrunFocus = false;
var comebackAfter7 = false;
var lastAbortDate = '';

function getAchievementStats() {
  var today = Utils.today();
  var todaySessions = sessions.filter(function(s) { return s.completed && s.date === today; });
  var todayMins = todaySessions.reduce(function(a, s) { return a + s.minutes; }, 0);
  var dates = Array.from(new Set(sessions.filter(function(s) { return s.completed; }).map(function(s) { return s.date; }))).sort();
  var streak = Utils.calcStreak(dates);
  var totalMins = sessions.filter(function(s) { return s.completed; }).reduce(function(a, s) { return a + s.minutes; }, 0);

  // 习惯全勤检测
  var activeHabits = habits.filter(function(h) { return !h.archived; });
  var habitsAllDone = activeHabits.length > 0 && activeHabits.every(function(h) { return h.dates && h.dates.includes(today); });

  // 习惯连续全勤
  var habitStreak = 0;
  if (habitsAllDone) {
    var check = new Date();
    while (true) {
      var ds = check.toISOString().slice(0, 10);
      var allDone = activeHabits.every(function(h) { return h.dates && h.dates.includes(ds); });
      if (allDone) { habitStreak++; check.setDate(check.getDate() - 1); }
      else break;
    }
  }

  // 最大习惯连续天数
  var maxHabitStreak = 0;
  activeHabits.forEach(function(h) { if (h.streak > maxHabitStreak) maxHabitStreak = h.streak; });

  // 所有目标完成
  var activeGoals = goals.filter(function(g) { return !g.archived; });
  var allGoalsDone = activeGoals.length > 0 && activeGoals.every(function(g) { return g.done >= g.tomatoes; });

  // 单次最长（今日）
  singleMaxMinsToday = todaySessions.reduce(function(max, s) { return s.minutes > max ? s.minutes : max; }, 0);

  // 断签7天后回归
  if (!comebackAfter7 && dates.length >= 2) {
    var lastDate = dates[dates.length - 1];
    var prevDate = dates[dates.length - 2];
    if (Utils.daysBetween(lastDate, prevDate) >= 7) comebackAfter7 = true;
  }

  // 签到统计
  var checkinDates = AppState.checkinDates || [];
  var checkinTotal = checkinDates.length;
  var checkinStreak = Utils.calcStreak(checkinDates.sort());

  return {
    totalCompletions: totalCompletions,
    totalMins: totalMins,
    streak: streak,
    todayMins: todayMins,
    habitsAllDone: habitsAllDone,
    habitStreak: habitStreak,
    maxHabitStreak: maxHabitStreak,
    allGoalsDone: allGoalsDone,
    currentTreeIdx: currentTreeIdx,
    betWins: betWinsTotal,
    betProfit: betProfitTotal,
    betMaxWin: betMaxWin,
    betCombo: consecutiveBetWins,
    shopPurchases: shopPurchases,
    shopSpent: shopSpent,
    inventoryCount: (AppState.inventory || []).length,
    totalEarned: totalEarned,
    singleMaxMins: Math.max(singleMaxMins, singleMaxMinsToday),
    singleMaxMinsToday: singleMaxMinsToday,
    consecutiveAborts: consecutiveAborts,
    midnightFocus: midnightFocus,
    speedrunFocus: speedrunFocus,
    comebackAfter7: comebackAfter7,
    checkinTotal: checkinTotal,
    checkinStreak: checkinStreak,
  };
}

// 检测并解锁成就
function checkAchievements(trigger) {
  var stats = getAchievementStats();
  var newUnlocks = [];

  ACHIEVEMENTS.forEach(function(ach) {
    if (AppState.unlockedAchievements.includes(ach.id)) return;
    // 每日成就已在今天解锁过则跳过
    if (ach.category === 'daily') {
      var today = Utils.today();
      var todayAchs = AppState.dailyAchievements[today] || [];
      if (todayAchs.includes(ach.id)) return;
    }
    // 隐藏成就——未解锁不显示进度
    try {
      if (ach.check(stats)) {
        AppState.unlockAchievement(ach.id);
        newUnlocks.push(ach);
        // 奖励
        if (ach.reward > 0) AppState.addCoins(ach.reward, 'ach_' + ach.id);
        if (ach.tier === 'legend') AppState.addFreeze(1);
      }
    } catch(e) {}
  });

  // 解锁特效
  if (newUnlocks.length > 0) {
    newUnlocks.forEach(function(ach, i) {
      setTimeout(function() {
        toast('🏆 成就解锁: ' + ach.name + ' (+' + ach.reward + '🪙)');
        EventBus.emit('achievement:unlocked', ach);
      }, i * 300);
    });
  }

  return newUnlocks;
}

// ==================== 每日重置 ====================
function resetDailyAchievements() {
  var today = Utils.today();
  var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // 清除今日成就记录
  if (AppState.dailyAchievements[yesterday]) {
    delete AppState.dailyAchievements[yesterday];
  }

  // 重置每日追踪状态
  singleMaxMinsToday = 0;
  midnightFocus = false;
  speedrunFocus = false;
  AppState.save();
}

// 设置每日重置定时器
function scheduleDailyReset() {
  var now = new Date();
  var midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  var msUntilMidnight = midnight - now;
  setTimeout(function() {
    resetDailyAchievements();
    scheduleDailyReset(); // 递归调度
  }, msUntilMidnight);
}

// ==================== 事件监听 ====================
EventBus.on('focus:completed', function(session) {
  // 累计专注分钟
  if (session.minutes > singleMaxMins) {
    singleMaxMins = session.minutes;
    localStorage.setItem('fsinglemax', String(singleMaxMins));
  }
  // 凌晨检测
  var h = new Date().getHours();
  if (h >= 0 && h < 5) midnightFocus = true;
  // 连续放弃重置
  consecutiveAborts = 0;
  localStorage.setItem('fconaborts', '0');
  // 最长单次
  if (session.minutes > singleMaxMinsToday) singleMaxMinsToday = session.minutes;

  checkAchievements('focus');
});

EventBus.on('focus:abandoned', function() {
  consecutiveAborts++;
  localStorage.setItem('fconaborts', String(consecutiveAborts));
  checkAchievements('abort');
});

EventBus.on('coin:changed', function(data) {
  if (data.amount > 0) {
    totalEarned += data.amount;
    localStorage.setItem('ftotalearned', String(totalEarned));
  }
  if (data.reason === 'bet_win') {
    betWinsTotal++;
    consecutiveBetWins++;
    localStorage.setItem('fbetwins', String(betWinsTotal));
    localStorage.setItem('fcbetwins', String(consecutiveBetWins));
    betProfitTotal += data.amount;
    localStorage.setItem('fbetprofit', String(betProfitTotal));
  }
  if (data.reason === 'bet_lose') {
    betProfitTotal -= Math.abs(data.amount);
    consecutiveBetWins = 0;
    localStorage.setItem('fbetprofit', String(betProfitTotal));
    localStorage.setItem('fcbetwins', '0');
  }
  if (data.amount > betMaxWin && data.reason === 'bet_win') {
    betMaxWin = data.amount;
    localStorage.setItem('fbetmaxwin', String(betMaxWin));
  }
  checkAchievements('coin');
});

EventBus.on('item:purchased', function() {
  shopPurchases++;
  localStorage.setItem('fshoppurchases', String(shopPurchases));
  checkAchievements('shop');
});

EventBus.on('habit:completed', function() {
  checkAchievements('habit');
});

// ==================== 成就渲染 ====================
var achFilter = 'all';
var achRarity = 'all';

function filterAch(type) {
  if (type) achFilter = type;
  achRarity = document.getElementById('achRarityFilter') ? document.getElementById('achRarityFilter').value : 'all';
  // 更新标签状态
  document.querySelectorAll('.ach-tab').forEach(function(t) {
    t.classList.toggle('sel', t.textContent === (achFilter === 'all' ? '全部' : achFilter === 'unlocked' ? '已解锁' : '未解锁'));
  });
  renderAchievements();
}

function renderAchievements() {
  var stats = getAchievementStats();
  var container = document.getElementById('achs');
  if (!container) return;

  var filtered = ACHIEVEMENTS.filter(function(a) {
    var unlocked = AppState.unlockedAchievements.includes(a.id);
    if (achFilter === 'unlocked' && !unlocked) return false;
    if (achFilter === 'locked' && unlocked) return false;
    if (achRarity !== 'all' && a.tier !== achRarity) return false;
    // 隐藏成就未解锁时不显示
    if (a.category === 'hidden' && achRarity === 'all' && !unlocked && achFilter !== 'locked') return false;
    return true;
  });

  var unlocked = ACHIEVEMENTS.filter(function(a) { return AppState.unlockedAchievements.includes(a.id); }).length;

  container.innerHTML =
    '<div class="ach-header"><strong>🏆 成就 (' + unlocked + '/' + ACHIEVEMENTS.length + ')</strong>' +
    '<span class="ach-count" style="font-size:11px">' + (unlocked === ACHIEVEMENTS.length ? '🎉 全部解锁！' : '剩' + (ACHIEVEMENTS.length - unlocked) + '项') + '</span></div>' +
    '<div class="ach-grid">' + filtered.map(function(a) {
      var isUnlocked = AppState.unlockedAchievements.includes(a.id);
      var tierClass = a.tier === 'legend' ? 'tier-legend' : '';
      var tierLabel = { bronze: '🥉', silver: '🥈', gold: '🥇', legend: '👑' }[a.tier] || '';
      var progress = isUnlocked ? 100 : Math.min(99, Math.round((function() {
        var s = stats;
        switch(a.id) {
          case 'total_10h': return s.totalMins / 600 * 100;
          case 'total_50h': return s.totalMins / 3000 * 100;
          case 'total_100h': return s.totalMins / 6000 * 100;
          case 'total_500h': return s.totalMins / 30000 * 100;
          case 'total_1000h': return s.totalMins / 60000 * 100;
          case 'sessions_100': return s.totalCompletions / 100 * 100;
          case 'streak_3': return s.streak / 3 * 100;
          case 'streak_7': return s.streak / 7 * 100;
          case 'streak_30': return s.streak / 30 * 100;
          case 'streak_100': return s.streak / 100 * 100;
          case 'streak_365': return s.streak / 365 * 100;
          case 'skin_3': return s.currentTreeIdx / 3 * 100;
          case 'skin_7': return s.currentTreeIdx / 7 * 100;
          case 'skin_10': return s.currentTreeIdx / 10 * 100;
          case 'skin_15': return s.currentTreeIdx / 15 * 100;
          case 'skin_all': return s.currentTreeIdx / 17 * 100;
          case 'bet_win_10': return s.betWins / 10 * 100;
          case 'bet_win_50': return s.betWins / 50 * 100;
          case 'bet_win_100': return s.betWins / 100 * 100;
          case 'bet_earn_500': return s.betProfit / 500 * 100;
          case 'bet_earn_2000': return s.betProfit / 2000 * 100;
          case 'daily_4hours': return s.todayMins / 240 * 100;
          case 'daily_90min': return s.singleMaxMinsToday / 90 * 100;
          case 'daily_all_habits': return s.habitsAllDone ? 100 : 0;
          case 'hidden_1000coins': return s.totalEarned / 10000 * 100;
          case 'signin_7': return s.checkinStreak / 7 * 100;
          case 'signin_30': return s.checkinStreak / 30 * 100;
          case 'signin_100': return s.checkinStreak / 100 * 100;
          default: return isUnlocked ? 100 : 0;
        }
      })()));
      var pColor = a.tier === 'bronze' ? '#e65100' : a.tier === 'silver' ? '#616161' : a.tier === 'gold' ? '#f57f17' : '#6a1b9a';

      // 隐藏成就未解锁
      var showIcon = isUnlocked ? a.icon : (a.category === 'hidden' ? '❓' : '🔒');
      var showName = (a.category === 'hidden' && !isUnlocked) ? '???' : a.name;
      var showDesc = (a.category === 'hidden' && !isUnlocked) ? '隐藏成就' : a.desc;

      return '<div class="ach-card ' + (isUnlocked ? 'unlocked ' + tierClass : 'locked') + '" title="' + showDesc + '">' +
        '<span class="ach-icon">' + showIcon + '</span>' +
        '<div class="ach-name">' + showName +
        (a.category === 'hidden' && !isUnlocked ? '' : '<span class="ach-tag ' + (a.tier === 'legend' ? 'legend' : '') + '">' + tierLabel + '</span>') +
        (a.category === 'hidden' && !isUnlocked ? '<span class="ach-tag hidden">隐藏</span>' : '') +
        (a.category === 'daily' ? '<span class="ach-tag" style="background:#e3f2fd;color:#1565c0">每日</span>' : '') +
        '</div>' +
        (isUnlocked ? '' : '<div class="ach-prog"><div style="width:' + progress + '%;background:' + pColor + '"></div></div>') +
        '</div>';
    }).join('') + '</div>';
}

// 初始化成就系统
(function initAchievements() {
  scheduleDailyReset();
  // 启动时检测一次
  setTimeout(function() { checkAchievements('init'); }, 1000);
  console.log('🏆 成就系统已加载: ' + ACHIEVEMENTS.length + '个成就');
})();
