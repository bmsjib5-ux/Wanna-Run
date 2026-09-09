import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}

/** ระยะที่ต้องลากลงก่อนจะถือว่าตั้งใจปิด */
const CLOSE_DISTANCE = 90

export default function Sheet({ open, title, subtitle, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  // ลากลงเพื่อปิด: จับเฉพาะตอนเนื้อหาในชีทเลื่อนอยู่บนสุด ไม่งั้นปล่อยให้เลื่อนอ่านตามปกติ
  // ต้องผูกด้วย addEventListener เพราะต้อง preventDefault ใน touchmove (React ผูกแบบ passive)
  useEffect(() => {
    const el = ref.current
    if (!open || !el) return
    let startY = 0
    let dragging = false
    let dy = 0

    const onStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      dy = 0
      dragging = el.scrollTop <= 0
      el.style.transition = ''
    }
    const onMove = (e: TouchEvent) => {
      if (!dragging) return
      dy = e.touches[0].clientY - startY
      if (dy <= 0) {
        // ลากขึ้น = อยากเลื่อนเนื้อหา ยกเลิกท่าลากปิด
        dragging = false
        el.style.transform = ''
        return
      }
      e.preventDefault()
      el.style.transform = `translateY(${dy}px)`
    }
    const onEnd = () => {
      if (!dragging) return
      dragging = false
      if (dy > CLOSE_DISTANCE) {
        el.style.transition = 'transform .18s ease-in'
        el.style.transform = 'translateY(110%)'
        window.setTimeout(onClose, 160)
        return
      }
      el.style.transition = 'transform .2s ease-out'
      el.style.transform = ''
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div ref={ref} className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <div className="grow">
            <h2>{title}</h2>
            {subtitle && <div className="sheet-sub">{subtitle}</div>}
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="ปิด">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
