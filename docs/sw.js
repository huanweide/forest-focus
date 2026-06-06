const V='forest-v13';
// HTML用网络优先（始终最新），静态资源用缓存优先
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>c.addAll([
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
  ])).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  // HTML请求用网络优先，确保始终获取最新版
  if (e.request.mode==='navigate'||e.request.destination==='document'){
    e.respondWith(fetch(e.request).then(r=>{
      let clone=r.clone();caches.open(V).then(c=>c.put(e.request,clone));return r;
    }).catch(()=>caches.match(e.request)));
  }else{
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
      if(res&&res.status===200){let clone=res.clone();caches.open(V).then(c=>c.put(e.request,clone));}return res;
    })));
  }
});
