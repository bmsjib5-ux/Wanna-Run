import { Footprints } from 'lucide-react'

export default function Brand({ tagline = true }: { tagline?: boolean }) {
  return <div className="run-brand">
    <Footprints size={44} strokeWidth={1.7} aria-hidden="true" />
    <h1>ไปวิ่งไหม</h1>
    {tagline && <p>สุขภาพดี เริ่มได้จากก้าวแรก</p>}
  </div>
}
