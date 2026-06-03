const V='forest-v5';
const FILES=['./','./index.html','./manifest.json','./src/images/azusa/azusa_default.png','./src/images/azusa/azusa_box.png','./src/images/azusa/azusa_transparent.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res&&res.status===200){let clone=res.clone();caches.open(V).then(c=>c.put(e.request,clone))}return res}).catch(()=>caches.match('./index.html'))))});
