/* checkin.js - 签到系统 (Phase 3)
 * 依赖：core.js (AppState, EventBus, Utils)
 * 提供：每日签到、月历、连续奖励、补签卡、习惯签到
 */

// 补签卡数量
var makeupCards = parseInt(localStorage.getItem('fmakeup') || '0');
var habitMakeupCards = parseInt(localStorage.getItem('fhmakeup') || '0');

// ==================== 每日签到 ====================
function showCheckinCard() {
  var today = Utils.today();
  var dates = AppState.checkinDates || [];
  if (dates.includes(today)) return false; // 今天已签到

  var streak = Utils.calcStreak(dates.sort());
  var reward = 5;
  var bonus = 0;
  var bonusText = '';

  if (streak === 6) { bonus = 15; AppState.addFreeze(1); bonusText = ' + 🎁 连续7天！额外15币+1护符'; }
  else if (streak === 29) { bonus = 50; bonusText = ' + 🎁 连续30天！额外50币+限定头像框'; }
  else if (streak >= 99) { bonus = 100; bonusText = ' + 🎁 连续100天！额外100币'; }

  var totalReward = reward + bonus;

  // 弹签到卡片
  var overlay = document.createElement('div');
  overlay.className = 'checkin-overlay';
  overlay.id = 'checkinOverlay';
  overlay.innerHTML =
    '<div class="checkin-card">' +
      '<div class="checkin-title">📅 每日签到</div>' +
      '<div class="checkin-date">' + today + '</div>' +
      '<div class="checkin-streak">🔥 连续签到 <b>' + (streak + 1) + '</b> 天</div>' +
      '<div class="checkin-reward">🪙 +' + totalReward + bonusText + '</div>' +
      '<div class="checkin-calendar" id="checkinCalendar"></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px">' +
        '<button class="checkin-btn primary" onclick="doCheckin()">📝 签到领币</button>' +
        '<button class="checkin-btn secondary" onclick="closeCheckin()">稍后</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  // 渲染月历
  renderCheckinCalendar();

  return true;
}

function doCheckin() {
  var today = Utils.today();
  var dates = AppState.checkinDates || [];
  if (dates.includes(today)) { toast('今天已经签到过了~'); return; }

  dates.push(today);
  AppState.checkinDates = dates;
  AppState.save();

  var streak = Utils.calcStreak(dates.sort());
  var reward = 5;
  if (streak === 7) { reward += 15; AppState.addFreeze(1); toast('🎉 连续7天签到！额外15币+1护符'); }
  else if (streak === 30) { reward += 50; toast('🎉 连续30天签到！额外50币+限定头像框'); }
  else if (streak === 100) { reward += 100; toast('👑 连续100天签到！阿梓为你骄傲'); }

  AppState.addCoins(reward, 'checkin');
  EventBus.emit('checkin:done', { streak: streak, reward: reward });

  // 关闭弹窗
  closeCheckin();
  toast('✅ 签到成功！+' + reward + '🪙 连续' + streak + '天');

  // 刷新成就
  if (typeof checkAchievements === 'function') checkAchievements('checkin');
}

function closeCheckin() {
  var overlay = document.getElementById('checkinOverlay');
  if (overlay) overlay.remove();
}

// ==================== 月历渲染 ====================
function renderCheckinCalendar() {
  var container = document.getElementById('checkinCalendar');
  if (!container) return;

  var now = new Date();
  var year = now.getFullYear(), month = now.getMonth();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var firstDay = new Date(year, month, 1).getDay();
  var today = Utils.today();
  var dates = AppState.checkinDates || [];

  var html = '<div class="cal-weekdays">';
  ['日','一','二','三','四','五','六'].forEach(function(d) {
    html += '<span>' + d + '</span>';
  });
  html += '</div><div class="cal-grid">';

  // 空白
  for (var i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';

  for (var d = 1; d <= daysInMonth; d++) {
    var ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var isToday = ds === today;
    var isChecked = dates.includes(ds);
    var canMakeup = !isChecked && ds < today && Utils.daysBetween(today, ds) <= 3 && makeupCards > 0;

    var cls = 'cal-day';
    if (isToday) cls += ' today';
    if (isChecked) cls += ' checked';
    if (canMakeup) cls += ' can-makeup';

    html += '<div class="' + cls + '"' +
      (canMakeup ? ' onclick="useMakeupCard(\'' + ds + '\')" title="使用补签卡"' : '') +
      '>' + d + (isChecked ? '<span class="cal-check">✓</span>' : '') + '</div>';
  }
  html += '</div>';

  // 补签卡信息
  html += '<div style="font-size:11px;color:var(--gr);margin-top:8px;text-align:center">' +
    '🔖 补签卡: <b>' + makeupCards + '</b> 张 | ' +
    '习惯补签卡: <b>' + habitMakeupCards + '</b> 张' +
    '</div>';

  container.innerHTML = html;
}

// ==================== 补签卡 ====================
function useMakeupCard(date) {
  if (makeupCards <= 0) { toast('没有补签卡了~ 去商城购买吧'); return; }
  if (Utils.daysBetween(Utils.today(), date) > 3) { toast('只能补签3天内的日期'); return; }

  makeupCards--;
  localStorage.setItem('fmakeup', String(makeupCards));

  var dates = AppState.checkinDates || [];
  dates.push(date);
  AppState.checkinDates = dates;
  AppState.save();

  toast('🔖 已补签 ' + date);
  renderCheckinCalendar();
}

function addMakeupCards(n) {
  makeupCards += n;
  localStorage.setItem('fmakeup', String(makeupCards));
}

// ==================== 习惯签到 ====================
function toggleHabitCheckin(habitId) {
  var today = Utils.today();
  var hc = AppState.habitCheckins || {};
  if (!hc[habitId]) hc[habitId] = [];

  var idx = hc[habitId].indexOf(today);
  if (idx >= 0) {
    hc[habitId].splice(idx, 1);
    toast('已取消习惯签到');
  } else {
    hc[habitId].push(today);
    var streak = Utils.calcStreak(hc[habitId].sort());
    toast('✅ 习惯签到！🔥' + streak + '天');
  }
  AppState.habitCheckins = hc;
  AppState.save();
}

function getHabitCheckinStreak(habitId) {
  var hc = AppState.habitCheckins || {};
  var dates = (hc[habitId] || []).slice().sort();
  return Utils.calcStreak(dates);
}

// ==================== 自动签到弹窗 ====================
var _checkinShownToday = false;
function autoShowCheckin() {
  if (_checkinShownToday) return;
  var today = Utils.today();
  if (localStorage.getItem('fcheckinShown') === today) return;

  var dates = AppState.checkinDates || [];
  if (dates.includes(today)) return;

  _checkinShownToday = true;
  localStorage.setItem('fcheckinShown', today);
  setTimeout(function() { showCheckinCard(); }, 1500);
}

// 监听第一次打开
setTimeout(autoShowCheckin, 2000);

console.log('📅 签到系统已加载: 补签卡=' + makeupCards);
