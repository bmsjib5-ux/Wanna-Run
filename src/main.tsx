import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { applyBackground, loadBackground } from './lib/background'
import { isNative } from './lib/native'

// รูปพื้นหลังที่ผู้ใช้เลือกไว้ ใส่ก่อนเรนเดอร์เพื่อไม่ให้กะพริบ
applyBackground(loadBackground())

// กันซูมด้วยนิ้วสองนิ้ว (iOS Safari ไม่สนใจ user-scalable=no) และเมนูค้างจากการกดแช่
// แผนที่ยังบีบซูมได้ตามปกติ เพราะ Leaflet จัดการท่าทางบนตัวมันเอง
const inEditable = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.closest('input, textarea, [contenteditable="true"]') !== null)
const onMap = (t: EventTarget | null) => t instanceof Element && t.closest('.leaflet-container') !== null
document.addEventListener('gesturestart', (e) => {
  if (!onMap(e.target)) e.preventDefault()
})
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length > 1 && !onMap(e.target)) e.preventDefault()
  },
  { passive: false },
)
document.addEventListener('contextmenu', (e) => {
  if (!inEditable(e.target)) e.preventDefault()
})
document.addEventListener('copy', (e) => {
  if (!inEditable(e.target)) e.preventDefault()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ในแอปมือถือไฟล์ถูกฝังมากับตัวแอปอยู่แล้ว ไม่ต้องใช้ service worker แคชซ้ำ
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* ใช้งานแบบออฟไลน์ไม่ได้ แต่แอปยังทำงานปกติ */
    })
  })
}
