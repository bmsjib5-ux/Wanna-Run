import { useEffect, useState } from 'react'
import { isCloudConfigured } from './supabase'
import { isNameAvailable } from './api'

export type NameState = 'idle' | 'checking' | 'free' | 'taken' | 'error'

/**
 * เช็คว่าชื่อซ้ำกับคนอื่นไหม โดยหน่วงไว้ก่อนยิงถาม
 * เพื่อไม่ให้ยิงทุกตัวอักษรที่พิมพ์
 */
export function useNameCheck(name: string, currentName?: string): NameState {
  const [state, setState] = useState<NameState>('idle')

  useEffect(() => {
    const value = name.trim()
    if (!isCloudConfigured || value === '' || value === currentName?.trim()) {
      setState('idle')
      return
    }
    setState('checking')
    let cancelled = false
    const timer = window.setTimeout(() => {
      isNameAvailable(value)
        .then((free) => !cancelled && setState(free ? 'free' : 'taken'))
        .catch(() => !cancelled && setState('error'))
    }, 450)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [name, currentName])

  return state
}

export function nameHint(state: NameState): { text: string; tone: 'ok' | 'bad' | 'muted' } | null {
  switch (state) {
    case 'checking':
      return { text: 'กำลังตรวจสอบชื่อ...', tone: 'muted' }
    case 'free':
      return { text: 'ชื่อนี้ใช้ได้', tone: 'ok' }
    case 'taken':
      return { text: 'ชื่อนี้มีคนใช้แล้ว ลองชื่ออื่นดูนะ', tone: 'bad' }
    case 'error':
      return { text: 'ตรวจสอบชื่อไม่สำเร็จ กดต่อได้ ระบบจะเช็คอีกครั้งตอนบันทึก', tone: 'muted' }
    default:
      return null
  }
}
