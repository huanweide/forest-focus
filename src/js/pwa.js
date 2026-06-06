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

// 换装自主漫游 - 重力驱动活跃移动
var dressupWanderId = null;
function stopDressupWander() { if (dressupWanderId) { clearInterval(dressupWanderId); dressupWanderId = null; } }
function startDressupWander() {
  stopDressupWander();
  dressupWanderId = setInterval(function() {
    if (dressupState.dragging || dressupState.flying || !dressupState.settled) return;
    var scene = document.getElementById('homeScene');
    if (!scene) return;
    var sr = scene.getBoundingClientRect();
    var maxX = sr.width/2 - 65, maxY = sr.height/4;
    // Verlet: 初始速度通过oldPos注入．水平快速+向上跳
    dressupState.oldX = dressupState.x - (Math.random()-0.5) * 10;
    dressupState.oldY = dressupState.y + (3 + Math.random() * 8);
    dressupState.velHistory = [];
    dressupState.flying = true; dressupState.settled = false;
    var wrap = document.getElementById('homeDressupWrap');
    if (wrap) wrap.classList.add('thrown');
    startDressupPhysics();
  }, 2000 + Math.random() * 3000);
}

// ==================== 换装阿梓物理（第二个角色）Verlet版 ====================
var dressupState = {
  x:0, y:0, oldX:0, oldY:0, vx:0, vy:0,
  dragging:false, flying:false, settled:true,
  startX:0, startY:0, origX:0, origY:0,
  lastX:0, lastY:0, lastT:0,
  velHistory:[]
};
var dressupAnimId = null;
var dressupResetId = null;

function initDressupPhysics() {
  var wrap = document.getElementById('homeDressupWrap');
  if (!wrap) return;
  // 初始左下
  wrap.style.left = '5px'; wrap.style.bottom = '5px'; wrap.style.top = 'auto';
  wrap.style.transform = 'translate(0,0)';
  dressupState.x = 0; dressupState.y = 0;
  startDressupWander();

  wrap.addEventListener('pointerdown', function(e) {
    e.preventDefault(); e.stopPropagation();
    stopDressupWander();
    if (dressupAnimId) { cancelAnimationFrame(dressupAnimId); dressupAnimId = null; }
    if (dressupResetId) { cancelAnimationFrame(dressupResetId); dressupResetId = null; }
    dressupState.dragging = true;
    dressupState.flying = false;
    dressupState.settled = false;
    dressupState.startX = e.clientX;
    dressupState.startY = e.clientY;
    dressupState.origX = dressupState.x;
    dressupState.origY = dressupState.y;
    dressupState.lastX = e.clientX;
    dressupState.lastY = e.clientY;
    dressupState.lastT = Date.now();
    dressupState.velHistory = [];
    wrap.classList.add('dragging');
    wrap.style.zIndex = 998;
  });

  wrap.addEventListener('pointermove', function(e) {
    if (!dressupState.dragging) return;
    var now2 = Date.now();
    var h2 = dressupState.velHistory;
    h2.push({x:e.clientX, y:e.clientY, t:now2});
    if (h2.length > PHYSICS.VEL_SMOOTH) h2.shift();
    dressupState.x = dressupState.origX + (e.clientX - dressupState.startX);
    dressupState.y = dressupState.origY + (e.clientY - dressupState.startY);
    dressupState.lastX = e.clientX;
    dressupState.lastY = e.clientY;
    dressupState.lastT = now2;
    wrap.style.transform = 'translate(' + dressupState.x + 'px,' + dressupState.y + 'px)';
  });

  wrap.addEventListener('pointerup', function(e) {
    var dx = Math.abs(e.clientX - dressupState.startX);
    var dy = Math.abs(e.clientY - dressupState.startY);
    if (dx < 5 && dy < 5) {
      dressupState.dragging = false;
      dressupState.settled = true;
      wrap.classList.remove('dragging');
      dressupTap(e);
      return;
    }
    dressupState.dragging = false;
    wrap.classList.remove('dragging');
    var h3 = dressupState.velHistory;
    var throwVX2 = 0, throwVY2 = 0;
    if (h3.length >= 2) {
      var first2 = h3[0], last2 = h3[h3.length-1];
      var totalDt2 = Math.max(1, last2.t - first2.t);
      throwVX2 = (last2.x - first2.x) / totalDt2 * PHYSICS.THROW_MULT;
      throwVY2 = (last2.y - first2.y) / totalDt2 * PHYSICS.THROW_MULT;
    } else {
      var dt2 = Math.max(1, Date.now() - dressupState.lastT);
      throwVX2 = (e.clientX - dressupState.lastX) / dt2 * PHYSICS.THROW_MULT;
      throwVY2 = (e.clientY - dressupState.lastY) / dt2 * PHYSICS.THROW_MULT;
    }
    throwVX2 = Math.max(-PHYSICS.MAX_SPEED, Math.min(PHYSICS.MAX_SPEED, throwVX2));
    throwVY2 = Math.max(-PHYSICS.MAX_SPEED, Math.min(PHYSICS.MAX_SPEED, throwVY2));
    // Verlet初速注入
    dressupState.oldX = dressupState.x - throwVX2;
    dressupState.oldY = dressupState.y - throwVY2;
    dressupState.velHistory = [];
    dressupState.flying = true;
    dressupState.settled = false;
    wrap.classList.add('thrown');
    startDressupPhysics();
  });
}

var _lastDressupTapTime = 0;
function dressupTap(e) {
  // 冷却：500ms内重复点击不响应
  var now = Date.now();
  if (now - _lastDressupTapTime < 500) return;
  _lastDressupTapTime = now;
  var wrap = document.getElementById('homeDressupWrap');
  if (!wrap) return;
  var rect = wrap.getBoundingClientRect();
  var cx = rect.left + rect.width/2, cy = rect.top;

  var lines = [
    '今天穿这件好看吗~','新衣服！','好看吧~','阿梓换新装啦',
    '喜欢这件吗？','斯瑞选的！','美美哒~','嘿嘿~'
  ];
  var bubble = document.getElementById('homeDressupBubble');
  if (bubble) {
    bubble.textContent = lines[Math.floor(Math.random()*lines.length)];
    bubble.style.display = 'block';
    clearTimeout(bubble._t);
    bubble._t = setTimeout(function(){bubble.style.display='none';},2000);
  }

  var flowers = ['🌸','🌺','💐','🌷','✨','💫','🎀','💝'];
  for (var i=0;i<4;i++) {
    var p = document.createElement('span');
    p.className = 'chibi-emoji-particle';
    p.textContent = flowers[Math.floor(Math.random()*flowers.length)];
    p.style.left = cx + 'px'; p.style.top = cy + 'px';
    p.style.setProperty('--dx', (Math.random()-0.5)*140+'px');
    p.style.setProperty('--dy', -(50+Math.random()*90)+'px');
    p.style.animationDuration = (0.5+Math.random())+'s';
    document.body.appendChild(p);
    setTimeout(function(){p.remove();},1000);
  }
  if (SFX&&SFX.click) SFX.click();
}

function startDressupPhysics() {
  if (dressupAnimId) return;
  var wrap = document.getElementById('homeDressupWrap');
  if (!wrap) return;
  var scene = document.getElementById('homeScene');
  var sr = scene?scene.getBoundingClientRect():{width:360,height:280};
  var cw=200,ch=200;

  function step() {
    if (!dressupState.flying) { dressupAnimId = null; return; }

    // === Verlet积分 ===
    var velX = dressupState.x - dressupState.oldX;
    var velY = dressupState.y - dressupState.oldY;
    dressupState.oldX = dressupState.x;
    dressupState.oldY = dressupState.y;
    dressupState.x += velX * PHYSICS.AIR_DRAG;
    dressupState.y += velY * PHYSICS.AIR_DRAG + PHYSICS.GRAVITY;
    dressupState.vx = dressupState.x - dressupState.oldX;
    dressupState.vy = dressupState.y - dressupState.oldY;

    var maxX = sr.width/2 - cw/2;
    var floorY = sr.height/2 - ch/2 + 10;
    var ceilY = -sr.height/2 + ch/2;
    var hitWall = false;
    if (dressupState.x > maxX) {
      var overshoot = dressupState.x - maxX;
      dressupState.x = maxX - overshoot * PHYSICS.WALL_BOUNCE;
      dressupState.vx = -Math.abs(dressupState.vx)*PHYSICS.WALL_BOUNCE;
      dressupState.oldX = dressupState.x + dressupState.vx;
      hitWall=true;
    }
    if (dressupState.x < -maxX) {
      var overshoot = -maxX - dressupState.x;
      dressupState.x = -maxX + overshoot * PHYSICS.WALL_BOUNCE;
      dressupState.vx = Math.abs(dressupState.vx)*PHYSICS.WALL_BOUNCE;
      dressupState.oldX = dressupState.x - dressupState.vx;
      hitWall=true;
    }
    if (dressupState.y > floorY) {
      dressupState.y=floorY;
      dressupState.vy = -Math.abs(dressupState.vy)*PHYSICS.FLOOR_BOUNCE;
      dressupState.vx *= PHYSICS.GROUND_FRICTION;
      dressupState.oldY = dressupState.y + dressupState.vy;
      hitWall=true;
      if (Math.abs(dressupState.vy)<0.4) { dressupState.vy=0; dressupState.vx*=0.7; dressupState.oldY=dressupState.y; }
    }
    if (dressupState.y < ceilY) {
      var overshoot = ceilY - dressupState.y;
      dressupState.y = ceilY + overshoot * PHYSICS.CEIL_BOUNCE;
      dressupState.vy = Math.abs(dressupState.vy)*PHYSICS.CEIL_BOUNCE;
      dressupState.oldY = dressupState.y - dressupState.vy;
      hitWall=true;
    }
    if (hitWall) {
      var chibiImg = wrap.querySelector('.azusa-chibi');
      if (chibiImg) { chibiImg.classList.add('squashing'); setTimeout(function(){ chibiImg.classList.remove('squashing'); }, 350); }
      spawnChibiSpark(wrap);
    }
    if (Math.abs(dressupState.vx)<PHYSICS.SETTLE_THRESH && Math.abs(dressupState.vy)<PHYSICS.SETTLE_THRESH && dressupState.y>=floorY-3) {
      dressupState.flying=false; dressupState.settled=true;
      dressupState.vx=0; dressupState.vy=0;
      dressupState.oldX=dressupState.x; dressupState.oldY=dressupState.y;
      wrap.classList.remove('thrown');
      dressupAnimId=null;
      wrap.style.transform = 'translate('+dressupState.x+'px,'+dressupState.y+'px)';
      startDressupWander();
      return;
    }
    wrap.style.transform = 'translate('+dressupState.x+'px,'+dressupState.y+'px)';
    dressupAnimId = requestAnimationFrame(step);
  }
  dressupAnimId = requestAnimationFrame(step);
}



// ==================== 首页渲染 ====================
function rHome() {
  var today = Utils.today();
  var todaySessions = sessions.filter(function(s) { return s.completed && s.date === today; });
  var todayMins = todaySessions.reduce(function(a, s) { return a + s.minutes; }, 0);
  var todayCount = todaySessions.length;

  // 快捷统计
  document.getElementById('quickStats').innerHTML =
    '<div class="quick-stat"><div class="qs-val">' + Utils.fmtMins(todayMins) + '</div><div class="qs-lbl">📅 今日专注</div></div>' +
    '<div class="quick-stat"><div class="qs-val">' + todayCount + '</div><div class="qs-lbl">🌳 完成次数</div></div>' +
    '<div class="quick-stat"><div class="qs-val">' + AppState.coins + '</div><div class="qs-lbl">🪙 阿梓币</div></div>' +
    '<div class="quick-stat"><div class="qs-val">🔥 ' + Utils.calcStreak(Array.from(new Set(sessions.filter(function(s) { return s.completed; }).map(function(s) { return s.date; })))) + '</div><div class="qs-lbl">连续天数</div></div>';

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
  var moodText = mood >= 80 ? '😄 阿梓心情超好' : mood >= 60 ? '😊 阿梓心情不错' : mood >= 40 ? '😐 阿梓心情一般' : mood >= 20 ? '😔 阿梓有点低落' : '😢 阿梓很伤心';
  var moodBadge = document.getElementById('homeMoodBadge');
  if (moodBadge) moodBadge.textContent = moodText;

  // 每日格言
  var quotes = [
    '"阿梓在等你开始今天的专注呢~"',
    '"每一棵树都是你努力的证明 🌳"',
    '"今天也要和阿梓一起加油哦！"',
    '"专注的你最帅了 💪"',
    '"阿梓相信，你今天一定能行！"',
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
  var dates = Array.from(new Set(sessions.filter(function(s) { return s.completed; }).map(function(s) { return s.date; }))).sort();
  var lastDate = dates[dates.length - 1];
  var duoEl = document.getElementById('duoWarning');
  if (duoEl) {
    if (lastDate && Utils.daysBetween(today, lastDate) >= 2) {
      duoEl.innerHTML = '<div class="duo-reminder"><div class="duo-title">⚠️ 连续记录危在旦夕！</div><div class="duo-msg">你已经' + Utils.daysBetween(today, lastDate) + '天没有专注了。阿梓很担心你...</div><button class="duo-action" onclick="goTab(1)">🌱 现在去种树</button></div>';
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
  setInterval(periodicBubble, 300000);
  setInterval(checkReminder, 600000);
  setTimeout(randomBubble, 10000);
  checkStreakDanger();

  var timerDefault = localStorage.getItem('ftimerDefault') === '1';
  updateCoinDisplay();
  initAzusaClick();
  initChibiPhysics();
  initDressupPhysics();
  initTimerDressupSimple();
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

// 页面隐藏锁屏
document.addEventListener('visibilitychange', function() {
  if (document.hidden && timerId && !isBreak) {
    lockExits++;
    document.getElementById('lockCount').textContent = lockExits;
    document.getElementById('lockLeft').textContent = Math.floor((totalSec - elapsed) / 60);
    document.getElementById('lockOverlay').classList.add('show');
    document.body.classList.add('locked');
    if (lockExits >= 3) {
      lockAbort();
      toast('😢 阿梓伤心了...树枯萎了');
    }
  }
});

// 启动应用
initAll();





// ==================== 计时页阿梓——轻量点击表情 ====================
function initTimerDressupSimple() {
  var wrap = document.getElementById('timerDressupWrap');
  if (!wrap) return;
  wrap.style.position = 'absolute';
  wrap.style.left = '16px'; wrap.style.top = 'auto'; wrap.style.bottom = '16px';
  wrap.style.transform = 'translate(0,0)';
  wrap.style.cursor = 'pointer';

  wrap.addEventListener('click', function(e) {
    e.stopPropagation();
    var bubble = document.getElementById('timerDressupBubble');
    if (!bubble) return;
    var msgs = ['别戳我啦~', '在呢！', '嘿嘿~', '想我了？', '加油哦！', '阿梓在呢~', '干什么！', '好痒！', '啊！', '斯瑞！', '最喜欢你了~'];
    bubble.textContent = msgs[Math.floor(Math.random() * msgs.length)];
    bubble.style.display = 'block';
    clearTimeout(bubble._t);
    bubble._t = setTimeout(function() { bubble.style.display = 'none'; }, 2000);

    var wrap2 = document.getElementById('timerDressupWrap');
    if (wrap2) { wrap2.classList.add('clicked'); setTimeout(function(){ wrap2.classList.remove('clicked'); }, 550); }

    if (SFX && SFX.click) SFX.click();
  });
}

function resetTimerDressup() {
  var wrap = document.getElementById('timerDressupWrap');
  if (!wrap) return;
  wrap.style.left = '16px';
  wrap.style.bottom = '16px';
  wrap.style.top = 'auto';
  wrap.style.transform = 'translate(0,0)';
}
function updateTimerDressupImg() {
  var img = document.getElementById('timerDressupImg');
  if (!img) return;
  var curTree = AZUSA_TREES[(typeof currentOutfit!=='undefined' && currentOutfit>=0 ? currentOutfit : currentTreeIdx)] || AZUSA_TREES[0];
  var newSrc = curTree.img || 'src/images/azusa/outfits/jk_uniform.png';
  img.src = newSrc;

  // 同步更新计时页分层阿梓的 dress 层
  var layerDress = document.getElementById('layerDress');
  if (layerDress) layerDress.src = newSrc;

  // 同步更新首页换装阿梓（如果存在）
  var homeDressImg = document.getElementById('homeDressupImg');
  if (homeDressImg) homeDressImg.src = newSrc;

  localStorage.setItem('foutfitfile', newSrc.split('/').pop());
  currentOutfitFile = newSrc.split('/').pop();
}

// 强制刷新所有位置的阿梓形象
function syncAllAzusaImages() {
  updateTimerDressupImg();
  var layerDress = document.getElementById('layerDress');
  var curTree = AZUSA_TREES[(typeof currentOutfit!=='undefined' && currentOutfit>=0 ? currentOutfit : currentTreeIdx)] || AZUSA_TREES[0];
  if (layerDress) layerDress.src = curTree.img || 'src/images/azusa/outfits/jk_uniform.png';
}
