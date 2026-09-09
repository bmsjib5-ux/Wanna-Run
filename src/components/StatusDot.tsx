type Props = {
  /** ออนไลน์ = เปิดแอปอยู่ภายใน 2 นาทีล่าสุด (จาก heartbeat) */
  online: boolean
  /** วางเป็นจุดเล็กที่มุมอวตาร (ต้องอยู่ใน .avatar-wrap) */
  corner?: boolean
}

export default function StatusDot({ online, corner = true }: Props) {
  const label = online ? 'ออนไลน์' : 'ออฟไลน์'
  return (
    <span
      className={`status-dot${online ? ' on' : ''}${corner ? ' corner' : ''}`}
      role="img"
      aria-label={label}
      title={label}
    />
  )
}
