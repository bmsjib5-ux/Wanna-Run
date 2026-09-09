import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  onBack?: () => void
  /** ช่องซ้ายสุด เช่น รูปโปรไฟล์ */
  left?: ReactNode
  right?: ReactNode
}

export default function TopBar({ title, subtitle, onBack, left, right }: Props) {
  return (
    <header className="topbar">
      {left}
      {onBack && (
        <button className="btn ghost sm" onClick={onBack} aria-label="ย้อนกลับ" style={{ padding: '8px 11px' }}>
          ‹
        </button>
      )}
      <div className="grow">
        <h1>{title}</h1>
        {subtitle && <div className="sub">{subtitle}</div>}
      </div>
      {right}
    </header>
  )
}
