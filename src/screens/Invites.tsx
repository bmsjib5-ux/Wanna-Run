import { useEffect, useMemo, useState } from 'react'
import type { Nav } from '../App'
import TopBar from '../components/TopBar'
import Sheet from '../components/Sheet'
import InviteCard from '../components/InviteCard'
import PlacePicker from '../components/PlacePicker'
import Map from '../components/Map'
import Avatar from '../components/Avatar'
import { useStore } from '../state/store'
import { fromLocalInput, toLocalInput, whenLabel } from '../lib/format'
import { PLACES } from '../lib/seed'
import { directionsUrl } from '../lib/geo'
import type { ID, Place, RunInvite } from '../types'

const TARGETS = [3, 5, 10, 15, 21]

export default function Invites({ nav, openNew }: { nav: Nav; openNew?: boolean }) {
  const { state, actions } = useStore()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [creating, setCreating] = useState(!!openNew)
  const [detail, setDetail] = useState<RunInvite | null>(null)

  const now = Date.now()
  const list = useMemo(() => {
    const sorted = [...state.invites].sort((a, b) => a.startAt - b.startAt)
    return tab === 'upcoming'
      ? sorted.filter((i) => i.startAt > now - 3600_000 && i.status !== 'cancelled')
      : sorted.filter((i) => i.startAt <= now - 3600_000 || i.status === 'cancelled').reverse()
  }, [state.invites, tab, now])

  // ให้ข้อมูลใน sheet อัปเดตตามเมื่อเพื่อนตอบรับ
  const live = detail ? (state.invites.find((i) => i.id === detail.id) ?? detail) : null

  return (
    <>
      <TopBar
        title="ชวนวิ่ง"
        subtitle="นัดกับเพื่อน เลือกที่ เลือกเวลา"
        onBack={() => nav('home')}
        right={
          <button className="btn primary sm" onClick={() => setCreating(true)}>
            + ชวน
          </button>
        }
      />

      <div className="seg">
        <button className={tab === 'upcoming' ? 'on' : ''} onClick={() => setTab('upcoming')}>
          กำลังจะถึง
        </button>
        <button className={tab === 'past' ? 'on' : ''} onClick={() => setTab('past')}>
          ที่ผ่านมา
        </button>
      </div>

      <div className="stack-12" style={{ marginTop: 14 }}>
        {list.length === 0 ? (
          <div className="card empty">
            <div className="big">📅</div>
            {tab === 'upcoming' ? 'ยังไม่มีนัดวิ่ง สร้างคำชวนใหม่ได้เลย' : 'ยังไม่มีประวัตินัดวิ่ง'}
          </div>
        ) : (
          list.map((iv) => <InviteCard key={iv.id} invite={iv} friends={state.friends} onOpen={() => setDetail(iv)} />)
        )}
      </div>

      <CreateInvite open={creating} onClose={() => setCreating(false)} />

      <Sheet open={!!live} title={live?.title ?? ''} subtitle={live ? whenLabel(live.startAt) : ''} onClose={() => setDetail(null)}>
        {live && (
          <>
            <Map
              center={{ lat: live.place.lat, lng: live.place.lng }}
              zoom={15}
              pins={[{ id: 'p', pos: { lat: live.place.lat, lng: live.place.lng }, emoji: '📍', label: live.place.name }]}
            />
            <div className="card" style={{ marginTop: 12 }}>
              <div className="row">
                <span className="avatar">🌳</span>
                <div className="grow">
                  <div className="strong" style={{ fontSize: 14.5 }}>
                    {live.place.name}
                  </div>
                  <div className="muted small">{live.place.area}</div>
                </div>
                <span className="chip">🎯 {live.targetKm} กม.</span>
              </div>
              {live.note && <div className="small muted" style={{ marginTop: 10, lineHeight: 1.6 }}>“{live.note}”</div>}
              <a
                className="btn block sm"
                style={{ marginTop: 12, textDecoration: 'none' }}
                href={directionsUrl({ lat: live.place.lat, lng: live.place.lng })}
                target="_blank"
                rel="noopener noreferrer"
              >
                🧭 นำทางไปจุดนัดพบด้วย Google Maps
              </a>
            </div>

            <div className="section-title">ใครไปบ้าง</div>
            <div className="stack-8">
              <div className="card tight row">
                <Avatar emoji={state.profile.emoji} photo={state.profile.avatarUrl} name={state.profile.name} />
                <span className="grow strong" style={{ fontSize: 14.5 }}>
                  {state.profile.name}
                </span>
                <span className={`chip ${live.hostIsMe || live.myReply === 'going' ? 'ok' : 'warn'}`}>
                  {live.hostIsMe ? 'เจ้าภาพ' : live.myReply === 'going' ? 'ไป' : live.myReply === 'maybe' ? 'อาจจะ' : live.myReply === 'declined' ? 'ไม่ไป' : 'ยังไม่ตอบ'}
                </span>
              </div>
              {state.friends
                .filter((f) => live.inviteeIds.includes(f.id) || live.replies[f.id] || f.id === live.hostId)
                .map((f) => {
                  const r = live.replies[f.id]
                  return (
                    <div key={f.id} className="card tight row">
                      <Avatar emoji={f.emoji} photo={f.avatarUrl} name={f.name} />
                      <span className="grow strong" style={{ fontSize: 14.5 }}>
                        {f.name}
                        {f.id === live.hostId && <span className="muted small"> · เจ้าภาพ</span>}
                      </span>
                      <span className={`chip ${r === 'going' ? 'ok' : r === 'maybe' ? 'warn' : r === 'declined' ? 'bad' : ''}`}>
                        {r === 'going' ? 'ไป' : r === 'maybe' ? 'อาจจะ' : r === 'declined' ? 'ไม่ไป' : 'รอตอบ'}
                      </span>
                    </div>
                  )
                })}
            </div>

            {!live.hostIsMe && live.status === 'open' && (
              <>
                <div className="section-title">ตอบคำชวน</div>
                <div className="row" style={{ gap: 8 }}>
                  {(['going', 'maybe', 'declined'] as const).map((r) => (
                    <button
                      key={r}
                      className={`btn grow sm ${live.myReply === r ? 'primary' : ''}`}
                      onClick={() => actions.replyInvite(live.id, r)}
                    >
                      {r === 'going' ? '✅ ไป' : r === 'maybe' ? '🤔 อาจจะ' : '❌ ไม่ไป'}
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
                  nav('run', { inviteId: live.id })
                }}
              >
                🏃 เริ่มวิ่งตามนัดนี้
              </button>
              {live.hostIsMe && live.status === 'open' && (
                <button
                  className="btn danger block"
                  onClick={() => {
                    actions.cancelInvite(live.id)
                    setDetail(null)
                  }}
                >
                  ยกเลิกนัด
                </button>
              )}
            </div>
          </>
        )}
      </Sheet>
    </>
  )
}

function CreateInvite({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, actions } = useStore()
  const friends = state.friends.filter((f) => f.status === 'friend')

  const [title, setTitle] = useState('')
  const [place, setPlace] = useState<Place>(PLACES[0])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [when, setWhen] = useState(() => toLocalInput(defaultStart()))
  const [target, setTarget] = useState(5)
  const [note, setNote] = useState('')
  const [groupId, setGroupId] = useState<ID | ''>('')
  const [ids, setIds] = useState<ID[]>([])

  useEffect(() => {
    if (!open) return
    setWhen(toLocalInput(defaultStart()))
  }, [open])

  const pickGroup = (gid: ID | '') => {
    setGroupId(gid)
    const group = state.groups.find((g) => g.id === gid)
    if (group) setIds(group.memberIds.filter((id) => friends.some((f) => f.id === id)))
  }

  const toggle = (id: ID) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const submit = () => {
    actions.createInvite({
      title: title || `ไปวิ่งที่${place.name}กัน`,
      place,
      startAt: fromLocalInput(when),
      targetKm: target,
      note,
      groupId: groupId || undefined,
      inviteeIds: ids,
    })
    setTitle('')
    setNote('')
    setIds([])
    setGroupId('')
    onClose()
  }

  return (
    <>
      <Sheet open={open} title="ชวนเพื่อนวิ่ง" subtitle="เลือกที่ เวลา ระยะ แล้วส่งถึงก๊วนได้เลย" onClose={onClose}>
        <label className="field">
          <span>หัวข้อ</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`ไปวิ่งที่${place.name}กัน`} maxLength={60} />
        </label>

        <div className="field">
          <span>สถานที่</span>
          <button className="list-btn" onClick={() => setPickerOpen(true)}>
            <span className="avatar">🌳</span>
            <span className="grow">
              <span className="strong" style={{ display: 'block', fontSize: 14.5 }}>
                {place.name}
              </span>
              <span className="muted small truncate" style={{ display: 'block' }}>
                {place.area}
              </span>
            </span>
            <span className="chip">เปลี่ยน</span>
          </button>
        </div>

        <label className="field">
          <span>วันและเวลา</span>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>

        <div className="field">
          <span>ระยะเป้าหมาย</span>
          <div className="row" style={{ gap: 6 }}>
            {TARGETS.map((t) => (
              <button
                key={t}
                className={`chip ${target === t ? 'on' : ''}`}
                onClick={() => setTarget(t)}
                style={{ flex: 1, justifyContent: 'center', padding: '10px 0' }}
              >
                {t} กม.
              </button>
            ))}
          </div>
        </div>

        {state.groups.length > 0 && (
          <label className="field">
            <span>ชวนทั้งกลุ่ม (ไม่บังคับ)</span>
            <select value={groupId} onChange={(e) => pickGroup(e.target.value)}>
              <option value="">— เลือกรายคน —</option>
              {state.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="field">
          <span>ชวนใครบ้าง ({ids.length})</span>
          {friends.length === 0 ? (
            <div className="muted small">ยังไม่มีเพื่อนในก๊วน เพิ่มเพื่อนก่อนนะ</div>
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

        <label className="field">
          <span>ข้อความถึงเพื่อน</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="เจอกันหน้าประตู 3 นะ ใครสายวิ่งตามมา 😆" maxLength={160} />
        </label>

        <button className="btn primary block" onClick={submit} disabled={ids.length === 0}>
          ส่งคำชวนถึง {ids.length} คน
        </button>
      </Sheet>

      <PlacePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={setPlace} />
    </>
  )
}

/** ค่าเริ่มต้น: พรุ่งนี้ 06:00 */
function defaultStart(): number {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(6, 0, 0, 0)
  return d.getTime()
}
