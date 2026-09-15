import { useMemo, useState, type CSSProperties } from 'react'
import type { Friend, InviteReply, Profile, RunInvite } from '../types'
import { whenLabel } from '../lib/format'
import Avatar from './Avatar'
import { ArrowUpRight, MapPin, CalendarDays } from 'lucide-react'

type Props = {
  invite: RunInvite
  friends: Friend[]
  /** โปรไฟล์ของเรา ใช้แสดงรูปตัวเองรวมในกลุ่มด้วย */
  me: Profile
  compact?: boolean
  onOpen?: () => void
  children?: React.ReactNode
}

export type InviteMember = {
  id: string
  name: string
  emoji: string
  avatarUrl?: string
  reply?: InviteReply
  isHost: boolean
  isMe: boolean
}

export function goingCount(invite: RunInvite): number {
  const others = Object.values(invite.replies).filter((r) => r === 'going').length
  const me = invite.hostIsMe || invite.myReply === 'going' ? 1 : 0
  return others + me
}

/**
 * ทุกคนที่เกี่ยวข้องกับคำชวนนี้ เรียงเจ้าภาพก่อน แล้วคนที่ตอบว่าไป
 * เจ้าภาพนับว่าไปเสมอ เพราะเป็นคนนัดเอง
 */
export function inviteMembers(invite: RunInvite, friends: Friend[], me: Profile): InviteMember[] {
  const byId = new Map(friends.map((f) => [f.id, f]))
  const list: InviteMember[] = []

  list.push({
    id: me.id,
    name: me.name,
    emoji: me.emoji,
    avatarUrl: me.avatarUrl,
    reply: invite.hostIsMe ? 'going' : invite.myReply,
    isHost: invite.hostIsMe,
    isMe: true,
  })

  const ids = [...new Set([invite.hostId, ...invite.inviteeIds, ...Object.keys(invite.replies)].filter(Boolean))] as string[]
  for (const id of ids) {
    if (id === me.id) continue
    const f = byId.get(id)
    if (!f) continue
    list.push({
      id,
      name: f.name,
      emoji: f.emoji,
      avatarUrl: f.avatarUrl,
      reply: id === invite.hostId ? 'going' : invite.replies[id],
      isHost: id === invite.hostId,
      isMe: false,
    })
  }

  const rank = (m: InviteMember) => (m.isHost ? 0 : m.reply === 'going' ? 1 : m.reply === 'maybe' ? 2 : m.reply === 'declined' ? 4 : 3)
  return list.sort((a, b) => rank(a) - rank(b))
}

const MAX_FACES = 6

export default function InviteCard({ invite, friends, me, compact, onOpen, children }: Props) {
  const [goingOnly, setGoingOnly] = useState(false)
  const members = useMemo(() => inviteMembers(invite, friends, me), [invite, friends, me])
  const going = members.filter((m) => m.reply === 'going')
  const shown = goingOnly ? going : members
  const soon = invite.startAt - Date.now() < 24 * 3600_000 && invite.startAt > Date.now()

  return (
    <div className="card invite-design-card">
      <div
        className={`invite-cover${invite.bannerUrl ? ' has-photo' : ''}`}
        // ส่งรูปผ่านตัวแปร CSS เพื่อให้เงาไล่ระดับใน stylesheet ยังซ้อนอยู่ข้างบน
        style={invite.bannerUrl ? ({ '--banner': `url("${invite.bannerUrl}")` } as CSSProperties) : undefined}
      >
        <span>{invite.targetKm} KM</span>
      </div>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <div className="row" style={{ gap: 6 }}>
            <div className="strong truncate" style={{ fontSize: 15 }}>
              {onOpen ? <button className="invite-title" onClick={onOpen}>{invite.title}<ArrowUpRight size={17} /></button> : invite.title}
            </div>
            {invite.status === 'cancelled' && <span className="chip bad">ยกเลิกแล้ว</span>}
            {invite.status === 'open' && soon && <span className="chip warn">ใกล้ถึงเวลา</span>}
          </div>
          <div className="muted small" style={{ marginTop: 3 }}>
            <MapPin size={14} aria-hidden="true" /> {invite.place.name}
          </div>
          <div className="muted small">
            <CalendarDays size={14} aria-hidden="true" /> {whenLabel(invite.startAt)} · {invite.targetKm} กม.
          </div>
        </div>
      </div>

      {!compact && invite.note && (
        <div className="small" style={{ marginTop: 10, color: 'var(--text)', opacity: 0.85, lineHeight: 1.6 }}>
          “{invite.note}”
        </div>
      )}

      <div className="row wrap" style={{ marginTop: 12, gap: 8 }}>
        <div className="face-pile">
          {shown.slice(0, MAX_FACES).map((m) => (
            <span
              key={m.id}
              className={`face${m.reply === 'going' ? ' going' : ''}${m.reply === 'declined' ? ' out' : ''}`}
              title={`${m.name}${m.isHost ? ' · เจ้าภาพ' : ''} — ${replyWord(m.reply)}`}
            >
              <Avatar emoji={m.emoji} photo={m.avatarUrl} name={m.name} size="sm" />
            </span>
          ))}
          {shown.length > MAX_FACES && <span className="face more">+{shown.length - MAX_FACES}</span>}
          {shown.length === 0 && <span className="muted small">ยังไม่มีใครตอบรับ</span>}
        </div>

        {/* แตะเพื่อสลับระหว่างทุกคนในกลุ่ม กับเฉพาะคนที่ไป */}
        <button
          className={`chip ${goingOnly ? 'ok' : ''}`}
          onClick={() => setGoingOnly((v) => !v)}
          aria-pressed={goingOnly}
        >
          {goingOnly ? `ไป ${going.length} คน` : `ทั้งกลุ่ม ${members.length} คน`}
        </button>

        {invite.hostIsMe ? (
          <span className="chip">คุณเป็นคนชวน</span>
        ) : invite.myReply ? (
          <span className={`chip ${invite.myReply === 'going' ? 'ok' : invite.myReply === 'maybe' ? 'warn' : 'bad'}`}>
            {invite.myReply === 'going' ? 'คุณตอบรับแล้ว' : invite.myReply === 'maybe' ? 'คุณตอบว่าอาจจะ' : 'คุณปฏิเสธ'}
          </span>
        ) : (
          <span className="chip warn">ยังไม่ตอบ</span>
        )}
      </div>

      {children}
    </div>
  )
}

function replyWord(reply?: InviteReply): string {
  return reply === 'going' ? 'ไป' : reply === 'maybe' ? 'อาจจะ' : reply === 'declined' ? 'ไม่ไป' : 'ยังไม่ตอบ'
}
