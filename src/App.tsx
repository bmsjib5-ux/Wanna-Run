import { useCallback, useEffect, useState } from 'react'
import { StoreProvider, useStore } from './state/store'
import { RunProvider, useRun } from './state/run'
import { formatDuration, formatKm } from './lib/geo'
import { AuthProvider, useAuth } from './state/auth'
import { isCloudConfigured } from './lib/supabase'
import { takeCodeFromUrl } from './lib/friendLink'
import { takeSpotFromUrl } from './lib/spotLink'
import Auth from './screens/Auth'
import Toaster from './components/Toaster'
import Onboarding from './screens/Onboarding'
import Home from './screens/Home'
import Friends from './screens/Friends'
import Groups from './screens/Groups'
import Invites from './screens/Invites'
import RunScreen from './screens/RunScreen'
import LiveMap from './screens/LiveMap'
import Games from './screens/Games'
import Profile from './screens/Profile'
import Notifications from './screens/Notifications'

export type Route =
  | 'home'
  | 'friends'
  | 'groups'
  | 'invites'
  | 'run'
  | 'map'
  | 'games'
  | 'profile'
  | 'notifications'

export type Nav = (route: Route, params?: Record<string, string>) => void

const TABS: Array<{ key: Route; label: string; icon: string }> = [
  { key: 'home', label: 'หน้าหลัก', icon: '🏠' },
  { key: 'friends', label: 'เพื่อน', icon: '👟' },
  { key: 'run', label: 'วิ่ง', icon: '🏃' },
  { key: 'map', label: 'แผนที่', icon: '🗺️' },
  { key: 'games', label: 'ภารกิจ', icon: '🎮' },
]

function Shell() {
  const { state, syncing } = useStore()
  const { tracker } = useRun()
  const [route, setRoute] = useState<Route>('home')
  const [params, setParams] = useState<Record<string, string>>({})

  const nav = useCallback<Nav>((next, p = {}) => {
    setRoute(next)
    setParams(p)
    window.scrollTo({ top: 0 })
  }, [])

  // เปิดจากลิงก์ QR (?add=RUN-XXXX) ให้เด้งไปหน้าเพิ่มเพื่อนทันที
  useEffect(() => {
    const code = takeCodeFromUrl()
    if (code) {
      nav('friends', { add: code })
      return
    }
    // ลิงก์จุดวิ่งที่เพื่อนส่งมา (?spot=lat,lng) เปิดแผนที่พร้อมปักหมุดให้
    const spot = takeSpotFromUrl()
    if (spot) nav('map', { lat: String(spot.lat), lng: String(spot.lng), name: spot.name, area: spot.area })
  }, [nav])

  // ปุ่มย้อนกลับของเบราว์เซอร์ให้กลับมาหน้าหลักแทนการออกจากแอป
  useEffect(() => {
    if (route === 'home') return
    window.history.pushState({ route }, '')
    const onPop = () => setRoute('home')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [route])

  if (syncing) return <Splash text="กำลังซิงก์ข้อมูลก๊วนของคุณ..." />
  if (!state.onboarded) return <Onboarding />

  const unread = state.notifications.filter((n) => !n.read).length

  return (
    <div className="shell">
      {tracker.running && route !== 'run' && (
        <button className={`run-banner${tracker.paused ? ' paused' : ''}`} onClick={() => nav('run')}>
          <span className="dot" />
          <span className="grow">
            {tracker.paused ? 'พักการวิ่งอยู่' : 'กำลังวิ่ง'} · {formatKm(tracker.distanceM)} กม. · {formatDuration(tracker.elapsedMs)}
          </span>
          <span>กลับไปหน้าวิ่ง ›</span>
        </button>
      )}
      <main className="page">
        {route === 'home' && <Home nav={nav} />}
        {route === 'friends' && <Friends nav={nav} addCode={params.add} />}
        {route === 'groups' && <Groups nav={nav} focusId={params.id} />}
        {route === 'invites' && (
          <Invites
            nav={nav}
            openNew={params.new === '1'}
            initialPlace={
              params.lat && params.lng
                ? {
                    id: 'pin_from_map',
                    name: params.name || 'จุดที่ปักหมุด',
                    area: params.area || '',
                    lat: Number(params.lat),
                    lng: Number(params.lng),
                    tags: ['ปักหมุดเอง'],
                  }
                : undefined
            }
          />
        )}
        {route === 'run' && <RunScreen nav={nav} inviteId={params.inviteId} />}
        {route === 'map' && (
          <LiveMap
            nav={nav}
            initialPin={
              params.lat && params.lng
                ? { id: 'from-link', name: params.name || 'จุดที่ปักหมุด', area: params.area || '', lat: Number(params.lat), lng: Number(params.lng), tags: [] }
                : undefined
            }
          />
        )}
        {route === 'games' && <Games nav={nav} tab={params.tab} />}
        {route === 'profile' && <Profile nav={nav} section={params.section === 'runs' ? 'runs' : undefined} />}
        {route === 'notifications' && <Notifications nav={nav} />}
      </main>

      <nav className="nav">
        {TABS.map((t) =>
          t.key === 'run' ? (
            <button key={t.key} onClick={() => nav('run')} aria-label={tracker.running ? 'กลับไปหน้าวิ่ง' : 'เริ่มวิ่ง'}>
              <span className={`fab${tracker.running ? ' live' : ''}`}>🏃</span>
            </button>
          ) : (
            <button
              key={t.key}
              className={route === t.key ? 'on' : ''}
              onClick={() => nav(t.key)}
              style={{ position: 'relative' }}
            >
              <span className="ico">{t.icon}</span>
              <span>{t.label}</span>
              {t.key === 'home' && unread > 0 && <span className="badge-dot">{unread}</span>}
            </button>
          ),
        )}
      </nav>

      <Toaster />
    </div>
  )
}

function Splash({ text }: { text: string }) {
  return (
    <div className="shell">
      <div className="page center" style={{ display: 'grid', placeContent: 'center', gap: 12 }}>
        <div style={{ fontSize: 56 }}>🏃‍♀️💨</div>
        <div className="muted small">{text}</div>
      </div>
    </div>
  )
}

function CloudApp() {
  const { session, loading } = useAuth()

  if (loading) return <Splash text="กำลังเชื่อมต่อ..." />
  if (!session) return <Auth />

  return (
    <StoreProvider userId={session.user.id}>
      <RunProvider>
        <Shell />
      </RunProvider>
    </StoreProvider>
  )
}

export default function App() {
  // ไม่ได้ตั้งค่าเซิร์ฟเวอร์ = ใช้งานแบบเก็บข้อมูลในเครื่องอย่างเดียว
  if (!isCloudConfigured) {
    return (
      <StoreProvider>
        <RunProvider>
          <Shell />
        </RunProvider>
      </StoreProvider>
    )
  }

  return (
    <AuthProvider>
      <CloudApp />
    </AuthProvider>
  )
}
