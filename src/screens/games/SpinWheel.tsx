import { useState } from 'react'
import { vibrate } from '../../lib/notify'

type Slice = { label: string; detail: string; coins: number; color: string }

const SLICES: Slice[] = [
  { label: '+30 เหรียญ', detail: 'โชคดีไป!', coins: 30, color: '#c6f24e' },
  { label: 'วิ่ง 2 กม.', detail: 'ภารกิจด่วน: ออกไปเก็บ 2 กม. วันนี้', coins: 10, color: '#4ee1c1' },
  { label: '+50 เหรียญ', detail: 'รางวัลใหญ่!', coins: 50, color: '#ffc44d' },
  { label: 'ชวนเพื่อน 1 คน', detail: 'ภารกิจด่วน: ส่งคำชวนวิ่งวันนี้', coins: 15, color: '#7aa2ff' },
  { label: '+10 เหรียญ', detail: 'ได้นิดหน่อยก็ยังดี', coins: 10, color: '#ff9de2' },
  { label: 'สปรินต์ 400 ม.', detail: 'ภารกิจด่วน: ซัดให้สุดหนึ่งรอบสนาม', coins: 20, color: '#ff8f6b' },
  { label: '+20 เหรียญ', detail: 'เก็บเข้ากระเป๋า', coins: 20, color: '#58e08a' },
  { label: 'ยืดเหยียด 5 นาที', detail: 'ภารกิจด่วน: คูลดาวน์ก่อนนอน', coins: 12, color: '#b79dff' },
]

export default function SpinWheel({
  onFinish,
  canSpin,
  nextInLabel,
}: {
  onFinish: (coins: number, label: string) => void
  canSpin: boolean
  nextInLabel: string
}) {
  const [angle, setAngle] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<Slice | null>(null)

  const step = 360 / SLICES.length

  const spin = () => {
    if (spinning || !canSpin) return
    setSpinning(true)
    setResult(null)
    const index = Math.floor(Math.random() * SLICES.length)
    // ให้เข็มบนสุดชี้กลางช่องที่สุ่มได้ หลังหมุนเพิ่มอีก 5 รอบ
    const target = 360 * 5 + (360 - (index * step + step / 2))
    setAngle((a) => a + target - (a % 360))
    window.setTimeout(() => {
      setSpinning(false)
      setResult(SLICES[index])
      vibrate([40, 60, 40])
    }, 4300)
  }

  return (
    <div>
      <div className="wheel-wrap">
        <div className="wheel-needle">🔻</div>
        <div
          className="wheel"
          style={{
            transform: `rotate(${angle}deg)`,
            background: `conic-gradient(${SLICES.map((s, i) => `${s.color} ${i * step}deg ${(i + 1) * step}deg`).join(', ')})`,
          }}
        >
          {SLICES.map((s, i) => (
            <span
              key={s.label}
              className="wheel-label"
              style={{
                transform: `rotate(${i * step + step / 2}deg) translate(28px, -6px)`,
                color: '#12180f',
              }}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {result ? (
        <div className="card center" style={{ marginTop: 14 }}>
          <div className="strong" style={{ fontSize: 20 }}>
            {result.label}
          </div>
          <div className="muted small" style={{ marginTop: 4 }}>
            {result.detail}
          </div>
          <div className="chip on" style={{ marginTop: 10 }}>
            🪙 +{result.coins} เหรียญ
          </div>
        </div>
      ) : (
        <div className="card tight center muted small" style={{ marginTop: 14, lineHeight: 1.7 }}>
          {canSpin ? 'หมุนได้วันละ 1 ครั้ง — ลุ้นเหรียญหรือภารกิจด่วนประจำวัน' : `หมุนครบแล้ววันนี้ · ${nextInLabel}`}
        </div>
      )}

      <div className="stack-8" style={{ marginTop: 14 }}>
        {result ? (
          <button className="btn primary block" onClick={() => onFinish(result.coins, result.label)}>
            รับรางวัล
          </button>
        ) : (
          <button className="btn primary block" onClick={spin} disabled={spinning || !canSpin}>
            {spinning ? 'กำลังหมุน...' : canSpin ? 'หมุนวงล้อ' : 'พรุ่งนี้มาใหม่'}
          </button>
        )}
      </div>
    </div>
  )
}
