// 오프라인에서도 놀 수 있도록 앱 파일을 기기에 담아 둡니다.
// 카메라 영상은 여기를 지나가지 않습니다 (네트워크로 보내는 코드가 없음).
const VERSION = 'mugunghwa-v6';
const FILES = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './js/app.js',
  './js/game.js',
  './js/motion.js',
  './js/scene.js',
  './js/sound.js',
  './js/fallback.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 인터넷이 되면 늘 새 파일을 받아 오고(고친 내용이 바로 보이게), 안 되면 기기에 담긴 파일을 씁니다.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })
      .then((hit) => hit || caches.match('./index.html'))),
  );
});
