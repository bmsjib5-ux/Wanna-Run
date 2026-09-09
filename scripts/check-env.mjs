/**
 * ตรวจตัวแปรสภาพแวดล้อมก่อน build แล้วพิมพ์ผลลงใน build log
 *
 * Vite ฝังค่า VITE_* ลงในไฟล์ตอน build ถ้าตอนนั้นไม่มีค่า แอปจะถูกคอมไพล์เป็น
 * โหมดเก็บข้อมูลในเครื่องอย่างเงียบ ๆ ไม่มีข้อความเตือนใด ๆ ทั้งที่หน้าเว็บขึ้นปกติ
 * สคริปต์นี้จึงมีไว้ให้เห็นตั้งแต่ใน log ว่าคีย์เข้าหรือไม่ ไม่ต้องมาไล่เดาทีหลัง
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { loadEnv } from 'vite'

// ใช้ตัวโหลดของ Vite เอง เพื่อให้เห็นค่าชุดเดียวกับที่ vite build จะเห็นจริง
// (รวมทั้งไฟล์ .env และตัวแปรที่ตั้งไว้ในสภาพแวดล้อม เช่นบน Render)
const env = loadEnv('production', process.cwd(), 'VITE_')

const KEYS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

const mask = (v) => (v.length <= 12 ? '***' : `${v.slice(0, 8)}…${v.slice(-4)} (${v.length} ตัวอักษร)`)

console.log('\n── ตรวจตัวแปรสภาพแวดล้อมก่อน build ──')
console.log(`  แหล่งที่มา: ${KEYS.some((k) => process.env[k]) ? 'สภาพแวดล้อม (เช่น Render)' : 'ไฟล์ .env ในโปรเจกต์'}`)
const missing = []
for (const key of KEYS) {
  const raw = env[key]
  if (!raw || raw.trim() === '') {
    missing.push(key)
    console.log(`  ✗ ${key} = (ไม่มีค่า)`)
  } else if (raw !== raw.trim()) {
    console.log(`  ⚠ ${key} = ${mask(raw.trim())}  ← มีช่องว่างหน้าหลัง อาจใช้ไม่ได้`)
  } else {
    console.log(`  ✓ ${key} = ${mask(raw)}`)
  }
}

if (missing.length > 0) {
  console.log(`
  ┌──────────────────────────────────────────────────────────────┐
  │  แอปจะถูก build เป็นโหมดเก็บข้อมูลในเครื่องอย่างเดียว            │
  │  ไม่มีหน้าเข้าสู่ระบบ และเพิ่มเพื่อนข้ามเครื่องไม่ได้             │
  │                                                              │
  │  แก้โดยตั้งค่าที่ Render → service → Environment:              │
  │    ${missing.join(', ').padEnd(58)}│
  │  แล้ว Manual Deploy → Clear build cache & deploy              │
  └──────────────────────────────────────────────────────────────┘
`)
} else {
  console.log('  → build เป็นโหมดเชื่อมเซิร์ฟเวอร์ (มีหน้าเข้าสู่ระบบ)\n')
}

/**
 * เขียนไฟล์บอกข้อมูล build ไว้ให้เรียกดูจากเว็บได้ที่ /build-info.json
 * เวลาไล่ปัญหาบนโฮสต์จะได้รู้ทันทีว่าที่เสิร์ฟอยู่คือ build ไหน โหมดอะไร
 * ไม่ต้องมานั่งเดาจากขนาดไฟล์หรือ last-modified
 */
const info = {
  builtAt: new Date().toISOString(),
  cloud: missing.length === 0,
  missing,
  commit: (process.env.RENDER_GIT_COMMIT ?? process.env.GIT_COMMIT ?? '').slice(0, 7) || null,
  branch: process.env.RENDER_GIT_BRANCH ?? null,
}
mkdirSync('public', { recursive: true })
writeFileSync('public/build-info.json', JSON.stringify(info, null, 2) + '\n')
console.log(`  เขียน public/build-info.json แล้ว (cloud: ${info.cloud})\n`)
