import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EventsResponse, Event } from '@/lib/events'
import { useAuth } from './useAuth'

export const organiserEventsKey = ['organiser-events'] as const

/**
 * Backend's GET /events returns published events + the caller's own drafts.
 * We filter client-side to keep only events authored by the current user.
 *
 * Known limitation: cancelled events are excluded by the backend.
 */
export function useOrganiserEvents() {
  const { user } = useAuth()

  return useQuery<Event[]>({
    queryKey: [...organiserEventsKey, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await api.get<EventsResponse>('/events?page=1')
      return res.events.filter((e) => e.organiser_id === user!.id)
    },
    staleTime: 20_000,
  })
}
