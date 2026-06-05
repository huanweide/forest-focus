/* dressup.js - 分层换装引擎 (Phase 4: 10层渲染 + 穿搭方案 + 商城联动)
 * 依赖：core.js (AppState, EventBus, Utils)
 * 图层顺序：scene(0) → body(1) → bottom(2) → top(3) → dress(4) →
 *           neck(5) → head(6) → face(7) → hand(8) → fx(9)
 */

// 图层映射
const LAYER_MAP = {
  scene:  { el:'layerScene',  type:'bg' },
  body:   { el:'layerBody',   type:'img' },
  bottom: { el:'layerBottom', type:'img' },
  top:    { el:'layerTop',    type:'img' },
  dress:  { el:'layerDress',  type:'img' },
  neck:   { el:'layerNeck',   type:'img' },
  head:   { el:'layerHead',   type:'img' },
  face:   { el:'layerFace',   type:'img' },
  hand:   { el:'layerHand',   type:'img' },
};

// 配件锚点（相对于角色容器的百分比位置）
const ANCHOR_POINTS = {
  head: { top:'2%', left:'45%' },
  face: { top:'20%', left:'43%' },
  neck: { top:'35%', left:'45%' },
  hand: { top:'55%', left:'20%' },
  back: { top:'25%', left:'50%' },
};

// 当前穿搭状态
var currentOutfitLayers = {
  body: 'src/images/azusa/base/body_base.png',
  bottom: '',
  top: '',
  dress: 'src/images/azusa/outfits/jk_uniform.png',
  neck: '',
  head: '',
  face: '',
  hand: '',
  scene: '',
};

// 配件微调偏移
var accessoryOffsets = {};

// 穿搭方案（最多6套）
var savedOutfits = JSON.parse(localStorage.getItem('fsavedoutfits') || '[]');

// ==================== 图层操作 ====================
function setLayer(layerName, src) {
  var info = LAYER_MAP[layerName];
  if (!info) return;

  var el = document.getElementById(info.el);
  if (!el) return;

  if (layerName === 'dress' && src) {
    // 连衣裙和上下装互斥
    setLayer('top', '');
    setLayer('bottom', '');
  }
  if ((layerName === 'top' || layerName === 'bottom') && src) {
    setLayer('dress', '');
  }

  currentOutfitLayers[layerName] = src;

  if (info.type === 'bg') {
    el.style.background = src ? 'url(' + src + ') center/cover' : '';
  } else if (info.type === 'img') {
    el.src = src || '';
    el.style.display = src ? 'block' : 'none';
  }

  // 保存到AppState
  AppState.currentOutfit = Utils.clone(currentOutfitLayers);
  AppState.save();
  EventBus.emit('outfit:changed', { layer: layerName, src: src, outfit: currentOutfitLayers });
}

function clearAllLayers() {
  Object.keys(LAYER_MAP).forEach(function(key) {
    if (key === 'dress') {
      setLayer(key, ''); // 连衣裙也清掉
    } else {
      setLayer(key, '');
    }
  });
}

// ==================== 商城物品→图层映射 ====================
function equipShopItem(itemId) {
  var item = null;
  if (typeof SHOP_ITEMS !== 'undefined') {
    item = SHOP_ITEMS.find(function(i) { return i.id === itemId; });
  }
  if (!item) return;

  // 检查是否拥有
  if (!AppState.hasItem(itemId)) {
    toast('你还没有这个道具~ 去商城购买吧');
    return;
  }

  // 根据slot映射到图层，使用实际图片路径
  var slot = item.slot;
  var imgPath = item.img || '';
  if (!imgPath) {
    toast('该物品暂无预览图');
    return;
  }
  if (slot === 'bg') {
    // 全局背景图 —— 换整个App背景
    applyGlobalBackground(imgPath);
    toast('🖼 背景已更换：' + item.name);
    return;
  } else if (slot === 'dress' || slot === 'scene') {
    setLayer(slot, imgPath);
  } else if (slot === 'head' || slot === 'face' || slot === 'neck' || slot === 'hand' || slot === 'back') {
    var layer = slot === 'back' ? 'head' : slot;
    setLayer(layer, imgPath);
    // 设置锚点偏移
    if (ANCHOR_POINTS[slot]) {
      accessoryOffsets[item.id] = { dx: 0, dy: 0, anchor: slot };
    }
  } else if (slot === 'tool') {
    toast(item.name + '在背包中使用哦~');
    return;
  } else if (slot === 'frame') {
    toast('头像框已装备！');
    return;
  }

  toast('👗 已穿上：' + item.name);
  applyAccessoryPositions();
}

// 应用配件位置
function applyAccessoryPositions() {
  Object.keys(LAYER_MAP).forEach(function(layerName) {
    var el = document.getElementById(LAYER_MAP[layerName].el);
    if (!el || !currentOutfitLayers[layerName]) return;

    // 找到对应配件的偏移
    var offset = null;
    Object.keys(accessoryOffsets).forEach(function(itemId) {
      var ao = accessoryOffsets[itemId];
      var slot = ao.anchor || '';
      // 粗略映射slot到layer
      var mappedLayer = slot === 'back' ? 'head' : slot;
      if (mappedLayer === layerName && currentOutfitLayers[layerName]) {
        offset = ao;
      }
    });

    if (offset && ANCHOR_POINTS[offset.anchor]) {
      var anchor = ANCHOR_POINTS[offset.anchor];
      el.style.top = 'calc(' + anchor.top + ' + ' + offset.dy + 'px)';
      el.style.left = 'calc(' + anchor.left + ' + ' + offset.dx + 'px)';
      el.style.width = 'auto';
      el.style.height = '30%';
    } else {
      el.style.top = '0';
      el.style.left = '0';
      el.style.width = '100%';
      el.style.height = '100%';
    }
  });
}

// ==================== 穿搭方案保存 ====================
function saveOutfit(name) {
  if (!name) name = '穿搭方案' + (savedOutfits.length + 1);
  if (savedOutfits.length >= 6) {
    toast('最多保存6套穿搭！');
    return false;
  }

  var outfit = {
    id: Utils.uid(),
    name: name,
    layers: Utils.clone(currentOutfitLayers),
    accessories: Utils.clone(accessoryOffsets),
    created: Utils.today(),
  };

  savedOutfits.push(outfit);
  localStorage.setItem('fsavedoutfits', JSON.stringify(savedOutfits));
  toast('💾 已保存：' + name);
  return true;
}

function loadOutfit(outfitId) {
  var outfit = savedOutfits.find(function(o) { return o.id === outfitId; });
  if (!outfit) return;

  // 清空当前
  clearAllLayers();

  // 加载图层
  Object.keys(outfit.layers).forEach(function(key) {
    if (outfit.layers[key]) setLayer(key, outfit.layers[key]);
  });

  // 加载配件偏移
  accessoryOffsets = Utils.clone(outfit.accessories || {});
  applyAccessoryPositions();

  toast('👗 已切换：' + outfit.name);
}

function deleteOutfit(outfitId) {
  savedOutfits = savedOutfits.filter(function(o) { return o.id !== outfitId; });
  localStorage.setItem('fsavedoutfits', JSON.stringify(savedOutfits));
}

// ==================== 换装预览UI ====================
function renderDressUpUI() {
  var gallery = document.getElementById('treeGallery');
  if (!gallery) return;

  // 如果已经渲染了衣柜，追加换装方案
  var outfitSection = document.createElement('div');
  outfitSection.innerHTML =
    '<div style="text-align:center;margin:8px 0"><button class="shop-btn primary" onclick="showBackgroundPanel()">🖼 更换背景 (' + (typeof SHOP_ITEMS !== "undefined" ? SHOP_ITEMS.filter(function(i){return i.slot==="bg"}).length : 10) + '张可选)</button></div>' +
    '<h3 class="sec-title" style="margin-top:16px">💾 穿搭方案 <span class="tip">| ' + savedOutfits.length + '/6套</span></h3>' +
    '<div class="wardrobe-grid" id="outfitList"></div>' +
    '<div style="text-align:center;margin:8px 0">' +
      '<button class="shop-btn primary" onclick="saveOutfit(prompt(\'方案名称:\',\'我的穿搭' + (savedOutfits.length + 1) + '\'))">💾 保存当前穿搭</button>' +
      '<button class="shop-btn secondary" onclick="clearAllLayers();toast(\'已清空所有图层\')">🗑 清空</button>' +
    '</div>' +
    '<h3 class="sec-title" style="margin-top:12px">🛒 商城装备 <span class="tip">| 已拥有但未装备</span></h3>' +
    '<div class="wardrobe-grid" id="equipList"></div>';

  gallery.appendChild(outfitSection);

  // 渲染穿搭方案列表
  renderOutfitList();
  renderEquipList();
}

function renderOutfitList() {
  var list = document.getElementById('outfitList');
  if (!list) return;

  if (!savedOutfits.length) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gr);grid-column:1/-1">还没有保存穿搭方案~</div>';
    return;
  }

  list.innerHTML = savedOutfits.map(function(o) {
    var layerCount = Object.values(o.layers).filter(Boolean).length;
    return '<div class="wcard unlocked">' +
      '<div class="wemoji">👗</div>' +
      '<div class="wname">' + o.name + '</div>' +
      '<div class="wsub">' + layerCount + '层 · ' + o.created + '</div>' +
      '<button class="wbtn" onclick="loadOutfit(\'' + o.id + '\')">穿上</button>' +
      '<button style="background:none;border:none;font-size:14px;cursor:pointer;position:absolute;top:4px;right:4px" onclick="deleteOutfit(\'' + o.id + '\');renderOutfitList()">🗑</button>' +
      '</div>';
  }).join('');
}

function renderEquipList() {
  var list = document.getElementById('equipList');
  if (!list) return;

  // 获取已拥有但未穿上的商城物品
  var inventory = AppState.inventory || [];
  if (typeof SHOP_ITEMS === 'undefined') {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gr);grid-column:1/-1">商城系统未加载</div>';
    return;
  }

  var equipItems = SHOP_ITEMS.filter(function(item) {
    if (!inventory.includes(item.id)) return false;
    if (item.cat === 'tool' || item.cat === 'frame') return false;
    // 检查是否已经穿上
    var slot = item.slot === 'back' ? 'head' : item.slot;
    return !currentOutfitLayers[slot];
  });

  if (!equipItems.length) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gr);grid-column:1/-1">所有装备都已穿上~</div>';
    return;
  }

  list.innerHTML = equipItems.map(function(item) {
    return '<div class="wcard unlocked" onclick="equipShopItem(\'' + item.id + '\');renderEquipList()">' +
      '<span class="wemoji">' + item.icon + '</span>' +
      '<div class="wname">' + item.name + '</div>' +
      '<div class="wsub">' + item.desc + '</div>' +
      '</div>';
  }).join('');
}

// ==================== 全局背景更换 ====================
var currentGlobalBg = localStorage.getItem('fglobalbg') || '';

function applyGlobalBackground(imgPath) {
  currentGlobalBg = imgPath;
  localStorage.setItem('fglobalbg', imgPath);
  // 改body背景图
  document.body.style.backgroundImage = imgPath ? 'url(' + imgPath + ')' : '';
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundAttachment = 'fixed';
  document.body.style.backgroundRepeat = 'no-repeat';
  // body::before 遮罩调暗让背景可见
  var style = document.getElementById('bgOverlayStyle');
  if (!style) {
    style = document.createElement('style');
    style.id = 'bgOverlayStyle';
    document.head.appendChild(style);
  }
  style.textContent = imgPath
    ? 'body::before{opacity:0.02 !important}body{background-color:rgba(0,0,0,.3)}'
    : 'body::before{opacity:.06}body{background-color:transparent}';
  EventBus.emit('background:changed', { src: imgPath });
}

// ==================== 外部照片导入 ====================
var importedPhotos = JSON.parse(localStorage.getItem('fimported_photos') || '[]');

function importPhoto() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = function() {
    var files = Array.from(input.files);
    if (!files.length) return;
    toast('📷 正在导入 ' + files.length + ' 张照片...');
    var loaded = 0;
    files.forEach(function(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        importedPhotos.push({
          id: Utils.uid(),
          name: file.name.replace(/\.[^.]+$/, ''),
          dataUrl: e.target.result,
          date: Utils.today()
        });
        loaded++;
        if (loaded === files.length) {
          localStorage.setItem('fimported_photos', JSON.stringify(importedPhotos));
          toast('✅ 已导入 ' + loaded + ' 张照片');
          showBackgroundPanel(); // 刷新面板
        }
      };
      reader.readAsDataURL(file);
    });
  };
  input.click();
}

function deleteImportedPhoto(photoId) {
  importedPhotos = importedPhotos.filter(function(p) { return p.id !== photoId; });
  localStorage.setItem('fimported_photos', JSON.stringify(importedPhotos));
  showBackgroundPanel();
}

// ==================== 背景选择面板 ====================
function showBackgroundPanel() {
  if (typeof SHOP_ITEMS === 'undefined') return;

  var bgItems = SHOP_ITEMS.filter(function(i) { return i.slot === 'bg'; });
  var overlay = document.createElement('div');
  overlay.className = 'shop-modal open';
  overlay.style.zIndex = '500';

  var html = '<div class="shop-modal-header">' +
      '<span>🖼 更换背景</span>' +
      '<button class="shop-close" onclick="this.closest(\'.shop-modal\').remove()">✕</button>' +
    '</div>' +
    '<div style="padding:8px;overflow-y:auto;flex:1">' +
      // 导入按钮 - 最显眼位置
      '<div style="text-align:center;margin:8px 0">' +
        '<button class="shop-btn primary" onclick="this.closest(\'.shop-modal\').remove();importPhoto()" style="font-size:16px;padding:14px 28px">📷 从手机导入照片做背景</button>' +
        '<div style="font-size:11px;color:var(--gr);margin-top:4px">支持任何图片 · 存储在本地</div>' +
      '</div>';

  // 已导入的照片
  if (importedPhotos.length > 0) {
    html += '<div style="font-size:13px;font-weight:700;color:var(--g);margin:8px 0">📁 我的照片 (' + importedPhotos.length + '张)</div><div class="shop-items">';
    importedPhotos.forEach(function(p) {
      var isActive = currentGlobalBg === p.dataUrl;
      html += '<div class="shop-card' + (isActive ? '' : '') + '" style="' + (isActive ? 'border:2px solid var(--g)' : '') + '">' +
        '<img src="' + p.dataUrl + '" style="width:100%;height:80px;object-fit:cover;border-radius:8px" onerror="this.src=\'src/images/items/gift.png\'">' +
        '<div class="shop-item-name" style="margin-top:4px;font-size:11px">' + p.name + '</div>' +
        '<div style="display:flex;gap:4px;margin-top:4px;justify-content:center">' +
          '<button class="shop-buy-btn ' + (isActive ? 'owned-btn' : 'buy-btn') + '" onclick="applyGlobalBackground(\'' + p.dataUrl + '\');this.closest(\'.shop-modal\').remove()" style="font-size:10px">' + (isActive ? '使用中' : '设背景') + '</button>' +
          '<button class="shop-buy-btn no-money-btn" onclick="deleteImportedPhoto(\'' + p.id + '\')" style="font-size:10px">🗑</button>' +
        '</div></div>';
    });
    html += '</div>';
  }

  // 默认恢复
  if (currentGlobalBg) {
    html += '<div style="text-align:center;margin:8px"><button class="shop-btn secondary" onclick="applyGlobalBackground(\'\');this.closest(\'.shop-modal\').remove()">🗑 恢复默认背景</button></div>';
  }

  // 商城场景
  html += '<div style="font-size:13px;font-weight:700;color:var(--g);margin:8px 0">🎨 商城场景 (' + bgItems.length + '张)</div><div class="shop-items">';

  bgItems.forEach(function(item) {
    var owned = AppState.inventory && AppState.inventory.includes(item.id);
    var isActive = currentGlobalBg === item.img;
    html += '<div class="shop-card' + (owned ? '' : '') + '">' +
      '<img src="' + item.img + '" style="width:100%;height:80px;object-fit:cover;border-radius:8px" loading="lazy" onerror="this.parentElement.style.display=\'none\'">' +
      '<div class="shop-item-name" style="margin-top:4px;font-size:11px">' + item.name + '</div>' +
      (owned
        ? '<button class="shop-buy-btn ' + (isActive ? 'owned-btn' : 'buy-btn') + '" onclick="applyGlobalBackground(\'' + item.img + '\');this.closest(\'.shop-modal\').remove()" style="font-size:10px">' + (isActive ? '使用中' : '更换') + '</button>'
        : '<div class="shop-item-price">🪙' + item.price + '</div><button class="shop-buy-btn ' + (AppState.coins >= item.price ? 'buy-btn' : 'no-money-btn') + '" onclick="purchaseItem(\'' + item.id + '\')" style="font-size:10px">' + (AppState.coins >= item.price ? '购买' : '币不足') + '</button>'
      ) +
    '</div>';
  });
  html += '</div></div>';

  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

// 启动时恢复背景
(function() {
  var saved = localStorage.getItem('fglobalbg');
  if (saved) applyGlobalBackground(saved);
})();

// ==================== 随机搭配 ====================
function randomOutfit() {
  var inventory = AppState.inventory || [];
  if (inventory.length < 2) { toast('背包里东西太少，去商城逛逛吧~'); return; }

  clearAllLayers();

  // 随机选一件服装
  var outfits = [];
  if (typeof SHOP_ITEMS !== 'undefined') {
    outfits = SHOP_ITEMS.filter(function(i) { return inventory.includes(i.id) && (i.cat === 'outfit'); });
  }
  if (outfits.length > 0) {
    var rand = outfits[Math.floor(Math.random() * outfits.length)];
    equipShopItem(rand.id);
  }

  // 随机配件
  var accs = [];
  if (typeof SHOP_ITEMS !== 'undefined') {
    accs = SHOP_ITEMS.filter(function(i) { return inventory.includes(i.id) && (i.cat === 'accessory' || i.cat === 'scene'); });
  }
  var count = Math.min(2, accs.length);
  for (var i = 0; i < count; i++) {
    var r = accs[Math.floor(Math.random() * accs.length)];
    equipShopItem(r.id);
    accs = accs.filter(function(a) { return a.id !== r.id; });
  }

  toast('🎲 随机搭配完成！');
}

// ==================== 初始化 ====================
function initDressUp() {
  // 加载保存的穿搭
  var savedLayers = AppState.currentOutfit;
  if (savedLayers && Object.keys(savedLayers).length > 0) {
    Object.keys(savedLayers).forEach(function(key) {
      if (savedLayers[key]) setLayer(key, savedLayers[key]);
    });
  }

  // 在衣柜页插入换装UI
  if (currentTab === 2) {
    setTimeout(renderDressUpUI, 100);
  }
}

// 监听tab切换到衣柜页
var _origGoTab = goTab;
goTab = function(i) {
  _origGoTab(i);
  if (i === 2) {
    setTimeout(renderDressUpUI, 200);
  }
};

// 初始化
setTimeout(initDressUp, 500);

console.log('👗 分层换装引擎已加载: 10层渲染');
