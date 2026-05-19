import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EventRegistrationsResponse } from '@/lib/events'

export function useEventRegistrations(eventId: string | undefined) {
  return useQuery<EventRegistrationsResponse>({
    queryKey: ['event-registrations', eventId],
    enabled: !!eventId,
    queryFn: () => api.get<EventRegistrationsResponse>(`/events/${eventId}/registrations`),
    staleTime: 15_000,
  })
}