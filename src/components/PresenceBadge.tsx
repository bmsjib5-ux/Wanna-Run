import { isOnline, serverNow, type Presence } from '../lib/presence'
import { agoLabel } from '../lib/format'

/** ป้ายสถานะขนาดอ่านง่าย: "● ออนไลน์" หรือ "○ 5 นาทีที่แล้ว" */
export default function PresenceBadge({ presence, now }: { presence: Presence; now: number }) {
  const online = isOnline(presence, now)
  // agoLabel เทียบกับนาฬิกาเครื่อง จึงแปลงเวลาเซิร์ฟเวอร์กลับก่อน
  const ago = agoLabel(presence.lastActiveAt - (serverNow(now) - now))
  return (
    <span className={`presence${online ? ' on' : ''}`} aria-label={online ? 'ออนไลน์' : `ออฟไลน์ · ออนไลน์ล่าสุด ${ago}`}>
      <i />
      {online ? 'ออนไลน์' : ago}
    </span>
  )
}
