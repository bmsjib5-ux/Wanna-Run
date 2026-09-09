import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { LatLng } from '../types'

export type MapPin = {
  id: string
  pos: LatLng
  emoji: string
  label?: string
  me?: boolean
}

function icon(pin: MapPin) {
  return L.divIcon({
    className: '',
    html: `<div class="pin ${pin.me ? 'me' : ''}"><div class="bubble">${pin.emoji}</div>${
      pin.label ? `<div class="tag">${escapeHtml(pin.label)}</div>` : ''
    }</div>`,
    iconSize: [34, pin.label ? 52 : 34],
    iconAnchor: [17, pin.label ? 26 : 17],
  })
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
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

type Props = {
  center: LatLng
  zoom?: number
  pins?: MapPin[]
  track?: LatLng[]
  fit?: [[number, number], [number, number]] | null
  onPick?: (p: LatLng) => void
  className?: string
  follow?: boolean
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
}: Props) {
  const line = useMemo(() => (track ?? []).map((p) => [p.lat, p.lng] as [number, number]), [track])

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
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
          maxZoom={20}
        />
        {line.length > 1 && <Polyline positions={line} pathOptions={{ color: '#c6f24e', weight: 5, opacity: 0.95 }} />}
        {pins.map((p) => (
          <Marker key={p.id} position={[p.pos.lat, p.pos.lng]} icon={icon(p)} />
        ))}
        {follow && <Recenter center={center} zoom={zoom} fit={fit} />}
        {onPick && <ClickCatcher onPick={onPick} />}
      </MapContainer>
    </div>
  )
}
