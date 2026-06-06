/* pwa.js - PWA安装、新手礼包、首页渲染、应用初始化
 * 依赖：core.js, timer.js, habits.js, goals.js, stats.js, effects.js, shop.js, chat.js
 */

// ==================== 互动阿梓物理引擎 v2 ====================
// 不复位：扔出去停哪就停哪，双击才归位
var chibiState = {
  x:0, y:0,        // 当前位置
  vx:0, vy:0,       // 速度
  dragging:false,
  flying:false,
  settled:true,     // 是否静止
  startX:0, startY:0,
  origX:0, origY:0,
  lastX:0, lastY:0,
  lastT:0
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
    var maxX = sr.width/2 - 100, maxY = sr.height/2 - 100;
    chibiState.vx = (Math.random()-0.5) * 3;
    chibiState.vy = (Math.random()-0.5) * 2 - 0.5;
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
    chibiState.x = chibiState.origX + (e.clientX - chibiState.startX);
    chibiState.y = chibiState.origY + (e.clientY - chibiState.startY);
    chibiState.lastX = e.clientX;
    chibiState.lastY = e.clientY;
    chibiState.lastT = Date.now();
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

    // 拖拽松手——计算投掷速度
    chibiState.dragging = false;
    wrap.classList.remove('dragging');

    var dt = Math.max(1, Date.now() - chibiState.lastT);
    chibiState.vx = (e.clientX - chibiState.lastX) / dt * 35;
    chibiState.vy = (e.clientY - chibiState.lastY) / dt * 35;
    // 限速，避免飞出屏幕
    var maxV = 35;
    chibiState.vx = Math.max(-maxV, Math.min(maxV, chibiState.vx));
    chibiState.vy = Math.max(-maxV, Math.min(maxV, chibiState.vy));

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

function handleChibiTap(e) {
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

  // 表情粒子
  var emojis = ['💕','✨','🌸','💖','😊','🥰','🔥','💪','🌱','⭐','🎉','💝','😘','🥺'];
  var scene = document.getElementById('homeScene');
  if (!scene) return;
  for (var i = 0; i < 5; i++) {
    var particle = document.createElement('span');
    particle.className = 'chibi-emoji-particle';
    particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    particle.style.left = cx + 'px';
    particle.style.top = cy + 'px';
    particle.style.setProperty('--dx', (Math.random() - 0.5) * 160 + 'px');
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

    // 重力
    chibiState.vy += 0.55;
    // 位移
    chibiState.x += chibiState.vx;
    chibiState.y += chibiState.vy;
    // 空气阻力
    chibiState.vx *= 0.985;
    chibiState.vy *= 0.985;

    // 边界碰撞——碰到立刻弹回
    var maxX = sceneRect.width/2 - cw/2;
    var floorY = sceneRect.height/2 - ch;
    var ceilY = -sceneRect.height/2 + ch/2;
    if (chibiState.x > maxX)  { chibiState.x = maxX;  chibiState.vx = -Math.abs(chibiState.vx)*0.6; }
    if (chibiState.x < -maxX) { chibiState.x = -maxX; chibiState.vx = Math.abs(chibiState.vx)*0.6; }
    if (chibiState.y > floorY) {
      chibiState.y = floorY;
      chibiState.vy = -Math.abs(chibiState.vy)*0.5;
      if (Math.abs(chibiState.vy) < 0.5) { chibiState.vy = 0; chibiState.vx *= 0.8; }
    }
    if (chibiState.y < ceilY) { chibiState.y = ceilY; chibiState.vy = Math.abs(chibiState.vy)*0.5; }

    // 静止判定
    if (Math.abs(chibiState.vx) < 0.08 && Math.abs(chibiState.vy) < 0.08 && chibiState.y >= floorY - 3) {
      chibiState.flying = false;
      chibiState.settled = true;
      chibiState.vx = 0; chibiState.vy = 0;
      wrap.classList.remove('thrown');
      wrap.style.setProperty('--rot', '0deg');
      wrap.style.setProperty('--scl', '1');
      chibiAnimId = null;
      chibiReaction('shy', 2000);
      wrap.style.transform = 'translate(' + chibiState.x + 'px,' + chibiState.y + 'px)';
      startChibiWander();
      return;
    }

    // 旋转+缩放视觉
    var rot = Math.atan2(chibiState.vy, Math.abs(chibiState.vx) + 0.1) * 30;
    wrap.style.setProperty('--rot', rot + 'deg');
    wrap.style.setProperty('--scl', Math.min(1.3, 1 + Math.abs(chibiState.vy) * 0.012));

    wrap.style.transform = 'translate(' + chibiState.x + 'px,' + chibiState.y + 'px)';
    chibiAnimId = requestAnimationFrame(step);
  }
  chibiAnimId = requestAnimationFrame(step);
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
    // easeOutCubic
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
    // 水平速度快一些，垂直给向上初速度让重力自然下落
    dressupState.vx = (Math.random()-0.5) * 8;
    dressupState.vy = -(3 + Math.random() * 6);
    dressupState.flying = true; dressupState.settled = false;
    var wrap = document.getElementById('homeDressupWrap');
    if (wrap) wrap.classList.add('thrown');
    startDressupPhysics();
  }, 2000 + Math.random() * 3000);
}

// ==================== 换装阿梓物理（第二个角色） ====================
var dressupState = {
  x:0, y:0, vx:0, vy:0,
  dragging:false, flying:false, settled:true,
  startX:0, startY:0, origX:0, origY:0,
  lastX:0, lastY:0, lastT:0
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
    wrap.classList.add('dragging');
    wrap.style.zIndex = 998;
  });

  wrap.addEventListener('pointermove', function(e) {
    if (!dressupState.dragging) return;
    dressupState.x = dressupState.origX + (e.clientX - dressupState.startX);
    dressupState.y = dressupState.origY + (e.clientY - dressupState.startY);
    dressupState.lastX = e.clientX;
    dressupState.lastY = e.clientY;
    dressupState.lastT = Date.now();
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
    var dt = Math.max(1, Date.now() - dressupState.lastT);
    dressupState.vx = (e.clientX - dressupState.lastX) / dt * 45;
    dressupState.vy = (e.clientY - dressupState.lastY) / dt * 45;
    var maxV = 35;
    dressupState.vx = Math.max(-maxV, Math.min(maxV, dressupState.vx));
    dressupState.vy = Math.max(-maxV, Math.min(maxV, dressupState.vy));
    dressupState.flying = true;
    dressupState.settled = false;
    wrap.classList.add('thrown');
    startDressupPhysics();
  });
}

function dressupTap(e) {
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
    dressupState.vy += 0.55;
    dressupState.x += dressupState.vx;
    dressupState.y += dressupState.vy;
    dressupState.vx *= 0.985;
    dressupState.vy *= 0.985;
    var maxX = sr.width/2 - cw/2;
    var floorY = sr.height/2 - ch/2 + 10;
    var ceilY = -sr.height/2 + ch/2;
    if (dressupState.x > maxX)  { dressupState.x=maxX;  dressupState.vx = -Math.abs(dressupState.vx)*0.6; }
    if (dressupState.x < -maxX) { dressupState.x=-maxX; dressupState.vx = Math.abs(dressupState.vx)*0.6; }
    if (dressupState.y > floorY) {
      dressupState.y=floorY;
      dressupState.vy = -Math.abs(dressupState.vy)*0.5;
      if (Math.abs(dressupState.vy)<0.5) { dressupState.vy=0; dressupState.vx*=0.8; }
    }
    if (dressupState.y < ceilY) { dressupState.y=ceilY; dressupState.vy = Math.abs(dressupState.vy)*0.5; }
    if (Math.abs(dressupState.vx)<0.08 && Math.abs(dressupState.vy)<0.08 && dressupState.y>=floorY-3) {
      dressupState.flying=false; dressupState.settled=true;
      dressupState.vx=0; dressupState.vy=0;
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
  // 换装角色——显示当前衣装
  var dressupImg = document.getElementById('homeDressupImg');
  if (dressupImg) {
    var outfitSrc = curTree.img || 'src/images/azusa/outfits/jk_uniform.png';
    dressupImg.src = outfitSrc;
    dressupImg.onerror = function() {
      this.src = 'src/images/azusa/outfits/jk_uniform.png';
    };
  }
  var homeAzusaName = document.getElementById('homeAzusaName');
  if (homeAzusaName) homeAzusaName.textContent = curTree.name;

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
  initTimerDressup();
  setTimeout(checkInstallAvailable, 3000);

  if (timerDefault) { goTab(1); } else { goTab(0); rHome(); }

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
if ('serviceWorker' in navigator) {
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


// ==================== 计时页换装阿梓物理 ====================
var timerDressupState = { x:0, y:0, vx:0, vy:0, dragging:false, flying:false, settled:true, startX:0, startY:0, origX:0, origY:0, lastX:0, lastY:0, lastT:0 };
var timerDressupAnimId = null;

function initTimerDressup() {
  var wrap = document.getElementById('timerDressupWrap');
  if (!wrap) return;

  wrap.addEventListener('pointerdown', function(e) {
    e.preventDefault(); e.stopPropagation();
    if (timerDressupAnimId) { cancelAnimationFrame(timerDressupAnimId); timerDressupAnimId = null; }
    timerDressupState.dragging = true;
    timerDressupState.flying = false;
    timerDressupState.settled = false;
    timerDressupState.startX = e.clientX;
    timerDressupState.startY = e.clientY;
    timerDressupState.origX = timerDressupState.x;
    timerDressupState.origY = timerDressupState.y;
    timerDressupState.lastX = e.clientX;
    timerDressupState.lastY = e.clientY;
    timerDressupState.lastT = Date.now();
    wrap.classList.add('dragging');
    wrap.classList.remove('thrown');
    wrap.setPointerCapture(e.pointerId);
  });

  wrap.addEventListener('pointermove', function(e) {
    if (!timerDressupState.dragging) return;
    timerDressupState.x = timerDressupState.origX + (e.clientX - timerDressupState.startX);
    timerDressupState.y = timerDressupState.origY + (e.clientY - timerDressupState.startY);
    timerDressupState.lastX = e.clientX;
    timerDressupState.lastY = e.clientY;
    timerDressupState.lastT = Date.now();
    wrap.style.transform = 'translate(' + timerDressupState.x + 'px,' + timerDressupState.y + 'px)';
  });

  wrap.addEventListener('pointerup', function(e) {
    var dx = Math.abs(e.clientX - timerDressupState.startX);
    var dy = Math.abs(e.clientY - timerDressupState.startY);
    if (dx < 5 && dy < 5) {
      timerDressupState.dragging = false;
      timerDressupState.settled = true;
      wrap.classList.remove('dragging');
      // tap: 弹个气泡
      var b = document.getElementById('timerDressupBubble');
      if (b) { b.textContent = '今天穿这件~'; b.style.display='block'; clearTimeout(b._t); b._t=setTimeout(function(){b.style.display='none';},2000); }
      return;
    }
    timerDressupState.dragging = false;
    wrap.classList.remove('dragging');
    var dt = Math.max(1, Date.now() - timerDressupState.lastT);
    timerDressupState.vx = (e.clientX - timerDressupState.lastX) / dt * 35;
    timerDressupState.vy = (e.clientY - timerDressupState.lastY) / dt * 35;
    var maxV = 35;
    timerDressupState.vx = Math.max(-maxV, Math.min(maxV, timerDressupState.vx));
    timerDressupState.vy = Math.max(-maxV, Math.min(maxV, timerDressupState.vy));
    timerDressupState.flying = true;
    timerDressupState.settled = false;
    wrap.classList.add('thrown');
    startTimerDressupPhysics();
  });
}

function startTimerDressupPhysics() {
  if (timerDressupAnimId) return;
  var wrap = document.getElementById('timerDressupWrap');
  if (!wrap) return;
  var page = document.getElementById('pg0');
  var pr = page ? page.getBoundingClientRect() : { width: 360, height: 600 };
  var cw = 140, ch = 200;

  function step() {
    if (!timerDressupState.flying) { timerDressupAnimId = null; return; }
    timerDressupState.vy += 0.55;
    timerDressupState.x += timerDressupState.vx;
    timerDressupState.y += timerDressupState.vy;
    timerDressupState.vx *= 0.985;
    timerDressupState.vy *= 0.985;
    var maxX = pr.width/2 - cw/2;
    var floorY = pr.height/2 - ch;
    var ceilY = -pr.height/2 + ch/2 + 40;
    if (timerDressupState.x > maxX)  { timerDressupState.x = maxX;  timerDressupState.vx = -Math.abs(timerDressupState.vx)*0.6; }
    if (timerDressupState.x < -maxX) { timerDressupState.x = -maxX; timerDressupState.vx = Math.abs(timerDressupState.vx)*0.6; }
    if (timerDressupState.y > floorY) {
      timerDressupState.y = floorY;
      timerDressupState.vy = -Math.abs(timerDressupState.vy)*0.5;
      if (Math.abs(timerDressupState.vy) < 0.5) { timerDressupState.vy = 0; timerDressupState.vx *= 0.8; }
    }
    if (timerDressupState.y < ceilY) { timerDressupState.y = ceilY; timerDressupState.vy = Math.abs(timerDressupState.vy)*0.5; }
    if (Math.abs(timerDressupState.vx) < 0.08 && Math.abs(timerDressupState.vy) < 0.08 && timerDressupState.y >= floorY - 3) {
      timerDressupState.flying = false; timerDressupState.settled = true;
      timerDressupState.vx = 0; timerDressupState.vy = 0;
      wrap.classList.remove('thrown');
      timerDressupAnimId = null;
      wrap.style.transform = 'translate(' + timerDressupState.x + 'px,' + timerDressupState.y + 'px)';
      return;
    }
    wrap.style.transform = 'translate(' + timerDressupState.x + 'px,' + timerDressupState.y + 'px)';
    timerDressupAnimId = requestAnimationFrame(step);
  }
  timerDressupAnimId = requestAnimationFrame(step);
}

function updateTimerDressupImg() {
  var img = document.getElementById('timerDressupImg');
  if (!img) return;
  var curTree = AZUSA_TREES[currentTreeIdx] || AZUSA_TREES[0];
  img.src = curTree.img || 'src/images/azusa/outfits/jk_uniform.png';
}
