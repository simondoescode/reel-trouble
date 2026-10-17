// Static, repo-scoped offline shell. Works with Vite hashed assets and raw branch publishing.
const CACHE='reel-trouble-offline-v13';
const ROOT=self.registration.scope;
const base=(path)=>new URL(path,ROOT).href;
const core=['./','./index.html','./manifest.webmanifest','./assets/title-logo.webp','./icons/favicon.ico','./icons/favicon.png','./icons/apple-touch-icon.png','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png'];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(core.map(base));
  // Vite names bundles by hash. Discover the actual filenames from generated HTML.
  const html=await (await cache.match(base('./index.html'))).text();
  const urls=[...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))(?:\?[^"]*)?"/g)]
    .map(match=>new URL(match[1],ROOT))
    .filter(url=>url.origin===self.location.origin && url.href.startsWith(ROOT));
  const raw=['./src/game.js','./src/styles.css','./src/tilt.js','./src/shooting.js','./src/airborne.js','./src/arcade-ui.js','./src/audio.js','./src/haptics.js','./src/ocean.js','./src/collection.js','./src/pwa.js'];
  // Installability: preload hashed Vite output when online; keep raw branch fallback.
  await Promise.allSettled([...new Set([...urls.map(u=>u.href),...raw.map(base)])].map(url=>cache.add(url)));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  await Promise.all((await caches.keys()).filter(k=>k.startsWith('reel-trouble-offline-')&&k!==CACHE)
    .map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 const url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(ROOT))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(req);
   if(response.ok)cache.put(req,response.clone()).catch(()=>{});
   return response;
  }catch(_){
   const cached=await cache.match(req,{ignoreSearch:true});
   if(cached)return cached;
   if(req.mode==='navigate'){
    const fallback=await cache.match(base('./index.html'));
    if(fallback)return fallback;
   }
   return Response.error();
  }
 })());
});
