import { useMemo } from 'react'
import { ArrowRight, Bell, CalendarDays, Flag, Footprints, MapPin, Plus, Settings, Users } from 'lucide-react'
import type { Nav } from '../App'
import Avatar from '../components/Avatar'
import InviteCard from '../components/InviteCard'
import StreakCard from '../components/StreakCard'
import { Button, Card, CardContent } from '../components/ui'
import { useStore } from '../state/store'
import { startOfWeek } from '../lib/format'
import { computeStreak } from '../lib/streak'
import { isOnline, useNow } from '../lib/presence'

export default function Home({ nav }: { nav: Nav }) {
  const { state, cloud } = useStore()
  const { profile, runs, friends, invites, notifications } = state
  const now = useNow()
  const unread = notifications.filter(n => !n.read).length
  const total = runs.reduce((sum, r) => sum + r.distanceM, 0) / 1000
  const weekStart = startOfWeek()
  const days = Array.from({ length: 7 }, (_, i) => {
    const start = new Date(weekStart); start.setDate(start.getDate() + i)
    const end = new Date(start); end.setDate(end.getDate() + 1)
    return runs.filter(r => r.startedAt >= +start && r.startedAt < +end).reduce((sum, r) => sum + r.distanceM, 0) / 1000
  })
  const week = days.reduce((sum, n) => sum + n, 0)
  const max = Math.max(1, ...days)
  const labels = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']
  const upcoming = invites.filter(i => i.status === 'open' && i.startAt > now - 3600000).sort((a, b) => a.startAt - b.startAt).slice(0, 2)
  const connected = friends.filter(f => f.status === 'friend')
  const online = connected.filter(f => isOnline(f, now))
  const streak = useMemo(() => computeStreak(runs), [runs])
  return <div className="home-screen">
    <header className="home-header">
      <button className="home-person" onClick={() => nav('profile')}><Avatar emoji={profile.emoji} photo={profile.avatarUrl} name={profile.name} /><span><small>สวัสดี {profile.name}</small><strong>ไปวิ่งกันไหมวันนี้?</strong></span></button>
      <Button variant="ghost" size="icon" aria-label="การแจ้งเตือน" onClick={() => nav('notifications')}><Bell size={21} />{unread > 0 && <span className="badge-dot">{unread}</span>}</Button>
      <Button variant="ghost" size="icon" aria-label="ตั้งค่า" onClick={() => nav('settings')}><Settings size={20} /></Button>
    </header>
    {!cloud && <p className="local-mode"><span />โหมดในเครื่อง · ข้อมูลบันทึกบนอุปกรณ์นี้</p>}
    <Card className="distance-card"><CardContent>
      <div className="distance-overview"><div><span className="eyebrow">ทุกก้าวมีความหมาย</span><p>ระยะทางรวม</p><strong>{total.toFixed(1)}</strong><span>กิโลเมตร</span></div>
        <div className="weekly-chart"><div className="chart-bars" aria-hidden="true">{days.map((n, i) => <div key={i}><i style={{ height: n ? Math.max(8, n / max * 76) : 3 }} /><span>{labels[i]}</span></div>)}</div><p>สัปดาห์นี้ <b>{week.toFixed(1)} กม.</b></p>
        <div className="sr-only"><table><caption>ระยะวิ่งสัปดาห์นี้ หน่วยกิโลเมตร</caption><tbody>{days.map((n, i) => <tr key={i}><th>{labels[i]}</th><td>{n.toFixed(2)}</td></tr>)}</tbody></table></div></div>
      </div>
      <div className="weekly-goal"><span>เป้าหมาย {profile.weeklyGoalKm} กม. / สัปดาห์</span><span>{Math.round(week / Math.max(1, profile.weeklyGoalKm) * 100)}%</span></div>
      <progress value={Math.min(week, profile.weeklyGoalKm)} max={Math.max(1, profile.weeklyGoalKm)} aria-label="ความคืบหน้าเป้าหมายรายสัปดาห์" />
    </CardContent></Card>
    <div className="home-shortcuts">
      {[{ icon: Plus, text: 'ชวนวิ่ง', go: () => nav('invites', { new: '1' }) }, { icon: CalendarDays, text: 'นัดวิ่ง', go: () => nav('invites') }, { icon: MapPin, text: 'แผนที่', go: () => nav('map') }, { icon: Users, text: 'ก๊วนวิ่ง', go: () => nav('groups') }].map(({ icon: Icon, text, go }) => <button key={text} onClick={go}><span><Icon size={23} strokeWidth={1.8} /></span>{text}</button>)}
    </div>
    <div className="section-title">นัดวิ่งของเรา<button onClick={() => nav('invites')}>ดูทั้งหมด <ArrowRight size={15} /></button></div>
    {upcoming.length ? <div className="stack-12">{upcoming.map(invite => <InviteCard key={invite.id} invite={invite} friends={friends} compact onOpen={() => nav('invites')} />)}</div> :
      <Card className="first-run-card"><div className="first-run-photo" role="img" aria-label="นักวิ่งกลางแจ้ง" /><CardContent><span className="eyebrow">เริ่มต้นไปด้วยกัน</span><h2>นัดแรก ก้าวแรก ของก๊วนเรา</h2><p>เลือกสถานที่ดี ๆ แล้วชวนเพื่อนออกไปวิ่ง</p><Button onClick={() => nav('invites', { new: '1' })}><Plus size={18} />สร้างนัดวิ่ง</Button></CardContent></Card>}
    <div className="section-title">เพื่อนนักวิ่ง<button onClick={() => nav('friends')}>ดูก๊วน <ArrowRight size={15} /></button></div>
    <Card><CardContent>{connected.length ? <div className="friend-preview">{connected.slice(0, 3).map(f => <button key={f.id} onClick={() => nav('friends')}><Avatar emoji={f.emoji} photo={f.avatarUrl} name={f.name} /><span><strong>{f.name}</strong><small>{isOnline(f, now) ? 'ออนไลน์ · พร้อมไปด้วยกัน' : 'เพื่อนร่วมทางของคุณ'}</small></span><span className={isOnline(f, now) ? 'online-dot' : 'offline-dot'} /></button>)}</div> : <div className="friend-empty"><span className="soft-icon"><Users size={25} /></span><div><strong>วิ่งคนเดียวก็ดี มีเพื่อนยิ่งสนุก</strong><p>เพิ่มเพื่อนด้วยรหัสหรือสแกน QR</p></div><Button variant="ghost" size="icon" aria-label="เพิ่มเพื่อน" onClick={() => nav('friends')}><Plus size={22} /></Button></div>}</CardContent></Card>
    <div className="section-title">ก้าวเล็ก ๆ ที่สม่ำเสมอ<button onClick={() => nav('games')}>ภารกิจ <Flag size={18} /></button></div><StreakCard streak={streak} onRun={() => nav('run')} />
    <Button className="home-start" onClick={() => nav('run')}><Footprints size={20} />ออกไปวิ่งกัน<ArrowRight size={18} /></Button>
    <p className="home-caption">{online.length ? online.length + ' คนในก๊วนกำลังออนไลน์' : 'มากกว่าการวิ่ง คือการได้ไปด้วยกัน'}</p>
  </div>
}
