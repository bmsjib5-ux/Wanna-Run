import { useEffect, useState } from 'react'
import { onToast } from '../lib/notify'
import { uid } from '../lib/id'

type Item = { id: string; title: string; body: string }

export default function Toaster() {
  const [items, setItems] = useState<Item[]>([])

  useEffect(
    () =>
      onToast(({ title, body }) => {
        const item = { id: uid('ts_'), title, body }
        setItems((prev) => [...prev, item].slice(-3))
        window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== item.id)), 4200)
      }),
    [],
  )

  if (items.length === 0) return null
  return (
    <div className="toasts">
      {items.map((t) => (
        <div key={t.id} className="toast">
          <div className="t">{t.title}</div>
          {t.body && <div className="b">{t.body}</div>}
        </div>
      ))}
    </div>
  )
}
