import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { applyBackground, loadBackground } from './lib/background'

// รูปพื้นหลังที่ผู้ใช้เลือกไว้ ใส่ก่อนเรนเดอร์เพื่อไม่ให้กะพริบ
applyBackground(loadBackground())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* ใช้งานแบบออฟไลน์ไม่ได้ แต่แอปยังทำงานปกติ */
    })
  })
}
