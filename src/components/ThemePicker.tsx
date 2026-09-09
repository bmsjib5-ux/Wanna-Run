import { ACCENTS, MODES, useTheme } from '../lib/theme'

/** การ์ดตั้งค่าธีม: เลือกโหมดมืด/สว่าง และสีหลักของแอป */
export default function ThemePicker() {
  const [theme, setTheme] = useTheme()

  return (
    <div className="card">
      <div className="strong" style={{ fontSize: 14.5 }}>
        ธีมของแอป
      </div>
      <div className="muted tiny" style={{ marginTop: 2 }}>
        เก็บไว้ในเครื่องนี้ ไม่กระทบเพื่อนหรือเครื่องอื่น
      </div>

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
    </div>
  )
}
