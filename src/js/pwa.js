/* pwa.js - PWA安装、新手礼包、首页渲染、应用初始化
 * 依赖：core.js, timer.js, habits.js, goals.js, stats.js, effects.js, shop.js, chat.js
 */

// ==================== 互动阿梓物理引擎 v4 (Verlet积分．移植自heax.js) ====================
// 参考开源项目：github.com/coderosh/heaxjs (MIT) 和 akihiko47/Verlet-Physics-Engine
// Verlet积分核心公式：velocity = position - oldPosition → 比Euler更稳定．投掷更自然
const PHYSICS = {
  GRAVITY: 0.15, AIR_DRAG: 0.9985, GROUND_FRICTION: 0.92,
  WALL_BOUNCE: 0.92, FLOOR_BOUNCE: 0.82, CEIL_BOUNCE: 0.88,
  MAX_SPEED: 60, MIN_SPEED: 0.01, THROW_MULT: 20,
  ANGULAR_DAMP: 0.95, SETTLE_THRESH: 0.015,
  VEL_SMOOTH: 3, // 投掷速度平滑窗口
  // 粒子特效
  SPARK_COUNT: 8, SPARK_LIFE: 600,
};
var chibiState = {
  x:0, y:0, oldX:0, oldY:0, vx:0, vy:0,  // Verlet: oldX/Y存储上一帧位置
  dragging:false, flying:false, settled:true,
  startX:0, startY:0, origX:0, origY:0,
  lastX:0, lastY:0, lastT:0,
  velHistory:[]  // 速度平滑：存储最近N帧(dx,dy,dt)
};
var chibiAnimId = null;
var chibiResetAnimId = null;
var chibiWanderId = null;

// 缓存首页元素引用（首帧获取一次），动画循环内直接复用，避免每帧 getElementById
var _pg5El = null;
function pg5Visible() {
  if (!_pg5El) _pg5El = document.getElementById('pg5');
  return _pg5El && _pg5El.classList.contains('on');
}

function stopChibiWander() { if (chibiWanderId) { clearInterval(chibiWanderId); chibiWanderId = null; } }
function startChibiWander() {
  stopChibiWander();
  chibiWanderId = setInterval(function() {
    if (chibiState.dragging || chibiState.flying || !chibiState.settled) return;
    var scene = document.getElementById('homeScene');
    if (!scene) return;
    var sr = scene.getBoundingClientRect();
    // Verlet: 设置oldPos来隐式设置初始速度 oldX = x - velX
    chibiState.oldX = chibiState.x - (Math.random()-0.5) * 2.5;
    chibiState.oldY = chibiState.y + (Math.random() * 3 + 1); // 向上跳!
    chibiState.velHistory = [];
    chibiState.flying = true; chibiState.settled = false;
    var wrap = document.getElementById('homeAzusaWrap');
    if (wrap) wrap.classList.add('thrown');
    startChibiPhysics();
  }, 4000 + Math.random() * 6000);
}

function initChibiPhysics() {
  var wrap = document.getElementById('homeAzusaWrap');
  if (!wrap) return;
  // 初始居中
  wrap.style.left = '50%'; wrap.style.top = '50%';
  wrap.style.transform = 'translate(-50%,-50%)';
  chibiState.x = 0; chibiState.y = 0;
  startChibiWander();

  wrap.addEventListener('pointerdown', function(e) {
    e.preventDefault(); e.stopPropagation();
    stopChibiWander();
    if (chibiAnimId) { cancelAnimationFrame(chibiAnimId); chibiAnimId = null; }
    if (chibiResetAnimId) { cancelAnimationFrame(chibiResetAnimId); chibiResetAnimId = null; }
    chibiState.dragging = true;
    chibiState.flying = false;
    chibiState.settled = false;
    chibiState.startX = e.clientX;
    chibiState.startY = e.clientY;
    chibiState.origX = chibiState.x;
    chibiState.origY = chibiState.y;
    chibiState.lastX = e.clientX;
    chibiState.lastY = e.clientY;
    chibiState.lastT = Date.now();

    wrap.classList.add('dragging');
    wrap.classList.remove('thrown');
    wrap.setPointerCapture(e.pointerId);
  });

  wrap.addEventListener('pointermove', function(e) {
    if (!chibiState.dragging) return;
    var now = Date.now();
    // 速度历史采样（用于投掷平滑计算）
    var h = chibiState.velHistory;
    h.push({x:e.clientX, y:e.clientY, t:now});
    if (h.length > PHYSICS.VEL_SMOOTH) h.shift();
    chibiState.x = chibiState.origX + (e.clientX - chibiState.startX);
    chibiState.y = chibiState.origY + (e.clientY - chibiState.startY);
    chibiState.lastX = e.clientX;
    chibiState.lastY = e.clientY;
    chibiState.lastT = now;
    wrap.style.transform = 'translate(' + chibiState.x + 'px,' + chibiState.y + 'px)';
  });

  wrap.addEventListener('pointerup', function(e) {
    var totalDx = Math.abs(e.clientX - chibiState.startX);
    var totalDy = Math.abs(e.clientY - chibiState.startY);
    var moved = totalDx > 5 || totalDy > 5;

    if (!moved) {
      // 点击——弹表情
      chibiState.dragging = false;
      chibiState.settled = true;
      wrap.classList.remove('dragging');
      handleChibiTap(e);
      return;
    }

    // 拖拽松手——速度平滑采样 + Verlet初速注入(移植自heax.js)
    if (typeof playThrowSound === 'function') playThrowSound();
    chibiState.dragging = false;
    wrap.classList.remove('dragging');

    var h = chibiState.velHistory;
    var throwVX = 0, throwVY = 0;
    if (h.length >= 2) {
      var first = h[0], last = h[h.length-1];
      var totalDt = Math.max(1, last.t - first.t);
      throwVX = (last.x - first.x) / totalDt * PHYSICS.THROW_MULT;
      throwVY = (last.y - first.y) / totalDt * PHYSICS.THROW_MULT;
    } else {
      var dt2 = Math.max(1, Date.now() - chibiState.lastT);
      throwVX = (e.clientX - chibiState.lastX) / dt2 * PHYSICS.THROW_MULT;
      throwVY = (e.clientY - chibiState.lastY) / dt2 * PHYSICS.THROW_MULT;
    }
    throwVX = Math.max(-PHYSICS.MAX_SPEED, Math.min(PHYSICS.MAX_SPEED, throwVX));
    throwVY = Math.max(-PHYSICS.MAX_SPEED, Math.min(PHYSICS.MAX_SPEED, throwVY));
    // Verlet核心: oldX = x - velX → 下一帧自动推导速度vel = x - oldX
    chibiState.oldX = chibiState.x - throwVX;
    chibiState.oldY = chibiState.y - throwVY;
    chibiState.velHistory = [];

    chibiState.flying = true;
    chibiState.settled = false;
    wrap.classList.add('thrown');
    startChibiPhysics();
  });

  // 双击归位
  wrap.addEventListener('dblclick', function(e) {
    e.preventDefault();
    resetChibi();
  });
}

var _lastTapTime = 0;
function handleChibiTap(e) {
  // 冷却：500ms内重复点击不响应
  var now = Date.now();
  if (now - _lastTapTime < 500) return;
  _lastTapTime = now;
  var homePage = document.getElementById('pg5');
  if (homePage && !homePage.classList.contains('on')) return;
  var wrap = document.getElementById('homeAzusaWrap');
  if (!wrap) return;
  var rect = wrap.getBoundingClientRect();
  var cx = rect.left + rect.width / 2;
  var cy = rect.top;

  var bubbles = [
    '别戳我啦~', '在呢！', '嘻嘻~', '想我了？', '加油哦！', '阿梓在呢~',
    '你干嘛！', '好痒！', '啊！', '嘿嘿~', '斯瑞！', '今天真开心',
    '不许摸头！', '...好吧再摸一下', '最喜欢你了~', '笨蛋！',
  ];
  var msg = bubbles[Math.floor(Math.random() * bubbles.length)];
  var bubble = document.getElementById('homeAzusaBubble');
  if (bubble) {
    bubble.textContent = msg;
    bubble.style.display = 'block';
    clearTimeout(bubble._t);
    bubble._t = setTimeout(function() { bubble.style.display = 'none'; }, 2500);
  }

  // 音效反馈
  if (typeof playTapSound === 'function') playTapSound();

  // 表情粒子
  var emojis = ['💕','✨','🌸','💖','😊','🥰','🔥','💪','🌱','⭐','🎉','💝','😘','🥺','🫧','💫','🌷','🍀','🦋','🎀','💎','🌟','🍬','🫶','😻'];
  var scene = document.getElementById('homeScene');
  if (!scene) return;
  for (var i = 0; i < 3; i++) {
    var particle = document.createElement('span');
    particle.className = 'chibi-emoji-particle';
    particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    particle.style.left = cx + 'px';
    particle.style.top = cy + 'px';
    particle.style.setProperty('--dx', (Math.random() - 0.5) * 80 + 'px');
    if (i === 0 && typeof playPopSound === 'function') playPopSound();
    particle.style.setProperty('--dy', -(60 + Math.random() * 100) + 'px');
    particle.style.animationDuration = (0.5 + Math.random()) + 's';
    document.body.appendChild(particle);
    setTimeout(function() { particle.remove(); }, 1000);
  }

  if (SFX && SFX.click) SFX.click();
}

function startChibiPhysics() {
  if (chibiAnimId) return;
  var wrap = document.getElementById('homeAzusaWrap');
  if (!wrap) return;
  var scene = document.getElementById('homeScene');
  var sceneRect = scene ? scene.getBoundingClientRect() : { width: 360, height: 280 };
  var cw = 200, ch = 200;

  function step() {
    if (!chibiState.flying) { chibiAnimId = null; return; }
    if (!pg5Visible()) { chibiAnimId = null; return; }

    // === Verlet积分(移植自heax.js开源引擎 MIT) ===
    // 核心公式: vel = pos - oldPos → 力直接作用在位置上．比Euler稳定10倍
    var velX = chibiState.x - chibiState.oldX;
    var velY = chibiState.y - chibiState.oldY;
    chibiState.oldX = chibiState.x;
    chibiState.oldY = chibiState.y;
    // 位置更新（空气阻力和重力直接作用于位置增量）
    chibiState.x += velX * PHYSICS.AIR_DRAG;
    chibiState.y += velY * PHYSICS.AIR_DRAG + PHYSICS.GRAVITY;
    // 同步显式速度（用于碰撞响应和渲染）
    chibiState.vx = chibiState.x - chibiState.oldX;
    chibiState.vy = chibiState.y - chibiState.oldY;

    var maxX = sceneRect.width/2 - cw/2;
    var floorY = sceneRect.height/2 - ch;
    var ceilY = -sceneRect.height/2 + ch/2;
    var hitWall = false;
    if (chibiState.x > maxX) {
      var overshoot = chibiState.x - maxX;
      chibiState.x = maxX - overshoot * PHYSICS.WALL_BOUNCE;
      chibiState.vx = -Math.abs(chibiState.vx)*PHYSICS.WALL_BOUNCE;
      chibiState.oldX = chibiState.x + chibiState.vx;
      hitWall = true;
    }
    if (chibiState.x < -maxX) {
      var overshoot = -maxX - chibiState.x;
      chibiState.x = -maxX + overshoot * PHYSICS.WALL_BOUNCE;
      chibiState.vx = Math.abs(chibiState.vx)*PHYSICS.WALL_BOUNCE;
      chibiState.oldX = chibiState.x - chibiState.vx;
      hitWall = true;
    }
    if (chibiState.y > floorY) {
      chibiState.y = floorY;
      chibiState.vy = -Math.abs(chibiState.vy)*PHYSICS.FLOOR_BOUNCE;
      chibiState.vx *= PHYSICS.GROUND_FRICTION;
      chibiState.oldY = chibiState.y + chibiState.vy;
      hitWall = true;
      if (Math.abs(chibiState.vy) < 0.4) { chibiState.vy = 0; chibiState.vx *= 0.7; chibiState.oldY = chibiState.y; }
    }
    if (chibiState.y < ceilY) {
      var overshoot = ceilY - chibiState.y;
      chibiState.y = ceilY + overshoot * PHYSICS.CEIL_BOUNCE;
      chibiState.vy = Math.abs(chibiState.vy)*PHYSICS.CEIL_BOUNCE;
      chibiState.oldY = chibiState.y - chibiState.vy;
      hitWall = true;
    }
    // 碰撞火花
    if (hitWall) {
      var ci = wrap.querySelector('.azusa-chibi');
      if (ci) { ci.classList.add('squashing'); setTimeout(function(){ ci.classList.remove('squashing'); }, 350); }
      spawnChibiSpark(wrap);
    }

    if (Math.abs(chibiState.vx) < PHYSICS.SETTLE_THRESH && Math.abs(chibiState.vy) < PHYSICS.SETTLE_THRESH && chibiState.y >= floorY - 3) {
      chibiState.flying = false; chibiState.settled = true;
      chibiState.vx = 0; chibiState.vy = 0;
      chibiState.oldX = chibiState.x; chibiState.oldY = chibiState.y;
      wrap.classList.remove('thrown');
      wrap.style.setProperty('--rot', '0deg'); wrap.style.setProperty('--scl', '1');
      chibiAnimId = null;
      wrap.style.transform = 'translate(' + chibiState.x + 'px,' + chibiState.y + 'px)';
      startChibiWander();
      return;
    }

    var speed = Math.sqrt(chibiState.vx*chibiState.vx + chibiState.vy*chibiState.vy);
    var rot = Math.atan2(chibiState.vy, Math.abs(chibiState.vx)+0.1) * Math.min(15, speed*0.5);
    wrap.style.setProperty('--rot', rot+'deg');
    wrap.style.setProperty('--scl', Math.min(1.3, 1+speed*0.006));

    wrap.style.transform = 'translate('+chibiState.x+'px,'+chibiState.y+'px)';
    chibiAnimId = requestAnimationFrame(step);
  }
  chibiAnimId = requestAnimationFrame(step);
}

// 碰撞粒子火花(移植自开源粒子特效)
function spawnChibiSpark(wrap) {
  if (!wrap) return;
  // 仅当所在页面可见时才生成粒子
  var pageEl = wrap.closest(".page");
  if (pageEl && !pageEl.classList.contains("on")) return;
  var rect = wrap.getBoundingClientRect();
  var cx = rect.left+rect.width/2, cy = rect.top+rect.height/2;
  var sparks = ['💥','✨','💫','🌟','⚡'];
  for (var i=0; i<PHYSICS.SPARK_COUNT; i++) {
    var p = document.createElement('span');
    p.className = 'chibi-emoji-particle';
    p.textContent = sparks[Math.floor(Math.random()*sparks.length)];
    p.style.left = cx+'px'; p.style.top = cy+'px';
    p.style.setProperty('--dx', (Math.random()-0.5)*100+'px');
    p.style.setProperty('--dy', (Math.random()-0.5)*80+'px');
    p.style.animationDuration = (0.3+Math.random()*0.3)+'s';
    document.body.appendChild(p);
    setTimeout(function(){ p.remove(); }, PHYSICS.SPARK_LIFE);
  }
}

// 双击归位（平滑动画回到中间）
function resetChibi() {
  chibiState.flying = false;
  chibiState.dragging = false;
  if (chibiAnimId) { cancelAnimationFrame(chibiAnimId); chibiAnimId = null; }
  if (chibiResetAnimId) { cancelAnimationFrame(chibiResetAnimId); }

  var wrap = document.getElementById('homeAzusaWrap');
  if (!wrap) return;
  wrap.classList.remove('thrown', 'dragging');

  var sx = chibiState.x, sy = chibiState.y;
  var t0 = Date.now();
  var dur = 350;

  function anim() {
    var p = Math.min(1, (Date.now() - t0) / dur);
    p = 1 - Math.pow(1 - p, 3);
    chibiState.x = sx + (0 - sx) * p;
    chibiState.y = sy + (0 - sy) * p;
    wrap.style.transform = 'translate(' + chibiState.x + 'px,' + chibiState.y + 'px)';
    wrap.style.setProperty('--rot', '0deg');
    wrap.style.setProperty('--scl', '1');
    if (p < 1) {
      chibiResetAnimId = requestAnimationFrame(anim);
    } else {
      chibiState.x = 0; chibiState.y = 0;
      chibiState.vx = 0; chibiState.vy = 0;
      chibiState.oldX = 0; chibiState.oldY = 0;
      chibiState.settled = true;
      chibiResetAnimId = null;
      wrap.style.transform = 'translate(0px, 0px)';
      startChibiWander();
    }
  }
  chibiResetAnimId = requestAnimationFrame(anim);
}

// ==================== 首页渲染 ====================
function rHome() {
  var today = Utils.today();
  var todaySessions = sessions.filter(function(s) { return s.completed && s.date === today; });
  var todayMins = todaySessions.reduce(function(a, s) { return a + s.minutes; }, 0);
  var todayCount = todaySessions.length;
  var dates = completedDates();
  var totalMins = sessions.filter(function(s) { return s.completed; })
    .reduce(function(a, s) { return a + (s.minutes || 0); }, 0);

  // 快捷统计（统一时间积累 · 可观测记录）
  document.getElementById('quickStats').innerHTML =
    '<div class="quick-stat"><div class="qs-val">' + Utils.fmtMins(todayMins) + '</div><div class="qs-lbl">📅 今日专注</div></div>' +
    '<div class="quick-stat"><div class="qs-val">' + todayCount + '</div><div class="qs-lbl">🌳 完成次数</div></div>' +
    '<div class="quick-stat"><div class="qs-val">🔥 ' + Utils.calcStreak(dates) + '</div><div class="qs-lbl">连续天数</div></div>' +
    '<div class="quick-stat"><div class="qs-val">' + Utils.fmtMins(totalMins) + '</div><div class="qs-lbl">⏳ 累计专注</div></div>';

  // 首页精灵——用完整单图(不切帧，避免裁切)
  var curTree = AZUSA_TREES[currentTreeIdx] || AZUSA_TREES[0];
  var homeAzusaImg = document.getElementById('homeAzusaImg');
  if (homeAzusaImg) {
    homeAzusaImg.src = 'src/images/azusa/chibi_home.png';
    homeAzusaImg.onerror = function() {
      this.src = curTree.img || 'src/images/azusa/chibi_home.png';
    };
  }

  // 心情
  var mood = AppState.mood;
  var moodText = mood >= 80 ? '😄 状态超好' : mood >= 60 ? '😊 状态不错' : mood >= 40 ? '😐 状态一般' : mood >= 20 ? '😔 有点疲惫' : '😢 需要休息';
  var moodBadge = document.getElementById('homeMoodBadge');
  if (moodBadge) moodBadge.textContent = moodText;

  // 每日格言
  var quotes = [
    '"今天也要好好专注呀~"',
    '"每一棵树都是你努力的证明 🌳"',
    '"专注当下，静心成长 🌿"',
    '"专注的你最棒了 💪"',
    '"相信今天的你一定能行！"',
  ];
  var quoteEl = document.getElementById('dailyQuote');
  if (quoteEl) quoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];

  // 黑夜场景
  var h = new Date().getHours();
  var scene = document.getElementById('homeScene');
  if (scene) {
    scene.classList.toggle('night', h >= 20 || h < 6);
    if (h >= 20 || h < 6) {
      var starsEl = document.getElementById('homeStars');
      if (starsEl && !starsEl.children.length) {
        var stars = '';
        for (var i = 0; i < 20; i++) {
          stars += '<div class="star" style="left:' + Math.random() * 100 + '%;top:' + Math.random() * 100 + '%;animation-delay:' + Math.random() * 2 + 's"></div>';
        }
        starsEl.innerHTML = stars;
      }
    }
  }

  // 断签危险提醒
  var lastDate = dates[dates.length - 1];
  var duoEl = document.getElementById('duoWarning');
  if (duoEl) {
    if (lastDate && Utils.daysBetween(today, lastDate) >= 2) {
      duoEl.innerHTML = '<div class="duo-reminder"><div class="duo-title">⚠️ 连续记录危在旦夕！</div><div class="duo-msg">你已经' + Utils.daysBetween(today, lastDate) + '天没有专注了，别让记录断在这里...</div><button class="duo-action" onclick="goTab(1)">🌱 现在去种树</button></div>';
    } else {
      duoEl.innerHTML = '';
    }
  }

  // 计时默认开关状态
  var timerToggle = document.getElementById('timerToggle');
  if (timerToggle) {
    timerToggle.classList.toggle('on', localStorage.getItem('ftimerDefault') === '1');
  }

  updateMoodUI();
}

// ==================== 新手礼包 ====================
function checkNewbieGift() {
  var welcomed = localStorage.getItem('fwelcomed');
  if (welcomed) return;
  var fakeCompletions = AZUSA_TREES[2].unlock;
  var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  for (var i = 0; i < fakeCompletions; i++) {
    sessions.push({
      date: yesterday,
      minutes: 25,
      completed: true,
      taskType: 'free',
      taskId: '',
      taskName: '新手上路'
    });
  }
  totalCompletions = sessions.filter(function(s) { return s.completed; }).length;
  AppState.save();
  updateCurrentTree();
  currentOutfit = 1;
  localStorage.setItem('foutfit', '1');
  localStorage.setItem('fwelcomed', '1');
  toast('🎁 欢迎来到阿梓的森林！送你3件初始衣装~');
  changeOutfit(AZUSA_TREES[1].img.split('/').pop());
  if (currentTab === 0) rHome();
  if (currentTab === 2) rGallery();
}

// ==================== PWA安装 ====================
var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredPrompt = e;
});

function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(r) {
      if (r.outcome === 'accepted') {
        toast('✅ 安装成功！');
        document.getElementById('installBar').classList.add('hidden');
      } else {
        showInstallGuide();
      }
      deferredPrompt = null;
    });
  } else {
    showInstallGuide();
  }
}

function showInstallGuide() {
  document.getElementById('installGuide').classList.add('show');
}

function closeInstallGuide() {
  document.getElementById('installGuide').classList.remove('show');
}

function checkInstallAvailable() {
  var bar = document.getElementById('installBar');
  if (!bar) return;
  var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  if (isStandalone) { bar.classList.add('hidden'); return; }
  if (deferredPrompt || isMobile) {
    bar.classList.remove('hidden');
  }
  if (isMobile && !deferredPrompt) {
    bar.querySelector('.inst-sub').textContent = '华为手机推荐用Edge浏览器打开安装';
  }
}

// ==================== 应用初始化 ====================

function initAll() {
  rHabits();
  rGoals();
  requestNotify();
  checkStreakRecovery();
  updateMoodUI();
  checkNewbieGift();
  setInterval(checkReminder, 600000);
  checkStreakDanger();

  var timerDefault = localStorage.getItem('ftimerDefault') === '1';
  updateCoinDisplay();
  initAzusaClick();
  initChibiPhysics();
  setTimeout(checkInstallAvailable, 3000);
  // 同步所有页面的阿梓形象
  setTimeout(function(){ syncAllAzusaImages(); }, 200);

  if (timerDefault) { goTab(1); } else { goTab(0); }

  // 初始化 API 设置显示
  var achsEl = document.getElementById('achs');
  if (achsEl) {
    var apiSetHtml = '<div style="margin-top:14px;padding:12px;background:var(--c);border-radius:14px;box-shadow:var(--sh)">' +
      '<div class="setting-row"><span style="font-size:13px">🤖 AI聊天设置</span><button class="btn-sm" style="padding:6px 14px;background:var(--gd);color:#fff;border:none;border-radius:12px;cursor:pointer;font-size:12px" onclick="setApiKey()">' + (dsApiKey ? '已连接✅' : '设置Key') + '</button></div>' +
      '<div style="font-size:11px;color:var(--gr);margin-top:4px">接入DeepSeek让阿梓真的会聊天 · 免费额度 · 点击设置</div></div>';
    achsEl.insertAdjacentHTML('beforebegin', apiSetHtml);
  }
}

// ==================== Service Worker ====================
// 仅在HTTPS或localhost下注册SW（file://协议不支持）
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('sw.js').catch(function() {});
}

// ==================== 严格锁机（离开即锁 + 分级惩罚） ====================
// 网页无法做 OS 级锁屏，这里做到：切走/失焦即弹遮罩阻断操作、累计离开次数、
// 离开过久（>2分钟）或累计 3 次直接判定放弃并扣减奖励。
var _awayStart = 0;
function _enterLock() {
  var ov = document.getElementById('lockOverlay');
  if (!ov || ov.classList.contains('show')) return;
  if (!(timerId && !isBreak)) return;
  if (!_awayStart) _awayStart = Date.now();
  lockExits++;
  document.getElementById('lockCount').textContent = lockExits;
  var left = isCountup ? '进行中' : Math.max(0, Math.floor((totalSec - elapsed) / 60));
  document.getElementById('lockLeft').textContent = left;
  ov.classList.add('show');
  document.body.classList.add('locked');
  if (lockExits >= 3) { lockAbort(); toast('⚠️ 离开次数过多，本次专注已结束'); }
}
function _leaveCheck() {
  if (document.hidden) { _enterLock(); return; }
  // 窗口失焦（仍“可见”但切到别的程序）：延迟确认，避免点页面内元素误触
  if (!document.hasFocus()) {
    setTimeout(function() { if (!document.hasFocus() && timerId && !isBreak) _enterLock(); }, 120);
  }
}
function _onReturn() {
  var ov = document.getElementById('lockOverlay');
  if (!ov || !ov.classList.contains('show')) return;
  var away = _awayStart ? (Date.now() - _awayStart) : 0;
  _awayStart = 0;
  if (away > 120000 && timerId && !isBreak) {
    lockAbort();
    toast('⏰ 离开过久，本次专注已结束');
  }
  // 否则保留遮罩，等用户主动点“回去”恢复（resumeFocus）
}
document.addEventListener('visibilitychange', function() {
  if (document.hidden) _enterLock(); else _onReturn();
});
window.addEventListener('blur', _leaveCheck);
window.addEventListener('focus', _onReturn);

// 启动应用
initAll();

function resetTimerDressup() { }

function updateTimerDressupImg() { }


// 强制刷新所有位置的阿梓形象
function syncAllAzusaImages() {
  updateTimerDressupImg();
  var layerDress = document.getElementById('layerDress');
  var curTree = AZUSA_TREES[(typeof currentOutfit!=='undefined' && currentOutfit>=0 ? currentOutfit : currentTreeIdx)] || AZUSA_TREES[0];
  if (layerDress) layerDress.src = curTree.img || 'src/images/azusa/outfits/jk_uniform.png';
}
