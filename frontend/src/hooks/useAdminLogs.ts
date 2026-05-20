import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AdminLogsResponse } from '@/lib/admin'

interface Params {
  page?: number
  limit?: number
}

export function useAdminLogs({ page = 1, limit = 50 }: Params = {}) {
  return useQuery<AdminLogsResponse>({
    queryKey: ['admin-logs', { page, limit }],
    queryFn: () =>
      api.get<AdminLogsResponse>(`/admin/logs?page=${page}&limit=${limit}`),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  })
}