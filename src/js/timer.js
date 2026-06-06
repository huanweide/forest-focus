/* timer.js - 专注计时器、衣柜渲染、阿梓角色动画
 * 依赖：core.js (AppState, Utils, sessions, habits, goals, azusaCoins, currentMood, streakFreezes)
 */

// ==================== 阿梓树系统(衣装) ====================
const AZUSA_TREES = [
  {id:'seed',name:'🌰 阿梓种子',img:'',emoji:'🌰',unlock:0,sub:'初始状态 · 种树解锁阿梓衣装',color:'#8D6E63'},
  {id:'default',name:'🌸 默认衣装',img:'src/images/azusa/azusa_default_hd.jpg',unlock:1,sub:'🎯 完成1次专注解锁默认衣装',color:'#90CAF9'},
  {id:'regular',name:'👘 常服阿梓',img:'src/images/azusa/azusa_regular.jpg',unlock:3,sub:'🎯 完成3次专注解锁常服',color:'#A5D6A7'},
  {id:'newyear',name:'🎊 新年衣装',img:'src/images/azusa/azusa_newyear.png',unlock:5,sub:'🎯 完成5次专注解锁新年衣装',color:'#EF5350'},
  {id:'summer',name:'🏖 夏日祭',img:'src/images/azusa/azusa_summer_festival.jpg',unlock:10,sub:'🎯 完成10次专注解锁夏日祭衣装',color:'#FF7043'},
  {id:'panda',name:'🐼 熊猫阿梓',img:'src/images/azusa/azusa_panda_outfit.jpg',unlock:18,sub:'🎯 完成18次专注解锁熊猫服',color:'#4CAF50'},
  {id:'rabbit',name:'🐰 六一兔梓',img:'src/images/azusa/azusa_rabbit_2024.jpg',unlock:28,sub:'🎯 完成28次专注解锁兔梓形象',color:'#FF80AB'},
  {id:'frog',name:'🐸 青蛙公主',img:'src/images/azusa/azusa_frog.jpg',unlock:38,sub:'🎯 完成38次专注解锁青蛙公主',color:'#66BB6A'},
  {id:'butterfly',name:'🦋 蝴蝶阿梓',img:'src/images/azusa/azusa_butterfly.jpg',unlock:50,sub:'🎯 完成50次专注解锁蝴蝶衣装',color:'#CE93D8'},
  {id:'eggplant',name:'🍆 茄子阿梓',img:'src/images/azusa/azusa_eggplant.png',unlock:65,sub:'🎯 完成65次专注解锁茄子阿梓',color:'#9575CD'},
  {id:'spring',name:'🌿 春装阿梓',img:'src/images/azusa/azusa_spring.png',unlock:80,sub:'🎯 完成80次专注解锁春装衣装',color:'#81C784'},
  {id:'ninja',name:'🥷 忍梓',img:'src/images/azusa/azusa_ninja_outfit.jpg',unlock:95,sub:'🎯 完成95次专注解锁忍者衣装',color:'#7E57C2'},
  {id:'fan1',name:'🎨 粉丝应援',img:'src/images/azusa/azusa_fan_model1.jpg',unlock:110,sub:'🎯 完成110次专注解锁粉丝模型',color:'#FF8A65'},
  {id:'chibi',name:'💎 Q版阿梓',img:'src/images/azusa/azusa_chibi.png',unlock:125,sub:'🎯 完成125次专注解锁Q版形象',color:'#FFD700'},
  {id:'fan2',name:'✨ 粉丝羁绊',img:'src/images/azusa/azusa_fan_model2.jpg',unlock:140,sub:'🎯 完成140次专注解锁粉丝羁绊',color:'#BA68C8'},
  {id:'box',name:'🎁 盒蛋手办',img:'src/images/azusa/azusa_box.png',unlock:160,sub:'🎯 完成160次专注解锁盒蛋',color:'#FFAB40'},
  {id:'wechat1',name:'📱 阿梓近照',img:'src/images/azusa/azusa_wechat1.jpg',unlock:150,sub:'🎯 完成150次专注解锁阿梓近照',color:'#FFB74D'},
  {id:'wechat2',name:'🌟 阿梓特写',img:'src/images/azusa/azusa_wechat2.png',unlock:165,sub:'🎯 完成165次专注解锁阿梓特写',color:'#4DD0E1'},
  {id:'ultimate',name:'👑 终极阿梓',img:'src/images/azusa/azusa_transparent_standing.png',unlock:200,sub:'🎯 完成200次专注解锁终极阿梓',color:'#E040FB'},
];

var currentTreeIdx = 0;
var totalCompletions = AppState.totalCompletions;

// ==================== 计时器状态 ====================
const DURS = [20, 25, 30, 45, 60];
var timerId = null, elapsed = 0, totalSec = 1500, isBreak = false, lockExits = 0;
var selectedTask = null;
var currentOutfit = parseInt(localStorage.getItem('foutfit') || '-1');
if (currentOutfit < 0 || currentOutfit > currentTreeIdx) currentOutfit = currentTreeIdx;
var currentOutfitFile = localStorage.getItem('foutfitfile') || 'azusa_default_hd';

updateCurrentTree();
if (AppState.darkMode) {
  document.body.classList.add('dark');
  document.getElementById('darkIcon').textContent = '☀️';
}

function updateCurrentTree() {
  for (var i = AZUSA_TREES.length - 1; i >= 0; i--) {
    if (totalCompletions >= AZUSA_TREES[i].unlock) { currentTreeIdx = i; break; }
  }
}

// ==================== Tab 导航 ====================
var currentTab = 0;
function goTab(i) {
  currentTab = i;
  if (typeof resetTimerDressup === 'function') resetTimerDressup();
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('on'); });
  document.querySelectorAll('.tab').forEach(function(t, j) { t.classList.toggle('on', j === i); });
  document.getElementById(['pg5','pg0','pg1','pg2','pg3','pg4'][i]).classList.add('on');
  document.getElementById('bar').textContent = ['🏠 阿梓的森林','⏱ 专注计时','👗 换装衣柜','✅ 习惯追踪','🎯 目标计划','👤 我的数据'][i];
  if (i === 0) rHome();
  if (i === 2) rGallery();
  if (i === 3) rHabits();
  if (i === 4) rGoals();
  if (i === 5) rProfile();
  updateCoinDisplay();
}

// ==================== 专注计时器 ====================
(function initFocus() {
  var c = document.getElementById('chips');
  DURS.forEach(function(d, i) {
    var e = document.createElement('div');
    e.className = 'chip' + (i === 1 ? ' sel' : '');
    e.textContent = d + '分钟';
    e.onclick = function() {
      c.querySelectorAll('.chip').forEach(function(x) { x.classList.remove('sel'); });
      e.classList.add('sel');
      totalSec = d * 60;
      if (!timerId) document.getElementById('time').textContent = d + ':00';
    };
    c.appendChild(e);
  });
  updateTaskSelects();
  drawRing(0);
  document.getElementById('lockLeft').textContent = Math.floor(totalSec / 60);
})();

function onTaskType() {
  var t = document.getElementById('taskType').value;
  var pick = document.getElementById('taskPick');
  pick.style.display = 'none';
  pick.innerHTML = '';
  selectedTask = null;
  document.getElementById('taskHint').textContent = '';
  if (t === 'habit') {
    pick.style.display = 'block';
    pick.innerHTML = '<option value="">-- 选习惯 --</option>' +
      habits.filter(function(h) { return !h.archived; })
        .map(function(h) { return '<option value="' + h.id + '">' + Utils.esc(h.name) + ' · 🔥' + (h.streak || 0) + '天</option>'; }).join('');
  } else if (t === 'goal') {
    pick.style.display = 'block';
    pick.innerHTML = '<option value="">-- 选目标 --</option>' +
      goals.filter(function(g) { return !g.archived; })
        .map(function(g) { return '<option value="' + g.id + '">' + Utils.esc(g.title) + ' · ' + Math.round((g.done || 0) / (g.tomatoes || 10) * 100) + '%</option>'; }).join('');
  } else if (t === 'free') {
    selectedTask = { type: 'free', id: '', name: '自由种树' };
    document.getElementById('taskHint').textContent = '🌸 自由模式 · 每一次专注都在为阿梓收集新衣服';
  }
}

function onTaskPick() {
  var type = document.getElementById('taskType').value;
  var id = document.getElementById('taskPick').value;
  if (!id) { selectedTask = null; document.getElementById('taskHint').textContent = ''; return; }
  if (type === 'habit') {
    var h = habits.find(function(x) { return x.id === id; });
    if (h) selectedTask = { type: 'habit', id: h.id, name: h.name };
    document.getElementById('taskHint').textContent = '✅ ' + (h ? h.name : '') + ' · 阿梓相信你能坚持';
  } else if (type === 'goal') {
    var g = goals.find(function(x) { return x.id === id; });
    if (g) selectedTask = { type: 'goal', id: g.id, name: g.title };
    document.getElementById('taskHint').textContent = '🎯 ' + (g ? g.title : '') + ' · 阿梓给你加油！';
  }
}

function updateTaskSelects() { onTaskType(); }

function start() {
  if (timerId || isBreak) return;
  elapsed = 0; isBreak = false; lockExits = 0;
  document.getElementById('btnGo').style.display = 'none';
  document.getElementById('btnStop').style.display = 'block';
  document.getElementById('status').textContent = selectedTask ? '阿梓陪你一起 · ' + selectedTask.name : '阿梓陪你一起专注 🌸';
  var char = document.getElementById('azusaChar');
  if (char) { char.classList.remove('full','celebrate','wilt','angry','surprised'); char.classList.add('seed'); setExpression('sleepy'); }
  document.querySelectorAll('#chips .chip').forEach(function(c) { c.style.pointerEvents = 'none'; });
  document.getElementById('taskType').disabled = true;
  document.getElementById('taskPick').disabled = true;
  document.getElementById('lockLeft').textContent = Math.floor(totalSec / 60);
  document.getElementById('lockCount').textContent = '0';
  drawRing(0); updateAzusaGrowth(0);
  timerId = setInterval(tick, 1000);
  EventBus.emit('focus:started', { duration: totalSec });
}

function tick() {
  elapsed++;
  var rem = Math.max(0, totalSec - elapsed);
  var m = Math.floor(rem / 60), s = rem % 60;
  document.getElementById('time').textContent = m + ':' + (s < 10 ? '0' : '') + s;
  document.getElementById('lockLeft').textContent = m;
  var p = Math.min(elapsed / totalSec, 1);
  drawRing(p); updateAzusaGrowth(p);
  if (elapsed >= totalSec) { clearInterval(timerId); timerId = null; onDone(); }
}

function onDone() {
  document.getElementById('status').textContent = '🎉 阿梓为你骄傲！';
  azusaCelebrate();
  document.getElementById('btnStop').style.display = 'none';
  document.getElementById('btnGo').style.display = 'block';
  document.getElementById('btnGo').textContent = '☕ 阿梓陪你休息';
  document.getElementById('btnGo').onclick = startBreak;
  document.querySelectorAll('#chips .chip').forEach(function(c) { c.style.pointerEvents = 'auto'; });
  document.getElementById('taskType').disabled = false;
  document.getElementById('taskPick').disabled = false;

  var mins = Math.round(totalSec / 60);
  var session = {
    date: Utils.today(),
    minutes: mins,
    completed: true,
    taskType: (selectedTask && selectedTask.type) ? selectedTask.type : 'free',
    taskId: (selectedTask && selectedTask.id) ? selectedTask.id : '',
    taskName: (selectedTask && selectedTask.name) ? selectedTask.name : '自由种树'
  };
  AppState.addSession(session);
  updateScore(10);
  AppState.updateMood(10);
  AppState.addCoins(5, 'focus_complete');

  totalCompletions = AppState.totalCompletions;
  if (currentOutfit < 0 || currentOutfit > currentTreeIdx) currentOutfit = currentTreeIdx;
  updateCurrentTree();

  // 更新目标进度
  if (selectedTask && selectedTask.type === 'goal') {
    var g = goals.find(function(x) { return x.id === selectedTask.id; });
    if (g) {
      g.done = (g.done || 0) + 1;
      g.totalMins = (g.totalMins || 0) + mins;
      AppState.save();
    }
  }
  // 更新习惯打卡
  if (selectedTask && selectedTask.type === 'habit') {
    var h = habits.find(function(x) { return x.id === selectedTask.id; });
    if (h) {
      h.done = true;
      h.streak = (h.streak || 0) + 1;
      h.health = Math.min(100, (h.health || 50) + 5);
      h.dates = h.dates || [];
      var t = Utils.today();
      if (!h.dates.includes(t)) h.dates.push(t);
      h.totalMins = (h.totalMins || 0) + mins;
      h.totalSessions = (h.totalSessions || 0) + 1;
      AppState.save();
      updateScore(5);
    }
  }

  // 检测新解锁衣装
  var newTree = null;
  for (var i = AZUSA_TREES.length - 1; i > currentTreeIdx; i--) {
    if (totalCompletions >= AZUSA_TREES[i].unlock) { newTree = AZUSA_TREES[i]; break; }
  }
  selectedTask = null;
  updateTaskSelects();

  // 押注结算（使用新的betting.js）
  var betAmt = parseInt(document.getElementById('betAmount').value || '0');
  if (betAmt > 0 && typeof onBetWin === 'function') {
    var win = onBetWin(betAmt, mins);
    var betResult = document.createElement('div');
    betResult.className = 'bet-result win';
    betResult.textContent = '🎉 押注胜利！获得🪙' + win;
    var azChar = document.getElementById('azusaChar');
    if (azChar) azChar.after(betResult);
    setTimeout(function() { betResult.remove(); }, 3000);
  }
  updateBetInfo();
  setTimeout(function() { if (!openRewardBox()) { randomBubble(); } }, 800);
  if (newTree) toast('🌸 新衣装解锁！' + newTree.name);
  else toast('🎉 专注完成！离下一件衣装更近了');
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch(e) {}
}

function startBreak() {
  if (timerId) return;
  elapsed = 0; totalSec = 300; isBreak = true;
  document.getElementById('status').textContent = '阿梓陪你歇一会 ☕';
  var char = document.getElementById('azusaChar');
  if (char) { char.classList.remove('full','growing'); char.classList.add('seed'); setExpression('sleepy'); }
  document.getElementById('btnGo').style.display = 'none';
  document.getElementById('btnGo').textContent = '🌱 和阿梓一起种树';
  document.getElementById('btnGo').onclick = start;
  drawRing(0); updateAzusaGrowth(0);
  timerId = setInterval(function() {
    elapsed++;
    var rem = Math.max(0, totalSec - elapsed);
    var m = Math.floor(rem / 60), s = rem % 60;
    document.getElementById('time').textContent = m + ':' + (s < 10 ? '0' : '') + s;
    drawRing(elapsed / totalSec);
    if (elapsed >= totalSec) {
      clearInterval(timerId); timerId = null; isBreak = false;
      document.getElementById('status').textContent = '阿梓在等你开始呢~';
      var chr = document.getElementById('azusaChar');
      if (chr) { chr.classList.remove('full','celebrate','wilt','angry','surprised'); chr.classList.add('seed'); setExpression('sleepy'); }
      document.getElementById('btnGo').style.display = 'block';
      document.getElementById('btnGo').textContent = '🌱 和阿梓一起种树';
      document.getElementById('btnGo').onclick = start;
      drawRing(0);
      document.getElementById('time').textContent = (totalSec / 60) + ':00';
      toast('☕ 阿梓说休息好啦~继续加油！');
      try { navigator.vibrate && navigator.vibrate([300]); } catch(e) {}
    }
  }, 1000);
}

function abort() {
  if (!timerId) return;
  clearInterval(timerId); timerId = null;
  document.getElementById('btnGo').style.display = 'block';
  document.getElementById('btnStop').style.display = 'none';
  document.getElementById('status').textContent = '没关系，下次一定可以的 🌸';
  azusaWilt();
  document.getElementById('btnGo').textContent = '🌱 和阿梓重新开始';
  document.getElementById('btnGo').onclick = start;
  document.querySelectorAll('#chips .chip').forEach(function(c) { c.style.pointerEvents = 'auto'; });
  document.getElementById('taskType').disabled = false;
  document.getElementById('taskPick').disabled = false;

  var session = {
    date: Utils.today(),
    minutes: Math.floor(elapsed / 60),
    completed: false,
    taskType: (selectedTask && selectedTask.type) ? selectedTask.type : 'free',
    taskId: (selectedTask && selectedTask.id) ? selectedTask.id : ''
  };
  AppState.addSession(session);

  if (selectedTask && selectedTask.type === 'habit') {
    var h = habits.find(function(x) { return x.id === selectedTask.id; });
    if (h) { h.health = Math.max(5, (h.health || 50) - 3); AppState.save(); }
  }
  selectedTask = null;
  updateTaskSelects();
  drawRing(0); azusaWilt();
  document.getElementById('time').textContent = (totalSec / 60) + ':00';
  document.getElementById('lockOverlay').classList.remove('show');

  var betAmt = parseInt(document.getElementById('betAmount').value || '0');
  if (betAmt > 0 && typeof onBetLose === 'function') {
    onBetLose(betAmt);
    var betResult = document.createElement('div');
    betResult.className = 'bet-result lose';
    betResult.textContent = '💸 押注失败，损失🪙' + betAmt;
    var azChar = document.getElementById('azusaChar');
    if (azChar) azChar.after(betResult);
    setTimeout(function() { betResult.remove(); }, 3000);
  }
  updateBetInfo();
  toast('🌸 没关系，阿梓会等你');
}

function drawRing(p) {
  var c = document.getElementById('ring');
  var dpr = window.devicePixelRatio || 1, sz = 180;
  c.width = c.height = sz * dpr;
  c.style.width = c.style.height = sz + 'px';
  var ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  var cx = sz / 2, cy = sz / 2, r = 72;
  ctx.clearRect(0, 0, sz, sz);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#e8e4f0';
  ctx.lineWidth = 10;
  ctx.stroke();
  if (p > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
    var grad = ctx.createLinearGradient(0, 0, sz, sz);
    grad.addColorStop(0, '#7C5CBF');
    grad.addColorStop(1, '#B39DDB');
    ctx.strokeStyle = isBreak ? '#ff8a65' : grad;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function resumeFocus() {
  document.getElementById('lockOverlay').classList.remove('show');
  document.body.classList.remove('locked');
}

function lockAbort() {
  document.getElementById('lockOverlay').classList.remove('show');
  document.body.classList.remove('locked');
  abort();
}

// ==================== 衣柜页渲染 ====================
function wearOutfit(idx) {
  currentOutfit = idx;
  localStorage.setItem('foutfit', idx);
  if (currentTab === 2) rGallery();
  if (currentTab === 1) updateAzusaGrowth(0);
  if (currentTab === 0) rHome();
  if (typeof updateTimerDressupImg === 'function') updateTimerDressupImg();
  toast('👗 ' + AZUSA_TREES[idx].name + ' 换上啦!');
}

function rGallery() {
  var curOutfit = currentOutfit;
  var curTreeIdx = currentTreeIdx;
  var gallery = document.getElementById('treeGallery');
  gallery.innerHTML = AZUSA_TREES.map(function(t, i) {
    var unlocked = totalCompletions >= t.unlock;
    var isCurrent = i === curOutfit;
    var progress = Math.min(100, Math.round(totalCompletions / Math.max(1, t.unlock) * 100));
    var imgHTML = t.img ? '<img class="tg-img" src="' + t.img + '" alt="' + t.name + '" loading="lazy">' : '<span class="tg-emoji">' + t.emoji + '</span>';
    return '<div class="tg-card' + (unlocked ? ' unlocked' : ' locked') + (isCurrent ? ' current' : '') + '"' +
      (unlocked ? ' onclick="wearOutfit(' + i + ')"' : '') + '>' +
      imgHTML +
      '<div class="tg-name">' + t.name + '</div>' +
      '<div class="tg-sub">' + t.sub + '</div>' +
      '<span class="tg-badge' + (unlocked ? '' : ' lock') + '">' + (unlocked ? '✅' : '🔒') + '</span>' +
      (unlocked ? '' : '<div class="tg-progress"><div style="width:' + progress + '%;background:' + t.color + '"></div></div>') +
      '</div>';
  }).join('');
}

// ==================== 阿梓2D角色系统 ====================
function changeOutfit(filename) {
  currentOutfitFile = filename;
  localStorage.setItem('foutfitfile', filename);
  var body = document.getElementById('azusaBody');
  if (body) body.src = 'src/images/azusa/' + filename;
  if (currentTab === 0) rHome();
  if (typeof updateTimerDressupImg === 'function') updateTimerDressupImg();
}

var currentExpression = 'smile';
function setExpression(type) {
  currentExpression = type;
  var face = document.getElementById('azusaFace');
  if (!face) return;
  var map = { happy: '😄', smile: '😊', sleepy: '😴', angry: '😡',
              surprised: '😲', shy: '😳', expect: '🤩', cry: '😢',
              star: '🤩', normal: '🙂', love: '😍', proud: '😎' };
  face.textContent = map[type] || '😊';
}

function autoExpression(mood) {
  if (mood >= 80) return 'star';
  if (mood >= 60) return 'happy';
  if (mood >= 40) return 'smile';
  if (mood >= 20) return 'sleepy';
  return 'cry';
}

function updateAzusaGrowth(progress) {
  var char = document.getElementById('azusaChar');
  if (!char) return;
  char.classList.remove('seed', 'growing', 'full');
  if (progress < 0.12) { char.classList.add('seed'); setExpression('sleepy'); }
  else if (progress < 0.7) { char.classList.add('growing'); setExpression('expect'); }
  else { char.classList.add('full'); setExpression('smile'); }
}

function azusaCelebrate() {
  var char = document.getElementById('azusaChar');
  if (!char) return;
  char.classList.remove('seed', 'growing');
  char.classList.add('full', 'celebrate');
  setExpression('happy');
  showAzusaSpeech('完成了！阿梓好开心 ✨', 2000);
  setTimeout(function() { char.classList.remove('celebrate'); }, 2000);
}

function azusaWilt() {
  var char = document.getElementById('azusaChar');
  if (!char) return;
  char.classList.add('wilt');
  setExpression('cry');
  showAzusaSpeech('怎么可以放弃... 😢', 2500);
  setTimeout(function() { char.classList.remove('wilt'); char.classList.add('full'); }, 2500);
}

var speechTimer = null;
function showAzusaSpeech(text, duration) {
  var bubble = document.getElementById('speechBubble');
  if (!bubble) return;
  bubble.textContent = text;
  bubble.style.display = 'block';
  clearTimeout(speechTimer);
  speechTimer = setTimeout(function() { bubble.style.display = 'none'; }, duration || 3000);
}

var _azusaClickInit = false;
function initAzusaClick() {
  if (_azusaClickInit) return;
  _azusaClickInit = true;
  var char = document.getElementById('azusaChar');
  if (!char) return;
  char.style.cursor = 'pointer';
  char.addEventListener('click', function() {
    var actions = ['celebrate', 'surprised', null];
    var rand = actions[Math.floor(Math.random() * actions.length)];
    if (rand) { char.classList.add(rand); setTimeout(function() { char.classList.remove(rand); }, 1500); }
    var msgs = ['别戳我啦~', '在呢！要专注哦', '嗯？想我了？', '阿梓陪着你呢 ✨', '加油加油！'];
    showAzusaSpeech(msgs[Math.floor(Math.random() * msgs.length)], 2000);
    setExpression(rand === 'surprised' ? 'surprised' : rand === 'celebrate' ? 'happy' : 'smile');
  });
}

// 启动时加载衣装
(function() {
  var saved = localStorage.getItem('foutfitfile');
  if (saved && saved !== currentOutfitFile) { currentOutfitFile = saved; }
  var body = document.getElementById('azusaBody');
  if (body && currentOutfitFile) body.src = 'src/images/azusa/' + currentOutfitFile;
})();

function updateBetInfo() {
  var sel = document.getElementById('betAmount');
  if (!sel) return;
  var currentBet = parseInt(sel.value);
  var info = document.getElementById('betInfo');
  if (currentBet > 0) {
    info.textContent = '完成得🪙' + Math.floor(currentBet * 1.5) + ' | 放弃-🪙' + currentBet;
    info.style.color = '#f57f17';
  } else {
    info.textContent = '';
  }
}
