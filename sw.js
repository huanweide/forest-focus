const V='forest-v13';
const MAX_CACHE_ENTRIES=50; // 运行时缓存最大条数，超出按插入顺序(LRU)删除最旧项
// HTML用网络优先（始终最新），静态资源用缓存优先
const PRECACHE=[
  './','./index.html','./manifest.json',
  './src/images/azusa/icon-192.png','./src/images/azusa/icon-512.png',
  './src/images/azusa/chibi_home.png','./src/images/azusa/chibi_azusa.png',
  './src/images/azusa/sprites/chibi_idle.png','./src/images/azusa/sprites/chibi_happy.png',
  './src/images/azusa/sprites/chibi_surprised.png','./src/images/azusa/sprites/chibi_shy.png',
  './src/images/azusa/base/body_base.png',
  './src/images/azusa/outfits/jk_uniform.png','./src/images/azusa/outfits/maid_dress.png',
  './src/images/azusa/outfits/cheongsam.png','./src/images/azusa/outfits/bunny_suit.png',
  './src/images/azusa/outfits/pajamas.png','./src/images/azusa/outfits/sportswear.png',
  './src/images/azusa/outfits/gothic.png','./src/images/azusa/outfits/yukata.png',
  './src/images/azusa/outfits/school_uniform.png','./src/images/azusa/outfits/sexy_dress.png',
  './src/images/azusa/outfits/clothing_ref.png',
  './src/images/azusa/outfits/bg_classroom.png','./src/images/azusa/outfits/bg_bedroom.png',
  './src/images/azusa/outfits/bg_garden.png','./src/images/azusa/outfits/bg_shrine.png',
  './src/images/azusa/outfits/bg_library.png','./src/images/azusa/outfits/bg_cafe.png',
  './src/images/azusa/outfits/bg_rooftop.png','./src/images/azusa/outfits/bg_rain.png',
  './src/images/azusa/outfits/bg_festival.png','./src/images/azusa/outfits/bg_starry.png',
  './src/images/azusa/accessories/cat_ear.png','./src/images/azusa/accessories/bunny_ear.png',
  './src/images/azusa/accessories/glasses.png','./src/images/azusa/accessories/crown.png',
  './src/images/azusa/accessories/angel_wings.png','./src/images/azusa/accessories/devil_horns.png',
  './src/images/items/star.png','./src/images/items/gem.png',
];
self.addEventListener('install',e=>{
  // 逐项预缓存并吞掉单项失败：任一图片 404 不再导致整个 SW 安装失败而永不激活
  e.waitUntil(caches.open(V).then(c=>Promise.all(PRECACHE.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  var req=e.request;
  // HTML请求用网络优先，确保始终获取最新版
  if (req.mode==='navigate'||req.destination==='document'){
    e.respondWith(fetch(req).then(r=>{
      let clone=r.clone();caches.open(V).then(c=>c.put(req,clone));return r;
    }).catch(()=>caches.match(req)));
    return;
  }
  // 仅对同源静态资源做运行时缓存；外部 API(api. 子域或 /api/ 路径)与带查询串的动态请求跳过，避免 Cache Storage 膨胀
  var url=new URL(req.url);
  var isStatic=req.method==='GET'
    && url.origin===self.location.origin
    && url.hostname.indexOf('api.')!==0
    && url.pathname.indexOf('/api/')===-1
    && !url.search;
  if(!isStatic){
    e.respondWith(fetch(req).catch(()=>caches.match(req)));
    return;
  }
  e.respondWith(caches.match(req).then(r=>r||fetch(req).then(res=>{
    if(res&&res.status===200){
      let clone=res.clone();
      caches.open(V).then(c=>{
        c.put(req,clone);
        // LRU：超出最大条数时删除最旧的插入项
        c.keys().then(keys=>{
          if(keys.length>MAX_CACHE_ENTRIES){
            keys.slice(0,keys.length-MAX_CACHE_ENTRIES).forEach(k=>c.delete(k));
          }
        });
      });
    }
    return res;
  })));
});
