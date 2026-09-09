export type ID = string

export type Profile = {
  id: ID
  name: string
  emoji: string
  /** รูปโปรไฟล์ที่ผู้ใช้อัปเอง ถ้าไม่มีจะใช้อิโมจิแทน */
  avatarUrl?: string
  code: string
  level: number
  xp: number
  coins: number
  weeklyGoalKm: number
  sharingLocation: boolean
  createdAt: number
}

export type FriendStatus = 'friend' | 'incoming' | 'outgoing' | 'suggested'

export type LatLng = { lat: number; lng: number }

export type Friend = {
  id: ID
  name: string
  emoji: string
  avatarUrl?: string
  code: string
  status: FriendStatus
  bio: string
  totalKm: number
  avgPaceSec: number
  /** ตำแหน่งฐาน ใช้จำลองการเคลื่อนที่บนแผนที่สด */
  home: LatLng
  sharingLocation: boolean
  lastActiveAt: number
  /** แอปเปิดอยู่ (ตั้งจาก heartbeat, ปิดทันทีเมื่อถูกย่อ) — undefined ถ้าฐานข้อมูลยังไม่มีคอลัมน์ */
  online?: boolean
}

export type Group = {
  id: ID
  name: string
  emoji: string
  description: string
  memberIds: ID[]
  createdAt: number
}

export type Place = {
  id: ID
  name: string
  area: string
  lat: number
  lng: number
  loopKm?: number
  tags: string[]
}

export type InviteReply = 'going' | 'maybe' | 'declined'

export type RunInvite = {
  id: ID
  title: string
  place: Place
  startAt: number
  targetKm: number
  note: string
  groupId?: ID
  inviteeIds: ID[]
  replies: Record<ID, InviteReply>
  hostIsMe: boolean
  hostId?: ID
  myReply?: InviteReply
  createdAt: number
  status: 'open' | 'cancelled' | 'done'
}

export type TrackPoint = { lat: number; lng: number; t: number }

export type RunSession = {
  id: ID
  startedAt: number
  endedAt: number
  distanceM: number
  movingMs: number
  path: TrackPoint[]
  inviteId?: ID
  placeName?: string
  simulated: boolean
}

export type MissionMetric =
  | 'distanceKm'
  | 'runCount'
  | 'inviteSent'
  | 'friendAdded'
  | 'groupCreated'
  | 'gamePlayed'
  | 'gameScore'
  | 'locationShared'

export type Mission = {
  id: ID
  title: string
  detail: string
  metric: MissionMetric
  target: number
  progress: number
  xp: number
  coins: number
  period: 'daily' | 'weekly' | 'season'
  claimed: boolean
}

export type AppNotification = {
  id: ID
  kind: 'invite' | 'friend' | 'group' | 'mission' | 'location' | 'run' | 'game'
  title: string
  body: string
  at: number
  read: boolean
  goto?: string
}

export type GameKey = 'tapsprint' | 'spin' | 'quiz'

export type PeriodCounters = {
  distanceKm: number
  runCount: number
  inviteSent: number
  friendAdded: number
  groupCreated: number
  gamePlayed: number
  gameScore: number
  locationShared: number
}

export type Counters = {
  dayKey: string
  weekKey: string
  daily: PeriodCounters
  weekly: PeriodCounters
  season: PeriodCounters
}

export type AppState = {
  version: number
  onboarded: boolean
  profile: Profile
  friends: Friend[]
  groups: Group[]
  invites: RunInvite[]
  runs: RunSession[]
  missions: Mission[]
  counters: Counters
  notifications: AppNotification[]
  highScores: Record<GameKey, number>
  lastSpinAt: number
  places: Place[]
}
