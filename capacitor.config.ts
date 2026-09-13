import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.wannarun.app',
  appName: 'Wanna Run?',
  // ใช้ผลลัพธ์จาก vite build ชุดเดียวกับเว็บ
  webDir: 'dist',
  android: {
    // ให้ WebView ทำงานบน https:// เพื่อให้ Geolocation/getUserMedia และ localStorage
    // ทำงานเหมือนบนเว็บจริง (บน http:// เบราว์เซอร์จะถือว่าไม่ปลอดภัย)
    androidScheme: 'https',
  },
}

export default config
