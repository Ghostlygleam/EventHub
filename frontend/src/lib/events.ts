export type EventType = 'lecture' | 'club' | 'workshop' | 'other'
export type EventStatus = 'upcoming' | 'past'

export interface Event {
  id: string
  title: string
  description: string
  event_type: EventType
  location: string
  starts_at: string
  ends_at: string | null
  capacity: number | null
  speaker_name: string | null
  organiser_id: string
  cover_image_url: string | null
  is_published: boolean
  is_cancelled: boolean
  created_at: string
  /** Total registered users; backend may omit. */
  registered_count?: number
  /** Whether the current user is registered. */
  is_registered?: boolean
}

export interface EventsResponse {
  events: Event[]
  page: number
  total: number
}

export interface EventsQuery {
  event_type?: EventType | null
  status?: EventStatus
  search?: string
  page?: number
}

export interface MyRegistrationsResponse {
  upcoming: Event[]
  past: Event[]
}

/* ── Organiser dashboard types ───────────────────────────── */

export interface EventFormValues {
  title: string
  description: string
  event_type: EventType
  location: string
  starts_at: string
  ends_at: string
  capacity: string
  speaker_name: string
  cover_image_url: string
  club_id: string
  is_published: boolean
}

export const EMPTY_FORM_VALUES: EventFormValues = {
  title: '',
  description: '',
  event_type: 'lecture',
  location: '',
  starts_at: '',
  ends_at: '',
  capacity: '',
  speaker_name: '',
  cover_image_url: '',
  club_id: '',
  is_published: false,
}

export type OrganiserStatus = 'draft' | 'live' | 'happening' | 'past' | 'spiked'

export const ORGANISER_STATUS_LABEL: Record<OrganiserStatus, string> = {
  draft: 'IN GALLEY',
  live: 'LIVE',
  happening: 'ON AIR',
  past: 'ARCHIVED',
  spiked: 'SPIKED',
}

export function deriveOrganiserStatus(event: Event): OrganiserStatus {
  if (event.is_cancelled) return 'spiked'
  if (!event.is_published) return 'draft'
  const now = Date.now()
  const start = new Date(event.starts_at).getTime()
  const end = event.ends_at ? new Date(event.ends_at).getTime() : start
  if (start > now) return 'live'
  if (now <= end) return 'happening'
  return 'past'
}

export interface StudentRow {
  id: string
  email: string
  full_name: string | null
}

export interface EventRegistrationsResponse {
  event_id: string
  total: number
  students: StudentRow[]
}

export const PAGE_SIZE = 20

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  lecture: 'Lecture',
  club: 'Club Event',
  workshop: 'Workshop',
  other: 'Other',
}

/** Tailwind/CSS class hooks per type — used to colour cards, badges, gradient covers. */
export const EVENT_TYPE_KEY: Record<EventType, 'lecture' | 'club' | 'workshop' | 'other'> = {
  lecture: 'lecture',
  club: 'club',
  workshop: 'workshop',
  other: 'other',
}

export function formatEventDate(iso: string): { day: string; month: string; weekday: string; time: string } {
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString('en-GB', { day: '2-digit' }),
    month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
  }
}

export function spotsLeft(event: Event): number | null {
  if (event.capacity == null) return null
  const taken = event.registered_count ?? 0
  return Math.max(0, event.capacity - taken)
}
