/* effects.js - 音效 + 粒子特效系统 (Phase 5)
 * 依赖：core.js (AppState, EventBus)
 * 音效：Web Audio API 合成（零外部文件，离线可用）
 * 特效：Canvas粒子（纸屑/金币雨/烟花/成就闪光）
 */

// ==================== 音效管理器 ====================
var AudioCtx = null;
var _audioMuted = false;

function getAudioCtx() {
  if (!AudioCtx) {
    try { AudioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  return AudioCtx;
}

function playTone(freq, duration, type, vol, delay) {
  if (_audioMuted) return;
  var ctx = getAudioCtx();
  if (!ctx) return;
  try {
    delay = delay || 0;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.3, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch(e) {}
}

function playNotes(notes, type, vol) {
  notes.forEach(function(n, i) {
    playTone(n.freq, n.dur, type || 'sine', (vol || 0.3) * (n.vol || 1), i * 0.1);
  });
}

// 音效库
const SFX = {
  // 专注开始 - 轻柔"叮"
  start: function() {
    playTone(880, 0.3, 'sine', 0.2);
    setTimeout(function() { playTone(1100, 0.4, 'sine', 0.15); }, 100);
  },

  // 专注完成 - 欢快上行音阶
  complete: function() {
    playNotes([
      {freq:523,dur:0.2}, {freq:659,dur:0.2}, {freq:784,dur:0.2},
      {freq:1047,dur:0.5,vol:1.5}
    ], 'triangle', 0.25);
  },

  // 成就解锁 - 大号铜锣感
  achievement: function() {
    // 低音轰鸣
    playTone(200, 1.0, 'triangle', 0.4);
    playTone(300, 0.8, 'triangle', 0.3);
    playNotes([
      {freq:523,dur:0.15}, {freq:659,dur:0.15}, {freq:784,dur:0.15},
      {freq:1047,dur:0.6,vol:2}
    ], 'triangle', 0.3);
    // 高频叮叮
    setTimeout(function() {
      playTone(1319, 0.4, 'sine', 0.15);
      playTone(1568, 0.6, 'sine', 0.1);
    }, 300);
  },

  // 购买成功 - 金币叮当
  purchase: function() {
    playTone(1568, 0.1, 'square', 0.15);
    setTimeout(function() { playTone(2093, 0.15, 'square', 0.12); }, 80);
    setTimeout(function() { playTone(2637, 0.2, 'square', 0.1); }, 160);
  },

  // 押注胜利 - 老虎机
  betWin: function() {
    playNotes([
      {freq:659,dur:0.1}, {freq:784,dur:0.1}, {freq:880,dur:0.1},
      {freq:1047,dur:0.3,vol:1.5}
    ], 'triangle', 0.2);
  },

  // 押注失败 - 下行音
  betLose: function() {
    playNotes([
      {freq:440,dur:0.3}, {freq:349,dur:0.3}, {freq:277,dur:0.5}
    ], 'triangle', 0.15);
  },

  // 签到 - 轻快铃声
  checkin: function() {
    playNotes([
      {freq:784,dur:0.1}, {freq:988,dur:0.1}, {freq:1175,dur:0.1},
      {freq:1319,dur:0.3,vol:1.5}
    ], 'sine', 0.2);
  },

  // 断签惩罚 - 悲伤钢琴
  streakBroken: function() {
    playNotes([
      {freq:330,dur:0.5}, {freq:311,dur:0.5}, {freq:277,dur:0.5},
      {freq:262,dur:1.0}
    ], 'triangle', 0.15);
  },

  // 点击音
  click: function() { playTone(660, 0.05, 'sine', 0.1); },

  // 错误/提示
  error: function() { playTone(200, 0.2, 'square', 0.1); },
};

// 全局静音开关
function toggleMute() {
  _audioMuted = !_audioMuted;
  localStorage.setItem('fmuted', _audioMuted ? '1' : '0');
  toast(_audioMuted ? '🔇 已静音' : '🔊 已开启音效');
}

// 初始化静音状态
_audioMuted = localStorage.getItem('fmuted') === '1';

// ==================== Canvas粒子特效 ====================
var _particles = [];
var _particleRAF = null;

function startParticleLoop() {
  if (_particleRAF) return;
  function loop() {
    _particles = _particles.filter(function(p) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity || 0.05;
      p.life -= 0.016;
      p.alpha = Math.max(0, p.life);
      return p.life > 0;
    });
    if (_particles.length === 0) {
      _particleRAF = null;
      return;
    }
    drawParticles();
    _particleRAF = requestAnimationFrame(loop);
  }
  _particleRAF = requestAnimationFrame(loop);
}

function drawParticles() {
  var canvas = document.getElementById('layerFx');
  if (!canvas) return;
  var charEl = document.getElementById('azusaChar');
  if (!charEl) return;

  var rect = charEl.getBoundingClientRect();
  canvas.width = rect.width || 200;
  canvas.height = rect.height || 280;
  canvas.style.width = canvas.width + 'px';
  canvas.style.height = canvas.height + 'px';

  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  _particles.forEach(function(p) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    if (p.type === 'confetti') {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size || 6, (p.size || 6) * 0.6);
    } else if (p.type === 'coin') {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size || 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFA000';
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.size || 4) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'spark') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

function spawnParticles(type, count, options) {
  var canvas = document.getElementById('layerFx');
  if (!canvas) return;
  var w = canvas.width || 200;
  var h = canvas.height || 280;
  var colors = options && options.colors ? options.colors : ['#7C5CBF','#FF7043','#66BB6A','#FFD54F','#FF80AB','#4FC3F7'];
  var cx = (options && options.x) || w / 2;
  var cy = (options && options.y) || h / 2;

  for (var i = 0; i < count; i++) {
    var angle = Math.random() * Math.PI * 2;
    var speed = 1 + Math.random() * 4;
    _particles.push({
      type: type || 'confetti',
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed * (type === 'spark' ? 2 : 1),
      vy: Math.sin(angle) * speed - (type === 'coin' ? 6 : 2),
      gravity: type === 'coin' ? 0.15 : type === 'spark' ? 0.02 : 0.08,
      life: 1 + Math.random() * 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 6,
    });
  }
  startParticleLoop();
}

// ==================== 特效预设 ====================
const FX = {
  // 五彩纸屑
  confetti: function() {
    spawnParticles('confetti', 60, {
      colors: ['#FF6B6B','#4ECDC4','#45B7D1','#F7DC6F','#BB8FCE','#82E0AA','#F8C471'],
    });
    SFX.complete();
  },

  // 金币雨
  coinRain: function() {
    spawnParticles('coin', 30, { colors: ['#FFD700','#FFA000'], y: 0 });
    SFX.purchase();
  },

  // 成就闪光
  achievementGlow: function() {
    spawnParticles('spark', 40, {
      colors: ['#FFD700','#FFF','#FFA000','#FFEB3B'],
      x: 100, y: 100,
    });
    // 屏幕中央大闪光
    setTimeout(function() {
      spawnParticles('spark', 20, {
        colors: ['#FFD700','#FFF'],
        x: 100, y: 80,
      });
    }, 300);
    SFX.achievement();
  },

  // 烟花
  fireworks: function() {
    var bursts = 5;
    for (var i = 0; i < bursts; i++) {
      setTimeout(function() {
        spawnParticles('spark', 25, {
          colors: ['#FF6B6B','#4ECDC4','#F7DC6F','#BB8FCE','#82E0AA'][Math.floor(Math.random()*5)],
          x: 40 + Math.random() * 120,
          y: 20 + Math.random() * 80,
        });
      }, i * 300);
    }
  },

  // 屏幕震动
  shake: function() {
    var body = document.body;
    body.style.transform = 'translateX(4px)';
    setTimeout(function() { body.style.transform = 'translateX(-4px)'; }, 50);
    setTimeout(function() { body.style.transform = 'translateX(3px)'; }, 100);
    setTimeout(function() { body.style.transform = 'translateX(-3px)'; }, 150);
    setTimeout(function() { body.style.transform = 'translateX(1px)'; }, 200);
    setTimeout(function() { body.style.transform = ''; }, 250);
  },

  // 阿梓生气（屏幕变红+震动）
  azusaAngry: function() {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,0,0,.15);z-index:500;pointer-events:none;transition:opacity .5s';
    document.body.appendChild(overlay);
    FX.shake();
    setTimeout(function() { overlay.style.opacity = '0'; }, 300);
    setTimeout(function() { overlay.remove(); }, 800);
  },
};

// ==================== 事件→音效映射 ====================
EventBus.on('focus:started', function() { SFX.start(); });
EventBus.on('focus:completed', function() { FX.confetti(); });
EventBus.on('focus:abandoned', function() { SFX.betLose(); });
EventBus.on('achievement:unlocked', function() { FX.achievementGlow(); });
EventBus.on('coin:changed', function(data) {
  if (data.reason === 'bet_win') SFX.betWin();
  else if (data.reason === 'bet_lose') SFX.betLose();
  else if (data.reason && data.reason.indexOf('buy_') === 0) SFX.purchase();
});
EventBus.on('checkin:done', function() { SFX.checkin(); });
EventBus.on('streak:broken', function() { SFX.streakBroken(); });

// ==================== 心情系统（从原effects.js迁移） ====================
function updateMoodUI() {
  var mood = AppState.mood;
  var face = mood >= 80 ? '😄' : mood >= 60 ? '😊' : mood >= 40 ? '😐' : mood >= 20 ? '😔' : '😢';
  var moodIcon = document.getElementById('moodIcon');
  if (moodIcon) moodIcon.textContent = face;
  if (typeof setExpression === 'function') setExpression(typeof autoExpression === 'function' ? autoExpression(mood) : 'smile');
  document.body.classList.remove('mood-high', 'mood-mid', 'mood-low');
  if (mood >= 70) document.body.classList.add('mood-high');
  else if (mood >= 30) document.body.classList.add('mood-mid');
  else document.body.classList.add('mood-low');
}

function toggleDark() {
  AppState.darkMode = !AppState.darkMode;
  document.body.classList.toggle('dark', AppState.darkMode);
  var icon = document.getElementById('darkIcon');
  if (icon) icon.textContent = AppState.darkMode ? '☀️' : '🌙';
  AppState.save();
}

// ==================== 阿梓对话气泡 ====================
var bubbleTimer = null;

function randomBubble() {
  var bubbles = [
    '今天也要加油哦~ ✨','阿梓一直陪着你呢！','专注的样子最帅了 💪',
    '别忘了休息一下哦~','今天心情不错呢！','阿梓最喜欢和你一起种树 🌱',
    '你是不是又摸鱼了？👀','加油加油！离下一件衣服不远了！',
    '记得每天签到领币哦~ 🪙','今天想穿哪件衣服呢？',
  ];
  var msg = bubbles[Math.floor(Math.random() * bubbles.length)];
  showBubble(msg);
}

function showBubble(msg) {
  var wrap = document.getElementById('bubbleWrap');
  var text = document.getElementById('bubbleText');
  if (!wrap || !text) return;
  text.textContent = msg;
  wrap.style.display = 'block';
  text.className = 'bubble bubble-fade';
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(function() { wrap.style.display = 'none'; }, 5000);
}

function periodicBubble() { randomBubble(); }

// ==================== 通知提醒 ====================
var notifyGranted = false;

function requestNotify() {
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(function(p) { notifyGranted = p === 'granted'; });
    } else if (Notification.permission === 'granted') {
      notifyGranted = true;
    }
  }
}

function sendNotify(title, body) {
  if (!notifyGranted) return;
  try { new Notification(title, { body:body, icon:'src/images/azusa/icon-192.png', tag:'azusa-focus' }); } catch(e) {}
}

function checkReminder() {
  var today = Utils.today();
  var todayDone = sessions.filter(function(s) { return s.completed && s.date === today; }).length;
  var h = new Date().getHours();
  if (h >= 19 && h <= 21 && todayDone === 0) sendNotify('🔥 连续记录危机', '你今天还没学习！阿梓在焦急地等你...');
  if (h >= 22 && todayDone === 0) sendNotify('🚨 最后警告', '今天快过去了！连续记录危在旦夕！');
}

// ==================== 断签系统 ====================
var streakLostDays = 0;

function checkStreakDanger() {
  var today = Utils.today();
  var dates = Array.from(new Set(sessions.filter(function(s) { return s.completed; }).map(function(s) { return s.date; }))).sort();
  if (!dates.length || dates[dates.length - 1] === today) return;
  var lastDate = dates[dates.length - 1];
  var missed = Utils.daysBetween(today, lastDate);
  if (missed >= 3 && !localStorage.getItem('flostShown' + today)) {
    streakLostDays = missed;
    showStreakLostOverlay();
  }
}

function checkStreakRecovery() {
  var today = Utils.today();
  var dates = Array.from(new Set(sessions.filter(function(s) { return s.completed; }).map(function(s) { return s.date; }))).sort();
  if (!dates.length) return;
  var lastDate = dates[dates.length - 1];
  if (lastDate === today) return;
  var missed = Utils.daysBetween(today, lastDate);
  if (missed >= 3 && !localStorage.getItem('flostShown' + today)) {
    streakLostDays = missed;
    showStreakLostOverlay();
  }
}

function showStreakLostOverlay() {
  var overlay = document.getElementById('streakLostOverlay');
  if (!overlay) return;
  var today = Utils.today();
  document.getElementById('lostTitle').textContent = streakLostDays >= 7 ? '阿梓已经快忘记你了...' : '阿梓很伤心...';
  document.getElementById('lostMsg').innerHTML = '你已经' + streakLostDays + '天没有专注了！<br>你的连续记录即将清空';
  document.getElementById('lostFreezeCount').textContent = AppState.streakFreezes;
  overlay.classList.remove('hidden');
  localStorage.setItem('flostShown' + today, '1');
}

function useFreezeRecovery() {
  if (AppState.streakFreezes <= 0) { toast('没有护符了...'); return; }
  AppState.useFreeze();
  document.getElementById('streakLostOverlay').classList.add('hidden');
  toast('🔀 护符保护了你的连续记录！快去种棵树吧~');
  goTab(1);
}

function acceptStreakLoss() {
  document.getElementById('streakLostOverlay').classList.add('hidden');
  AppState.updateMood(-25);
  SFX.streakBroken();
  EventBus.emit('streak:broken', { days: streakLostDays });
  toast('💔 连续记录清空了... 明天重新开始吧');
}

function toggleTimerDefault() {
  var current = localStorage.getItem('ftimerDefault') === '1';
  var next = !current;
  localStorage.setItem('ftimerDefault', next ? '1' : '0');
  var el = document.getElementById('timerToggle');
  if (el) el.classList.toggle('on', next);
  toast(next ? '⏱ 下次打开直接进入计时页' : '🏠 下次打开进入首页');
}

// ==================== 静音按钮（注入AppBar） ====================
setTimeout(function() {
  var bar = document.getElementById('bar');
  if (bar) {
    var muteBtn = document.createElement('span');
    muteBtn.style.cssText = 'cursor:pointer;font-size:16px;margin-left:6px';
    muteBtn.textContent = _audioMuted ? '🔇' : '🔊';
    muteBtn.onclick = function() {
      toggleMute();
      muteBtn.textContent = _audioMuted ? '🔇' : '🔊';
    };
    bar.appendChild(muteBtn);
  }
}, 1000);

console.log('🎵 音效系统已加载: 12种音效 + 5种特效');
