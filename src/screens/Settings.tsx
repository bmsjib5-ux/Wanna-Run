import { useState } from 'react'
import { Bell, ChevronRight, Palette, UserRound, MapPin, Trophy, Info } from 'lucide-react'
import type { Nav } from '../App'
import TopBar from '../components/TopBar'
import ThemePicker from '../components/ThemePicker'
import AboutBuild from '../components/AboutBuild'
import { Card, CardContent, Button } from '../components/ui'
import { notificationPermission, requestNotificationPermission } from '../lib/notify'
import { usePush } from '../lib/usePush'
import { useStore } from '../state/store'
import { isNative } from '../lib/native'

const SETTINGS_HINT = isNative() ? 'ของเครื่อง' : 'เบราว์เซอร์'

export default function Settings({ nav }: { nav: Nav }) {
  const { cloud } = useStore()
  const push = usePush(cloud)
  const [perm, setPerm] = useState(notificationPermission())

  // สิทธิ์ถูกปิดไว้ที่ตัวเครื่อง/เบราว์เซอร์ — ปุ่มในแอปแก้ไม่ได้ ต้องไปเปิดเอง
  const blocked = push.status === 'denied' || (!isNative() && perm === 'denied')
  const detail = blocked
    ? `ถูกปิดไว้ เปิดสิทธิ์ได้ในการตั้งค่า${SETTINGS_HINT}`
    : push.status === 'on'
      ? 'เตือนได้แม้ปิดแอป — คำชวนและคำตอบจากเพื่อน'
      : push.status === 'unsupported'
        ? perm === 'granted'
          ? 'เตือนได้เฉพาะตอนเปิดแอปอยู่'
          : 'อุปกรณ์นี้รับแจ้งเตือนเบื้องหลังไม่ได้'
        : 'เปิดไว้เพื่อไม่พลาดคำชวนจากเพื่อน แม้ปิดแอป'

  const action = blocked ? null : push.status === 'on' ? (
    <Button size="sm" variant="ghost" disabled={push.busy} onClick={() => void push.disable()}>
      ปิด
    </Button>
  ) : push.status === 'unsupported' ? (
    perm === 'default' && (
      <Button size="sm" onClick={async () => setPerm(await requestNotificationPermission())}>
        เปิด
      </Button>
    )
  ) : (
    <Button size="sm" disabled={push.busy} onClick={() => void push.enable()}>
      {push.busy ? 'กำลังเปิด...' : 'เปิด'}
    </Button>
  )

  return <>
    <TopBar title="การตั้งค่า" subtitle="ให้ทุกก้าวเป็นแบบที่คุณชอบ" onBack={() => nav('home')} />
    <Card className="settings-list">
      <button onClick={() => nav('profile')}><UserRound /><span><strong>บัญชีของฉัน</strong><small>โปรไฟล์ ประวัติ และจัดการบัญชี</small></span><ChevronRight /></button>
      <div className="settings-row"><Bell /><span><strong>การแจ้งเตือน</strong><small>{detail}</small></span>{action}</div>
      <button onClick={() => nav('map')}><MapPin /><span><strong>การแชร์ตำแหน่ง</strong><small>เลือกแชร์ตำแหน่งกับเพื่อนในก๊วน</small></span><ChevronRight /></button>
      <button onClick={() => nav('games')}><Trophy /><span><strong>ภารกิจและมินิเกม</strong><small>เป้าหมายเล็ก ๆ และรางวัลระหว่างทาง</small></span><ChevronRight /></button>
      <details><summary><Palette /><span><strong>ธีมและหน้าตา</strong><small>สี โหมดสว่าง–มืด และภาพพื้นหลัง</small></span><ChevronRight /></summary><CardContent><ThemePicker /></CardContent></details>
      <details><summary><Info /><span><strong>เกี่ยวกับแอป</strong><small>ไปวิ่งไหม · มากกว่าการวิ่ง</small></span><ChevronRight /></summary><CardContent><AboutBuild /></CardContent></details>
    </Card>
    <p className="settings-note">เปิดการแจ้งเตือนไว้ แล้วแอปจะเตือนคุณเมื่อเพื่อนชวนไปวิ่งหรือตอบคำชวน แม้ปิดแอปอยู่ · การแจ้งเตือนทั้งหมดย้อนดูได้จากไอคอนกระดิ่ง</p>
  </>
}
