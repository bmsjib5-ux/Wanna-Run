import { useCallback, useEffect, useState } from 'react'

export type ThemeMode = 'dark' | 'light' | 'system'
export type Accent = 'lime' | 'sky' | 'coral' | 'violet' | 'rose' | 'mint'
/** สไตล์สำเร็จรูป — 'custom' คือเลือกโหมดและสีหลักเอง */
export type Preset = 'custom' | 'neon' | 'mono' | 'pastel' | 'glass' | 'sunset'

export type ThemeSettings = { mode: ThemeMode; accent: Accent; preset: Preset }

/** สไตล์สำเร็จรูปพร้อมสีแถบสถานะของแต่ละแบบ */
export const PRESETS: Array<{ key: Preset; label: string; detail: string; bar: string }> = [
  { key: 'custom', label: 'ปรับเอง', detail: 'เลือกโหมดและสีหลักด้านล่าง', bar: '#0b0f14' },
  { key: 'neon', label: 'Neon Sport', detail: 'ดำสนิท สีสะท้อนแสง', bar: '#05070a' },
  { key: 'mono', label: 'Minimal', detail: 'ขาวสะอาด เรียบ ๆ', bar: '#fafafa' },
  { key: 'pastel', label: 'Pastel', detail: 'โทนนุ่ม มุมโค้งมน', bar: '#fdf7f4' },
  { key: 'glass', label: 'Midnight', detail: 'กระจกเบลอ น้ำเงินเข้ม', bar: '#080e1c' },
  { key: 'sunset', label: 'Sunset', detail: 'อบอุ่น ส้ม-เหลือง', bar: '#140f0e' },
]

export const ACCENTS: Array<{ key: Accent; label: string; swatch: string }> = [
  { key: 'lime', label: 'เขียวมะนาว', swatch: '#c6f24e' },
  { key: 'mint', label: 'มินต์', swatch: '#4ee1c1' },
  { key: 'sky', label: 'ฟ้า', swatch: '#5cc8ff' },
  { key: 'violet', label: 'ม่วง', swatch: '#b48cff' },
  { key: 'rose', label: 'ชมพู', swatch: '#ff7aa8' },
  { key: 'coral', label: 'ส้ม', swatch: '#ff8a5c' },
]

export const MODES: Array<{ key: ThemeMode; label: string; icon: string }> = [
  { key: 'dark', label: 'มืด', icon: '🌙' },
  { key: 'light', label: 'สว่าง', icon: '☀️' },
  { key: 'system', label: 'ตามเครื่อง', icon: '📱' },
]

/** คีย์เดียวกับที่สคริปต์ใน index.html อ่านตอนเปิดหน้า เพื่อไม่ให้ธีมกะพริบ */
export const THEME_KEY = 'wanna-run.theme'
const DEFAULTS: ThemeSettings = { mode: 'dark', accent: 'lime', preset: 'custom' }

/** สีแถบสถานะของเบราว์เซอร์ ให้กลืนกับพื้นแอปแต่ละธีม */
const BAR_COLOR: Record<'dark' | 'light', string> = { dark: '#0b0f14', light: '#f3f6fa' }

export function loadTheme(): ThemeSettings {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<ThemeSettings>
    return {
      mode: MODES.some((m) => m.key === parsed.mode) ? (parsed.mode as ThemeMode) : DEFAULTS.mode,
      accent: ACCENTS.some((a) => a.key === parsed.accent) ? (parsed.accent as Accent) : DEFAULTS.accent,
      preset: PRESETS.some((p) => p.key === parsed.preset) ? (parsed.preset as Preset) : DEFAULTS.preset,
    }
  } catch {
    return DEFAULTS
  }
}

function systemPrefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveMode(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return mode
}

/**
 * เขียนค่าธีมลงบน <html> และอัปเดตสีแถบสถานะ
 *
 * สไตล์สำเร็จรูปกำหนดจานสีมาครบชุดแล้ว จึงถอด data-theme/data-accent ออก
 * เพื่อไม่ให้สองระบบแย่งกันกำหนดสีเดียวกัน
 */
export function applyTheme(settings: ThemeSettings): void {
  const root = document.documentElement
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')

  if (settings.preset !== 'custom') {
    root.dataset.preset = settings.preset
    delete root.dataset.theme
    delete root.dataset.accent
    if (meta) meta.content = PRESETS.find((p) => p.key === settings.preset)?.bar ?? BAR_COLOR.dark
    return
  }

  const resolved = resolveMode(settings.mode)
  delete root.dataset.preset
  root.dataset.theme = resolved
  root.dataset.accent = settings.accent
  if (meta) meta.content = BAR_COLOR[resolved]
}

export function saveTheme(settings: ThemeSettings): void {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(settings))
  } catch {
    /* ปิดใช้ localStorage ไว้ ก็แค่จำไม่ได้ข้ามครั้ง */
  }
}

/** ธีมเป็นความชอบส่วนตัวของเครื่อง จึงเก็บในเครื่องอย่างเดียว ไม่ซิงก์ขึ้นเซิร์ฟเวอร์ */
export function useTheme(): [ThemeSettings, (patch: Partial<ThemeSettings>) => void] {
  const [settings, setSettings] = useState<ThemeSettings>(loadTheme)

  useEffect(() => {
    applyTheme(settings)
    saveTheme(settings)
  }, [settings])

  // โหมด "ตามเครื่อง" ต้องตามเมื่อระบบสลับกลางคัน เช่น ตกเย็นแล้วมือถือเปลี่ยนเป็นมืดเอง
  useEffect(() => {
    if (settings.preset !== 'custom' || settings.mode !== 'system' || typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme(settings)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [settings])

  const update = useCallback((patch: Partial<ThemeSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  return [settings, update]
}
