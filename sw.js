/* Guarda os arquivos do app para abrir rápido. Dados do banco nunca são guardados aqui. */
var CACHE = "calixto-v1";
var FILES = ["./", "index.html", "sb.js", "config.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-180.png"];
self.addEventListener("install", function(e){ e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(FILES); }).then(function(){ return self.skipWaiting(); })); });
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  var r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;     // banco, fotos e fontes: direto da internet
  e.respondWith(fetch(r).then(function(res){
    var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(r, copy); }); return res;
  }).catch(function(){ return caches.match(r).then(function(m){ return m || caches.match("index.html"); }); }));
});
