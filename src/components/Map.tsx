import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import L, { type DivIcon } from 'leaflet'
import type { LatLng } from '../types'

export type MapPin = {
  id: string
  pos: LatLng
  emoji: string
  /** รูปโปรไฟล์ ถ้ามีจะแสดงแทนอิโมจิ */
  photo?: string
  label?: string
  me?: boolean
}

// เก็บ icon ที่สร้างแล้วไว้ใช้ซ้ำ ไม่ต้องสร้างใหม่ทุกครั้งที่ re-render
// (ชื่อ Map ในไฟล์นี้เป็นคอมโพเนนต์ จึงใช้ออบเจกต์ธรรมดาแทน)
const iconCache: Record<string, DivIcon> = {}

function icon(pin: MapPin): DivIcon {
  const key = `${pin.emoji}|${pin.photo ?? ''}|${pin.label ?? ''}|${pin.me ? 1 : 0}`
  iconCache[key] ??= buildIcon(pin)
  return iconCache[key]
}

function buildIcon(pin: MapPin) {
  return L.divIcon({
    className: '',
    html: `<div class="pin ${pin.me ? 'me' : ''}"><div class="bubble">${
      pin.photo
        ? `<img src="${escapeHtml(pin.photo)}" alt="" />`
        : pin.emoji
    }</div>${pin.label ? `<div class="tag">${escapeHtml(pin.label)}</div>` : ''}</div>`,
    iconSize: [34, pin.label ? 52 : 34],
    iconAnchor: [17, pin.label ? 26 : 17],
  })
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}

/** บอก Leaflet ให้คำนวณขนาดใหม่เมื่อกล่องแผนที่เปลี่ยนขนาด */
function ResizeWatcher() {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }))
    observer.observe(el)
    // เผื่อกรณีที่ layout ยังไม่นิ่งตอน mount แรก
    const t = window.setTimeout(() => map.invalidateSize({ animate: false }), 250)
    return () => {
      observer.disconnect()
      window.clearTimeout(t)
    }
  }, [map])
  return null
}

function Recenter({ center, zoom, fit }: { center: LatLng; zoom?: number; fit?: [[number, number], [number, number]] | null }) {
  const map = useMap()
  useEffect(() => {
    if (fit) map.fitBounds(fit, { padding: [24, 24] })
    else map.setView([center.lat, center.lng], zoom ?? map.getZoom(), { animate: true })
  }, [map, center.lat, center.lng, zoom, fit])
  return null
}

function ClickCatcher({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

/** ชั้นแผนที่ให้เลือกแบบเดียวกับ Google Maps: แผนที่ปกติ กับ ภาพถ่ายดาวเทียม */
const LAYERS = {
  map: {
    label: '🗺️ แผนที่',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    // ภาพดาวเทียมของ Esri ไม่มีชื่อถนน จึงต้องซ้อนชั้นตัวอักษรทับอีกที
    labels: null as string | null,
  },
  satellite: {
    label: '🛰️ ดาวเทียม',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'ภาพถ่าย &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
    labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  },
} as const

export type MapLayer = keyof typeof LAYERS

type Props = {
  center: LatLng
  zoom?: number
  pins?: MapPin[]
  track?: LatLng[]
  fit?: [[number, number], [number, number]] | null
  onPick?: (p: LatLng) => void
  className?: string
  follow?: boolean
  /** แสดงปุ่มสลับแผนที่/ดาวเทียม */
  layers?: boolean
  /** แสดงปุ่มกลับไปตำแหน่งฉัน */
  onLocate?: () => void
  /** ตำแหน่งฉันพร้อมใช้แล้วหรือยัง (ใช้บอกสถานะปุ่ม) */
  locating?: boolean
}

export default function Map({
  center,
  zoom = 15,
  pins = [],
  track,
  fit = null,
  onPick,
  className = 'map-box',
  follow = true,
  layers = false,
  onLocate,
  locating = false,
}: Props) {
  const line = useMemo(() => (track ?? []).map((p) => [p.lat, p.lng] as [number, number]), [track])
  const [layer, setLayer] = useState<MapLayer>('map')
  const tiles = LAYERS[layer]

  return (
    <div className={className}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        className="map"
        zoomControl={false}
        attributionControl
        scrollWheelZoom
      >
        {/*
          แผนที่ปกติใช้ tile มาตรฐานของ OpenStreetMap: มีชื่อถนนและสถานที่ภาษาไทยครบ
          ไม่ต้องมี API key (CARTO ที่ใช้เดิมเปลี่ยนนโยบายให้ต้องมีคีย์ ไม่งั้นแปะลายน้ำทับ)
          ส่วนดาวเทียมใช้ภาพของ Esri ซึ่งเปิดให้ใช้ได้เมื่อใส่ที่มา
          ทั้งสองเจ้าขอให้ไม่ดึงจำนวนมหาศาล ซึ่งเหมาะกับแอปขนาดนี้
        */}
        <TileLayer key={layer} url={tiles.url} attribution={tiles.attribution} maxZoom={tiles.maxZoom} />
        {tiles.labels && <TileLayer key={`${layer}-labels`} url={tiles.labels} maxZoom={tiles.maxZoom} />}
        <ZoomControl position="bottomright" />
        {line.length > 1 && <Polyline positions={line} pathOptions={{ color: '#c6f24e', weight: 5, opacity: 0.95 }} />}
        {pins.map((p) => (
          <Marker key={p.id} position={[p.pos.lat, p.pos.lng]} icon={icon(p)} />
        ))}
        <ResizeWatcher />
        {follow && <Recenter center={center} zoom={zoom} fit={fit} />}
        {onPick && <ClickCatcher onPick={onPick} />}
      </MapContainer>

      {layers && (
        <button
          className="map-ctl layers"
          onClick={() => setLayer((v) => (v === 'map' ? 'satellite' : 'map'))}
          aria-label={`สลับเป็น${layer === 'map' ? 'ภาพดาวเทียม' : 'แผนที่ปกติ'}`}
        >
          {LAYERS[layer === 'map' ? 'satellite' : 'map'].label}
        </button>
      )}

      {onLocate && (
        <button className="map-ctl locate" onClick={onLocate} aria-label="ไปที่ตำแหน่งฉัน">
          {locating ? '◌' : '◎'}
        </button>
      )}
    </div>
  )
}
