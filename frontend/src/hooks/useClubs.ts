import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ClubsResponse } from '@/lib/clubs'

interface Params {
  page?: number
  size?: number
  search?: string
}

export function useClubs({ page = 1, size = 50, search = '' }: Params = {}) {
  return useQuery<ClubsResponse>({
    queryKey: ['clubs', { page, size, search }],
    queryFn: () => {
      const sp = new URLSearchParams()
      sp.set('page', String(page))
      sp.set('size', String(size))
      if (search.trim()) sp.set('search', search.trim())
      return api.get<ClubsResponse>(`/clubs?${sp.toString()}`)
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
}
