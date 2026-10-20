// שומר את האתר במכשיר כדי שייפתח גם בלי אינטרנט.
// תמיד מנסה קודם את הגרסה העדכנית מהרשת; העותק השמור משמש רק כשאין חיבור.
// בקשות לענן (Google Apps Script) לא עוברות כאן בכלל.
const CACHE = 'akordim-v8';
const FILES = ['./', 'index.html', 'chords.html', 'maaser.html', 'tromot.html', 'shopping.html', 'shop-core.js', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }) // בודק מול השרת בכל פעם, כדי שלא יוצג קובץ ישן מזיכרון הדפדפן
      .then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
