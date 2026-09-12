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
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* ใช้งานแบบออฟไลน์ไม่ได้ แต่แอปยังทำงานปกติ */
    })
  })
}
