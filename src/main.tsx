import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './native-design.css'
import App from './App'
import { applyBackground, loadBackground } from './lib/background'
import { isNative } from './lib/native'

// รูปพื้นหลังที่ผู้ใช้เลือกไว้ ใส่ก่อนเรนเดอร์เพื่อไม่ให้กะพริบ
applyBackground(loadBackground())

// Keep browser zoom and text selection available for accessibility.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ในแอปมือถือไฟล์ถูกฝังมากับตัวแอปอยู่แล้ว ไม่ต้องใช้ service worker แคชซ้ำ
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative()) {
  // มี service worker คุมหน้านี้อยู่หรือยัง — ใช้แยก "ติดตั้งครั้งแรก" ออกจาก "มีเวอร์ชันใหม่"
  // ต้องอัปเดตค่าเรื่อย ๆ ไม่ใช่อ่านครั้งเดียวตอนเปิด ไม่งั้นการเปลี่ยนเวอร์ชัน
  // ที่เกิดหลังการติดตั้งครั้งแรกในหน้าเดียวกันจะถูกมองว่าเป็นการติดตั้งครั้งแรกไปด้วย
  let controlled = Boolean(navigator.serviceWorker.controller)
  let reloading = false

  // เวอร์ชันใหม่เข้ามาคุมแทน = ผู้ใช้ยังเปิดของเก่าค้างอยู่ ให้โหลดใหม่ให้เลยครั้งเดียว
  // ไม่งั้นต้องคอยบอกให้ล้างแคชเองทุกครั้งที่ปล่อยของใหม่
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const wasControlled = controlled
    controlled = true
    if (!wasControlled || reloading) return
    reloading = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // เช็กของใหม่ทันทีที่เปิด และทุกครั้งที่กลับมาที่หน้าจอ
        void reg.update()
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void reg.update()
        })
      })
      .catch(() => {
        /* ใช้งานแบบออฟไลน์ไม่ได้ แต่แอปยังทำงานปกติ */
      })
  })
}
