import type {
  Counters,
  Friend,
  GameKey,
  Group,
  ID,
  InviteReply,
  LatLng,
  Place,
  Profile,
  RunInvite,
  RunSession,
  TrackPoint,
} from '../types'
import { requireSupabase } from './supabase'
import { squareThumbnail } from './image'
import { simplifyPath } from './geo'
import { startOfWeek } from './format'
import { setServerTime } from './presence'

/** uuid v4 สำหรับแถวใหม่ — randomUUID ต้องใช้บน https ส่วน fallback ใช้ได้ทุกที่ */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** แถวโปรไฟล์ตามที่เก็บในฐานข้อมูล */
type ProfileRow = {
  id: string
  name: string
  emoji: string
  avatar_url?: string | null
  code: string
  bio: string
  weekly_goal_km: number
  total_km: number
  avg_pace_sec: number | null
  sharing_location: boolean
  last_active_at: string
  is_online?: boolean | null
  weekly_score?: number | null
  weekly_score_at?: string | null
  created_at: string
}

// ใช้ * แทนการไล่ชื่อคอลัมน์ เพื่อให้แอปยังทำงานได้แม้ฐานข้อมูลยังไม่มีคอลัมน์ใหม่
// (เช่น avatar_url ก่อนรัน supabase/avatars.sql) แทนที่จะพังทั้งหน้าเพราะ 42703
const PROFILE_COLS = '*'

const BANGKOK: LatLng = { lat: 13.7305, lng: 100.5418 }

function toProfile(row: ProfileRow, local: Pick<Profile, 'level' | 'xp' | 'coins'>): Profile {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    avatarUrl: row.avatar_url ?? undefined,
    code: row.code,
    weeklyGoalKm: row.weekly_goal_km,
    sharingLocation: row.sharing_location,
    createdAt: new Date(row.created_at).getTime(),
    ...local,
  }
}

/** คะแนนสัปดาห์นี้เท่านั้น ของสัปดาห์ก่อนถือว่าเป็น 0 (กระดานรีเซ็ตทุกสัปดาห์) */
function weeklyScoreOf(row: ProfileRow): number {
  if (!row.weekly_score || !row.weekly_score_at) return 0
  return new Date(row.weekly_score_at).getTime() >= startOfWeek() ? row.weekly_score : 0
}

function toFriend(row: ProfileRow, status: Friend['status'], home: LatLng): Friend {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    avatarUrl: row.avatar_url ?? undefined,
    code: row.code,
    status,
    bio: row.bio ?? '',
    totalKm: Math.round(Number(row.total_km ?? 0)),
    avgPaceSec: row.avg_pace_sec ?? 360,
    weeklyScore: weeklyScoreOf(row),
    home,
    sharingLocation: row.sharing_location,
    lastActiveAt: new Date(row.last_active_at).getTime(),
    online: row.is_online ?? undefined,
  }
}

/** id ของผู้ใช้ที่ล็อกอินอยู่ */
export async function currentUserId(): Promise<string | null> {
  const { data } = await requireSupabase().auth.getUser()
  return data.user?.id ?? null
}

// ---------- โปรไฟล์ ----------

export async function fetchMyProfile(
  local: Pick<Profile, 'level' | 'xp' | 'coins'>,
): Promise<Profile | null> {
  const uid = await currentUserId()
  if (!uid) return null
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select(PROFILE_COLS)
    .eq('id', uid)
    .maybeSingle()
  if (error) throw error
  return data ? toProfile(data as ProfileRow, local) : null
}

export async function createMyProfile(
  name: string,
  emoji: string,
  weeklyGoalKm: number,
  local: Pick<Profile, 'level' | 'xp' | 'coins'>,
): Promise<Profile> {
  const { data, error } = await requireSupabase().rpc('create_my_profile', {
    p_name: name,
    p_emoji: emoji,
    p_goal_km: weeklyGoalKm,
  })
  if (error) throw error
  const row = (Array.isArray(data) ? data[0] : data) as ProfileRow
  return toProfile(row, local)
}

/** เช็คว่าชื่อนี้ยังว่างอยู่ไหม (ไม่นับชื่อเดิมของตัวเอง) */
export async function isNameAvailable(name: string): Promise<boolean> {
  const { data, error } = await requireSupabase().rpc('is_name_available', { p_name: name })
  if (error) throw error
  return data === true
}

export async function updateMyProfile(patch: Partial<Profile>): Promise<void> {
  const uid = await currentUserId()
  if (!uid) return
  const row: Record<string, unknown> = { last_active_at: new Date().toISOString() }
  if (patch.name !== undefined) row.name = patch.name
  if (patch.emoji !== undefined) row.emoji = patch.emoji
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl ?? null
  if (patch.weeklyGoalKm !== undefined) row.weekly_goal_km = patch.weeklyGoalKm
  if (patch.sharingLocation !== undefined) row.sharing_location = patch.sharingLocation
  const { error } = await requireSupabase().from('profiles').update(row).eq('id', uid)
  if (error) throw error
}

/**
 * heartbeat บอกว่ายังเปิดแอปอยู่ (online=true) หรือกำลังจะไป (online=false)
 * ใช้ fetch ตรงแทน supabase-js เพราะตอนถูกย่อหน้าจอเบราว์เซอร์อาจหยุด JS ทันที
 * keepalive ทำให้ระบบส่งคำขอให้จนจบแม้หน้าเว็บปิดไปแล้ว (sendBeacon ใส่ header ไม่ได้)
 *
 * เรียก touch_presence() ให้เซิร์ฟเวอร์ประทับเวลาเอง แล้วเอาเวลาที่คืนมาเทียบนาฬิกาเครื่อง
 * ถ้าฐานข้อมูลยังไม่มีฟังก์ชันนี้ (ยังไม่ได้รัน presence.sql) จะถอยไปอัปเดตคอลัมน์ตรง ๆ
 */
let presenceRpcMissing = false

export async function touchPresence(online = true, keepalive = false): Promise<void> {
  const sb = requireSupabase()
  const { data } = await sb.auth.getSession()
  const session = data.session
  if (!session) return
  const base = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '')
  const headers = {
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }

  if (!presenceRpcMissing) {
    const res = await fetch(`${base}/rest/v1/rpc/touch_presence`, {
      method: 'POST',
      keepalive,
      headers,
      body: JSON.stringify({ p_online: online }),
    })
    if (res.ok) {
      const serverTime = (await res.json()) as string
      setServerTime(serverTime)
      return
    }
    // 404 = ยังไม่มีฟังก์ชัน ใช้แบบเก่าไปก่อนและไม่ต้องลองอีก
    if (res.status !== 404) throw new Error(`heartbeat ล้มเหลว (${res.status})`)
    presenceRpcMissing = true
  }

  const res = await fetch(`${base}/rest/v1/profiles?id=eq.${session.user.id}`, {
    method: 'PATCH',
    keepalive,
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ last_active_at: new Date().toISOString() }),
  })
  if (!res.ok) throw new Error(`heartbeat ล้มเหลว (${res.status})`)
}

export async function updateMyStats(totalKm: number, avgPaceSec: number | null): Promise<void> {
  const uid = await currentUserId()
  if (!uid) return
  await requireSupabase()
    .from('profiles')
    .update({ total_km: totalKm, avg_pace_sec: avgPaceSec, last_active_at: new Date().toISOString() })
    .eq('id', uid)
}

// ---------- เพื่อน ----------

type FriendshipRow = {
  id: string
  requester: string
  addressee: string
  status: 'pending' | 'accepted'
  requester_profile: ProfileRow | null
  addressee_profile: ProfileRow | null
}

export async function fetchFriends(): Promise<Friend[]> {
  const uid = await currentUserId()
  if (!uid) return []
  const { data, error } = await requireSupabase()
    .from('friendships')
    .select(
      `id,requester,addressee,status,
       requester_profile:profiles!friendships_requester_fkey(${PROFILE_COLS}),
       addressee_profile:profiles!friendships_addressee_fkey(${PROFILE_COLS})`,
    )
  if (error) throw error

  const out: Friend[] = []
  for (const row of (data ?? []) as unknown as FriendshipRow[]) {
    const iAmRequester = row.requester === uid
    const other = iAmRequester ? row.addressee_profile : row.requester_profile
    if (!other) continue
    const status: Friend['status'] =
      row.status === 'accepted' ? 'friend' : iAmRequester ? 'outgoing' : 'incoming'
    out.push(toFriend(other, status, BANGKOK))
  }
  return out
}

/** ส่งคำขอด้วยรหัสเพื่อน คืนข้อความผลลัพธ์เป็นภาษาไทยจากฝั่งฐานข้อมูล */
export async function sendFriendRequestByCode(code: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc('send_friend_request', { p_code: code })
  if (error) throw error
  return String(data)
}

export async function acceptFriendRequest(friendId: ID): Promise<void> {
  const uid = await currentUserId()
  if (!uid) return
  const { error } = await requireSupabase()
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('requester', friendId)
    .eq('addressee', uid)
  if (error) throw error
}

export async function removeFriendship(friendId: ID): Promise<void> {
  const uid = await currentUserId()
  if (!uid) return
  const { error } = await requireSupabase()
    .from('friendships')
    .delete()
    .or(`and(requester.eq.${uid},addressee.eq.${friendId}),and(requester.eq.${friendId},addressee.eq.${uid})`)
  if (error) throw error
}

// ---------- กลุ่ม ----------

type GroupRow = {
  id: string
  owner: string
  name: string
  emoji: string
  description: string
  created_at: string
  group_members: Array<{ member: string }>
}

export async function fetchGroups(): Promise<Group[]> {
  const { data, error } = await requireSupabase()
    .from('groups')
    .select('id,owner,name,emoji,description,created_at,group_members(member)')
    .order('created_at', { ascending: false })
  if (error) throw error
  const uid = await currentUserId()
  return ((data ?? []) as unknown as GroupRow[]).map((g) => ({
    id: g.id,
    name: g.name,
    emoji: g.emoji,
    description: g.description ?? '',
    memberIds: (g.group_members ?? []).map((m) => m.member).filter((m) => m !== uid),
    createdAt: new Date(g.created_at).getTime(),
  }))
}

export async function createGroupRemote(
  name: string,
  emoji: string,
  description: string,
  memberIds: ID[],
): Promise<Group> {
  const sb = requireSupabase()
  const uid = await currentUserId()
  if (!uid) throw new Error('ยังไม่ได้เข้าสู่ระบบ')
  // สร้าง id ฝั่งแอปแล้วไม่ขอค่ากลับ — เลี่ยง INSERT ... RETURNING ซึ่ง Postgres จะเอา
  // policy ของ SELECT มาตรวจแถวใหม่ด้วย และฟังก์ชัน policy ที่เป็น stable
  // ยังมองไม่เห็นแถวที่เพิ่งใส่ในสเตตเมนต์เดียวกัน
  const id = newId()
  const createdAt = Date.now()
  const { error } = await sb
    .from('groups')
    .insert({ id, owner: uid, name, emoji, description, created_at: new Date(createdAt).toISOString() })
  if (error) throw error
  await setGroupMembers(id, memberIds)
  return { id, name, emoji, description, memberIds, createdAt }
}

export async function setGroupMembers(groupId: ID, memberIds: ID[]): Promise<void> {
  const sb = requireSupabase()
  const uid = await currentUserId()
  const keep = [...new Set(memberIds)].filter((id) => id !== uid)
  const { error: delErr } = await sb.from('group_members').delete().eq('group_id', groupId)
  if (delErr) throw delErr
  if (keep.length === 0) return
  const { error } = await sb
    .from('group_members')
    .insert(keep.map((member) => ({ group_id: groupId, member })))
  if (error) throw error
}

export async function updateGroupRemote(groupId: ID, patch: Partial<Group>): Promise<void> {
  const sb = requireSupabase()
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.emoji !== undefined) row.emoji = patch.emoji
  if (patch.description !== undefined) row.description = patch.description
  if (Object.keys(row).length > 0) {
    const { error } = await sb.from('groups').update(row).eq('id', groupId)
    if (error) throw error
  }
  if (patch.memberIds) await setGroupMembers(groupId, patch.memberIds)
}

export async function deleteGroupRemote(groupId: ID): Promise<void> {
  const { error } = await requireSupabase().from('groups').delete().eq('id', groupId)
  if (error) throw error
}

// ---------- คำชวนวิ่ง ----------

type InviteRow = {
  id: string
  host: string
  title: string
  note: string
  place_name: string
  place_area: string
  lat: number
  lng: number
  start_at: string
  target_km: number
  group_id: string | null
  status: 'open' | 'cancelled' | 'done'
  created_at: string
  invite_replies: Array<{ member: string; reply: InviteReply | null }>
}

export async function fetchInvites(): Promise<RunInvite[]> {
  const { data, error } = await requireSupabase()
    .from('invites')
    .select(
      'id,host,title,note,place_name,place_area,lat,lng,start_at,target_km,group_id,status,created_at,invite_replies(member,reply)',
    )
    .order('start_at', { ascending: true })
  if (error) throw error
  const uid = await currentUserId()

  return ((data ?? []) as unknown as InviteRow[]).map((row) => {
    const replies: Record<ID, InviteReply> = {}
    let myReply: InviteReply | undefined
    for (const r of row.invite_replies ?? []) {
      if (r.member === uid) {
        if (r.reply) myReply = r.reply
        continue
      }
      if (r.reply) replies[r.member] = r.reply
    }
    return {
      id: row.id,
      title: row.title,
      place: {
        id: row.id,
        name: row.place_name,
        area: row.place_area ?? '',
        lat: row.lat,
        lng: row.lng,
        tags: [],
      } satisfies Place,
      startAt: new Date(row.start_at).getTime(),
      targetKm: Number(row.target_km),
      note: row.note ?? '',
      groupId: row.group_id ?? undefined,
      inviteeIds: (row.invite_replies ?? []).map((r) => r.member).filter((m) => m !== uid),
      replies,
      hostIsMe: row.host === uid,
      hostId: row.host === uid ? undefined : row.host,
      myReply,
      createdAt: new Date(row.created_at).getTime(),
      status: row.status,
    }
  })
}

export async function createInviteRemote(input: {
  title: string
  place: Place
  startAt: number
  targetKm: number
  note: string
  groupId?: ID
  inviteeIds: ID[]
}): Promise<void> {
  const sb = requireSupabase()
  const uid = await currentUserId()
  if (!uid) throw new Error('ยังไม่ได้เข้าสู่ระบบ')

  const id = newId()
  const { error } = await sb.from('invites').insert({
    id,
    host: uid,
    title: input.title,
    note: input.note,
    place_name: input.place.name,
    place_area: input.place.area,
    lat: input.place.lat,
    lng: input.place.lng,
    start_at: new Date(input.startAt).toISOString(),
    target_km: input.targetKm,
    group_id: input.groupId ?? null,
  })
  if (error) throw error

  // เจ้าภาพนับเป็นไปแน่นอน ส่วนคนที่ถูกชวนเริ่มจากยังไม่ตอบ
  const rows = [
    { invite_id: id, member: uid, reply: 'going' as InviteReply },
    ...input.inviteeIds.map((member) => ({ invite_id: id, member, reply: null })),
  ]
  const { error: rErr } = await sb.from('invite_replies').insert(rows)
  if (rErr) throw rErr
}

export async function replyInviteRemote(inviteId: ID, reply: InviteReply): Promise<void> {
  const uid = await currentUserId()
  if (!uid) return
  const { error } = await requireSupabase()
    .from('invite_replies')
    .update({ reply, replied_at: new Date().toISOString() })
    .eq('invite_id', inviteId)
    .eq('member', uid)
  if (error) throw error
}

export async function cancelInviteRemote(inviteId: ID): Promise<void> {
  const { error } = await requireSupabase().from('invites').update({ status: 'cancelled' }).eq('id', inviteId)
  if (error) throw error
}

// ---------- ตำแหน่งสด ----------

export type FriendLocation = { userId: ID; pos: LatLng; speedKmh: number; updatedAt: number }

export async function pushMyLocation(pos: LatLng, speedKmh: number | null): Promise<void> {
  const uid = await currentUserId()
  if (!uid) return
  const { error } = await requireSupabase().from('locations').upsert(
    {
      user_id: uid,
      lat: pos.lat,
      lng: pos.lng,
      speed_kmh: speedKmh,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw error
}

export async function clearMyLocation(): Promise<void> {
  const uid = await currentUserId()
  if (!uid) return
  await requireSupabase().from('locations').delete().eq('user_id', uid)
}

export async function fetchFriendLocations(): Promise<FriendLocation[]> {
  const uid = await currentUserId()
  const { data, error } = await requireSupabase()
    .from('locations')
    .select('user_id,lat,lng,speed_kmh,updated_at')
  if (error) throw error
  return (data ?? [])
    .filter((r) => r.user_id !== uid)
    .map((r) => ({
      userId: r.user_id as string,
      pos: { lat: r.lat as number, lng: r.lng as number },
      speedKmh: Number(r.speed_kmh ?? 0),
      updatedAt: new Date(r.updated_at as string).getTime(),
    }))
}

const WATCHED_TABLES = ['friendships', 'invites', 'invite_replies', 'locations', 'profiles']

/**
 * รับสัญญาณเมื่อข้อมูลฝั่งเซิร์ฟเวอร์เปลี่ยน คืนฟังก์ชันสำหรับยกเลิก
 *
 * ชื่อ channel ต้องไม่ซ้ำกันในแต่ละครั้งที่เรียก เพราะ supabase-js จะคืน channel
 * ตัวเดิมเมื่อชื่อซ้ำ แล้วการ .on() ทับหลังจากที่ตัวนั้น subscribe ไปแล้วจะโยน error
 * ("cannot add postgres_changes callbacks ... after subscribe()") ทำให้ฝั่งที่เรียกทีหลัง
 * พังทั้งคอมโพเนนต์
 */
export type ChangeRow = Record<string, unknown>

export function subscribeToChanges(
  onChange: (table: string, row: ChangeRow | null) => void,
  tables: string[] = WATCHED_TABLES,
): () => void {
  const sb = requireSupabase()
  const channel = sb.channel(`wanna-run:${newId()}`)
  for (const table of tables) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      const row = payload.new && typeof payload.new === 'object' && Object.keys(payload.new).length > 0 ? (payload.new as ChangeRow) : null
      onChange(table, row)
    })
  }
  channel.subscribe()
  return () => {
    void sb.removeChannel(channel)
  }
}


/**
 * เช็คว่าแถวโปรไฟล์ที่เปลี่ยนคือแค่สถานะออนไลน์ของเพื่อนคนนี้หรือเปล่า
 * ถ้าใช่ คืนค่าที่ต้องแปะในสเตตให้เลย ไม่ต้องดึงทั้งชุดใหม่
 */
export function heartbeatOnly(row: ChangeRow, friend: Friend): Pick<Friend, 'lastActiveAt' | 'online'> | null {
  if (row.id !== friend.id || typeof row.last_active_at !== 'string') return null
  const same =
    row.name === friend.name &&
    row.emoji === friend.emoji &&
    (row.avatar_url ?? undefined) === friend.avatarUrl &&
    row.sharing_location === friend.sharingLocation &&
    Math.round(Number(row.total_km ?? 0)) === friend.totalKm &&
    (row.avg_pace_sec ?? 360) === friend.avgPaceSec &&
    (row.bio ?? '') === friend.bio
  if (!same) return null
  return {
    lastActiveAt: new Date(row.last_active_at).getTime(),
    online: typeof row.is_online === 'boolean' ? row.is_online : undefined,
  }
}

// ---------- จุดวิ่งประจำ ----------

type SpotRow = { id: string; name: string; area: string; lat: number; lng: number; created_at: string }

export async function fetchSpots(): Promise<Place[]> {
  const { data, error } = await requireSupabase()
    .from('spots')
    .select('id,name,area,lat,lng,created_at')
    .order('created_at', { ascending: false })
  // ยังไม่ได้รัน spots.sql (42P01) → โยนต่อไป ให้ refresh เก็บรายการในเครื่องไว้ตามเดิม
  if (error) throw error
  return ((data ?? []) as SpotRow[]).map((r) => ({ id: r.id, name: r.name, area: r.area ?? '', lat: r.lat, lng: r.lng, tags: ['จุดประจำ'] }))
}

export async function createSpotRemote(spot: Place): Promise<void> {
  const uid = await currentUserId()
  if (!uid) throw new Error('ยังไม่ได้เข้าสู่ระบบ')
  const { error } = await requireSupabase()
    .from('spots')
    .insert({ id: spot.id, owner: uid, name: spot.name, area: spot.area, lat: spot.lat, lng: spot.lng })
  if (error) throw error
}

export async function deleteSpotRemote(spotId: ID): Promise<void> {
  const { error } = await requireSupabase().from('spots').delete().eq('id', spotId)
  if (error) throw error
}

// ---------- ประวัติการวิ่ง / ความคืบหน้า / คะแนนเกม ----------

type RunRow = {
  id: string
  started_at: string
  ended_at: string
  distance_m: number
  moving_ms: number
  path: TrackPoint[] | null
  invite_id: string | null
  place_name: string | null
  simulated: boolean
}

function toRun(r: RunRow): RunSession {
  return {
    id: r.id,
    startedAt: new Date(r.started_at).getTime(),
    endedAt: new Date(r.ended_at).getTime(),
    distanceM: Number(r.distance_m),
    movingMs: Number(r.moving_ms),
    path: Array.isArray(r.path) ? r.path : [],
    inviteId: r.invite_id ?? undefined,
    placeName: r.place_name ?? undefined,
    simulated: r.simulated,
  }
}

export async function fetchRuns(): Promise<RunSession[]> {
  const { data, error } = await requireSupabase()
    .from('runs')
    .select('id,started_at,ended_at,distance_m,moving_ms,path,invite_id,place_name,simulated')
    .order('started_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return ((data ?? []) as RunRow[]).map(toRun)
}

/** id ของกิจกรรมที่สร้างในเครื่อง (rn_xxx) ใช้เป็น uuid ไม่ได้ จึงแปลงให้ตอนอัปขึ้น */
function runRow(run: RunSession, owner: string) {
  return {
    id: /^[0-9a-f-]{36}$/i.test(run.id) ? run.id : newId(),
    owner,
    started_at: new Date(run.startedAt).toISOString(),
    ended_at: new Date(run.endedAt).toISOString(),
    distance_m: run.distanceM,
    moving_ms: Math.round(run.movingMs),
    // ลดจุดก่อนเก็บ ประหยัดพื้นที่แต่เส้นทางบนแผนที่ยังเหมือนเดิม
    path: simplifyPath(run.path),
    invite_id: run.inviteId ?? null,
    place_name: run.placeName ?? null,
    simulated: run.simulated,
  }
}

export async function saveRunRemote(run: RunSession): Promise<void> {
  const uid = await currentUserId()
  if (!uid) throw new Error('ยังไม่ได้เข้าสู่ระบบ')
  const { error } = await requireSupabase().from('runs').insert(runRow(run, uid))
  if (error) throw error
}

export async function deleteRunRemote(runId: ID): Promise<void> {
  const { error } = await requireSupabase().from('runs').delete().eq('id', runId)
  if (error) throw error
}

/** อัปประวัติที่เคยเก็บไว้ในเครื่องขึ้นเซิร์ฟเวอร์ครั้งแรกที่ล็อกอิน คืนรายการที่อัปแล้ว */
export async function uploadLocalRuns(runs: RunSession[]): Promise<RunSession[]> {
  const uid = await currentUserId()
  if (!uid || runs.length === 0) return []
  const rows = runs.map((r) => runRow(r, uid))
  const { error } = await requireSupabase().from('runs').insert(rows)
  if (error) throw error
  return rows.map((row, i) => ({ ...runs[i], id: row.id }))
}

export type Progress = {
  xp: number
  coins: number
  counters: Counters
  claimed: string[]
  lastSpinAt: number
}

export async function fetchProgress(): Promise<Progress | null> {
  const uid = await currentUserId()
  if (!uid) return null
  const { data, error } = await requireSupabase()
    .from('progress')
    .select('xp,coins,counters,claimed,last_spin_at')
    .eq('owner', uid)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as { xp: number; coins: number; counters: Counters; claimed: string[]; last_spin_at: string | null }
  return {
    xp: row.xp,
    coins: row.coins,
    counters: row.counters,
    claimed: Array.isArray(row.claimed) ? row.claimed : [],
    lastSpinAt: row.last_spin_at ? new Date(row.last_spin_at).getTime() : 0,
  }
}

export async function saveProgress(p: Progress): Promise<void> {
  const uid = await currentUserId()
  if (!uid) return
  const { error } = await requireSupabase().from('progress').upsert(
    {
      owner: uid,
      xp: p.xp,
      coins: p.coins,
      counters: p.counters,
      claimed: p.claimed,
      last_spin_at: p.lastSpinAt ? new Date(p.lastSpinAt).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'owner' },
  )
  if (error) throw error
}

/** ส่งคะแนนมินิเกมสัปดาห์นี้ขึ้นโปรไฟล์ ให้เพื่อนเห็นบนกระดาน */
export async function updateWeeklyScore(score: number): Promise<void> {
  const uid = await currentUserId()
  if (!uid) return
  const { error } = await requireSupabase()
    .from('profiles')
    .update({ weekly_score: Math.round(score), weekly_score_at: new Date().toISOString() })
    .eq('id', uid)
  if (error) throw error
}

export async function fetchGameScores(): Promise<Partial<Record<GameKey, number>>> {
  const { data, error } = await requireSupabase().from('game_scores').select('game,best_score')
  if (error) throw error
  const out: Partial<Record<GameKey, number>> = {}
  for (const row of (data ?? []) as Array<{ game: GameKey; best_score: number }>) out[row.game] = row.best_score
  return out
}

export async function saveGameScore(game: GameKey, best: number): Promise<void> {
  const uid = await currentUserId()
  if (!uid) return
  const { error } = await requireSupabase()
    .from('game_scores')
    .upsert({ owner: uid, game, best_score: best, updated_at: new Date().toISOString() }, { onConflict: 'owner,game' })
  if (error) throw error
}


// ---------- รูปโปรไฟล์ ----------

const AVATAR_BUCKET = 'avatars'

/** ย่อรูปแล้วอัปขึ้น Storage คืน URL สาธารณะพร้อมพารามิเตอร์กันแคชค้าง */
export async function uploadAvatar(file: File): Promise<string> {
  const sb = requireSupabase()
  const uid = await currentUserId()
  if (!uid) throw new Error('ยังไม่ได้เข้าสู่ระบบ')

  const thumb = await squareThumbnail(file)
  const path = `${uid}/avatar.jpg`
  const { error } = await sb.storage
    .from(AVATAR_BUCKET)
    .upload(path, thumb, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' })
  if (error) throw error

  const { data } = sb.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  // ที่อยู่ไฟล์เหมือนเดิมทุกครั้ง จึงต้องต่อเวอร์ชันไว้ให้เบราว์เซอร์โหลดรูปใหม่
  const url = `${data.publicUrl}?v=${Date.now()}`
  await updateMyProfile({ avatarUrl: url })
  return url
}

export async function removeAvatar(): Promise<void> {
  const sb = requireSupabase()
  const uid = await currentUserId()
  if (!uid) return
  await sb.storage.from(AVATAR_BUCKET).remove([`${uid}/avatar.jpg`])
  // ล้างค่าตรง ๆ เพราะ updateMyProfile ข้ามฟิลด์ที่เป็น undefined
  const { error } = await sb.from('profiles').update({ avatar_url: null }).eq('id', uid)
  if (error) throw error
}
