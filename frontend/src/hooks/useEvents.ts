import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { EventsQuery, EventsResponse } from '../lib/events'

function buildQueryString(params: EventsQuery): string {
  const sp = new URLSearchParams()
  if (params.event_type) sp.set('event_type', params.event_type)
  if (params.status) sp.set('status', params.status)
  if (params.search && params.search.trim().length > 0) sp.set('search', params.search.trim())
  if (params.page && params.page > 1) sp.set('page', String(params.page))
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

export function useEvents(query: EventsQuery) {
  return useQuery<EventsResponse>({
    queryKey: ['events', query],
    queryFn: () => api.get<EventsResponse>(`/events${buildQueryString(query)}`),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}
