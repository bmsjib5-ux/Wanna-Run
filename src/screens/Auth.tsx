import { useState } from 'react'
import { useAuth } from '../state/auth'
import {
  ChartIcon,
  EyeIcon,
  HeartIcon,
  LockIcon,
  MailIcon,
  ShoeIcon,
  SignInIcon,
  UserPlusIcon,
  UsersIcon,
} from '../components/AuthIcons'

/** จำอีเมลไว้ให้กรอกครั้งต่อไปเร็วขึ้น (เก็บแค่ในเครื่องนี้ ไม่เกี่ยวกับรหัสผ่าน) */
const EMAIL_KEY = 'wanna-run.email'

const FEATURES = [
  { Icon: ShoeIcon, label: 'RUN' },
  { Icon: UsersIcon, label: 'TOGETHER' },
  { Icon: HeartIcon, label: 'BE HEALTHY' },
  { Icon: ChartIcon, label: 'BE BETTER' },
]

export default function Auth() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem(EMAIL_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const emailOk = /\S+@\S+\.\S+/.test(email)
  const ready = emailOk && password.length >= 6

  const rememberEmail = () => {
    try {
      if (remember) localStorage.setItem(EMAIL_KEY, email.trim())
      else localStorage.removeItem(EMAIL_KEY)
    } catch {
      /* ปิด localStorage ไว้ ก็แค่จำไม่ได้ */
    }
  }

  const submit = async () => {
    setBusy(true)
    setMsg(null)
    const err = mode === 'in' ? await signIn(email, password) : await signUp(email, password)
    if (!err) rememberEmail()
    setMsg(err)
    setBusy(false)
  }

  const forgot = async () => {
    if (!emailOk) {
      setMsg('กรอกอีเมลก่อน แล้วกดลืมรหัสผ่านอีกครั้ง')
      return
    }
    setBusy(true)
    const err = await resetPassword(email)
    setMsg(err ?? `ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่ ${email.trim()} แล้ว เช็กกล่องจดหมายได้เลย`)
    setBusy(false)
  }

  const switchTo = (next: 'in' | 'up') => {
    setMode(next)
    setMsg(null)
  }

  return (
    <div className="shell auth">
      <div className="auth-hero" role="img" aria-label="นักวิ่งยามเช้า" />

      <div className="page auth-page">
        <div className="auth-brand">
          <h1>
            Wanna <span>Run?</span>
          </h1>
          <p className="muted">มากกว่าการวิ่ง คือเพื่อนร่วมทาง</p>
        </div>

        <div className="card auth-card">
          <div className="seg" style={{ marginBottom: 16 }}>
            <button className={mode === 'in' ? 'on' : ''} onClick={() => switchTo('in')}>
              เข้าสู่ระบบ
            </button>
            <button className={mode === 'up' ? 'on' : ''} onClick={() => switchTo('up')}>
              สมัครใหม่
            </button>
          </div>

          <label className="auth-input">
            <span className="ico">
              <MailIcon />
            </span>
            <span className="grow">
              <span className="lbl">อีเมล</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </span>
          </label>

          <label className="auth-input">
            <span className="ico">
              <LockIcon />
            </span>
            <span className="grow">
              <span className="lbl">รหัสผ่าน{mode === 'up' ? ' (อย่างน้อย 6 ตัว)' : ''}</span>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === 'Enter' && ready && !busy && void submit()}
              />
            </span>
            <button
              type="button"
              className="eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
            >
              <EyeIcon off={showPassword} />
            </button>
          </label>

          <div className="auth-row">
            <button type="button" className="auth-check" onClick={() => setRemember((v) => !v)} aria-pressed={remember}>
              <span className={`box${remember ? ' on' : ''}`}>{remember ? '✓' : ''}</span>
              จดจำอีเมล
            </button>
            {mode === 'in' && (
              <button type="button" className="auth-link" onClick={() => void forgot()} disabled={busy}>
                ลืมรหัสผ่าน?
              </button>
            )}
          </div>

          {msg && (
            <div className="card tight small auth-msg">{msg}</div>
          )}

          <button className="btn primary block" disabled={!ready || busy} onClick={() => void submit()}>
            {busy ? (
              'กำลังดำเนินการ...'
            ) : (
              <>
                <span className="ico">{mode === 'in' ? <SignInIcon /> : <UserPlusIcon />}</span>
                {mode === 'in' ? 'เข้าสู่ระบบ' : 'สมัครและเริ่มใช้งาน'}
              </>
            )}
          </button>

          <div className="auth-divider">
            <span>หรือ</span>
          </div>

          <button className="btn ghost block auth-alt" onClick={() => switchTo(mode === 'in' ? 'up' : 'in')}>
            <span className="ico">{mode === 'in' ? <UserPlusIcon /> : <SignInIcon />}</span>
            {mode === 'in' ? 'สมัครสมาชิก' : 'กลับไปเข้าสู่ระบบ'}
          </button>
        </div>

        <div className="auth-quote">“สุขภาพดี เริ่มได้จากก้าวแรก”</div>

        <div className="auth-features">
          {FEATURES.map(({ Icon, label }) => (
            <div key={label} className="auth-feature">
              <span className="ico">
                <Icon />
              </span>
              {label}
            </div>
          ))}
        </div>

        <div className="auth-note muted tiny">
          อีเมลใช้สำหรับเข้าสู่ระบบเท่านั้น เพื่อนของคุณเห็นแค่ชื่อ อวตาร และรหัสเพื่อน
          ส่วนตำแหน่งจะถูกแชร์เฉพาะตอนที่คุณเปิดสวิตช์แชร์เองเท่านั้น
        </div>
      </div>
    </div>
  )
}
