import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail, ArrowRight } from 'lucide-react'
import { useAuth } from '../state/auth'
import Brand from '../components/Brand'
import { Button, Input } from '../components/ui'

const EMAIL_KEY = 'wanna-run.email'
export default function Auth() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState(() => { try { return localStorage.getItem(EMAIL_KEY) ?? '' } catch { return '' } })
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const submit = async () => {
    if (busy) return
    setBusy(true); setMsg(null)
    try {
      const result = mode === 'in' ? await signIn(email, password) : await signUp(email, password)
      if (!result) {
        try { if (remember) localStorage.setItem(EMAIL_KEY, email.trim()); else localStorage.removeItem(EMAIL_KEY) } catch { /* Optional preference. */ }
      }
      setMsg(result)
    } catch { setMsg('เชื่อมต่อไม่ได้ ลองอีกครั้งนะ') }
    finally { setBusy(false) }
  }
  const forgot = async () => {
    if (!/\S+@\S+\.\S+/.test(email)) { setMsg('กรอกอีเมลก่อน แล้วกดลืมรหัสผ่านอีกครั้ง'); return }
    setBusy(true)
    try { setMsg(await resetPassword(email) ?? 'ส่งลิงก์ตั้งรหัสผ่านใหม่แล้ว เช็กกล่องจดหมายได้เลย') }
    catch { setMsg('ส่งลิงก์ไม่สำเร็จ ลองอีกครั้งนะ') }
    finally { setBusy(false) }
  }
  return <div className="shell signin-screen">
    <div className="signin-photo"><span>วิ่งด้วยกัน<br />ไปได้ไกลกว่าเดิม</span></div>
    <main className="signin-content"><Brand />
      <form className="signin-form" onSubmit={e => { e.preventDefault(); void submit() }}>
        <h2>{mode === 'in' ? 'ยินดีต้อนรับกลับมา' : 'เริ่มก้าวแรกไปด้วยกัน'}</h2>
        <label className="signin-field"><span>อีเมล</span><div><Mail size={19} aria-hidden="true" /><Input type="email" name="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} /></div></label>
        <label className="signin-field"><span>รหัสผ่าน{mode === 'up' ? ' (อย่างน้อย 6 ตัวอักษร)' : ''}</span><div><LockKeyhole size={19} aria-hidden="true" /><Input type={show ? 'text' : 'password'} name="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={6} required placeholder="กรอกรหัสผ่าน" value={password} onChange={e => setPassword(e.target.value)} /><Button variant="ghost" size="icon" aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} aria-pressed={show} onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</Button></div></label>
        <div className="signin-options"><label><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> จดจำอีเมล</label><button type="button" disabled={busy} onClick={() => void forgot()}>ลืมรหัสผ่าน?</button></div>
        <p className="signin-message" role="status" aria-live="polite">{msg}</p>
        <Button type="submit" disabled={busy}>{busy ? 'กำลังดำเนินการ…' : mode === 'in' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}<ArrowRight size={18} /></Button>
      </form>
      <div className="signin-switch">{mode === 'in' ? 'ยังไม่มีบัญชี?' : 'มีบัญชีอยู่แล้ว?'} <button onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null) }}>{mode === 'in' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</button></div>
      <p className="signin-footer">มากกว่าการวิ่ง คือการได้ไปด้วยกัน</p>
    </main>
  </div>
}
