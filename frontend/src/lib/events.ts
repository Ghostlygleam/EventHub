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
