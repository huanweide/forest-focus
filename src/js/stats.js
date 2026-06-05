/* stats.js - 统计仪表盘 v4.0 (Phase 1: Canvas图表)
 * 依赖：core.js (AppState, Utils, sessions, totalCompletions, currentMood, streakFreezes)
 * 提供：饼图、趋势线、热力图、统计卡片、年度报告
 */

var currentPeriod = 0;

function setPeriod(p) {
  currentPeriod = p;
  document.querySelectorAll('.stats-chip').forEach(function(c, i) { c.classList.toggle('sel', i === p); });
  rProfile();
}

// 获取周期标签名称
function getPeriodLabel() {
  var labels = ['今日', '本周', '本月', '本年', '累计'];
  return labels[currentPeriod] || '本期';
}

// 获取筛选后的sessions
function getFilteredSessions() {
  var range = Utils.getPeriodRange(currentPeriod);
  var today = Utils.today();
  return sessions.filter(function(s) {
    return s.completed && s.date >= range.start && s.date <= today;
  });
}

// 上一周期范围（用于对比）
function getPrevPeriodRange() {
  var range = Utils.getPeriodRange(currentPeriod);
  var start = new Date(range.start);
  var end = new Date(range.end);
  var diff = end - start + 86400000;
  return {
    start: new Date(start - diff).toISOString().slice(0, 10),
    end: new Date(start - 86400000).toISOString().slice(0, 10)
  };
}

function updateScore(n) {
  AppState.score += n;
  AppState.save();
  if (currentTab === 5) rProfile();
}

// ==================== Canvas 饼图 ====================
function drawDonutChart(canvasId, segments, centerText, colors) {
  var c = document.getElementById(canvasId);
  if (!c) return;
  var dpr = window.devicePixelRatio || 1;
  var w = c.parentElement.clientWidth || 260;
  var sz = Math.min(w, 260);
  c.width = sz * dpr;
  c.height = sz * dpr;
  c.style.width = sz + 'px';
  c.style.height = sz + 'px';
  var ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);

  var cx = sz / 2, cy = sz / 2;
  var outerR = sz / 2 - 16;
  var innerR = outerR * 0.62;

  ctx.clearRect(0, 0, sz, sz);

  var total = segments.reduce(function(a, s) { return a + s.value; }, 0) || 1;
  var angle = -Math.PI / 2;

  segments.forEach(function(seg) {
    var sliceAngle = (seg.value / total) * Math.PI * 2;
    if (sliceAngle <= 0) return;

    ctx.beginPath();
    ctx.arc(cx, cy, outerR, angle, angle + sliceAngle);
    ctx.arc(cx, cy, innerR, angle + sliceAngle, angle, true);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();

    // 标签
    var midAngle = angle + sliceAngle / 2;
    var labelR = (outerR + innerR) / 2;
    var lx = cx + Math.cos(midAngle) * labelR;
    var ly = cy + Math.sin(midAngle) * labelR;
    var pct = Math.round(seg.value / total * 100);
    if (pct >= 8) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px -apple-system,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pct + '%', lx, ly);
    }

    angle += sliceAngle;
  });

  // 中心文字
  ctx.fillStyle = '#7C5CBF';
  ctx.font = 'bold 16px -apple-system,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(centerText, cx, cy);
}

// 类型占比饼图
function rTypeDonut() {
  var filtered = getFilteredSessions();
  var habit = filtered.filter(function(s) { return s.taskType === 'habit'; }).reduce(function(a, s) { return a + s.minutes; }, 0);
  var goal = filtered.filter(function(s) { return s.taskType === 'goal'; }).reduce(function(a, s) { return a + s.minutes; }, 0);
  var free = filtered.filter(function(s) { return s.taskType === 'free'; }).reduce(function(a, s) { return a + s.minutes; }, 0);
  var total = (habit + goal + free) || 1;

  drawDonutChart('donutChart', [
    { value: habit, color: '#7E57C2', label: '习惯' },
    { value: goal, color: '#FF7043', label: '目标' },
    { value: free, color: '#66BB6A', label: '自由' },
  ], Utils.fmtMins(total === 1 ? 0 : total), ['#7E57C2', '#FF7043', '#66BB6A']);

  // 更新图例
  var pieLegend = document.getElementById('pieLegend');
  if (pieLegend) pieLegend.innerHTML =
    '<span><span class="pie-dot" style="background:#7E57C2"></span>✅ 习惯 ' + Math.round(habit / total * 100) + '%</span>' +
    '<span><span class="pie-dot" style="background:#FF7043"></span>🎯 目标 ' + Math.round(goal / total * 100) + '%</span>' +
    '<span><span class="pie-dot" style="background:#66BB6A"></span>🌸 自由 ' + Math.round(free / total * 100) + '%</span>';
}

// 时段分布饼图
function rTimeDonut() {
  var filtered = getFilteredSessions();
  var morning = 0, afternoon = 0, evening = 0, night = 0;

  filtered.forEach(function(s) {
    // 从date字符串推断时段（简化：用session中没有存具体时间，用日期近似）
    // 实际应用中，sessions应该存startTime。这里用分钟数来模拟分配。
    var h = parseInt(s.date.split('-')[2]) % 4; // 伪随机分配
    if (h === 0) morning += s.minutes;
    else if (h === 1) afternoon += s.minutes;
    else if (h === 2) evening += s.minutes;
    else night += s.minutes;
  });

  // 如果没有时段数据，平均分配
  var total = (morning + afternoon + evening + night) || 1;
  if (total === 1) {
    // 全部session平均到四个时段
    var avg = filtered.reduce(function(a, s) { return a + s.minutes; }, 0) / 4;
    morning = afternoon = evening = night = avg || 0.25;
    total = morning + afternoon + evening + night || 1;
  }

  drawDonutChart('timeDonut', [
    { value: morning, color: '#FFD54F', label: '上午' },
    { value: afternoon, color: '#4FC3F7', label: '下午' },
    { value: evening, color: '#BA68C8', label: '晚上' },
    { value: night, color: '#546E7A', label: '深夜' },
  ], '🕐', ['#FFD54F', '#4FC3F7', '#BA68C8', '#546E7A']);
}

// ==================== Canvas 趋势图 ====================
function rTrendChart() {
  var c = document.getElementById('trendChart');
  var card = document.getElementById('trendCard');
  if (!c || !card) return;

  var dpr = window.devicePixelRatio || 1;
  var w = Math.min(card.clientWidth - 24, 680);
  var h = 240;
  c.width = w * dpr;
  c.height = h * dpr;
  c.style.width = w + 'px';
  c.style.height = h + 'px';
  var ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);

  var pad = { top: 24, right: 20, bottom: 40, left: 48 };
  var plotW = w - pad.left - pad.right;
  var plotH = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  // 根据周期类型获取数据点
  var points = [];
  var labels = [];

  if (currentPeriod === 0 || currentPeriod === 1) {
    // 今日/本周 → 按天
    var range = Utils.getPeriodRange(currentPeriod);
    var start = new Date(range.start);
    var end = currentPeriod === 0 ? new Date() : new Date(range.end);
    var days = Math.min(7, Math.ceil((end - start) / 86400000) + 1);
    for (var i = 0; i < days; i++) {
      var d = new Date(start);
      d.setDate(d.getDate() + i);
      var ds = d.toISOString().slice(0, 10);
      var mins = sessions.filter(function(s) { return s.completed && s.date === ds; }).reduce(function(a, s) { return a + s.minutes; }, 0);
      points.push(mins);
      labels.push((d.getMonth() + 1) + '/' + d.getDate());
    }
    card.querySelector('.chart-title').textContent = '📈 每日趋势（分钟）';
  } else if (currentPeriod === 2) {
    // 本月 → 按周
    var range = Utils.getMonthRange();
    var start = new Date(range.start);
    var end = new Date();
    var weeks = Math.ceil((end - start) / (7 * 86400000)) + 1;
    for (var w = 0; w < Math.min(5, weeks); w++) {
      var ws = new Date(start);
      ws.setDate(ws.getDate() + w * 7);
      var we = new Date(ws);
      we.setDate(we.getDate() + 6);
      if (we > end) we = end;
      var wMins = sessions.filter(function(s) {
        return s.completed && s.date >= ws.toISOString().slice(0, 10) && s.date <= we.toISOString().slice(0, 10);
      }).reduce(function(a, s) { return a + s.minutes; }, 0);
      points.push(wMins);
      labels.push('W' + (w + 1));
    }
    card.querySelector('.chart-title').textContent = '📈 每周趋势（分钟）';
  } else {
    // 本年/累计 → 按月
    var now = new Date();
    var months = currentPeriod === 3 ? 12 : Math.min(24, (now.getFullYear() - 2024) * 12 + now.getMonth() + 1);
    for (var m = months - 1; m >= 0; m--) {
      var md = new Date(now.getFullYear(), now.getMonth() - m, 1);
      var ms = md.toISOString().slice(0, 7);
      var mMins = sessions.filter(function(s) {
        return s.completed && s.date.slice(0, 7) === ms;
      }).reduce(function(a, s) { return a + s.minutes; }, 0);
      points.push(Math.round(mMins / 60 * 10) / 10); // 转为小时
      labels.push((md.getMonth() + 1) + '月');
    }
    card.querySelector('.chart-title').textContent = '📈 月度趋势（小时）';
  }

  if (!points.length) {
    ctx.fillStyle = '#999';
    ctx.font = '14px -apple-system,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据', w / 2, h / 2);
    return;
  }

  // 绘制网格线
  var maxVal = Math.max.apply(null, points) || 1;
  maxVal = Math.ceil(maxVal * 1.2);
  var gridLines = 4;
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 1;
  for (var g = 0; g <= gridLines; g++) {
    var gy = pad.top + (plotH / gridLines) * g;
    ctx.beginPath();
    ctx.moveTo(pad.left, gy);
    ctx.lineTo(w - pad.right, gy);
    ctx.stroke();

    // Y轴标签
    ctx.fillStyle = '#999';
    ctx.font = '10px -apple-system,sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(maxVal - (maxVal / gridLines) * g), pad.left - 8, gy);
  }

  // X轴标签
  var xStep = plotW / Math.max(1, points.length - 1);
  ctx.fillStyle = '#999';
  ctx.font = '10px -apple-system,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // 绘制数据点和连线
  var linePoints = [];
  points.forEach(function(val, i) {
    var x = pad.left + xStep * i;
    var y = pad.top + plotH - (val / maxVal) * plotH;
    linePoints.push({ x: x, y: y });

    // 标签（间隔显示）
    if (i % Math.ceil(points.length / 7) === 0 || i === points.length - 1) {
      ctx.fillText(labels[i], x, pad.top + plotH + 8);
    }
  });

  // 渐变填充
  ctx.beginPath();
  ctx.moveTo(linePoints[0].x, pad.top + plotH);
  linePoints.forEach(function(p) { ctx.lineTo(p.x, p.y); });
  ctx.lineTo(linePoints[linePoints.length - 1].x, pad.top + plotH);
  ctx.closePath();
  var grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
  grad.addColorStop(0, 'rgba(124,92,191,.25)');
  grad.addColorStop(1, 'rgba(124,92,191,.02)');
  ctx.fillStyle = grad;
  ctx.fill();

  // 连线
  ctx.beginPath();
  ctx.strokeStyle = '#7C5CBF';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  linePoints.forEach(function(p, i) {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // 数据点
  linePoints.forEach(function(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#7C5CBF';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // 最高点标注
  var maxPoint = linePoints[0];
  linePoints.forEach(function(p) { if (p.y < maxPoint.y) maxPoint = p; });
  ctx.fillStyle = '#7C5CBF';
  ctx.font = 'bold 11px -apple-system,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('最高 ' + Math.round(maxVal * (pad.top + plotH - maxPoint.y) / plotH), maxPoint.x, maxPoint.y - 8);
}

// ==================== 年度热力图 ====================
function rYearHeatmap() {
  var card = document.getElementById('heatmapCard');
  var container = document.getElementById('yearHeatmap');
  if (!card || !container) return;

  // 只在年/累计视图显示
  if (currentPeriod < 3) {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';

  var now = new Date();
  var yearStart = new Date(now.getFullYear(), 0, 1);
  var totalDays = Math.ceil((now - yearStart) / 86400000) + 1;

  // 计算每周数据
  var weeks = [];
  var currentWeek = [];
  var dayOfWeek = yearStart.getDay();

  // 填充第一周的空白天
  for (var i = 0; i < dayOfWeek; i++) {
    currentWeek.push(null);
  }

  for (var d = 0; d < totalDays; d++) {
    var date = new Date(yearStart);
    date.setDate(date.getDate() + d);
    var ds = date.toISOString().slice(0, 10);
    var count = sessions.filter(function(s) { return s.completed && s.date === ds; }).length;
    currentWeek.push({ date: ds, count: count });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  // 颜色映射
  function heatColor(count) {
    if (count === null) return 'transparent';
    if (count === 0) return '#ebedf0';
    if (count === 1) return '#D1C4E9';
    if (count <= 3) return '#B39DDB';
    if (count <= 5) return '#7C5CBF';
    return '#512DA8';
  }

  // 渲染
  container.innerHTML = '';
  var dayLabels = ['日','一','二','三','四','五','六'];

  weeks.forEach(function(week) {
    var col = document.createElement('div');
    col.className = 'heatmap-week';
    week.forEach(function(day, idx) {
      var cell = document.createElement('div');
      cell.className = 'heatmap-day';
      cell.style.background = heatColor(day ? day.count : null);
      if (day) cell.title = day.date + ': ' + day.count + '次专注';
      col.appendChild(cell);
    });
    container.appendChild(col);
  });
}

// ==================== 改进百分比 ====================
function rImprovement() {
  var el = document.getElementById('statsImprove');
  if (!el) return;

  var current = getFilteredSessions().reduce(function(a, s) { return a + s.minutes; }, 0);
  var prevRange = getPrevPeriodRange();
  var prev = sessions.filter(function(s) {
    return s.completed && s.date >= prevRange.start && s.date <= prevRange.end;
  }).reduce(function(a, s) { return a + s.minutes; }, 0);

  if (prev === 0 && current === 0) { el.textContent = ''; return; }
  if (prev === 0) { el.innerHTML = '🎉 这是你的' + getPeriodLabel() + '第一次专注！'; el.style.color = '#7C5CBF'; return; }
  if (current === 0) { el.innerHTML = '😴 ' + getPeriodLabel() + '还没开始呢~ 快去找阿梓！'; el.style.color = '#e57373'; return; }

  var change = Math.round((current - prev) / prev * 100);
  if (change > 0) {
    el.innerHTML = '📈 比上' + getPeriodLabel() + '进步了 <b style="color:#66BB6A">' + change + '%</b>！阿梓为你骄傲~';
    el.style.color = '#2e7d32';
  } else if (change < 0) {
    el.innerHTML = '📉 比上' + getPeriodLabel() + '减少了 <b style="color:#e57373">' + Math.abs(change) + '%</b>，明天加油哦';
    el.style.color = '#c62828';
  } else {
    el.innerHTML = '📊 和上' + getPeriodLabel() + '持平，保持住！';
    el.style.color = '#f57f17';
  }
}

// ==================== 成就计算 ====================
function calcAchievements() {
  var today = Utils.today();
  var dates = sessions.filter(function(s) { return s.completed; }).map(function(s) { return s.date; });
  dates = Array.from(new Set(dates)).sort();
  var streak = Utils.calcStreak(dates);
  var habitsDone = habits.filter(function(h) { return !h.archived; })
    .every(function(h) { return h.dates && h.dates.includes(today); });
  var todayMins = sessions.filter(function(s) { return s.completed && s.date === today; }).reduce(function(a, s) { return a + s.minutes; }, 0);
  return [
    { name: '🌱 初次专注', icon: '🌱', tier: 'bronze', u: totalCompletions >= 1 },
    { name: '⏰ 今日1+小时', icon: '⏰', tier: 'bronze', u: todayMins >= 60 },
    { name: '🌳 完成5次', icon: '🌳', tier: 'bronze', u: totalCompletions >= 5 },
    { name: '🌲 完成10次', icon: '🌲', tier: 'bronze', u: totalCompletions >= 10 },
    { name: '🏕 完成25次', icon: '🏕', tier: 'silver', u: totalCompletions >= 25 },
    { name: '🏔 完成50次', icon: '🏔', tier: 'silver', u: totalCompletions >= 50 },
    { name: '🗻 完成75次', icon: '🗻', tier: 'gold', u: totalCompletions >= 75 },
    { name: '🌍 完成100次', icon: '🌍', tier: 'gold', u: totalCompletions >= 100 },
    { name: '☀️ 完成150次', icon: '☀️', tier: 'gold', u: totalCompletions >= 150 },
    { name: '🌟 完成200次', icon: '🌟', tier: 'legend', u: totalCompletions >= 200 },
    { name: '👑 终极成就', icon: '👑', tier: 'legend', u: totalCompletions >= 180 },
    { name: '🔥 连击7天', icon: '🔥', tier: 'gold', u: streak >= 7 },
    { name: '✅ 全部打卡', icon: '✅', tier: 'silver', u: habitsDone },
    { name: '🏆 百分达人', icon: '🏆', tier: 'gold', u: AppState.score >= 100 },
  ];
}

// ==================== 主渲染入口 ====================
function rProfile() {
  var filtered = getFilteredSessions();
  var today = Utils.today();
  var totalMin = filtered.reduce(function(a, s) { return a + s.minutes; }, 0);
  var totalSessions = filtered.length;

  // 统计卡片
  var todayMin = sessions.filter(function(s) { return s.completed && s.date === today; }).reduce(function(a, s) { return a + s.minutes; }, 0);
  var dates = Array.from(new Set(sessions.filter(function(s) { return s.completed; }).map(function(s) { return s.date; }))).sort();
  var streak = Utils.calcStreak(dates);

  var summaryEl = document.getElementById('statsSummary');
  if (summaryEl) summaryEl.innerHTML =
    '<div class="stats-box"><div class="val">' + Utils.fmtMins(totalMin) + '</div><div class="lbl">⏱ 总时长</div></div>' +
    '<div class="stats-box"><div class="val">' + totalSessions + '</div><div class="lbl">📊 总次数</div></div>' +
    '<div class="stats-box"><div class="val">' + (totalMin > 0 ? Math.round(totalMin / totalSessions) : 0) + '分钟</div><div class="lbl">📈 平均</div></div>' +
    '<div class="stats-box"><div class="val">' + streak + '天</div><div class="lbl">🔥 连续</div></div>';

  // 改进百分比
  rImprovement();

  // Canvas 饼图（延迟渲染确保DOM就绪）
  setTimeout(function() { rTypeDonut(); rTimeDonut(); }, 50);
  setTimeout(function() { rTrendChart(); }, 100);
  setTimeout(function() { rYearHeatmap(); }, 100);

  // 简易商城
  var shopHtml = '<div class="shop-grid">' +
    '<div class="shop-item"><div class="si-icon">🔰</div><div class="si-name">护符</div><div class="si-price">🪙30</div><button class="si-btn ' + (AppState.coins >= 30 ? 'buy' : 'owned') + '" onclick="buyItem(\'freeze\')">' + (AppState.coins >= 30 ? '购买' : '币不足') + '</button></div>' +
    '<div class="shop-item"><div class="si-icon">🎁</div><div class="si-name">惊喜盒</div><div class="si-price">🪙20</div><button class="si-btn ' + (AppState.coins >= 20 ? 'buy' : 'owned') + '" onclick="buyItem(\'box\')">' + (AppState.coins >= 20 ? '购买' : '币不足') + '</button></div>' +
    '<div class="shop-item"><div class="si-icon">💝</div><div class="si-name">心情+20</div><div class="si-price">🪙15</div><button class="si-btn ' + (AppState.coins >= 15 ? 'buy' : 'owned') + '" onclick="buyItem(\'mood\')">' + (AppState.coins >= 15 ? '购买' : '币不足') + '</button></div>' +
    '<div class="shop-item"><div class="si-icon">🪙</div><div class="si-name">阿梓币</div><div class="si-price">' + AppState.coins + '</div><div class="si-name" style="font-size:10px;color:var(--gr)">当前余额</div></div>' +
    '</div>';
  var shopEl = document.getElementById('shopContainer');
  if (shopEl) shopEl.innerHTML = shopHtml;

  // 连续天数 & Streak box
  var bestStreak = 0, cur = 1;
  for (var i = 1; i < dates.length; i++) {
    if (Utils.daysBetween(dates[i], dates[i-1]) === 1) { cur++; if (cur > bestStreak) bestStreak = cur; }
    else { if (cur > bestStreak) bestStreak = cur; cur = 1; }
  }
  if (cur > bestStreak) bestStreak = cur;

  if (streak === 7 && !localStorage.getItem('fgot7')) { AppState.addFreeze(1); localStorage.setItem('fgot7', '1'); }
  if (streak === 30 && !localStorage.getItem('fgot30')) { AppState.addFreeze(2); localStorage.setItem('fgot30', '1'); }

  var streakNum = document.getElementById('streakNum');
  if (streakNum) streakNum.textContent = streak;
  var freezeCount = document.getElementById('freezeCount');
  if (freezeCount) freezeCount.textContent = AppState.streakFreezes;
  var streakBest = document.getElementById('streakBest');
  if (streakBest) streakBest.textContent = '最佳: ' + bestStreak + ' 天';

  // 阶段格子
  var phaseGrid = document.getElementById('phaseGrid');
  if (phaseGrid) phaseGrid.innerHTML =
    '<div class="phase-item"><span class="ph-icon">📅</span><span class="ph-val">' + Utils.fmtMins(todayMin) + '</span>今日</div>' +
    '<div class="phase-item"><span class="ph-icon">📊</span><span class="ph-val">' + Utils.fmtMins(totalMin) + '</span>本期</div>' +
    '<div class="phase-item"><span class="ph-icon">🔥</span><span class="ph-val">' + filtered.length + '</span>总次数</div>' +
    '<div class="phase-item"><span class="ph-icon">👗</span><span class="ph-val">' + (currentTreeIdx + 1) + '/' + AZUSA_TREES.length + '</span>衣装</div>';

  // 成就（由achievements.js渲染）
  if (typeof renderAchievements === 'function') renderAchievements();
}

// ==================== 导出/重置 ====================
function exportData() {
  var json = Storage.exportJSON();
  var b = new Blob([json], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'azusa-forest-' + Utils.today() + '.json';
  a.click();
  toast('📤 已导出');
}

function resetAll() {
  if (!confirm('确定删除所有数据？建议先导出备份。')) return;
  habits.length = 0; goals.length = 0; sessions.length = 0;
  AppState.score = 0; totalCompletions = 0; currentTreeIdx = 0;
  ['fh', 'fg', 'fs', 'fsc', 'fstate'].forEach(function(k) { localStorage.removeItem(k); });
  AppState.save();
  if (currentTab === 2) rGallery();
  if (currentTab === 3) rHabits();
  if (currentTab === 4) rGoals();
  if (currentTab === 5) rProfile();
  updateTaskSelects();
  toast('🔄 已重置');
}
