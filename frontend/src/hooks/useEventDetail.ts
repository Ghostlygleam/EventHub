import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Event } from '@/lib/events'

export function useEventDetail(id: string | undefined) {
  return useQuery<Event>({
    queryKey: ['event', id],
    queryFn: () => api.get<Event>(`/events/${id}`),
    enabled: !!id,
    staleTime: 30_000,
    retry: (failureCount, err) => {
      if (err instanceof Error && /not found/i.test(err.message)) return false
      return failureCount < 1
    },
  })
}
