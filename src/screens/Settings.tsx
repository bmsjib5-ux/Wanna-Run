import { useState } from 'react'
import type { Nav } from '../App'
import TopBar from '../components/TopBar'
import ThemePicker from '../components/ThemePicker'
import { notificationPermission, requestNotificationPermission } from '../lib/notify'
import { isNative } from '../lib/native'

/** ตั้งค่าที่เข้าถึงบ่อยจากหน้าหลัก: การแจ้งเตือน และธีมของแอป */
export default function Settings({ nav }: { nav: Nav }) {
  const [perm, setPerm] = useState(notificationPermission())

  const detail =
    perm === 'granted'
      ? 'เปิดอยู่ — จะเตือนเมื่อเพื่อนชวนวิ่งหรือตอบรับนัด'
      : perm === 'denied'
        ? isNative()
          ? 'ถูกปฏิเสธ ต้องเปิดสิทธิ์แจ้งเตือนในตั้งค่าของเครื่อง'
          : 'ถูกปฏิเสธ ต้องเปิดสิทธิ์ในตั้งค่าเบราว์เซอร์'
        : perm === 'unsupported'
          ? 'เบราว์เซอร์นี้ไม่รองรับ แต่ยังเห็นแจ้งเตือนในแอปได้'
          : 'ยังไม่ได้เปิด — เปิดไว้จะได้ไม่พลาดนัดวิ่ง'

  return (
    <>
      <TopBar title="ตั้งค่า" subtitle="การแจ้งเตือนและหน้าตาของแอป" onBack={() => nav('home')} />

      <div className="section-title">การแจ้งเตือน</div>
      <div className="card tight row">
        <span className="avatar sm">🔔</span>
        <div className="grow">
          <div className="strong" style={{ fontSize: 14 }}>
            แจ้งเตือนจากระบบ
          </div>
          <div className="muted tiny" style={{ lineHeight: 1.6 }}>
            {detail}
          </div>
        </div>
        {perm !== 'granted' && perm !== 'unsupported' && (
          <button className="btn primary xs" onClick={async () => setPerm(await requestNotificationPermission())}>
            เปิด
          </button>
        )}
      </div>
      <div className="card tight muted tiny" style={{ marginTop: 8, lineHeight: 1.7 }}>
        แจ้งเตือนในแอป (ไอคอนกระดิ่ง) ทำงานเสมอ ส่วนแจ้งเตือนของระบบจะเด้งขึ้นมาแม้ไม่ได้เปิดแอปอยู่
        เช่น เมื่อเพื่อนชวนวิ่ง ตอบรับนัด หรือระหว่างจับระยะทาง
      </div>

      <div className="section-title">หน้าตาของแอป</div>
      <ThemePicker />

      <div className="card tight row" style={{ marginTop: 12 }}>
        <span className="avatar sm">👤</span>
        <div className="grow">
          <div className="strong" style={{ fontSize: 14 }}>
            ข้อมูลส่วนตัวและบัญชี
          </div>
          <div className="muted tiny">ชื่อ รูปโปรไฟล์ เป้าหมาย ประวัติการวิ่ง และออกจากระบบ</div>
        </div>
        <button className="btn xs" onClick={() => nav('profile')}>
          เปิด
        </button>
      </div>
    </>
  )
}
