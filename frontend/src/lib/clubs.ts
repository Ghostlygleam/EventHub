export interface Club {
  id: string
  name: string
  description: string | null
  owner_id: string
  owner_email: string | null
  is_active: boolean
  created_at: string
  events_count: number
}

export interface ClubsResponse {
  clubs: Club[]
  page: number
  total: number
  pages: number
}

export interface ClubFormValues {
  name: string
  description: string
  owner_id: string  // empty string = "use current admin"
}

export const EMPTY_CLUB_FORM: ClubFormValues = {
  name: '',
  description: '',
  owner_id: '',
}

/** Visual accent — one of four event-type-palette HSL triplets, picked by id hash. */
const ACCENT_PALETTE = [
  '217 91% 50%',  // blue
  '0 100% 30%',   // crimson
  '142 60% 38%',  // green
  '262 52% 50%',  // purple
]

export function deriveClubAccent(id: string): string {
  /* Stable hash from the first few chars of the UUID. */
  const seed = id.replace(/-/g, '').slice(0, 4)
  let n = 0
  for (let i = 0; i < seed.length; i++) n = (n + seed.charCodeAt(i)) >>> 0
  return ACCENT_PALETTE[n % ACCENT_PALETTE.length]
}

export function clubSerial(id: string): string {
  return id.replace(/-/g, '').slice(0, 4).toUpperCase()
}

/** Two-letter initials for the avatar — from the first two words of the club name. */
export function clubInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'CL'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
