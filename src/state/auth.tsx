import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { describeAuthError, isCloudConfigured, supabase } from '../lib/supabase'

type AuthCtx = {
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<string | null>
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isCloudConfigured)

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
    }),
    [session, loading],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth ต้องอยู่ภายใน AuthProvider')
  return ctx
}
