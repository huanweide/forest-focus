const V='forest-v9';
const FILES=[
  './','./index.html','./manifest.json',
  // 核心图标
  './src/images/azusa/icon-192.png','./src/images/azusa/icon-512.png',
  // 2D衣装
  './src/images/azusa/azusa_default.png','./src/images/azusa/azusa_chibi.png',
  './src/images/azusa/azusa_chibi4.png','./src/images/azusa/azusa_box.png',
  './src/images/azusa/azusa_newyear.png','./src/images/azusa/azusa_summer.png',
  './src/images/azusa/azusa_panda.png','./src/images/azusa/azusa_rabbit.png',
  './src/images/azusa/azusa_frog.png','./src/images/azusa/azusa_butterfly.png',
  './src/images/azusa/azusa_eggplant.png','./src/images/azusa/azusa_spring_new.png',
  './src/images/azusa/azusa_ninja.png','./src/images/azusa/azusa_fan_model1.jpg',
  './src/images/azusa/azusa_rabbit_2024.jpg','./src/images/azusa/azusa_summer_festival_hd.jpg',
  './src/images/azusa/azusa_touming_liren.png','./src/images/azusa/azusa_wechat1.jpg',
  // 新增衣装 + 高清
  './src/images/azusa/azusa_beizi.png','./src/images/azusa/azusa_huazi.png',
  './src/images/azusa/azusa_tuozi_normal_crop.png','./src/images/azusa/azusa_tuozi_tongue_crop.png',
  './src/images/azusa/azusa_default_hd.png','./src/images/azusa/azusa_regular.png',
  './src/images/azusa/azusa_panda_outfit.png','./src/images/azusa/azusa_ninja_outfit.png',
  // 精灵GIF
  './src/images/azusa/azusa_mascot_live2d.gif',
  // 表情贴纸
  './src/images/azusa/stickers/阿梓从小就很可爱新装扮_比心.gif',
  './src/images/azusa/stickers/阿梓从小就很可爱新装扮_打call.gif',
  './src/images/azusa/stickers/阿梓从小就很可爱新装扮_大家好.gif',
  './src/images/azusa/stickers/阿梓从小就很可爱新装扮_就这啊.gif',
  './src/images/azusa/stickers/阿梓从小就很可爱新装扮_哭哭.gif',
  './src/images/azusa/stickers/阿梓从小就很可爱新装扮_拳头硬了.gif',
  './src/images/azusa/stickers/阿梓从小就很可爱新装扮_晚安.gif',
  './src/images/azusa/stickers/阿梓从小就很可爱新装扮_真牛哇.gif',
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res&&res.status===200){let clone=res.clone();caches.open(V).then(c=>c.put(e.request,clone))}return res}).catch(()=>caches.match('./index.html'))))});
