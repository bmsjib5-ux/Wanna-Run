import { useState } from 'react'
import { useStore } from '../state/store'
import { requestNotificationPermission } from '../lib/notify'

const AVATARS = ['🏃', '🦊', '🐼', '🐯', '🦄', '🐧', '🐨', '🐸', '🦁', '🐰', '🐻', '🐙']
const GOALS = [10, 20, 30, 50]

export default function Onboarding() {
  const { actions } = useStore()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🏃')
  const [goal, setGoal] = useState(20)

  const finish = async () => {
    await requestNotificationPermission()
    actions.completeOnboarding(name, emoji, goal)
  }

  return (
    <div className="shell">
      <div className="page" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 40px)', paddingBottom: 40 }}>
        {step === 0 && (
          <div className="col" style={{ gap: 18, minHeight: '76dvh', justifyContent: 'center' }}>
            <div className="center">
              <div style={{ fontSize: 74, lineHeight: 1 }}>🏃‍♀️💨</div>
              <h1 style={{ fontSize: 34, margin: '18px 0 6px', letterSpacing: -1 }}>Wanna Run?</h1>
              <p className="muted" style={{ margin: 0, lineHeight: 1.7 }}>
                ชวนเพื่อนออกไปวิ่งด้วยกัน นัดสถานที่ แชร์ตำแหน่ง
                <br />
                จับระยะทาง เก็บภารกิจ และเล่นมินิเกมระหว่างทาง
              </p>
            </div>

            <div className="card" style={{ marginTop: 10 }}>
              <div className="stack-12">
                <Feature icon="👟" title="ชวนเพื่อน & สร้างก๊วน" body="ส่งคำชวนวิ่ง เลือกสถานที่ เวลา และระยะเป้าหมาย" />
                <Feature icon="📍" title="แชร์ตำแหน่งแบบสด" body="ดูว่าเพื่อนอยู่ตรงไหนบนแผนที่ ไม่ต้องโทรตาม" />
                <Feature icon="⏱️" title="จับระยะด้วย GPS" body="ระยะทาง เวลา เพซ และเส้นทางที่วิ่งจริง" />
                <Feature icon="🎮" title="ภารกิจ & มินิเกม" body="เก็บ XP เหรียญ และเลเวลอัพไปพร้อมกัน" />
              </div>
            </div>

            <button className="btn primary block" onClick={() => setStep(1)}>
              เริ่มเลย
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="col" style={{ gap: 4, paddingTop: 20 }}>
            <h1 style={{ fontSize: 26, marginBottom: 4 }}>ตั้งโปรไฟล์นักวิ่ง</h1>
            <p className="muted small" style={{ marginTop: 0, marginBottom: 22 }}>
              ใช้แสดงให้เพื่อนในก๊วนเห็น เปลี่ยนทีหลังได้
            </p>

            <label className="field">
              <span>ชื่อที่อยากให้เพื่อนเห็น</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น เอ๋ย, Run With Ple"
                maxLength={24}
                autoFocus
              />
            </label>

            <div className="field">
              <span>เลือกอวตาร</span>
              <div className="row wrap" style={{ gap: 8 }}>
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    className={`avatar${emoji === a ? '' : ''}`}
                    onClick={() => setEmoji(a)}
                    style={{
                      borderColor: emoji === a ? 'var(--accent)' : 'var(--line)',
                      background: emoji === a ? 'rgba(198,242,78,.14)' : 'var(--surface-2)',
                    }}
                    aria-pressed={emoji === a}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span>เป้าหมายต่อสัปดาห์</span>
              <div className="row" style={{ gap: 8 }}>
                {GOALS.map((g) => (
                  <button
                    key={g}
                    className={`chip ${goal === g ? 'on' : ''}`}
                    onClick={() => setGoal(g)}
                    style={{ flex: 1, justifyContent: 'center', padding: '11px 0' }}
                  >
                    {g} กม.
                  </button>
                ))}
              </div>
            </div>

            <div className="card tight small muted" style={{ marginTop: 6, lineHeight: 1.65 }}>
              ขั้นถัดไปแอปจะขออนุญาต <b>การแจ้งเตือน</b> เพื่อบอกเมื่อเพื่อนชวนวิ่งหรือตอบรับนัด
              และจะขอ <b>ตำแหน่ง</b> ตอนที่คุณเริ่มวิ่งหรือเปิดแผนที่ ข้อมูลทั้งหมดเก็บไว้ในเครื่องของคุณเท่านั้น
            </div>

            <button className="btn primary block" style={{ marginTop: 18 }} onClick={finish} disabled={!name.trim()}>
              เข้าใช้งาน Wanna Run?
            </button>
            <button className="btn ghost block" onClick={() => setStep(0)}>
              ย้อนกลับ
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="row">
      <div className="avatar">{icon}</div>
      <div className="grow">
        <div className="strong" style={{ fontSize: 14.5 }}>
          {title}
        </div>
        <div className="muted small">{body}</div>
      </div>
    </div>
  )
}
