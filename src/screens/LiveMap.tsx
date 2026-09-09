import { useEffect, useMemo, useRef, useState } from 'react'
import type { Nav } from '../App'
import TopBar from '../components/TopBar'
import Sheet from '../components/Sheet'
import Avatar from '../components/Avatar'
import Map, { type MapPin } from '../components/Map'
import { useStore } from '../state/store'
import { useCurrentPosition, useFriendPings } from '../lib/useGeo'
import { isOnline, useNow } from '../lib/presence'
import { spotShareText, spotLink } from '../lib/spotLink'
import SpotList from '../components/SpotList'
import { boundsOf, distanceM } from '../lib/geo'
import { pushNotice } from '../lib/notify'
import { PLACES } from '../lib/seed'
import { directionsUrl } from '../lib/geo'
import { presetMatches, reverseGeocode, searchPlaces, type SearchHit } from '../lib/geocode'
import type { LatLng, Place } from '../types'
import * as api from '../lib/api'
import type { FriendPing } from '../lib/useGeo'

export default function LiveMap({ nav, initialPin }: { nav: Nav; initialPin?: Place }) {
  const { state, actions, cloud } = useStore()
  const geo = useCurrentPosition(true)
  const [showPlaces, setShowPlaces] = useState(true)
  const [shareOpen, setShareOpen] = useState(false)

  // หมุดที่ผู้ใช้ปักเอง (แตะบนแผนที่ หรือเลือกจากผลค้นหา) มีได้ทีละหนึ่งจุด
  const [pin, setPin] = useState<Place | null>(initialPin ?? null)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const reverseCtl = useRef<AbortController | null>(null)

  // ค้นหาแบบหน่วง: Nominatim ขอไม่เกิน 1 คำขอ/วินาที จึงห้ามยิงทุกตัวอักษร
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    // รายการแนะนำขึ้นทันที ส่วนผลจาก OSM ค่อยตามมาแทนที่เมื่อโหลดเสร็จ
    setResults(presetMatches(q))
    setSearching(true)
    const ctl = new AbortController()
    const timer = window.setTimeout(() => {
      searchPlaces(q, ctl.signal)
        .then((hits) => {
          setResults(hits)
          setSearching(false)
        })
        .catch((err: Error) => {
          if (err.name !== 'AbortError') setSearching(false)
        })
    }, 600)
    return () => {
      ctl.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  /** ปักหมุดที่พิกัดนี้ แล้วค่อยไปถามชื่อสถานที่มาใส่ทีหลัง */
  const dropPin = (pos: LatLng) => {
    reverseCtl.current?.abort()
    const ctl = new AbortController()
    reverseCtl.current = ctl
    setPin({
      id: `pin_${Date.now()}`,
      name: 'จุดที่ปักหมุด',
      area: `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`,
      lat: pos.lat,
      lng: pos.lng,
      tags: ['ปักหมุดเอง'],
    })
    reverseGeocode(pos, ctl.signal)
      .then((place) => {
        if (!ctl.signal.aborted) setPin((cur) => (cur && cur.lat === pos.lat && cur.lng === pos.lng ? { ...cur, ...place, id: cur.id } : cur))
      })
      .catch(() => undefined)
  }

  const choose = (hit: SearchHit) => {
    setPin({ id: hit.id, name: hit.name, area: hit.area, lat: hit.lat, lng: hit.lng, tags: hit.tags })
    setQuery('')
    setResults([])
  }

  const friends = useMemo(
    () => state.friends.filter((f) => f.status === 'friend'),
    [state.friends],
  )
  const sharingFriends = useMemo(
    () => friends.filter((f) => f.sharingLocation).map((f) => ({ id: f.id, home: f.home, sharingLocation: true })),
    [friends],
  )
  // ต้องเป็นอาร์เรย์ตัวเดิมเมื่อค่าไม่เปลี่ยน ไม่งั้น effect ใน useFriendPings
  // จะเห็นว่า dependency เปลี่ยนทุกครั้งที่ render แล้ววนไม่รู้จบ
  const simulatedInput = useMemo(() => (cloud ? [] : sharingFriends), [cloud, sharingFriends])
  const simulated = useFriendPings(simulatedInput)
  const live = useLiveFriendLocations(cloud)
  const pings = cloud ? live : simulated

  const me = geo.position
  const sharing = state.profile.sharingLocation

  /** จุดประจำที่ตรงกับหมุดปัจจุบัน (ห่างกันไม่เกิน 30 ม. ถือว่าจุดเดียวกัน) */
  const savedSpot = useMemo(
    () => (pin ? state.spots.find((sp) => sp.id === pin.id || distanceM(sp, pin) < 30) : undefined),
    [pin, state.spots],
  )

  const shareSpot = (place: Place) => {
    const text = spotShareText(place, state.profile.name)
    const url = spotLink(place)
    const nav2 = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    if (nav2.share) {
      nav2.share({ title: `ไปวิ่งที่ ${place.name} กันไหม?`, text, url }).catch(() => undefined)
      return
    }
    navigator.clipboard
      ?.writeText(text)
      .then(() => pushNotice('คัดลอกแล้ว', `ส่งจุด "${place.name}" ให้เพื่อนในแชตได้เลย`))
      .catch(() => pushNotice(place.name, url))
  }
  const now = useNow()

  // ส่งตำแหน่งของเราขึ้นเซิร์ฟเวอร์ระหว่างที่เปิดแชร์อยู่
  useEffect(() => {
    if (!cloud || !sharing || !me) return
    const send = () => void api.pushMyLocation(me, null).catch(console.error)
    send()
    const timer = window.setInterval(send, 10_000)
    return () => window.clearInterval(timer)
  }, [cloud, sharing, me])

  const pins = useMemo<MapPin[]>(() => {
    const out: MapPin[] = []
    if (me) out.push({ id: 'me', pos: me, emoji: state.profile.emoji, photo: state.profile.avatarUrl, label: sharing ? 'คุณ (แชร์อยู่)' : 'คุณ', me: true })
    for (const p of pings) {
      const f = friends.find((x) => x.id === p.id)
      if (f) out.push({ id: f.id, pos: p.pos, emoji: f.emoji, photo: f.avatarUrl, label: f.name })
    }
    if (showPlaces) {
      for (const pl of PLACES) out.push({ id: pl.id, pos: { lat: pl.lat, lng: pl.lng }, emoji: '🌳', label: pl.name })
    }
    if (pin) out.push({ id: 'pin', pos: { lat: pin.lat, lng: pin.lng }, emoji: '📍', label: pin.name })
    return out
  }, [me, pings, friends, showPlaces, sharing, state.profile.emoji, state.profile.avatarUrl, pin])

  // เมื่อไม่ได้แสดงหมุดสวน ให้ซูมพอดีกับคุณและเพื่อนที่แชร์ตำแหน่ง
  const fit = useMemo(() => {
    if (showPlaces || pin) return null
    const pts = [...(me ? [me] : []), ...pings.map((p) => p.pos)]
    return pts.length > 1 ? boundsOf(pts) : null
  }, [me, pings, showPlaces, pin])

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

      <div className="search-wrap">
        <input
          className="input"
          type="search"
          placeholder="ค้นหาสวน ถนน หรือสถานที่..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="ค้นหาสถานที่บนแผนที่"
        />
        {query.trim().length >= 2 && (
          <div className="search-results" role="listbox">
            {searching && <div className="muted tiny" style={{ padding: '8px 14px 0' }}>กำลังค้นหาเพิ่มจาก OpenStreetMap...</div>}
            {!searching && results.length === 0 && <div className="muted small" style={{ padding: 12 }}>ไม่พบสถานที่ ลองพิมพ์ชื่อเขตหรือถนน</div>}
            {results.map((r) => (
              <button key={r.id} className="search-item" role="option" onClick={() => choose(r)}>
                <span>{r.source === 'preset' ? '🌳' : '📍'}</span>
                <span className="grow">
                  <span className="strong" style={{ display: 'block', fontSize: 14 }}>{r.name}</span>
                  <span className="muted tiny">{r.area}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Map
        center={pin ? { lat: pin.lat, lng: pin.lng } : (me ?? geo.fallback)}
        zoom={pin ? 16 : me ? 15 : 13}
        pins={pins}
        fit={fit}
        className="map-box map-full"
        follow
        onPick={dropPin}
      />
      <div className="muted tiny center" style={{ marginTop: 6 }}>
        แตะบนแผนที่เพื่อปักหมุด
      </div>

      {pin && (
        <div className="card" style={{ marginTop: 10, borderColor: 'rgba(var(--accent-rgb), .45)' }}>
          <div className="row">
            <span className="avatar">📍</span>
            <div className="grow">
              <div className="strong" style={{ fontSize: 14.5 }}>{pin.name}</div>
              <div className="muted small">{pin.area}</div>
            </div>
            <button className="btn xs" onClick={() => setPin(null)} aria-label="ลบหมุด">
              ✕
            </button>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button
              className="btn primary sm grow"
              onClick={() => nav('invites', { new: '1', lat: String(pin.lat), lng: String(pin.lng), name: pin.name, area: pin.area })}
            >
              📣 ชวนวิ่งที่นี่
            </button>
            <a
              className="btn sm grow"
              style={{ textDecoration: 'none' }}
              href={directionsUrl({ lat: pin.lat, lng: pin.lng })}
              target="_blank"
              rel="noopener noreferrer"
            >
              🧭 นำทาง
            </a>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            {savedSpot ? (
              <span className="chip on grow" style={{ justifyContent: 'center' }}>
                ⭐ บันทึกเป็นจุดประจำแล้ว
              </span>
            ) : (
              <button
                className="btn sm grow"
                onClick={() => {
                  setSaveName(pin.name)
                  setSaveOpen(true)
                }}
              >
                ⭐ บันทึกเป็นจุดประจำ
              </button>
            )}
            <button className="btn sm grow" onClick={() => shareSpot(pin)}>
              📤 ส่งให้เพื่อน
            </button>
          </div>
        </div>
      )}

      <SpotList
        spots={state.spots}
        activeId={savedSpot?.id}
        onPick={(spot) => {
          setPin(spot)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        onInvite={(spot) => nav('invites', { new: '1', lat: String(spot.lat), lng: String(spot.lng), name: spot.name, area: spot.area })}
        onShare={shareSpot}
        onRemove={(spot) => actions.removeSpot(spot.id)}
      />

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
        <button className="chip" onClick={() => me && dropPin(me)} disabled={!me}>
          📍 ปักหมุดที่ตำแหน่งฉัน
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
                <Avatar emoji={f.emoji} photo={f.avatarUrl} name={f.name} online />
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
        {cloud
          ? 'ตำแหน่งจะถูกส่งขึ้นเซิร์ฟเวอร์เฉพาะตอนที่คุณเปิดแชร์ และเห็นได้เฉพาะเพื่อนในก๊วนเท่านั้น พอปิดแชร์ ตำแหน่งล่าสุดจะถูกลบทิ้งทันที'
          : 'ตำแหน่งของคุณอ่านจาก GPS ของเครื่องและไม่ถูกส่งออกนอกอุปกรณ์ ส่วนตำแหน่งเพื่อนในโหมดนี้เป็นข้อมูลตัวอย่างที่จำลองขึ้น'}
      </div>

      <Sheet open={saveOpen} title="บันทึกจุดวิ่งประจำ" subtitle="ตั้งชื่อให้จำง่าย เช่น หน้าประตู 3 สวนลุม" onClose={() => setSaveOpen(false)}>
        {pin && (
          <>
            <label className="field">
              <span>ชื่อจุด</span>
              <input value={saveName} onChange={(e) => setSaveName(e.target.value)} maxLength={50} autoFocus />
            </label>
            <div className="muted small" style={{ marginBottom: 14 }}>
              📍 {pin.area || `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`}
            </div>
            <button
              className="btn primary block"
              onClick={() => {
                const name = saveName.trim() || pin.name
                actions.addSpot(pin, name)
                setPin({ ...pin, name })
                setSaveOpen(false)
                pushNotice('บันทึกจุดประจำแล้ว', 'เลือกได้ตอนสร้างคำชวน หรือส่งให้เพื่อนได้เลย')
              }}
            >
              ⭐ บันทึก
            </button>
          </>
        )}
      </Sheet>

      <Sheet open={shareOpen} title="ใครเห็นตำแหน่งคุณได้บ้าง" subtitle="ปิดรายคนได้ตามต้องการ" onClose={() => setShareOpen(false)}>
        <div className="stack-8">
          {friends.map((f) => (
            <div key={f.id} className="card tight row">
              <Avatar emoji={f.emoji} photo={f.avatarUrl} name={f.name} online={isOnline(f, now)} />
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

/** ตำแหน่งจริงของเพื่อนจากเซิร์ฟเวอร์ อัปเดตทั้งแบบสดและถามซ้ำเป็นระยะ */
function useLiveFriendLocations(enabled: boolean): FriendPing[] {
  const [pings, setPings] = useState<FriendPing[]>([])
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    if (!enabled) {
      setPings([])
      return
    }
    const pull = () => {
      api
        .fetchFriendLocations()
        .then((rows) => {
          if (!alive.current) return
          setPings(rows.map((r) => ({ id: r.userId, pos: r.pos, movingKmh: r.speedKmh })))
        })
        .catch(console.error)
    }
    pull()
    const timer = window.setInterval(pull, 8000)
    const unsubscribe = api.subscribeToChanges(() => pull(), ['locations'])
    return () => {
      alive.current = false
      window.clearInterval(timer)
      unsubscribe()
    }
  }, [enabled])

  return pings
}
