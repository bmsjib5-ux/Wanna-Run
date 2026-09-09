import { useMemo, useState } from 'react'
import type { Nav } from '../App'
import TopBar from '../components/TopBar'
import Sheet from '../components/Sheet'
import StatusDot from '../components/StatusDot'
import Map, { type MapPin } from '../components/Map'
import { useStore } from '../state/store'
import { useCurrentPosition, useFriendPings } from '../lib/useGeo'
import { boundsOf, distanceM } from '../lib/geo'
import { pushNotice } from '../lib/notify'
import { PLACES } from '../lib/seed'

export default function LiveMap({ nav }: { nav: Nav }) {
  const { state, actions } = useStore()
  const geo = useCurrentPosition(true)
  const [showPlaces, setShowPlaces] = useState(true)
  const [shareOpen, setShareOpen] = useState(false)

  const friends = useMemo(
    () => state.friends.filter((f) => f.status === 'friend'),
    [state.friends],
  )
  const sharingFriends = useMemo(
    () => friends.filter((f) => f.sharingLocation).map((f) => ({ id: f.id, home: f.home, sharingLocation: true })),
    [friends],
  )
  const pings = useFriendPings(sharingFriends)

  const me = geo.position
  const sharing = state.profile.sharingLocation

  const pins = useMemo<MapPin[]>(() => {
    const out: MapPin[] = []
    if (me) out.push({ id: 'me', pos: me, emoji: state.profile.emoji, label: sharing ? 'คุณ (แชร์อยู่)' : 'คุณ', me: true })
    for (const p of pings) {
      const f = friends.find((x) => x.id === p.id)
      if (f) out.push({ id: f.id, pos: p.pos, emoji: f.emoji, label: f.name })
    }
    if (showPlaces) {
      for (const pl of PLACES) out.push({ id: pl.id, pos: { lat: pl.lat, lng: pl.lng }, emoji: '🌳', label: pl.name })
    }
    return out
  }, [me, pings, friends, showPlaces, sharing, state.profile.emoji])

  // เมื่อไม่ได้แสดงหมุดสวน ให้ซูมพอดีกับคุณและเพื่อนที่แชร์ตำแหน่ง
  const fit = useMemo(() => {
    if (showPlaces) return null
    const pts = [...(me ? [me] : []), ...pings.map((p) => p.pos)]
    return pts.length > 1 ? boundsOf(pts) : null
  }, [me, pings, showPlaces])

  const shareLink = () => {
    if (!me) {
      pushNotice('ยังไม่รู้ตำแหน่ง', 'กดปุ่มค้นหาตำแหน่งก่อนนะ')
      return
    }
    const url = `https://maps.google.com/?q=${me.lat.toFixed(6)},${me.lng.toFixed(6)}`
    const text = `${state.profile.name} อยู่ตรงนี้: ${url}`
    const nav2 = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    if (nav2.share) {
      nav2.share({ title: 'Wanna Run? — ตำแหน่งของฉัน', text, url }).catch(() => undefined)
      return
    }
    navigator.clipboard
      ?.writeText(text)
      .then(() => pushNotice('คัดลอกลิงก์ตำแหน่งแล้ว', 'วางส่งให้เพื่อนในแชตได้เลย'))
      .catch(() => pushNotice('ตำแหน่งของคุณ', url))
  }

  return (
    <>
      <TopBar
        title="แผนที่เพื่อน"
        subtitle={sharing ? 'คุณกำลังแชร์ตำแหน่งอยู่' : `${pings.length} คนกำลังแชร์ตำแหน่ง`}
        right={
          <button className="btn sm" onClick={geo.locate} aria-label="ค้นหาตำแหน่ง">
            🎯
          </button>
        }
      />

      <Map center={me ?? geo.fallback} zoom={me ? 15 : 13} pins={pins} fit={fit} className="map-box map-full" follow />

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <span className="avatar">{sharing ? '📡' : '📴'}</span>
          <div className="grow">
            <div className="strong" style={{ fontSize: 14.5 }}>
              แชร์ตำแหน่งให้ก๊วน
            </div>
            <div className="muted small">
              {sharing ? 'เพื่อนในก๊วนเห็นตำแหน่งคุณแบบสด' : 'เปิดเพื่อให้เพื่อนตามหาคุณเจอตอนนัดวิ่ง'}
            </div>
          </div>
          <button
            className={`btn sm ${sharing ? '' : 'primary'}`}
            onClick={() => {
              if (!sharing && !me) geo.locate()
              actions.toggleShareLocation(!sharing)
            }}
          >
            {sharing ? 'ปิด' : 'เปิด'}
          </button>
        </div>

        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <button className="btn sm grow" onClick={shareLink}>
            🔗 ส่งลิงก์ตำแหน่ง
          </button>
          <button className="btn sm grow" onClick={() => setShareOpen(true)}>
            👥 เลือกคนที่เห็น
          </button>
        </div>

        {geo.error && (
          <div className="small" style={{ color: 'var(--danger)', marginTop: 10 }}>
            {geo.error}
          </div>
        )}
      </div>

      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <button className={`chip ${showPlaces ? 'on' : ''}`} onClick={() => setShowPlaces((v) => !v)}>
          🌳 แสดงสวนแนะนำ
        </button>
        <button className="chip" onClick={() => nav('invites', { new: '1' })}>
          📣 ชวนวิ่งจากจุดนี้
        </button>
      </div>

      <div className="section-title">เพื่อนที่แชร์ตำแหน่ง ({pings.length})</div>
      {pings.length === 0 ? (
        <div className="card empty">
          <div className="big">🛰️</div>
          ยังไม่มีเพื่อนแชร์ตำแหน่งตอนนี้
        </div>
      ) : (
        <div className="stack-8">
          {pings.map((p) => {
            const f = friends.find((x) => x.id === p.id)
            if (!f) return null
            const away = me ? distanceM(me, p.pos) : null
            return (
              <div key={p.id} className="card tight row">
                <span className="avatar-wrap">
                  <span className="avatar">{f.emoji}</span>
                  <StatusDot online />
                </span>
                <span className="grow">
                  <span className="strong" style={{ display: 'block', fontSize: 14.5 }}>
                    {f.name}
                  </span>
                  <span className="muted small">
                    กำลังเคลื่อนที่ {p.movingKmh.toFixed(1)} กม./ชม.
                    {away != null ? ` · ห่างคุณ ${away < 1000 ? `${Math.round(away)} ม.` : `${(away / 1000).toFixed(1)} กม.`}` : ''}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="card tight muted tiny" style={{ marginTop: 12, lineHeight: 1.7 }}>
        ตำแหน่งของคุณอ่านจาก GPS ของเครื่องและไม่ถูกส่งออกนอกอุปกรณ์
        ส่วนตำแหน่งเพื่อนในเวอร์ชันนี้เป็นข้อมูลตัวอย่างที่จำลองขึ้น เนื่องจากยังไม่มีเซิร์ฟเวอร์กลาง
      </div>

      <Sheet open={shareOpen} title="ใครเห็นตำแหน่งคุณได้บ้าง" subtitle="ปิดรายคนได้ตามต้องการ" onClose={() => setShareOpen(false)}>
        <div className="stack-8">
          {friends.map((f) => (
            <div key={f.id} className="card tight row">
              <span className="avatar-wrap">
                <span className="avatar">{f.emoji}</span>
                <StatusDot online={f.sharingLocation} />
              </span>
              <span className="grow strong" style={{ fontSize: 14.5 }}>
                {f.name}
              </span>
              <span className={`chip ${sharing ? 'ok' : ''}`}>{sharing ? 'เห็นได้' : 'ปิดอยู่'}</span>
            </div>
          ))}
        </div>
        <div className="card tight muted small" style={{ marginTop: 14, lineHeight: 1.65 }}>
          ตอนนี้การแชร์เป็นแบบเปิด/ปิดทั้งก๊วน การเลือกรายคนจะมาพร้อมกับระบบบัญชีผู้ใช้ในเวอร์ชันถัดไป
        </div>
      </Sheet>
    </>
  )
}
