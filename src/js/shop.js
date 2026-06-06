/* shop.js - 商城 + 背包系统 (Phase 3: 30+商品)
 * 依赖：core.js (AppState, EventBus)
 */

// ==================== 商品定义 (33个) ====================
const SHOP_ITEMS = [
  // 🎽 服装 (10) - 图标用像素风
  { id:'jk_uniform', name:'JK水手服', icon:'img:star.png', price:30, cat:'outfit', slot:'dress', rarity:'rare', desc:'经典JK制服，学院风满满', img:'src/images/azusa/outfits/jk_uniform.png' },
  { id:'maid_dress', name:'女仆装', icon:'img:gem.png', price:50, cat:'outfit', slot:'dress', rarity:'epic', desc:'可爱的女仆装，阿梓也很喜欢', img:'src/images/azusa/outfits/maid_dress.png' },
  { id:'cheongsam', name:'旗袍', icon:'img:gem_large.png', price:50, cat:'outfit', slot:'dress', rarity:'epic', desc:'优雅的东方旗袍', img:'src/images/azusa/outfits/cheongsam.png' },
  { id:'bunny_suit', name:'兔女郎服', icon:'img:heart.png', price:80, cat:'outfit', slot:'dress', rarity:'epic', desc:'性感兔女郎装扮', img:'src/images/azusa/outfits/bunny_suit.png' },
  { id:'pajamas', name:'睡衣', icon:'img:calendar.png', price:25, cat:'outfit', slot:'dress', rarity:'common', desc:'舒适柔软的睡衣', img:'src/images/azusa/outfits/pajamas.png' },
  { id:'sportswear', name:'运动服', icon:'img:battery.png', price:20, cat:'outfit', slot:'dress', rarity:'common', desc:'活力运动装', img:'src/images/azusa/outfits/sportswear.png' },
  { id:'gothic', name:'哥特萝莉', icon:'img:potion_red.png', price:60, cat:'outfit', slot:'dress', rarity:'epic', desc:'暗黑哥特风连衣裙', img:'src/images/azusa/outfits/gothic.png' },
  { id:'yukata', name:'浴衣', icon:'img:suit_hearts.png', price:40, cat:'outfit', slot:'dress', rarity:'rare', desc:'夏日祭典浴衣', img:'src/images/azusa/outfits/yukata.png' },
  { id:'school_uniform', name:'校服', icon:'img:book.png', price:15, cat:'outfit', slot:'dress', rarity:'common', desc:'普通高中校服', img:'src/images/azusa/outfits/school_uniform.png' },
  { id:'sexy_dress', name:'情趣小裙子', icon:'img:heart_large.png', price:100, cat:'outfit', slot:'dress', rarity:'legend', desc:'阿梓的秘密衣装...', img:'src/images/azusa/outfits/sexy_dress.png' },

  // 💎 配件 (10)
  { id:'cat_ear', name:'猫耳', icon:'img:star.png', price:20, cat:'accessory', slot:'head', rarity:'common', desc:'可爱的猫耳朵头饰', img:'src/images/azusa/accessories/cat_ear.png' },
  { id:'bunny_ear', name:'兔耳', icon:'img:star_gold.png', price:25, cat:'accessory', slot:'head', rarity:'common', desc:'毛茸茸的兔子耳朵', img:'src/images/azusa/accessories/bunny_ear.png' },
  { id:'glasses', name:'圆框眼镜', icon:'img:gem.png', price:10, cat:'accessory', slot:'face', rarity:'common', desc:'文艺青年必备', img:'src/images/azusa/accessories/glasses.png' },
  { id:'sunglasses', name:'墨镜', icon:'img:gem_large.png', price:15, cat:'accessory', slot:'face', rarity:'common', desc:'酷酷的太阳镜', img:'src/images/azusa/accessories/glasses.png' },
  { id:'mask', name:'口罩', icon:'img:key.png', price:5, cat:'accessory', slot:'face', rarity:'common', desc:'日常防护口罩', img:'' },
  { id:'crown', name:'皇冠', icon:'img:crown.png', price:60, cat:'accessory', slot:'head', rarity:'epic', desc:'闪闪发光的公主皇冠', img:'src/images/azusa/accessories/crown.png' },
  { id:'angel_wings', name:'天使翅膀', icon:'img:star_gold.png', price:80, cat:'accessory', slot:'back', rarity:'epic', desc:'洁白的羽毛翅膀', img:'src/images/azusa/accessories/angel_wings.png' },
  { id:'devil_horns', name:'恶魔角', icon:'img:star_red.png', price:40, cat:'accessory', slot:'head', rarity:'rare', desc:'小恶魔的角', img:'src/images/azusa/accessories/devil_horns.png' },
  { id:'ribbon', name:'蝴蝶结', icon:'img:suit_hearts.png', price:15, cat:'accessory', slot:'head', rarity:'common', desc:'可爱的蝴蝶结发饰', img:'' },
  { id:'necklace', name:'项链', icon:'img:gem.png', price:30, cat:'accessory', slot:'neck', rarity:'rare', desc:'精致的宝石项链', img:'' },

  // 🎨 场景背景 (10张含阿梓的完整场景)
  { id:'bg_classroom', name:'教室里的阿梓', icon:'img:book.png', price:30, cat:'scene', slot:'bg', rarity:'rare', desc:'阿梓在教室等你下课', img:'src/images/azusa/outfits/bg_classroom.png' },
  { id:'bg_bedroom', name:'阿梓的卧室', icon:'img:heart.png', price:50, cat:'scene', slot:'bg', rarity:'epic', desc:'阿梓温馨的小窝', img:'src/images/azusa/outfits/bg_bedroom.png' },
  { id:'bg_garden', name:'花园漫步', icon:'img:star.png', price:40, cat:'scene', slot:'bg', rarity:'rare', desc:'和阿梓在花海中', img:'src/images/azusa/outfits/bg_garden.png' },
  { id:'bg_shrine', name:'神社祈福', icon:'img:star_gold.png', price:45, cat:'scene', slot:'bg', rarity:'rare', desc:'樱花树下的阿梓', img:'src/images/azusa/outfits/bg_shrine.png' },
  { id:'bg_library', name:'图书馆时光', icon:'img:gem.png', price:35, cat:'scene', slot:'bg', rarity:'rare', desc:'安静的图书馆约会', img:'src/images/azusa/outfits/bg_library.png' },
  { id:'bg_cafe', name:'咖啡馆约会', icon:'img:heart.png', price:40, cat:'scene', slot:'bg', rarity:'rare', desc:'和阿梓喝下午茶', img:'src/images/azusa/outfits/bg_cafe.png' },
  { id:'bg_rooftop', name:'天台夕阳', icon:'img:star_red.png', price:50, cat:'scene', slot:'bg', rarity:'epic', desc:'夕阳下的阿梓，风吹起她的头发', img:'src/images/azusa/outfits/bg_rooftop.png' },
  { id:'bg_rain', name:'雨中等你', icon:'img:gem_large.png', price:55, cat:'scene', slot:'bg', rarity:'epic', desc:'透明雨伞下的阿梓', img:'src/images/azusa/outfits/bg_rain.png' },
  { id:'bg_festival', name:'夏日祭典', icon:'img:suit_hearts.png', price:50, cat:'scene', slot:'bg', rarity:'epic', desc:'烟火大会上的阿梓', img:'src/images/azusa/outfits/bg_festival.png' },
  { id:'bg_starry', name:'星空下的阿梓', icon:'img:star_gold.png', price:45, cat:'scene', slot:'bg', rarity:'epic', desc:'躺在草地上数星星', img:'src/images/azusa/outfits/bg_starry.png' },
  { id:'bg_azusa_casual', name:'阿梓的私服', icon:'img:suit_hearts.png', price:35, cat:'scene', slot:'bg', rarity:'rare', desc:'阿梓的日常私服装扮', img:'src/images/azusa/outfits/clothing_ref.png' },

  // 📔 日记 - 入口按钮
  { id:'diary_list', name:'📔 阿梓的日记本', icon:'img:heart_large.png', price:0, cat:'diary', slot:'diary', rarity:'legend', desc:'每天自动写一篇 · 好感度' + (typeof calcAffection==='function'?calcAffection():0) + '/100', effect:'diary_list' },

  // 🔧 道具 (6)
  { id:'tool_makeup', name:'补签卡', icon:'img:calendar.png', price:10, cat:'tool', slot:'tool', rarity:'common', desc:'弥补一次断签（3天内有效）', effect:'makeup' },
  { id:'tool_freeze', name:'护符', icon:'img:potion_blue.png', price:20, cat:'tool', slot:'tool', rarity:'rare', desc:'断签时自动消耗，保护连续记录', effect:'freeze' },
  { id:'tool_double', name:'专注加倍卡', icon:'img:potion_green.png', price:30, cat:'tool', slot:'tool', rarity:'rare', desc:'30分钟内专注获得双倍阿梓币', effect:'double_coin' },
  { id:'tool_mood', name:'心情恢复剂', icon:'img:potion_red.png', price:15, cat:'tool', slot:'tool', rarity:'common', desc:'恢复阿梓20点心情值', effect:'mood' },
  { id:'tool_hmakeup', name:'习惯补签卡', icon:'img:clock.png', price:5, cat:'tool', slot:'tool', rarity:'common', desc:'弥补一次习惯断签', effect:'hmakeup' },
  { id:'tool_lucky', name:'幸运符', icon:'img:star_gold.png', price:25, cat:'tool', slot:'tool', rarity:'epic', desc:'下次押注胜率+30%（被动触发）', effect:'lucky' },

  // 🖼 头像框 (3)
  { id:'frame_gold', name:'金色边框', icon:'img:crown.png', price:20, cat:'frame', slot:'frame', rarity:'common', desc:'金色头像框', img:'' },
  { id:'frame_fire', name:'火焰边框', icon:'img:star_red.png', price:30, cat:'frame', slot:'frame', rarity:'rare', desc:'燃烧的火焰边框', img:'' },
  { id:'frame_rainbow', name:'彩虹边框', icon:'img:gem_large.png', price:50, cat:'frame', slot:'frame', rarity:'epic', desc:'七彩渐变边框', img:'' },


  // 🎵 音效主题 (3)
  { id:'sfx_nature', name:'自然之声', icon:'🌿', price:20, cat:'sfx', slot:'sfx', rarity:'rare', desc:'森林鸟鸣+溪流——最治愈的专注伴侣', effect:'sfx_nature' },
  { id:'sfx_rain', name:'雨夜咖啡馆', icon:'🌧️', price:25, cat:'sfx', slot:'sfx', rarity:'rare', desc:'窗外细雨+爵士钢琴', effect:'sfx_rain' },
  { id:'sfx_lofi', name:'Lo-fi 节拍', icon:'🎧', price:30, cat:'sfx', slot:'sfx', rarity:'epic', desc:'温暖低保真节拍，专注力翻倍', effect:'sfx_lofi' },

  // 🎨 主题配色 (4)
  { id:'theme_sakura', name:'樱花粉主题', icon:'🌸', price:15, cat:'theme', slot:'theme', rarity:'common', desc:'温柔樱花粉——少女心满满', effect:'theme_sakura' },
  { id:'theme_ocean', name:'海洋蓝主题', icon:'🌊', price:15, cat:'theme', slot:'theme', rarity:'common', desc:'沉静深海蓝——冷静思考', effect:'theme_ocean' },
  { id:'theme_sunset', name:'日落橙主题', icon:'🌅', price:20, cat:'theme', slot:'theme', rarity:'rare', desc:'温暖日落——给努力的自己一点甜', effect:'theme_sunset' },
  { id:'theme_midnight', name:'午夜紫主题', icon:'🌙', price:25, cat:'theme', slot:'theme', rarity:'rare', desc:'深邃夜空紫——夜间专注模式', effect:'theme_midnight' },

  // 🎁 限时特惠 (2)
  { id:'gift_box', name:'神秘礼盒', icon:'🎁', price:40, cat:'tool', slot:'tool', rarity:'epic', desc:'随机开出稀有道具或大量阿梓币', effect:'gift_box' },
  { id:'streak_insurance', name:'连续守护符', icon:'🛡️', price:50, cat:'tool', slot:'tool', rarity:'legend', desc:'断签时自动使用，保护连续记录不中断', effect:'streak_insurance' },];

const SHOP_CATEGORIES = [
  { id:'all', name:'全部', icon:'🏪' },
  { id:'outfit', name:'服装', icon:'👗' },
  { id:'accessory', name:'配件', icon:'💎' },
  { id:'scene', name:'场景', icon:'🎨' },
  { id:'tool', name:'道具', icon:'🔧' },
  { id:'diary', name:'日记', icon:'📔' },
  { id:'frame', name:'边框', icon:'🖼' },
  { id:'sfx', name:'音效', icon:'🎵' },
  { id:'theme', name:'主题', icon:'🎨' },
];

var shopCatFilter = 'all';
var shopOpen = false;

// ==================== 商城UI ====================
function toggleShop() {
  shopOpen = !shopOpen;
  var modal = document.getElementById('shopModal');
  if (!modal) {
    // 创建商城弹窗
    modal = document.createElement('div');
    modal.id = 'shopModal';
    modal.className = 'shop-modal' + (shopOpen ? ' open' : '');
    modal.innerHTML =
      '<div class="shop-modal-header">' +
        '<span>🏪 阿梓的杂货铺</span>' +
        '<span class="shop-coin">🪙<b id="shopCoinVal">' + AppState.coins + '</b></span>' +
        '<button class="shop-close" onclick="toggleShop()">✕</button>' +
      '</div>' +
      '<div class="shop-cats" id="shopCats"></div>' +
      '<div class="shop-items" id="shopItems"></div>' +
      '<div style="text-align:center;margin-top:12px">' +
        '<button class="shop-btn secondary" onclick="toggleBag()">🎒 打开背包 (' + (AppState.inventory||[]).length + '件)</button>' +
      '</div>';
    document.body.appendChild(modal);
    renderShopCategories();
  }
  modal.classList.toggle('open', shopOpen);
  if (shopOpen) {
    renderShopItems();
    updateShopCoin();
  }
}

function renderShopCategories() {
  var container = document.getElementById('shopCats');
  if (!container) return;
  container.innerHTML = SHOP_CATEGORIES.map(function(c) {
    return '<span class="shop-cat' + (c.id === shopCatFilter ? ' sel' : '') + '" onclick="filterShop(\'' + c.id + '\')">' + c.icon + ' ' + c.name + '</span>';
  }).join('');
}

function filterShop(catId) {
  shopCatFilter = catId;
  renderShopCategories();
  renderShopItems();
}

function renderShopItems() {
  var container = document.getElementById('shopItems');
  if (!container) return;

  var items = SHOP_ITEMS.slice();
  if (shopCatFilter !== 'all') {
    items = items.filter(function(i) { return i.cat === shopCatFilter; });
  }

  var inventory = AppState.inventory || [];
  container.innerHTML = items.map(function(item) {
    var owned = inventory.includes(item.id);
    var canBuy = AppState.coins >= item.price && !owned;
    var rarityLabel = { common:'普通', rare:'稀有', epic:'史诗', legend:'传说' }[item.rarity] || '';
    var rarityCls = 'rarity-' + item.rarity;

    // 图标：img:前缀→用像素图标文件；否则用emoji
    var iconHTML = item.icon;
    if (item.icon && item.icon.indexOf('img:') === 0) {
      iconHTML = '<img src="src/images/items/' + item.icon.slice(4) + '" style="width:36px;height:36px;image-rendering:pixelated;display:block;margin:0 auto 4px" alt="">';
    } else {
      iconHTML = '<span class="shop-item-icon">' + item.icon + '</span>';
    }

    return '<div class="shop-card' + (owned ? ' owned' : '') + '">' +
      iconHTML +
      '<div class="shop-item-name">' + item.name + '</div>' +
      '<div class="shop-item-desc">' + item.desc + '</div>' +
      '<span class="shop-item-rarity ' + rarityCls + '">' + rarityLabel + '</span>' +
      '<div class="shop-item-price">🪙' + item.price + '</div>' +
      (owned
        ? '<button class="shop-buy-btn owned-btn">已拥有</button>'
        : '<button class="shop-buy-btn ' + (canBuy ? 'buy-btn' : 'no-money-btn') + '" onclick="purchaseItem(\'' + item.id + '\')">' + (canBuy ? '购买' : '币不足') + '</button>'
      ) +
      '</div>';
  }).join('');
}

function updateShopCoin() {
  var el = document.getElementById('shopCoinVal');
  if (el) el.textContent = AppState.coins;
}

function purchaseItem(itemId) {
  // 日记列表入口
  if (itemId === 'diary_list') {
    if (typeof showDiaryList === 'function') showDiaryList();
    else toast('日记系统加载中...');
    return;
  }
  // 日记购买
  if (itemId.indexOf('diary_') === 0) {
    if (typeof buyDiary === 'function') { buyDiary(itemId); renderShopItems(); }
    return;
  }

  var item = SHOP_ITEMS.find(function(i) { return i.id === itemId; });
  if (!item) return;

  if (AppState.inventory && AppState.inventory.includes(itemId)) {
    toast('你已经拥有这个了~');
    return;
  }
  if (AppState.coins < item.price) {
    toast('🪙 币不够哦~');
    return;
  }

  if (!confirm('确定购买 ' + item.name + '？\n💰 价格: ' + item.price + '🪙')) return;

  AppState.spendCoins(item.price, 'buy_' + itemId);
  AppState.addToInventory(itemId);

  // 道具类特殊处理
  if (item.effect === 'freeze') AppState.addFreeze(1);
  if (item.effect === 'makeup') addMakeupCards(1);
  if (item.effect === 'hmakeup') { habitMakeupCards++; localStorage.setItem('fhmakeup', String(habitMakeupCards)); }
  if (item.effect === 'mood') AppState.updateMood(20);
  if (item.effect === 'double_coin') activateBuff('double_coin', 30 * 60 * 1000); // 30分钟
  if (item.effect === 'lucky') activateBuff('lucky', 0); // 持续到下次押注

  toast('✅ 购买了 ' + item.name + '！');
  renderShopItems();
  updateShopCoin();
  EventBus.emit('item:purchased', { id: itemId });
}

// ==================== Buff系统 ====================
function activateBuff(buffId, duration) {
  var buffs = AppState.activeBuffs || [];
  buffs.push({ id: buffId, expiresAt: duration > 0 ? Date.now() + duration : 0, used: false });
  AppState.activeBuffs = buffs;
  AppState.save();

  if (duration > 0) {
    setTimeout(function() {
      var b = AppState.activeBuffs.find(function(x) { return x.id === buffId && !x.used; });
      if (b) { b.used = true; b.expired = true; AppState.save(); }
    }, duration);
  }
}

function hasActiveBuff(buffId) {
  return (AppState.activeBuffs || []).some(function(b) { return b.id === buffId && !b.used && (b.expiresAt === 0 || b.expiresAt > Date.now()); });
}

function consumeBuff(buffId) {
  var b = (AppState.activeBuffs || []).find(function(x) { return x.id === buffId && !x.used; });
  if (b) { b.used = true; AppState.save(); return true; }
  return false;
}

// ==================== 背包系统 ====================
function toggleBag() {
  var bagModal = document.getElementById('bagModal');
  if (!bagModal) {
    bagModal = document.createElement('div');
    bagModal.id = 'bagModal';
    bagModal.className = 'shop-modal';
    bagModal.innerHTML =
      '<div class="shop-modal-header">' +
        '<span>🎒 我的背包</span>' +
        '<button class="shop-close" onclick="closeBag()">✕</button>' +
      '</div>' +
      '<div style="padding:8px;font-size:12px;color:var(--gr)">点击道具使用 | 服装/配件/场景在换装页使用</div>' +
      '<div class="shop-items" id="bagItems"></div>';
    document.body.appendChild(bagModal);
  }
  bagModal.classList.add('open');
  renderBagItems();
}

function closeBag() {
  var m = document.getElementById('bagModal');
  if (m) m.classList.remove('open');
}

function renderBagItems() {
  var container = document.getElementById('bagItems');
  if (!container) return;

  var inventory = AppState.inventory || [];
  if (!inventory.length) {
    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--gr)">背包空空如也~ 去商城逛逛吧 🛒</div>';
    return;
  }

  var items = inventory.map(function(id) {
    return SHOP_ITEMS.find(function(i) { return i.id === id; });
  }).filter(Boolean);

  container.innerHTML = items.map(function(item) {
    var isTool = item.cat === 'tool';
    var actionHTML = '';
    if (isTool) {
      if (item.effect === 'makeup') actionHTML = '<button class="shop-buy-btn buy-btn" onclick="useBagItem(\'' + item.id + '\')">使用</button>';
      else if (item.effect === 'double_coin') actionHTML = '<button class="shop-buy-btn buy-btn" onclick="useBagItem(\'' + item.id + '\')">启用</button>';
      else if (item.effect === 'lucky') actionHTML = '<button class="shop-buy-btn buy-btn" onclick="useBagItem(\'' + item.id + '\')">装备</button>';
      else actionHTML = '<span style="font-size:11px;color:var(--gr)">已生效</span>';
    } else {
      actionHTML = '<span style="font-size:11px;color:var(--g)">在换装页使用</span>';
    }

    var iconHTML = item.icon;
    if (item.icon && item.icon.indexOf('img:') === 0) {
      iconHTML = '<img src="src/images/items/' + item.icon.slice(4) + '" style="width:36px;height:36px;image-rendering:pixelated" alt="">';
    } else {
      iconHTML = '<span class="shop-item-icon">' + item.icon + '</span>';
    }

    return '<div class="shop-card owned">' +
      iconHTML +
      '<div class="shop-item-name">' + item.name + '</div>' +
      '<div class="shop-item-desc">' + item.desc + '</div>' +
      actionHTML +
      '</div>';
  }).join('');
}

function useBagItem(itemId) {
  var item = SHOP_ITEMS.find(function(i) { return i.id === itemId; });
  if (!item) return;

  if (item.effect === 'makeup') {
    useMakeupCard(prompt('输入要补签的日期(YYYY-MM-DD，3天内):') || '');
  } else if (item.effect === 'double_coin') {
    if (hasActiveBuff('double_coin')) { toast('已有加倍卡生效中！'); return; }
    activateBuff('double_coin', 30 * 60 * 1000);
    toast('⚡ 专注加倍卡已启用！30分钟内专注双倍币');
  } else if (item.effect === 'lucky') {
    if (hasActiveBuff('lucky')) { toast('已有幸运符生效中！'); return; }
    activateBuff('lucky', 0);
    toast('🍀 幸运符已装备！下次押注胜率提升');
  } else if (item.effect === 'mood') {
    AppState.updateMood(20);
    toast('💝 已使用心情恢复剂！');
  } else {
    toast('这个道具不需要手动使用~');
  }
  renderBagItems();
}

// ==================== 旧商城（兼容） ====================
function buyItem(type) {
  if (type === 'freeze' && AppState.coins >= 30) {
    AppState.spendCoins(30, 'buy_freeze');
    AppState.addFreeze(1);
    AppState.addToInventory('tool_freeze');
  } else if (type === 'box' && AppState.coins >= 20) {
    AppState.spendCoins(20, 'buy_box');
    openRewardBox();
  } else if (type === 'mood' && AppState.coins >= 15) {
    AppState.spendCoins(15, 'buy_mood');
    AppState.updateMood(20);
    toast('💝 阿梓心情变好了！');
  } else {
    toast('🪙 币不够哦~');
  }
  if (typeof rProfile === 'function') rProfile();
}

function openRewardBox() {
  var rewards = [
    { icon:'🪙', text:'获得 10 阿梓币', action:function(){ AppState.addCoins(10,'box') } },
    { icon:'🪙', text:'获得 25 阿梓币', action:function(){ AppState.addCoins(25,'box') } },
    { icon:'🪙', text:'获得 50 阿梓币', action:function(){ AppState.addCoins(50,'box') } },
    { icon:'🔰', text:'获得 1 个护符', action:function(){ AppState.addFreeze(1) } },
    { icon:'💝', text:'阿梓心情 +15', action:function(){ AppState.updateMood(15) } },
    { icon:'🎉', text:'获得 100 阿梓币', action:function(){ AppState.addCoins(100,'box_jackpot') } },
  ];
  if (Math.random() < 0.05) {
    var r = rewards[Math.floor(Math.random() * rewards.length)];
    document.getElementById('boxReward').textContent = r.icon;
    document.getElementById('boxText').textContent = r.text;
    document.getElementById('boxOverlay').classList.remove('hidden');
    r.action();
    return true;
  }
  return false;
}

function closeBox() { document.getElementById('boxOverlay').classList.add('hidden'); }

// 事件监听
EventBus.on('coin:changed', function() { updateShopCoin(); });

console.log('🏪 商城已加载: ' + SHOP_ITEMS.length + '件商品');
