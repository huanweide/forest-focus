/* habits.js - 习惯追踪
 * 依赖：core.js (AppState, Utils, habits)
 */

function addHabit() {
  var name = prompt('新习惯名称（如：阅读30分钟）：');
  if (!name) return;
  habits.push({
    id: Utils.uid(),
    name: name,
    icon: '✅',
    streak: 0,
    health: 50,
    tier: 'micro',
    dates: [],
    totalMins: 0,
    totalSessions: 0,
    archived: false,
    done: false
  });
  AppState.save();
  rHabits();
  updateTaskSelects();
  toast('✅ 习惯已添加！');
}

// 健康度 → 颜色（红/黄/绿），让低健康习惯一眼可辨「该补打卡了」
// <30 红（危险）、30~70 黄（注意）、>=70 绿（健康）
function healthColor(h) {
  if (h < 30) return '#EF5350';
  if (h < 70) return '#FFA726';
  return '#66BB6A';
}

function rHabits() {
  var list = document.getElementById('habitsList');
  var active = habits.filter(function(h) { return !h.archived; });
  if (!active.length) {
    list.innerHTML = '<div style="text-align:center;padding:36px 20px 28px;color:var(--gr)">' +
      '<div style="font-size:52px;margin-bottom:10px">🌱</div>' +
      '<div style="font-size:15px;font-weight:700;color:var(--t);margin-bottom:6px">还没有习惯</div>' +
      '<div style="font-size:12px;line-height:1.5;margin-bottom:16px">每天打卡一小步，森林会记住你的坚持~</div>' +
      '<button style="background:var(--gd);color:#fff;border:none;padding:9px 18px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:var(--sh)" onclick="addHabit()">+ 新建习惯</button>' +
      '</div>';
    drawHeatmap();
    return;
  }
  var colors = ['#7C5CBF', '#FF7043', '#66BB6A', '#42A5F5', '#FFA726', '#AB47BC', '#26A69A', '#EF5350'];
  list.innerHTML = active.map(function(h, i) {
    var color = colors[i % colors.length];         // 每条习惯固定身份色（左侧色条）
    var healthPct = Math.max(0, Math.min(100, h.health || 50));
    var hc = healthColor(healthPct);               // 健康条按健康度着色
    var tierName = (window.HabitHealth && HabitHealth.TIER_NAME) ? (HabitHealth.TIER_NAME[h.tier] || '') : '';
    var today = Utils.today();
    var todayDone = h.dates && h.dates.includes(today);
    return '<div class="ht-row" style="margin-bottom:8px;padding:8px 8px 8px 12px;background:var(--c);border-radius:12px;box-shadow:var(--sh);border-left:5px solid ' + color + '">' +
      '<div class="ht-ck' + (todayDone ? ' done' : '') + '" onclick="toggleHabit(\'' + h.id + '\')">' + (todayDone ? '✅' : '○') + '</div>' +
      '<div class="ht-info">' +
        '<div class="ht-n">' + Utils.esc(h.name) + (tierName ? ' <span class="ht-tier">' + Utils.esc(tierName) + '</span>' : '') + '</div>' +
        '<div class="ht-d">🔥 ' + (h.streak || 0) + '天 · 总' + (h.totalSessions || 0) + '次' + (h.totalMins ? ' · ' + Utils.fmtMins(h.totalMins) : '') + '</div>' +
        '<div class="ht-bar"><div class="ht-fill" style="width:' + healthPct + '%;background:' + hc + '"></div></div>' +
      '</div>' +
      '<div class="ht-s" style="color:' + hc + '">' + healthPct + '<span>健康</span></div>' +
      '<button style="background:none;border:none;font-size:14px;cursor:pointer;padding:4px" onclick="editHabitName(\'' + h.id + '\')">✏️</button>' +
      '<button style="background:none;border:none;font-size:14px;cursor:pointer;padding:4px" onclick="deleteHabit(\'' + h.id + '\')">🗑</button>' +
      '</div>';
  }).join('');
  drawHeatmap();
}

function toggleHabit(id) {
  var h = habits.find(function(x) { return x.id === id; });
  if (!h) return;
  var today = Utils.today();
  h.dates = h.dates || [];
  if (h.dates.includes(today)) {
    h.dates = h.dates.filter(function(d) { return d !== today; });
    h.done = false;
    h.streak = Math.max(0, (h.streak || 1) - 1);
    h.health = HabitHealth.calculateHealthScore(h.dates || [], 'daily', [1,2,3,4,5,6,7]);
    h.totalSessions = Math.max(0, (h.totalSessions || 1) - 1);
    AppState.save();
  } else {
    AppState.completeHabit(id);
    AppState.addCoins(2, 'habit_complete');
    AppState.save();
  }
  rHabits();
}

function editHabitName(id) {
  var h = habits.find(function(x) { return x.id === id; });
  if (!h) return;
  var name = prompt('修改习惯名称：', h.name);
  if (name) { h.name = name; AppState.save(); rHabits(); updateTaskSelects(); }
}

function deleteHabit(id) {
  if (!confirm('确定删除这个习惯吗？')) return;
  var idx = habits.findIndex(function(x) { return x.id === id; });
  if (idx >= 0) { habits.splice(idx, 1); AppState.save(); rHabits(); updateTaskSelects(); toast('已删除'); }
}

function drawHeatmap() {
  var container = document.getElementById('heatmap');
  if (!container) return;
  var now = new Date();
  var year = now.getFullYear(), month = now.getMonth();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var firstDay = new Date(year, month, 1).getDay();

  // 收集本月所有打卡日期
  var allDates = [];
  habits.forEach(function(h) {
    if (h.dates) allDates = allDates.concat(h.dates);
  });
  allDates = allDates.filter(function(d) {
    var parts = d.split('-');
    return parseInt(parts[0]) === year && parseInt(parts[1]) === month + 1;
  });

  var html = '';
  // 空白填充
  for (var i = 0; i < firstDay; i++) { html += '<div></div>'; }
  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var count = allDates.filter(function(x) { return x === dateStr; }).length;
    var color;
    if (count === 0) color = '#e8e8e8';
    else if (count === 1) color = '#D1C4E9';
    else if (count <= 3) color = '#B39DDB';
    else if (count <= 5) color = '#7C5CBF';
    else color = '#512DA8';
    html += '<div style="background:' + color + '" title="' + dateStr + ': ' + count + '次"></div>';
  }
  container.innerHTML = html;
}
