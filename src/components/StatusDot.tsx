type Props = {
  /** ออนไลน์ = กำลังแชร์ตำแหน่งให้ก๊วนเห็นอยู่ */
  online: boolean
  /** วางเป็นจุดเล็กที่มุมอวตาร (ต้องอยู่ใน .avatar-wrap) */
  corner?: boolean
}

export default function StatusDot({ online, corner = true }: Props) {
  const label = online ? 'ออนไลน์ · กำลังแชร์ตำแหน่ง' : 'ออฟไลน์'
  return (
    <span
      className={`status-dot${online ? ' on' : ''}${corner ? ' corner' : ''}`}
      role="img"
      aria-label={label}
      title={label}
    />
  )
}
