import { useRef, useState } from 'react'
import { ACCENTS, MODES, PRESETS, useTheme } from '../lib/theme'
import { DIMS, useBackground } from '../lib/background'
import { pushNotice } from '../lib/notify'

/** การ์ดตั้งค่าธีม: เลือกโหมดมืด/สว่าง และสีหลักของแอป */
export default function ThemePicker() {
  const [theme, setTheme] = useTheme()
  const { background, setImage, setDim, clear } = useBackground()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      await setImage(file)
    } catch (err) {
      pushNotice('ใช้รูปนี้ไม่ได้', err instanceof Error ? err.message : 'ลองรูปอื่นดูนะ')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="card">
      <div className="strong" style={{ fontSize: 14.5 }}>
        ธีมของแอป
      </div>
      <div className="muted tiny" style={{ marginTop: 2 }}>
        เก็บไว้ในเครื่องนี้ ไม่กระทบเพื่อนหรือเครื่องอื่น
      </div>

      <div className="field" style={{ marginTop: 14, marginBottom: 14 }}>
        <span>สไตล์สำเร็จรูป</span>
        <div className="styles" role="radiogroup" aria-label="สไตล์ของแอป">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              role="radio"
              aria-checked={theme.preset === p.key}
              className={`style-pick${theme.preset === p.key ? ' on' : ''}`}
              onClick={() => setTheme({ preset: p.key })}
            >
              {/* ตัวอย่างย่อใช้จานสีของสไตล์นั้นจริง ๆ ผ่านคลาส .p-* */}
              <span className={`style-demo${p.key === 'custom' ? '' : ` p-${p.key}`}`}>
                <span className="d-bar">
                  <span className="d-dot" />
                  <span className="d-line" />
                </span>
                <span className="d-card">
                  <span className="d-line" />
                  <span className="d-btn" />
                </span>
                <span className="d-row">
                  <span className="d-sq hot" />
                  <span className="d-sq" />
                  <span className="d-sq" />
                </span>
              </span>
              <span className="style-name">
                {p.label}
                {theme.preset === p.key && <span className="tick">✓</span>}
              </span>
            </button>
          ))}
        </div>
        <div className="muted tiny" style={{ marginTop: 8 }}>
          {PRESETS.find((p) => p.key === theme.preset)?.detail}
        </div>
      </div>

      {theme.preset === 'custom' && (
        <>
      <div className="field" style={{ marginTop: 14, marginBottom: 14 }}>
        <span>โหมด</span>
        <div className="seg" role="radiogroup" aria-label="โหมดสี">
          {MODES.map((m) => (
            <button
              key={m.key}
              role="radio"
              aria-checked={theme.mode === m.key}
              className={theme.mode === m.key ? 'on' : ''}
              onClick={() => setTheme({ mode: m.key })}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <span>สีหลัก</span>
        <div className="row wrap" style={{ gap: 10 }} role="radiogroup" aria-label="สีหลัก">
          {ACCENTS.map((a) => (
            <button
              key={a.key}
              role="radio"
              aria-checked={theme.accent === a.key}
              aria-label={a.label}
              title={a.label}
              className={`swatch${theme.accent === a.key ? ' on' : ''}`}
              style={{ background: a.swatch }}
              onClick={() => setTheme({ accent: a.key })}
            >
              {theme.accent === a.key ? '✓' : ''}
            </button>
          ))}
        </div>
        <div className="muted tiny" style={{ marginTop: 8 }}>
          {ACCENTS.find((a) => a.key === theme.accent)?.label}
        </div>
      </div>
        </>
      )}

      <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
        <span>รูปพื้นหลัง</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => void pick(e.target.files?.[0])}
        />
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <button
            className="bg-preview"
            aria-label={background ? 'เปลี่ยนรูปพื้นหลัง' : 'เลือกรูปพื้นหลังจากเครื่อง'}
            style={background ? { backgroundImage: `url("${background.image}")` } : undefined}
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {busy ? '⏳' : background ? '' : '🖼️'}
          </button>
          <div className="grow stack-8">
            <button className="btn sm block" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? 'กำลังเตรียมรูป…' : background ? '🖼️ เปลี่ยนรูป' : '🖼️ เลือกรูปจากเครื่อง'}
            </button>
            {background && (
              <button className="btn ghost sm block" onClick={clear}>
                ใช้พื้นหลังธีมปกติ
              </button>
            )}
          </div>
        </div>
        {background && (
          <div style={{ marginTop: 12 }}>
            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>
              ความชัดของรูป
            </span>
            <div className="seg" role="radiogroup" aria-label="ความชัดของรูปพื้นหลัง">
              {DIMS.map((d) => (
                <button
                  key={d.key}
                  role="radio"
                  aria-checked={background.dim === d.key}
                  className={background.dim === d.key ? 'on' : ''}
                  onClick={() => setDim(d.key)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="muted tiny" style={{ marginTop: 8 }}>
          รูปถูกย่อและเก็บไว้ในเครื่องนี้เท่านั้น ไม่อัปโหลดไปไหน
        </div>
      </div>
    </div>
  )
}
