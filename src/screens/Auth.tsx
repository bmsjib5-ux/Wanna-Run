import { useState } from 'react'
import { useAuth } from '../state/auth'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setMsg(null)
    const err = mode === 'in' ? await signIn(email, password) : await signUp(email, password)
    setMsg(err)
    setBusy(false)
  }

  const ready = /\S+@\S+\.\S+/.test(email) && password.length >= 6

  return (
    <div className="shell">
      <div className="page" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)', paddingBottom: 40 }}>
        <div className="center" style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 66, lineHeight: 1 }}>🏃‍♀️💨</div>
          <h1 style={{ fontSize: 31, margin: '16px 0 6px', letterSpacing: -1 }}>Wanna Run?</h1>
          <p className="muted small" style={{ margin: 0, lineHeight: 1.7 }}>
            เข้าสู่ระบบเพื่อชวนเพื่อนจริง ๆ มาวิ่งด้วยกัน
            <br />
            เพิ่มเพื่อนข้ามเครื่อง แชร์ตำแหน่ง และนัดวิ่งได้ทั้งก๊วน
          </p>
        </div>

        <div className="seg" style={{ marginBottom: 18 }}>
          <button className={mode === 'in' ? 'on' : ''} onClick={() => { setMode('in'); setMsg(null) }}>
            เข้าสู่ระบบ
          </button>
          <button className={mode === 'up' ? 'on' : ''} onClick={() => { setMode('up'); setMsg(null) }}>
            สมัครใหม่
          </button>
        </div>

        <label className="field">
          <span>อีเมล</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label className="field">
          <span>รหัสผ่าน {mode === 'up' && <span className="muted">(อย่างน้อย 6 ตัว)</span>}</span>
          <input
            type="password"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e) => e.key === 'Enter' && ready && !busy && submit()}
          />
        </label>

        {msg && (
          <div className="card tight small" style={{ borderColor: 'rgba(255,196,77,.4)', color: 'var(--warn)', marginBottom: 14 }}>
            {msg}
          </div>
        )}

        <button className="btn primary block" disabled={!ready || busy} onClick={submit}>
          {busy ? 'กำลังดำเนินการ...' : mode === 'in' ? 'เข้าสู่ระบบ' : 'สมัครและเริ่มใช้งาน'}
        </button>

        <div className="card tight muted tiny" style={{ marginTop: 18, lineHeight: 1.7 }}>
          อีเมลใช้สำหรับเข้าสู่ระบบเท่านั้น เพื่อนของคุณเห็นแค่ชื่อ อวตาร และรหัสเพื่อน
          ส่วนตำแหน่งจะถูกแชร์เฉพาะตอนที่คุณเปิดสวิตช์แชร์เองเท่านั้น
        </div>
      </div>
    </div>
  )
}
