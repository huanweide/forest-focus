/* goals.js - 目标计划
 * 依赖：core.js (AppState, Utils, goals)
 */

function addGoal() {
  var title = prompt('目标名称（如：复习高数第三章）：');
  if (!title) return;
  var tomatoes = parseInt(prompt('需要几个番茄钟（每个25分钟）？', '10')) || 10;
  goals.push({
    id: Utils.uid(),
    title: title,
    tomatoes: tomatoes,
    done: 0,
    totalMins: 0,
    archived: false
  });
  AppState.save();
  rGoals();
  updateTaskSelects();
  toast('🎯 目标已创建！');
}

function rGoals() {
  var list = document.getElementById('goalsList');
  var active = goals.filter(function(g) { return !g.archived; });
  if (!active.length) {
    list.innerHTML = '<div style="text-align:center;padding:36px 20px 28px;color:var(--gr)">' +
      '<div style="font-size:52px;margin-bottom:10px">🎯</div>' +
      '<div style="font-size:15px;font-weight:700;color:var(--t);margin-bottom:6px">还没有目标</div>' +
      '<div style="font-size:12px;line-height:1.5;margin-bottom:16px">把大目标拆成番茄钟，和阿梓一起完成吧~</div>' +
      '<button style="background:var(--gd);color:#fff;border:none;padding:9px 18px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:var(--sh)" onclick="addGoal()">+ 新建目标</button>' +
      '</div>';
    return;
  }
  list.innerHTML = active.map(function(g) {
    var pct = Math.min(100, Math.round((g.done || 0) / Math.max(1, g.tomatoes) * 100));
    var color = pct >= 100 ? '#66BB6A' : pct >= 50 ? '#FFA726' : '#FF7043';
    var canTick = g.done < g.tomatoes;
    return '<div class="g-row" style="margin-bottom:10px;padding:8px">' +
      '<div class="g-pct">' + pct + '%</div>' +
      '<div class="g-bar"><div class="g-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
      '<div style="font-size:12px;min-width:50px;text-align:right">' + (g.done || 0) + '/' + g.tomatoes + '</div>' +
      '<button style="background:' + (canTick ? 'var(--g)' : '#ccc') + ';color:#fff;border:none;width:28px;height:28px;border-radius:50%;font-size:14px;cursor:' + (canTick ? 'pointer' : 'default') + '" ' + (canTick ? 'onclick="tickGoal(\'' + g.id + '\')"' : '') + '>✓</button>' +
      '<button style="background:none;border:none;font-size:14px;cursor:pointer;padding:2px" onclick="editGoalName(\'' + g.id + '\')">✏️</button>' +
      '<button style="background:none;border:none;font-size:14px;cursor:pointer;padding:2px" onclick="deleteGoal(\'' + g.id + '\')">🗑</button>' +
      '</div>' +
      '<div style="font-size:13px;font-weight:600;margin:-4px 0 4px 48px">' + Utils.esc(g.title) + '</div>';
  }).join('');
}

function tickGoal(id) {
  var g = goals.find(function(x) { return x.id === id; });
  if (!g || g.done >= g.tomatoes) return;
  g.done = Math.min(g.tomatoes, (g.done || 0) + 1);
  AppState.save();
  rGoals();
  updateTaskSelects();
  updateScore(5);
  AppState.addCoins(3, 'goal_progress');
  if (g.done >= g.tomatoes) {
    toast('🎉 目标完成！' + g.title);
    EventBus.emit('goal:completed', { goal: g });
  }
}

function editGoalName(id) {
  var g = goals.find(function(x) { return x.id === id; });
  if (!g) return;
  var title = prompt('修改目标名称：', g.title);
  if (title) { g.title = title; AppState.save(); rGoals(); updateTaskSelects(); }
}

function deleteGoal(id) {
  if (!confirm('确定删除这个目标吗？')) return;
  var idx = goals.findIndex(function(x) { return x.id === id; });
  if (idx >= 0) { goals.splice(idx, 1); AppState.save(); rGoals(); updateTaskSelects(); toast('已删除'); }
}

function archiveGoal(id) {
  var g = goals.find(function(x) { return x.id === id; });
  if (!g) return;
  g.archived = true;
  AppState.save();
  rGoals();
  updateTaskSelects();
}
