import { useCallback, useEffect, useRef, useState } from 'react'
import { vibrate } from '../../lib/notify'

type Blip = { id: number; x: number; y: number; bomb: boolean; born: number }

const DURATION = 25_000
const SPAWN_MS = 620

export default function TapSprint({ onFinish, best }: { onFinish: (score: number) => void; best: number }) {
  const [phase, setPhase] = useState<'idle' | 'play' | 'done'>('idle')
  const [blips, setBlips] = useState<Blip[]>([])
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [left, setLeft] = useState(DURATION)
  const seq = useRef(0)
  const timers = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearInterval(t))
    timers.current = []
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const startGame = () => {
    clearTimers()
    setScore(0)
    setCombo(0)
    setBlips([])
    setLeft(DURATION)
    setPhase('play')
    const startedAt = Date.now()

    timers.current.push(
      window.setInterval(() => {
        seq.current += 1
        const blip: Blip = {
          id: seq.current,
          x: 6 + Math.random() * 74,
          y: 6 + Math.random() * 72,
          bomb: Math.random() < 0.22,
          born: Date.now(),
        }
        setBlips((prev) => [...prev.filter((b) => Date.now() - b.born < 1500), blip])
      }, SPAWN_MS),
    )

    timers.current.push(
      window.setInterval(() => {
        const remain = DURATION - (Date.now() - startedAt)
        setLeft(Math.max(0, remain))
        setBlips((prev) => prev.filter((b) => Date.now() - b.born < 1500))
        if (remain <= 0) {
          clearTimers()
          setBlips([])
          setPhase('done')
        }
      }, 100),
    )
  }

  const hit = (b: Blip) => {
    setBlips((prev) => prev.filter((x) => x.id !== b.id))
    if (b.bomb) {
      setCombo(0)
      setScore((s) => Math.max(0, s - 15))
      vibrate([120])
      return
    }
    setCombo((c) => {
      const next = c + 1
      setScore((s) => s + 10 + Math.min(20, next * 2))
      return next
    })
    vibrate(15)
  }

  if (phase === 'idle' || phase === 'done') {
    return (
      <div>
        <div className="card center">
          <div style={{ fontSize: 46 }}>{phase === 'done' ? '🏁' : '⚡'}</div>
          {phase === 'done' ? (
            <>
              <div className="strong" style={{ fontSize: 30, marginTop: 8 }}>
                {score}
              </div>
              <div className="muted small">คะแนนรอบนี้ · สถิติเดิม {best}</div>
              {score > best && <div className="chip on" style={{ marginTop: 10 }}>🎉 ทำลายสถิติ!</div>}
            </>
          ) : (
            <>
              <div className="strong" style={{ fontSize: 18, marginTop: 8 }}>
                แตะให้ทันจังหวะ
              </div>
              <div className="muted small" style={{ marginTop: 6, lineHeight: 1.7 }}>
                แตะ 🟢 ให้ได้มากที่สุดใน 25 วินาที ต่อคอมโบยิ่งได้แต้มเยอะ
                <br />
                ระวัง 💣 กดโดนแล้วเสียแต้มและคอมโบหลุด
              </div>
              <div className="muted small" style={{ marginTop: 8 }}>
                สถิติสูงสุดของคุณ: <b style={{ color: 'var(--accent)' }}>{best}</b>
              </div>
            </>
          )}
        </div>
        <div className="stack-8" style={{ marginTop: 14 }}>
          <button className="btn primary block" onClick={startGame}>
            {phase === 'done' ? 'เล่นอีกครั้ง' : 'เริ่มเล่น'}
          </button>
          {phase === 'done' && (
            <button className="btn block" onClick={() => onFinish(score)}>
              รับรางวัลและปิด
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="chip on">คะแนน {score}</span>
        <span className="chip">คอมโบ x{combo}</span>
        <span className="grow" />
        <span className="chip warn">{(left / 1000).toFixed(1)} วิ</span>
      </div>
      <div className="bar" style={{ marginBottom: 10 }}>
        <i style={{ width: `${(left / DURATION) * 100}%` }} />
      </div>
      <div className="arena">
        {blips.map((b) => (
          <button
            key={b.id}
            className={`target ${b.bomb ? 'bomb' : ''}`}
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
            onPointerDown={() => hit(b)}
          >
            {b.bomb ? '💣' : '🏃'}
          </button>
        ))}
      </div>
    </div>
  )
}
