import type { SVGProps } from 'react'

/**
 * ไอคอนเส้นแบบเรียบ ใช้ currentColor จึงเปลี่ยนสีตามสถานะได้
 * เลือกใช้ SVG แทนอิโมจิ เพราะอิโมจิแสดงผลต่างกันในแต่ละระบบปฏิบัติการ
 * ขนาดไม่เท่ากัน และย้อมสีตามธีมไม่ได้
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export function IconHome(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 10.6 12 3.2l9 7.4" />
      <path d="M5.6 9.4V19.4a1.4 1.4 0 0 0 1.4 1.4h3.2v-5.4h3.6v5.4H17a1.4 1.4 0 0 0 1.4-1.4V9.4" />
    </Svg>
  )
}

export function IconFriends(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9.2" cy="8.2" r="3.3" />
      <path d="M3.4 20.2c0-3.4 2.6-5.6 5.8-5.6s5.8 2.2 5.8 5.6" />
      <path d="M16.4 5.4a3.3 3.3 0 0 1 0 6" />
      <path d="M17.6 14.9c1.9.7 3 2.5 3 5.3" />
    </Svg>
  )
}

export function IconRun(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="15.6" cy="4.6" r="2.1" />
      <path d="M8.4 21.2 11 16.5l-2.9-2.6.9-4.6L6 10.9 4.6 14" />
      <path d="M9 9.3 13.4 7.7l2.8 3 3.2.8" />
      <path d="M11 16.5h3.6l2 4.7" />
    </Svg>
  )
}

export function IconMap(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9.2 3.5 3.6 5.9v14.6l5.6-2.4 5.6 2.4 5.6-2.4V3.5l-5.6 2.4-5.6-2.4Z" />
      <path d="M9.2 3.5v14.6M14.8 5.9v14.6" />
    </Svg>
  )
}

export function IconTarget(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function IconGroup(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="7.4" r="2.9" />
      <circle cx="5.4" cy="10.6" r="2.3" />
      <circle cx="18.6" cy="10.6" r="2.3" />
      <path d="M7.2 19.4c0-2.9 2.1-4.8 4.8-4.8s4.8 1.9 4.8 4.8" />
      <path d="M2.6 18.2c0-2.2 1.3-3.6 3.4-3.6M21.4 18.2c0-2.2-1.3-3.6-3.4-3.6" />
    </Svg>
  )
}

export function IconMegaphone(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 10.2v3.6a1.6 1.6 0 0 0 1.6 1.6h1.9l7.9 4.2V4.4L7.5 8.6H5.6A1.6 1.6 0 0 0 4 10.2Z" />
      <path d="M18.4 8.6a4.6 4.6 0 0 1 0 6.8" />
      <path d="M7.5 15.4v3.4a1.6 1.6 0 0 0 1.6 1.6h.8" />
    </Svg>
  )
}

export function IconBell(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M18 16.2V10.8a6 6 0 1 0-12 0v5.4L4.4 18.4h15.2L18 16.2Z" />
      <path d="M10 21.2a2.4 2.4 0 0 0 4 0" />
    </Svg>
  )
}
