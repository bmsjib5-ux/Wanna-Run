// service worker แบบง่าย: แคชไฟล์ของแอปไว้ใช้ตอนออฟไลน์
const CACHE = 'wanna-run-v2'
const CORE = ['/', '/index.html', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // หน้าเว็บ: ลองออนไลน์ก่อน ถ้าไม่ได้ค่อยใช้แคช
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')))
    return
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        }),
    ),
  )
})

// แจ้งเตือนจากเซิร์ฟเวอร์ — ทำงานแม้ผู้ใช้ปิดแท็บแอปไปแล้ว
self.addEventListener('push', (event) => {
  const payload = { title: 'ไปวิ่งไหม', body: '', goto: '', tag: 'wanna-run:push' }
  if (event.data) {
    try {
      Object.assign(payload, event.data.json())
    } catch {
      payload.body = event.data.text()
    }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: payload.tag || 'wanna-run:push',
      renotify: true,
      data: { goto: payload.goto || '' },
    }),
  )
})

// ถ้าเบราว์เซอร์ต่ออายุการสมัครรับแจ้งเตือนเอง ให้แอปรู้เพื่อบันทึก token ใหม่
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      list.forEach((c) => c.postMessage({ type: 'wanna-run:resubscribe' }))
    }),
  )
})

// แตะแจ้งเตือน (เช่น ตัวเลขระยะทางระหว่างวิ่ง) ให้กลับมาที่แอปแท็บเดิม ไม่เปิดซ้ำ
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const goto = data.goto || ''
  const target = data.url || (goto ? `/?goto=${encodeURIComponent(goto)}` : '/')
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => 'focus' in c)
      if (existing) {
        if (goto) existing.postMessage({ type: 'wanna-run:goto', route: goto })
        return existing.focus()
      }
      return self.clients.openWindow(target)
    }),
  )
})
