/* tree_engine.js - 种树引擎 (移植自 self-discipline-forest Flutter 版)
 * 8 树型 × 7 生长阶段：种子→发芽→生长→开花→成熟，外加枯萎/受伤
 * 专注完成种「活树(成熟)」，放弃种「枯树(枯萎)」——损失厌恶可视化
 * 依赖：core.js (AppState, EventBus, Utils)
 * 暴露：window.TreeEngine
 */
(function (global) {
  'use strict';

  // 树型：key / 中文名 / emoji / 解锁条件（基于 fstate 现有字段）
  // 与原 Flutter 的差异：原版 maple 用「完成目标数」解锁，本版用 totalCompletions 近似
  // （fstate 无独立目标完成计数）；其余阈值对齐，保证随进度解锁更高级树型。
  var TYPES = [
    { key: 'oak',     name: '橡树',   emoji: '🌳', unlock: { type: 'always' } },
    { key: 'pine',    name: '松树',   emoji: '🌲', unlock: { type: 'streak', val: 3 } },
    { key: 'cherry',  name: '樱花',   emoji: '🌸', unlock: { type: 'score',  val: 500 } },
    { key: 'bamboo',  name: '竹子',   emoji: '🎋', unlock: { type: 'streak', val: 7 } },
    { key: 'cactus',  name: '仙人掌', emoji: '🌵', unlock: { type: 'score',  val: 1000 } },
    { key: 'maple',   name: '枫树',   emoji: '🍁', unlock: { type: 'completions', val: 20 } },
    { key: 'willow',  name: '柳树',   emoji: '🌿', unlock: { type: 'score',  val: 2000 } },
    { key: 'redwood', name: '红杉',   emoji: '🌲', unlock: { type: 'score',  val: 5000 } }
  ];

  var STAGE_NAME = {
    seed: '种子', sprout: '发芽', growing: '生长', blooming: '开花',
    mature: '成熟', withered: '枯萎', damaged: '受伤'
  };

  function pointsForType(key) {
    var map = { oak: 10, pine: 15, cherry: 20, bamboo: 25, cactus: 30, maple: 40, willow: 50, redwood: 100 };
    return map[key] || 10;
  }
  function displayName(key) {
    for (var i = 0; i < TYPES.length; i++) if (TYPES[i].key === key) return TYPES[i].name;
    return '树';
  }

  // 根据进度算阶段（复刻 Flutter stageFromProgress）
  function stageFromProgress(progress, opts) {
    opts = opts || {};
    if (opts.abandoned) return 'withered';
    if (opts.interrupted) return 'damaged';
    if (progress < 0.2) return 'seed';
    if (progress < 0.4) return 'sprout';
    if (progress < 0.7) return 'growing';
    if (progress < 0.95) return 'blooming';
    return 'mature';
  }

  // 基于解锁规则挑选当前可种的最高阶树型
  function chooseType(ctx) {
    ctx = ctx || {};
    var streak = ctx.streak || 0;
    var score = ctx.score || 0;
    var completions = ctx.completions || 0;
    var best = 'oak';
    for (var i = 0; i < TYPES.length; i++) {
      var u = TYPES[i].unlock, ok = false;
      if (u.type === 'always') ok = true;
      else if (u.type === 'streak') ok = streak >= u.val;
      else if (u.type === 'score') ok = score >= u.val;
      else if (u.type === 'completions') ok = completions >= u.val;
      if (ok) best = TYPES[i].key;
    }
    return best;
  }

  // 最近连续专注天数（与 stats 计算一致），用于解锁 pine/bamboo
  function ctxStreak() {
    try {
      var dates = [];
      var ss = AppState.sessions || [];
      for (var i = 0; i < ss.length; i++) if (ss[i].completed) dates.push(ss[i].date);
      var uniq = {};
      for (var j = 0; j < dates.length; j++) uniq[dates[j]] = true;
      var arr = Object.keys(uniq).sort();
      return Utils.calcStreak(arr);
    } catch (e) { return 0; }
  }

  // 种一棵树：专注完成=成熟，放弃=枯萎
  function plantTree(session, opts) {
    opts = opts || {};
    var trees = AppState.trees;
    if (!trees) { AppState.trees = []; trees = AppState.trees; }
    var abandoned = !!opts.abandoned;
    var typeKey = chooseType({
      streak: ctxStreak(),
      score: AppState.score || 0,
      completions: AppState.totalCompletions || 0
    });
    var tree = {
      id: Utils.uid(),
      sessionId: session && session.date ? (session.date + '-' + (session.minutes || 0) + '-' + Utils.uid()) : Utils.uid(),
      type: typeKey,
      stage: abandoned ? 'withered' : 'mature',
      plantedAt: new Date().toISOString(),
      maturedAt: abandoned ? null : new Date().toISOString(),
      earnedPoints: abandoned ? 0 : pointsForType(typeKey),
      minutes: session ? (session.minutes || 0) : 0
    };
    trees.push(tree);
    AppState.save();
    return tree;
  }

  // ==================== 森林聚合统计（复刻 Flutter Forest） ====================
  function todayCount(trees) {
    var now = new Date();
    var n = 0, arr = trees || [];
    for (var i = 0; i < arr.length; i++) {
      var d = new Date(arr[i].plantedAt);
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) n++;
    }
    return n;
  }
  function aliveCount(trees) {
    var n = 0, arr = trees || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].stage !== 'withered') n++;
    return n;
  }
  function witheredCount(trees) {
    var n = 0, arr = trees || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].stage === 'withered') n++;
    return n;
  }
  function countByType(trees) {
    var m = {}, arr = trees || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].stage === 'mature') m[arr[i].type] = (m[arr[i].type] || 0) + 1;
    return m;
  }

  // ==================== SVG 渲染（复刻 Flutter CustomPaint 各阶段） ====================
  // 固定随机种子，保证每棵树画出来一致
  function seededRand(seed) {
    var s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  function renderTreeSVG(typeKey, stage, progress) {
    if (progress == null) progress = 1;
    if (progress < 0) progress = 0; if (progress > 1) progress = 1;
    var C = {
      trunk: '#795548', trunkDark: '#6D4C41', leaf: '#4CAF50', leaf2: '#66BB6A',
      soil: '#5D4037', seed: '#8B4513', flower: '#FF80AB', flowerCore: '#FFD54F',
      fruit: '#FF6F00', dead: '#8D6E63', deadLeaf: '#A1887F', damage: '#EF5350'
    };
    var cx = 60, base = 150; // 画布 120x180
    var p = [];
    p.push('<svg viewBox="0 0 120 180" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">');

    function soil() {
      return '<path d="M35 ' + base + ' Q60 ' + (base + 8) + ' 85 ' + base + ' Q90 ' + (base + 3) + ' 80 ' + (base + 6) +
        ' L40 ' + (base + 6) + ' Q30 ' + (base + 3) + ' 35 ' + base + ' Z" fill="' + C.soil + '"/>';
    }
    function trunk(h, w) {
      w = w || 5;
      return '<path d="M' + (cx - w / 2) + ' ' + base + ' L' + (cx - w * 0.4) + ' ' + (base - h) +
        ' Q' + cx + ' ' + (base - h - 3) + ' ' + (cx + w * 0.4) + ' ' + (base - h) +
        ' L' + (cx + w / 2) + ' ' + base + ' Z" fill="' + C.trunk + '"/>';
    }
    function crown(cy, r, op) {
      return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + C.leaf + '" fill-opacity="' + (op || 0.85) + '"/>';
    }

    if (stage === 'seed') {
      var sz = 4 + progress * 2;
      p.push('<ellipse cx="' + cx + '" cy="' + (base - 2) + '" rx="' + sz + '" ry="' + (sz / 2) + '" fill="' + C.seed + '"/>');
      if (progress > 0.1) {
        p.push('<path d="M' + cx + ' ' + (base - sz) + ' Q' + (cx + 3) + ' ' + (base - sz - 6) + ' ' + (cx + 1) + ' ' + (base - sz - 10) + '" stroke="' + C.leaf + '" stroke-width="1.5" fill="none"/>');
      }
    } else if (stage === 'sprout') {
      var th = 30 * progress;
      p.push(trunk(th, 3));
      for (var i = 0; i < 3; i++) {
        var a = -Math.PI / 2 + (i - 1) * 0.8;
        var lx = cx + Math.cos(a) * 15 * progress;
        var ly = (base - 25 * progress) + Math.sin(a) * 15 * progress;
        p.push('<ellipse cx="' + lx + '" cy="' + ly + '" rx="' + (10 * progress) + '" ry="' + (6 * progress) + '" fill="' + C.leaf2 + '"/>');
      }
    } else if (stage === 'growing' || stage === 'blooming' || stage === 'mature' || stage === 'damaged') {
      var gProg = (stage === 'growing') ? progress : 1;
      var th2 = 50 + 40 * gProg;
      p.push(trunk(th2, 5));
      var cy2 = base - th2;
      var cr = 20 + 25 * gProg;
      p.push(crown(cy2, cr, 0.85));
      p.push('<circle cx="' + (cx - 8) + '" cy="' + (cy2 + 5) + '" r="' + (cr * 0.7) + '" fill="' + C.leaf2 + '" fill-opacity="0.6"/>');
      p.push('<circle cx="' + (cx + 8) + '" cy="' + (cy2 + 3) + '" r="' + (cr * 0.65) + '" fill="' + C.leaf2 + '" fill-opacity="0.6"/>');
      for (var b = 0; b < 3; b++) {
        var ba = -Math.PI / 2 + (b - 1) * 0.6;
        p.push('<path d="M' + cx + ' ' + (base - th2 * 0.7) + ' L' + (cx + Math.cos(ba) * cr * 0.8) + ' ' + (base - th2 * 0.7 + Math.sin(ba) * cr * 0.4) + '" stroke="' + C.trunkDark + '" stroke-width="2" fill="none"/>');
      }
      var rng = seededRand(42);
      if (stage === 'blooming' || stage === 'mature') {
        for (var f = 0; f < 5; f++) {
          var fa = rng() * 2 * Math.PI;
          var fd = 15 + rng() * 20;
          var fx = cx + Math.cos(fa) * fd;
          var fy = cy2 + Math.sin(fa) * fd;
          p.push('<circle cx="' + fx + '" cy="' + fy + '" r="4" fill="' + C.flower + '"/>');
          p.push('<circle cx="' + fx + '" cy="' + fy + '" r="2" fill="' + C.flowerCore + '"/>');
        }
      }
      if (stage === 'mature') {
        for (var fr = 0; fr < 3; fr++) {
          var fra = rng() * 2 * Math.PI;
          var frd = 10 + rng() * 15;
          p.push('<circle cx="' + (cx + Math.cos(fra) * frd) + '" cy="' + (cy2 + Math.sin(fra) * frd) + '" r="3" fill="' + C.fruit + '"/>');
        }
      }
      if (stage === 'damaged') {
        p.push('<line x1="' + (cx - 3) + '" y1="' + (base - 20) + '" x2="' + (cx + 3) + '" y2="' + (base - 10) + '" stroke="' + C.damage + '" stroke-width="2.5"/>');
        p.push('<line x1="' + (cx + 3) + '" y1="' + (base - 20) + '" x2="' + (cx - 3) + '" y2="' + (base - 10) + '" stroke="' + C.damage + '" stroke-width="2.5"/>');
      }
    } else if (stage === 'withered') {
      p.push(trunk(50, 3));
      p.push('<circle cx="' + cx + '" cy="' + (base - 50) + '" r="18" fill="' + C.dead + '" fill-opacity="0.5"/>');
      for (var l = 0; l < 4; l++) {
        var lx2 = cx + (l - 1.5) * 15;
        var ly2 = base + 10 + (l % 2) * 8;
        p.push('<ellipse cx="' + lx2 + '" cy="' + ly2 + '" rx="6" ry="3" fill="' + C.deadLeaf + '"/>');
      }
    }

    p.push(soil());
    p.push('</svg>');
    return p.join('');
  }

  // ==================== 挂载到「我的数据」页 ====================
  function mountForest(statsId, gridId) {
    var trees = AppState.trees || [];
    var statsEl = document.getElementById(statsId);
    if (statsEl) {
      statsEl.innerHTML =
        '<div class="stats-box"><div class="val">' + trees.length + '</div><div class="lbl">🌳 总种树</div></div>' +
        '<div class="stats-box"><div class="val">' + aliveCount(trees) + '</div><div class="lbl">💚 存活</div></div>' +
        '<div class="stats-box"><div class="val">' + witheredCount(trees) + '</div><div class="lbl">🥀 枯萎</div></div>' +
        '<div class="stats-box"><div class="val">' + todayCount(trees) + '</div><div class="lbl">🌱 今日</div></div>';
    }
    var gridEl = document.getElementById(gridId);
    if (gridEl) {
      if (!trees.length) {
        gridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--gr);font-size:13px">还没有种下树~ 完成一次专注就会长出一棵🌱（放弃会枯萎哦）</div>';
        return;
      }
      var shown = trees.slice(-60).reverse(); // 最多展示最近60棵，避免无限增长卡顿
      var html = '';
      for (var i = 0; i < shown.length; i++) {
        var t = shown[i];
        var nm = displayName(t.type);
        var emoji = '🌳';
        for (var k = 0; k < TYPES.length; k++) if (TYPES[k].key === t.type) emoji = TYPES[k].emoji;
        var prog = (t.stage === 'mature' || t.stage === 'withered' || t.stage === 'damaged') ? 1 : 0.6;
        html += '<div class="forest-cell" data-tid="' + t.id + '" title="' + nm + ' · ' + (STAGE_NAME[t.stage] || t.stage) + ' · ' + (t.minutes || 0) + '分钟（点击看详情）">' +
          '<div class="forest-svg">' + renderTreeSVG(t.type, t.stage, prog) + '</div>' +
          '<div class="forest-cap">' + emoji + ' ' + nm + '</div>' +
          '</div>';
      }
      gridEl.innerHTML = html;
      // 事件委托：点击单棵树弹出详情（只绑一次，innerHTML 重渲染不重复绑定）
      if (!gridEl._detailBound) {
        gridEl.addEventListener('click', function (e) {
          var cell = e.target && e.target.closest ? e.target.closest('.forest-cell') : null;
          if (!cell) return;
          var id = cell.getAttribute('data-tid');
          var tree = null, arr = AppState.trees || [];
          for (var j = 0; j < arr.length; j++) if (arr[j].id === id) { tree = arr[j]; break; }
          if (tree) TreeEngine.showTreeDetail(tree);
        });
        gridEl._detailBound = true;
      }
    }
  }

  // ==================== 单棵树详情弹窗 ====================
  function showTreeDetail(tree) {
    var modal = document.getElementById('treeDetail');
    if (!modal) return;
    var nm = displayName(tree.type);
    var emoji = '🌳';
    for (var k = 0; k < TYPES.length; k++) if (TYPES[k].key === tree.type) emoji = TYPES[k].emoji;
    var prog = (tree.stage === 'mature' || tree.stage === 'withered' || tree.stage === 'damaged') ? 1 : 0.6;
    var elName = document.getElementById('tdName');
    if (elName) elName.textContent = emoji + ' ' + nm;
    var elSvg = document.getElementById('tdSvg');
    if (elSvg) elSvg.innerHTML = renderTreeSVG(tree.type, tree.stage, prog);
    var rows = document.getElementById('tdRows');
    if (rows) {
      var planted = new Date(tree.plantedAt);
      var pad = function (n) { return String(n).padStart(2, '0'); };
      var dateStr = planted.getFullYear() + '-' + pad(planted.getMonth() + 1) + '-' + pad(planted.getDate()) +
        ' ' + pad(planted.getHours()) + ':' + pad(planted.getMinutes());
      var isDead = (tree.stage === 'withered');
      var statusTxt = isDead ? '🥀 枯萎（曾放弃）' : (tree.stage === 'damaged' ? '💔 受伤' : '🌳 已长成');
      rows.innerHTML =
        '<div class="td-row"><span>状态</span><b style="color:' + (isDead ? '#8D6E63' : '#66BB6A') + '">' + statusTxt + '</b></div>' +
        '<div class="td-row"><span>阶段</span><b>' + (STAGE_NAME[tree.stage] || tree.stage) + '</b></div>' +
        '<div class="td-row"><span>专注时长</span><b>' + (tree.minutes || 0) + ' 分钟</b></div>' +
        '<div class="td-row"><span>获得积分</span><b>🌟 ' + (tree.earnedPoints || 0) + '</b></div>' +
        '<div class="td-row"><span>种下时间</span><b>' + dateStr + '</b></div>';
    }
    modal.classList.add('show');
  }
  function closeTreeDetail() {
    var modal = document.getElementById('treeDetail');
    if (modal) modal.classList.remove('show');
  }

  // ==================== 事件订阅：专注完成/放弃 → 自动种树 ====================
  if (typeof EventBus !== 'undefined') {
    EventBus.on('focus:completed', function (session) {
      try { plantTree(session, { abandoned: false }); } catch (e) { console.error('[TreeEngine] plant failed', e); }
    });
    EventBus.on('focus:abandoned', function (session) {
      try { plantTree(session, { abandoned: true }); } catch (e) { console.error('[TreeEngine] plant withered failed', e); }
    });
  }

  global.TreeEngine = {
    TYPES: TYPES,
    STAGE_NAME: STAGE_NAME,
    pointsForType: pointsForType,
    displayName: displayName,
    stageFromProgress: stageFromProgress,
    chooseType: chooseType,
    plantTree: plantTree,
    todayCount: todayCount,
    aliveCount: aliveCount,
    witheredCount: witheredCount,
    countByType: countByType,
    renderTreeSVG: renderTreeSVG,
    mountForest: mountForest,
    showTreeDetail: showTreeDetail,
    closeTreeDetail: closeTreeDetail
  };
})(window);
