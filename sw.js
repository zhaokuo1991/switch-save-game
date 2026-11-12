/* 离线缓存：第一次成功打开后，页面存进设备本地；断网 / 连不上 GitHub 时照样能玩 */
const CACHE = 'kid-save-v1';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   /* 本页没有任何外部资源，保险起见直接放行 */
  e.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(req, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(req))
      || (await cache.match('./index.html'))
      || (await cache.match('./'));
    if (hit) return hit;
    return new Response('现在连不上网，而且本地还没有缓存过。请联网打开一次后再试。', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
