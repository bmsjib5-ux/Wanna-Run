/** ไอคอนเส้นสำหรับหน้าเข้าสู่ระบบ ใช้ currentColor จึงเปลี่ยนสีตามธีมเอง */
type Props = { size?: number }

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export function MailIcon({ size = 20 }: Props) {
  return (
    <svg {...base(size)}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
      <path d="M3.5 7.5 12 13l8.5-5.5" />
    </svg>
  )
}

export function LockIcon({ size = 20 }: Props) {
  return (
    <svg {...base(size)}>
      <rect x="4" y="10.5" width="16" height="10" rx="3" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  )
}

export function EyeIcon({ size = 19, off = false }: Props & { off?: boolean }) {
  return (
    <svg {...base(size)}>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 20 20 4" />}
    </svg>
  )
}

export function SignInIcon({ size = 19 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M14 3.5h4a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-4" />
      <path d="M10 8.5 13.5 12 10 15.5" />
      <path d="M3.5 12h10" />
    </svg>
  )
}

export function UserPlusIcon({ size = 19 }: Props) {
  return (
    <svg {...base(size)}>
      <circle cx="10" cy="8" r="3.6" />
      <path d="M3.6 20c.7-3.3 3.3-5.2 6.4-5.2 1.2 0 2.3.3 3.2.8" />
      <path d="M17.5 14.5v6M14.5 17.5h6" />
    </svg>
  )
}

export function ShoeIcon({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M2.5 16.5h19a0 0 0 0 1 0 0v1a2 2 0 0 1-2 2h-17Z" />
      <path d="M2.5 16.5v-6l4-1 2.5 2.5 3-1.5 2 2 4 1a5 5 0 0 1 3.5 3" />
    </svg>
  )
}

export function UsersIcon({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19.5c.6-3 2.9-4.8 6-4.8s5.4 1.8 6 4.8" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6M17.5 15c2 .6 3.4 2.2 3.9 4.5" />
    </svg>
  )
}

export function HeartIcon({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M12 20s-7.5-4.3-7.5-9.3A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.5 2.7C19.5 15.7 12 20 12 20Z" />
    </svg>
  )
}

export function ChartIcon({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M4 20V13M10 20V7M16 20v-4M22 20H2" />
    </svg>
  )
}
