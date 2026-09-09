import { useState } from 'react'
import { useAuth } from '../state/auth'
import { EyeIcon, LockIcon } from '../components/AuthIcons'

/** หน้าตั้งรหัสผ่านใหม่ หลังกดลิงก์ที่ส่งไปทางอีเมล */
export default function ResetPassword() {
  const { recovery, recoveryError, updatePassword, endRecovery, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const tooShort = password.length > 0 && password.length < 6
  const mismatch = confirm.length > 0 && confirm !== password
  const ready = password.length >= 6 && confirm === password

  const save = async () => {
    setBusy(true)
    setMsg(null)
    const err = await updatePassword(password)
    setBusy(false)
    if (err) {
      setMsg(err)
      return
    }
    setDone(true)
  }

  const failed = recovery === 'failed'

  return (
    <div className="shell auth">
      <div className="auth-hero" role="img" aria-label="นักวิ่งยามเช้า" />

      <div className="page auth-page">
        <div className="auth-brand">
          <h1>
            ตั้ง<span>รหัสใหม่</span>
          </h1>
          <p className="muted">ใส่รหัสผ่านใหม่ที่จะใช้เข้าสู่ระบบต่อจากนี้</p>
        </div>

        <div className="card auth-card">
          {failed ? (
            <>
              <div className="card tight small auth-msg">{recoveryError ?? 'ลิงก์ใช้ไม่ได้'}</div>
              <button
                className="btn primary block"
                onClick={() => {
                  void signOut()
                  endRecovery()
                }}
              >
                กลับไปหน้าเข้าสู่ระบบ
              </button>
            </>
          ) : done ? (
            <>
              <div className="center" style={{ padding: '6px 0 14px' }}>
                <div style={{ fontSize: 46 }}>🎉</div>
                <div className="strong" style={{ marginTop: 10, fontSize: 15 }}>
                  เปลี่ยนรหัสผ่านเรียบร้อย
                </div>
                <div className="muted small" style={{ marginTop: 6, lineHeight: 1.7 }}>
                  ครั้งต่อไปใช้รหัสใหม่นี้เข้าสู่ระบบได้เลย
                </div>
              </div>
              <button className="btn primary block" onClick={endRecovery}>
                เริ่มใช้งาน
              </button>
            </>
          ) : (
            <>
              <label className="auth-input">
                <span className="ico">
                  <LockIcon />
                </span>
                <span className="grow">
                  <span className="lbl">รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)</span>
                  <input
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </span>
                <button
                  type="button"
                  className="eye"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  <EyeIcon off={show} />
                </button>
              </label>

              <label className="auth-input">
                <span className="ico">
                  <LockIcon />
                </span>
                <span className="grow">
                  <span className="lbl">ยืนยันรหัสผ่านใหม่</span>
                  <input
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    onKeyDown={(e) => e.key === 'Enter' && ready && !busy && void save()}
                  />
                </span>
              </label>

              {(tooShort || mismatch || msg) && (
                <div className="card tight small auth-msg">
                  {msg ?? (tooShort ? 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัว' : 'รหัสผ่านสองช่องยังไม่ตรงกัน')}
                </div>
              )}

              <button className="btn primary block" disabled={!ready || busy} onClick={() => void save()}>
                {busy ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
              </button>

              <div className="auth-divider">
                <span>หรือ</span>
              </div>

              <button
                className="btn ghost block auth-alt"
                onClick={() => {
                  void signOut()
                  endRecovery()
                }}
              >
                ยกเลิก แล้วกลับไปเข้าสู่ระบบ
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
