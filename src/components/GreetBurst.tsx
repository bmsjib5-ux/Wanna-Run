import { useEffect, useState } from 'react'
import { onGreetReceived } from '../lib/greet'
import { uid } from '../lib/id'

type Burst = { id: string; emoji: string; from: string }

/** อิโมจิลอยขึ้นกลางจอเมื่อเพื่อนทักมา — ดูออกทันทีโดยไม่ต้องอ่าน */
export default function GreetBurst() {
  const [bursts, setBursts] = useState<Burst[]>([])

  useEffect(
    () =>
      onGreetReceived(({ emoji, from }) => {
        const burst = { id: uid('gb_'), emoji, from }
        setBursts((prev) => [...prev, burst].slice(-3))
        window.setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== burst.id)), 2600)
      }),
    [],
  )

  if (bursts.length === 0) return null
  return (
    <div className="greet-burst" aria-live="polite">
      {bursts.map((b) => (
        <div key={b.id} className="greet-burst-item">
          <span className="e">{b.emoji}</span>
          <span className="who">{b.from}</span>
        </div>
      ))}
    </div>
  )
}
