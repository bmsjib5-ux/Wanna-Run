import { useState } from 'react'
import type { Nav } from '../App'
import TopBar from '../components/TopBar'
import Sheet from '../components/Sheet'
import Avatar from '../components/Avatar'
import { useStore } from '../state/store'
import { shortDate } from '../lib/format'
import type { Group, ID } from '../types'

const GROUP_EMOJI = ['🌅', '🏅', '⚡', '🌙', '🔥', '🌊', '🏔️', '🎽', '🐢', '🦅']

export default function Groups({ nav, focusId }: { nav: Nav; focusId?: string }) {
  const { state, actions } = useStore()
  const [creating, setCreating] = useState(false)
  const [detail, setDetail] = useState<Group | null>(
    focusId ? (state.groups.find((g) => g.id === focusId) ?? null) : null,
  )

  const friends = state.friends.filter((f) => f.status === 'friend')

  return (
    <>
      <TopBar
        title="กลุ่มวิ่ง"
        subtitle={`${state.groups.length} กลุ่ม`}
        onBack={() => nav('home')}
        right={
          <button className="btn primary sm" onClick={() => setCreating(true)}>
            + สร้าง
          </button>
        }
      />

      {state.groups.length === 0 ? (
        <div className="card empty">
          <div className="big">👥</div>
          ยังไม่มีกลุ่ม — สร้างก๊วนแรกของคุณเลย
          <div style={{ marginTop: 14 }}>
            <button className="btn primary sm" onClick={() => setCreating(true)}>
              สร้างกลุ่ม
            </button>
          </div>
        </div>
      ) : (
        <div className="stack-8">
          {state.groups.map((g) => {
            const members = friends.filter((f) => g.memberIds.includes(f.id))
            return (
              <button key={g.id} className="list-btn" onClick={() => setDetail(g)}>
                <span className="avatar">{g.emoji}</span>
                <span className="grow">
                  <span className="strong" style={{ display: 'block', fontSize: 14.5 }}>
                    {g.name}
                  </span>
                  <span className="muted small truncate" style={{ display: 'block' }}>
                    {members.length + 1} คน · {g.description || `สร้างเมื่อ ${shortDate(g.createdAt)}`}
                  </span>
                </span>
                <span className="row" style={{ gap: 0 }}>
                  {members.slice(0, 3).map((m, i) => (
                    <span key={m.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                      <Avatar emoji={m.emoji} photo={m.avatarUrl} name={m.name} size="sm" />
                    </span>
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <GroupForm
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(name, emoji, desc, ids) => {
          actions.createGroup(name, emoji, desc, ids)
          setCreating(false)
        }}
        friends={friends}
      />

      <Sheet
        open={!!detail}
        title={detail ? `${detail.emoji} ${detail.name}` : ''}
        subtitle={detail?.description}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <>
            <div className="section-title" style={{ marginTop: 4 }}>
              สมาชิก
            </div>
            <div className="stack-8">
              <div className="card tight row">
                <Avatar emoji={state.profile.emoji} photo={state.profile.avatarUrl} name={state.profile.name} />
                <span className="grow strong" style={{ fontSize: 14.5 }}>
                  {state.profile.name}
                </span>
                <span className="chip on">คุณ</span>
              </div>
              {friends
                .filter((f) => detail.memberIds.includes(f.id))
                .map((f) => (
                  <div key={f.id} className="card tight row">
                    <Avatar emoji={f.emoji} photo={f.avatarUrl} name={f.name} />
                    <span className="grow">
                      <span className="strong" style={{ display: 'block', fontSize: 14.5 }}>
                        {f.name}
                      </span>
                      <span className="muted small">{f.totalKm} กม.</span>
                    </span>
                    <button
                      className="btn xs"
                      onClick={() => {
                        const next = detail.memberIds.filter((id) => id !== f.id)
                        actions.updateGroup(detail.id, { memberIds: next })
                        setDetail({ ...detail, memberIds: next })
                      }}
                    >
                      นำออก
                    </button>
                  </div>
                ))}
            </div>

            {friends.some((f) => !detail.memberIds.includes(f.id)) && (
              <>
                <div className="section-title">เพิ่มสมาชิก</div>
                <div className="row wrap" style={{ gap: 8 }}>
                  {friends
                    .filter((f) => !detail.memberIds.includes(f.id))
                    .map((f) => (
                      <button
                        key={f.id}
                        className="chip"
                        onClick={() => {
                          const next = [...detail.memberIds, f.id]
                          actions.updateGroup(detail.id, { memberIds: next })
                          setDetail({ ...detail, memberIds: next })
                        }}
                      >
                        {f.emoji} {f.name} +
                      </button>
                    ))}
                </div>
              </>
            )}

            <div className="stack-8" style={{ marginTop: 18 }}>
              <button
                className="btn primary block"
                onClick={() => {
                  setDetail(null)
                  nav('invites', { new: '1' })
                }}
              >
                📣 ชวนทั้งกลุ่มไปวิ่ง
              </button>
              <button
                className="btn danger block"
                onClick={() => {
                  actions.deleteGroup(detail.id)
                  setDetail(null)
                }}
              >
                ลบกลุ่มนี้
              </button>
            </div>
          </>
        )}
      </Sheet>
    </>
  )
}

function GroupForm({
  open,
  onClose,
  onSubmit,
  friends,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (name: string, emoji: string, desc: string, ids: ID[]) => void
  friends: Array<{ id: ID; name: string; emoji: string }>
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(GROUP_EMOJI[0])
  const [desc, setDesc] = useState('')
  const [ids, setIds] = useState<ID[]>([])

  const toggle = (id: ID) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <Sheet open={open} title="สร้างกลุ่มวิ่ง" subtitle="รวมเพื่อนไว้ที่เดียว นัดทีเดียวถึงทุกคน" onClose={onClose}>
      <div className="field">
        <span>ไอคอนกลุ่ม</span>
        <div className="row wrap" style={{ gap: 8 }}>
          {GROUP_EMOJI.map((e) => (
            <button
              key={e}
              className="avatar sm"
              onClick={() => setEmoji(e)}
              style={{
                borderColor: emoji === e ? 'var(--accent)' : 'var(--line)',
                background: emoji === e ? 'rgba(198,242,78,.14)' : 'var(--surface-2)',
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>ชื่อกลุ่ม</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ก๊วนวิ่งเช้าสวนลุม" maxLength={40} />
      </label>

      <label className="field">
        <span>รายละเอียด (ไม่บังคับ)</span>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="นัดประจำ วัน/เวลา หรือกติกาของก๊วน" maxLength={140} />
      </label>

      <div className="field">
        <span>เลือกสมาชิก ({ids.length})</span>
        {friends.length === 0 ? (
          <div className="muted small">ยังไม่มีเพื่อน เพิ่มเพื่อนก่อนแล้วค่อยกลับมาสร้างกลุ่มได้</div>
        ) : (
          <div className="row wrap" style={{ gap: 8 }}>
            {friends.map((f) => (
              <button key={f.id} className={`chip ${ids.includes(f.id) ? 'on' : ''}`} onClick={() => toggle(f.id)}>
                {f.emoji} {f.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        className="btn primary block"
        disabled={!name.trim()}
        onClick={() => {
          onSubmit(name, emoji, desc, ids)
          setName('')
          setDesc('')
          setIds([])
        }}
      >
        สร้างกลุ่ม
      </button>
    </Sheet>
  )
}
