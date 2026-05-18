import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { MyRegistrationsResponse } from '@/lib/events'

export const myRegistrationsKey = ['my-registrations'] as const

export function useMyRegistrations() {
  return useQuery<MyRegistrationsResponse>({
    queryKey: myRegistrationsKey,
    queryFn: () => api.get<MyRegistrationsResponse>('/registrations/me'),
    staleTime: 30_000,
  })
}
