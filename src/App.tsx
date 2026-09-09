import { useCallback, useEffect, useState } from 'react'
import { StoreProvider, useStore } from './state/store'
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
  const { state } = useStore()
  const [route, setRoute] = useState<Route>('home')
  const [params, setParams] = useState<Record<string, string>>({})

  const nav = useCallback<Nav>((next, p = {}) => {
    setRoute(next)
    setParams(p)
    window.scrollTo({ top: 0 })
  }, [])

  // ปุ่มย้อนกลับของเบราว์เซอร์ให้กลับมาหน้าหลักแทนการออกจากแอป
  useEffect(() => {
    if (route === 'home') return
    window.history.pushState({ route }, '')
    const onPop = () => setRoute('home')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [route])

  if (!state.onboarded) return <Onboarding />

  const unread = state.notifications.filter((n) => !n.read).length

  return (
    <div className="shell">
      <main className="page">
        {route === 'home' && <Home nav={nav} />}
        {route === 'friends' && <Friends nav={nav} />}
        {route === 'groups' && <Groups nav={nav} focusId={params.id} />}
        {route === 'invites' && <Invites nav={nav} openNew={params.new === '1'} />}
        {route === 'run' && <RunScreen nav={nav} inviteId={params.inviteId} />}
        {route === 'map' && <LiveMap nav={nav} />}
        {route === 'games' && <Games nav={nav} tab={params.tab} />}
        {route === 'profile' && <Profile nav={nav} />}
        {route === 'notifications' && <Notifications nav={nav} />}
      </main>

      <nav className="nav">
        {TABS.map((t) =>
          t.key === 'run' ? (
            <button key={t.key} onClick={() => nav('run')} aria-label="เริ่มวิ่ง">
              <span className="fab">🏃</span>
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

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
