/* habit_health.js - 习惯健康度算法 (移植自 self-discipline-forest Flutter 版)
 * 健康度 = 近14天完成率×0.7 + 全部历史完成率×0.3，加权后×100
 * 微习惯阶梯：连续14天成功→升级；近期失败过多(健康<30近似)→降级
 * 依赖：无（纯函数，便于单测）
 * 暴露：window.HabitHealth
 */
(function (global) {
  'use strict';

  var TIERS = ['micro', 'normal', 'challenge'];
  var TIER_NAME = { micro: '微习惯', normal: '正常', challenge: '挑战' };

  function _parseDate(s) {
    return new Date(String(s).slice(0, 10) + 'T00:00:00');
  }

  function _iso(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (m.length < 2) m = '0' + m;
    if (day.length < 2) day = '0' + day;
    return y + '-' + m + '-' + day;
  }

  // 是否为活跃日：daily 每天；weekly 按周另算(此处返回true)；custom 看 activeDays
  function isActiveDay(dateStr, frequency, activeDays) {
    var d = _parseDate(dateStr);
    var wd = d.getDay(); if (wd === 0) wd = 7; // 周日记为7
    if (frequency === 'daily') return true;
    if (frequency === 'weekly') return true;
    if (frequency === 'custom') return (activeDays || []).indexOf(wd) !== -1;
    return true;
  }

  // 主算法：复刻 Flutter calculateHealthScore
  function calculateHealthScore(completions, frequency, activeDays) {
    completions = completions || [];
    frequency = frequency || 'daily';
    activeDays = activeDays || [1, 2, 3, 4, 5, 6, 7];
    var now = new Date(); now.setHours(0, 0, 0, 0);
    // 近14天窗口：含今天（与 Flutter 原版差异——原版不含今天，会导致「当天打卡次日才计入」，
    // 本版 deliberately 包含今天，使打卡当天即反映到健康度，体验更直观）
    var fourteenAgo = new Date(now.getTime() - 13 * 86400000);

    if (frequency === 'weekly') return _weekly(completions, now, fourteenAgo);

    // 近14天预期/完成（含今天）
    var expRecent = 0, doneRecent = 0;
    for (var d = new Date(fourteenAgo); d <= now; d.setDate(d.getDate() + 1)) {
      var ds = _iso(d);
      if (isActiveDay(ds, 'daily', activeDays)) {
        expRecent++;
        if (completions.indexOf(ds) !== -1) doneRecent++;
      }
    }

    // 全部历史预期/完成（含今天）
    var expTotal = 0, doneTotal = 0;
    if (completions.length) {
      var first = completions[0];
      for (var k = 1; k < completions.length; k++) {
        if (_parseDate(completions[k]) < _parseDate(first)) first = completions[k];
      }
      for (var d2 = _parseDate(first); d2 <= now; d2.setDate(d2.getDate() + 1)) {
        var ds2 = _iso(d2);
        if (isActiveDay(ds2, 'daily', activeDays)) {
          expTotal++;
          if (completions.indexOf(ds2) !== -1) doneTotal++;
        }
      }
    }

    var recentRate = expRecent > 0 ? doneRecent / expRecent : 0;
    var totalRate = expTotal > 0 ? doneTotal / expTotal : 0;
    var score = (recentRate * 0.7 + totalRate * 0.3) * 100;
    if (score < 0) score = 0;
    if (score > 100) score = 100;
    return Math.round(score);
  }

  // 周频率：按「周」计预期，按「去重完成周」计完成
  function _weekly(completions, now, fourteenAgo) {
    var recent = _weeklyStats(completions, fourteenAgo, now);
    var expTotal = 0, doneTotal = 0;
    if (completions.length) {
      var first = completions[0];
      for (var k = 1; k < completions.length; k++) {
        if (_parseDate(completions[k]) < _parseDate(first)) first = completions[k];
      }
      var total = _weeklyStats(completions, _parseDate(first), now);
      expTotal = total.exp; doneTotal = total.done;
    }
    var rRate = recent.exp > 0 ? Math.min(1, recent.done / recent.exp) : 0;
    var tRate = expTotal > 0 ? Math.min(1, doneTotal / expTotal) : 0;
    var score = (rRate * 0.7 + tRate * 0.3) * 100;
    if (score < 0) score = 0;
    if (score > 100) score = 100;
    return Math.round(score);
  }

  function _weeklyStats(completions, start, end) {
    var days = Math.floor((end - start) / 86400000);
    var exp = Math.floor(days / 7);
    var weeks = {};
    for (var i = 0; i < completions.length; i++) {
      var d = _parseDate(completions[i]);
      if (d >= start && d <= end) weeks[_weekKey(d)] = true;
    }
    return { exp: exp, done: Object.keys(weeks).length };
  }

  function _weekKey(d) {
    var startOfYear = new Date(d.getFullYear(), 0, 1);
    var dayOfYear = Math.floor((d - startOfYear) / 86400000);
    var week = Math.floor((dayOfYear + startOfYear.getDay() - 1) / 7) + 1;
    return d.getFullYear() + '-' + week;
  }

  // 微习惯阶梯：连续成功>=14 升级；近期失败>=7(用 health<30 近似) 降级
  function calculateNextTier(currentTier, recentStreak, recentMisses) {
    var idx = TIERS.indexOf(currentTier);
    if (idx < 0) idx = 0;
    if (recentStreak >= 14 && idx < TIERS.length - 1) return TIERS[idx + 1];
    if (recentMisses >= 7 && idx > 0) return TIERS[idx - 1];
    return TIERS[idx];
  }

  global.HabitHealth = {
    TIERS: TIERS,
    TIER_NAME: TIER_NAME,
    calculateHealthScore: calculateHealthScore,
    calculateNextTier: calculateNextTier,
    isActiveDay: isActiveDay
  };
})(window);
