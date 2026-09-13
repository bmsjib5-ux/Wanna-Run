import { useState } from 'react'
import { Bell, ChevronRight, Palette, UserRound, MapPin, Trophy, Info } from 'lucide-react'
import type { Nav } from '../App'
import TopBar from '../components/TopBar'
import ThemePicker from '../components/ThemePicker'
import AboutBuild from '../components/AboutBuild'
import { Card, CardContent, Button } from '../components/ui'
import { notificationPermission, requestNotificationPermission } from '../lib/notify'
import { isNative } from '../lib/native'

export default function Settings({ nav }: { nav: Nav }) {
  const [perm, setPerm] = useState(notificationPermission())
  const detail = perm === 'granted' ? 'เปิดการแจ้งเตือนแล้ว' : perm === 'denied' ? 'เปิดสิทธิ์ได้ในการตั้งค่า' + (isNative() ? 'ของเครื่อง' : 'เบราว์เซอร์') : perm === 'unsupported' ? 'ใช้การแจ้งเตือนในแอป' : 'รับข่าวนัดวิ่งและคำชวนจากเพื่อน'
  return <>
    <TopBar title="การตั้งค่า" subtitle="ให้ทุกก้าวเป็นแบบที่คุณชอบ" onBack={() => nav('home')} />
    <Card className="settings-list">
      <button onClick={() => nav('profile')}><UserRound /><span><strong>บัญชีของฉัน</strong><small>โปรไฟล์ ประวัติ และจัดการบัญชี</small></span><ChevronRight /></button>
      <div className="settings-row"><Bell /><span><strong>การแจ้งเตือน</strong><small>{detail}</small></span>{perm !== 'granted' && perm !== 'unsupported' && perm !== 'denied' && <Button size="sm" onClick={async () => setPerm(await requestNotificationPermission())}>เปิด</Button>}</div>
      <button onClick={() => nav('map')}><MapPin /><span><strong>การแชร์ตำแหน่ง</strong><small>เลือกแชร์ตำแหน่งกับเพื่อนในก๊วน</small></span><ChevronRight /></button>
      <button onClick={() => nav('games')}><Trophy /><span><strong>ภารกิจและมินิเกม</strong><small>เป้าหมายเล็ก ๆ และรางวัลระหว่างทาง</small></span><ChevronRight /></button>
      <details><summary><Palette /><span><strong>ธีมและหน้าตา</strong><small>สี โหมดสว่าง–มืด และภาพพื้นหลัง</small></span><ChevronRight /></summary><CardContent><ThemePicker /></CardContent></details>
      <details><summary><Info /><span><strong>เกี่ยวกับแอป</strong><small>ไปวิ่งไหม · มากกว่าการวิ่ง</small></span><ChevronRight /></summary><CardContent><AboutBuild /></CardContent></details>
    </Card>
    <p className="settings-note">การแจ้งเตือนในแอปดูได้จากไอคอนกระดิ่ง ส่วนการแจ้งเตือนของระบบขึ้นอยู่กับสิทธิ์และการทำงานของอุปกรณ์</p>
  </>
}
