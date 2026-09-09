import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { isCloudConfigured } from '../lib/supabase'

type BuildInfo = { builtAt: string; cloud: boolean; commit: string | null }

/**
 * บอกว่าเครื่องนี้กำลังใช้ build ไหนและโหมดอะไร
 * มีไว้ไล่ปัญหาเวลาไม่แน่ใจว่าติดตั้ง APK ตัวเก่าหรือตัวใหม่
 */
export default function AboutBuild() {
  const [info, setInfo] = useState<BuildInfo | null>(null)

  useEffect(() => {
    fetch('/build-info.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BuildInfo | null) => setInfo(data))
      .catch(() => undefined)
  }, [])

  const platform = Capacitor.isNativePlatform() ? `แอป ${Capacitor.getPlatform() === 'android' ? 'Android' : 'iOS'}` : 'เว็บ'
  const built = info?.builtAt ? new Date(info.builtAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : null

  return (
    <div className="card tight small" style={{ marginTop: 12, lineHeight: 1.9 }}>
      <div className="strong" style={{ fontSize: 13.5, marginBottom: 4 }}>
        เกี่ยวกับแอป
      </div>
      <div className="muted">
        โหมด:{' '}
        {isCloudConfigured ? (
          <span style={{ color: 'var(--ok)' }}>เชื่อมเซิร์ฟเวอร์</span>
        ) : (
          <span style={{ color: 'var(--warn)' }}>ทดลอง (เก็บข้อมูลในเครื่อง)</span>
        )}
        <br />
        ใช้งานผ่าน: {platform}
        {isCloudConfigured && (
          <>
            <br />
            ประวัติการวิ่ง เกม และภารกิจ: เก็บบนคลาวด์
          </>
        )}
        {built && (
          <>
            <br />
            เวอร์ชัน: {built}
            {info?.commit ? ` · ${info.commit}` : ''}
          </>
        )}
      </div>
    </div>
  )
}
