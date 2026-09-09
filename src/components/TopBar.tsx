import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: ReactNode
}

export default function TopBar({ title, subtitle, onBack, right }: Props) {
  return (
    <header className="topbar">
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
