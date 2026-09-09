import { useState } from 'react'
import StatusDot from './StatusDot'

type Props = {
  emoji: string
  photo?: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
  /** ใส่จุดบอกสถานะที่มุม (undefined = ไม่แสดง) */
  online?: boolean
}

/** อวตารของผู้ใช้ ใช้รูปที่อัปไว้ถ้ามี ไม่มีก็ใช้อิโมจิ */
export default function Avatar({ emoji, photo, name, size = 'md', online }: Props) {
  const [broken, setBroken] = useState(false)
  const cls = `avatar${size === 'sm' ? ' sm' : size === 'lg' ? ' lg' : ''}`

  const inner =
    photo && !broken ? (
      <span className={`${cls} has-photo`}>
        <img src={photo} alt={name ? `รูปโปรไฟล์ของ${name}` : 'รูปโปรไฟล์'} onError={() => setBroken(true)} />
      </span>
    ) : (
      <span className={cls}>{emoji}</span>
    )

  if (online === undefined) return inner
  return (
    <span className="avatar-wrap">
      {inner}
      <StatusDot online={online} />
    </span>
  )
}
