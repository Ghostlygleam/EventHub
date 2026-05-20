import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AdminUsersResponse } from '@/lib/admin'

interface Params {
  page?: number
  limit?: number
}

export function useAdminUsers({ page = 1, limit = 50 }: Params = {}) {
  return useQuery<AdminUsersResponse>({
    queryKey: ['admin-users', { page, limit }],
    queryFn: () =>
      api.get<AdminUsersResponse>(`/admin/users?page=${page}&limit=${limit}`),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
}