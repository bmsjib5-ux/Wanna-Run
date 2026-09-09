import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { describeAuthError, isCloudConfigured, supabase } from '../lib/supabase'
import { describeRecoveryError, takeRecoveryFromUrl } from '../lib/recovery'

type AuthCtx = {
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<string | null>
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  /** ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมล */
  resetPassword: (email: string) => Promise<string | null>
  /** เปิดแอปมาจากลิงก์ตั้งรหัสผ่านใหม่หรือเปล่า ('ready' = พร้อมให้ตั้งรหัสใหม่) */
  recovery: 'none' | 'ready' | 'failed'
  recoveryError: string | null
  /** ตั้งรหัสผ่านใหม่ให้บัญชีที่กำลังกู้คืน */
  updatePassword: (password: string) => Promise<string | null>
  /** ออกจากโหมดกู้รหัสผ่าน (กดยกเลิก หรือตั้งรหัสใหม่เสร็จแล้ว) */
  endRecovery: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isCloudConfigured)
  const [recovery, setRecovery] = useState<'none' | 'ready' | 'failed'>('none')
  const [recoveryError, setRecoveryError] = useState<string | null>(null)

  // เปิดแอปมาจากลิงก์ในอีเมล: แลกโทเคนเป็นเซสชัน แล้วพาไปหน้าตั้งรหัสผ่านใหม่
  // ฟัง hashchange ด้วย เผื่อเบราว์เซอร์เปิดลิงก์ในแท็บที่แอปเปิดค้างอยู่ (ไม่โหลดหน้าใหม่)
  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    const check = () => {
      const link = takeRecoveryFromUrl()
      if (!link) return
      setLoading(true)
      const run =
        link.kind === 'tokens'
          ? sb.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken })
          : sb.auth.exchangeCodeForSession(link.code)
      void run.then(({ error }) => {
        if (error) {
          setRecovery('failed')
          setRecoveryError(describeRecoveryError(error.message))
        } else {
          setRecovery('ready')
        }
        setLoading(false)
      })
    }
    check()
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [])

  useEffect(() => {
    if (!supabase) return
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      loading,
      async signUp(email, password) {
        if (!supabase) return 'ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์'
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) return describeAuthError(error.message)
        // เมื่อเปิดยืนยันอีเมลไว้ Supabase จะยังไม่คืน session มาให้
        if (!data.session) return 'สมัครแล้ว — เช็กอีเมลเพื่อยืนยันก่อนเข้าใช้งาน'
        return null
      },
      async signIn(email, password) {
        if (!supabase) return 'ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์'
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        return error ? describeAuthError(error.message) : null
      },
      async signOut() {
        await supabase?.auth.signOut()
      },
      recovery,
      recoveryError,
      async updatePassword(password) {
        if (!supabase) return 'ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์'
        const { error } = await supabase.auth.updateUser({ password })
        return error ? describeAuthError(error.message) : null
      },
      endRecovery() {
        setRecovery('none')
        setRecoveryError(null)
      },
      async resetPassword(email) {
        if (!supabase) return 'ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์'
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${location.origin}/`,
        })
        return error ? describeAuthError(error.message) : null
      },
    }),
    [session, loading, recovery, recoveryError],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth ต้องอยู่ภายใน AuthProvider')
  return ctx
}
