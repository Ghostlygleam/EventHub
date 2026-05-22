import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import type { Club, ClubsResponse } from '@/lib/clubs'

/**
 * Active clubs the current user can attach an event to.
 *
 * - admin       → every active club in the system
 * - organiser   → only the clubs they own
 *
 * Backend has no `?owner_id=me` filter, so we fetch the page and narrow
 * client-side. The list is typically tiny (single digits per organiser),
 * so this is fine.
 */
export function useMyClubs() {
  const { user } = useAuth()

  return useQuery<Club[]>({
    queryKey: ['my-clubs', user?.id, user?.role],
    enabled: !!user,
    queryFn: async () => {
      const res = await api.get<ClubsResponse>('/clubs?size=100')
      const all = res.clubs.filter((c) => c.is_active)
      if (user?.role === 'admin') return all
      return all.filter((c) => c.owner_id === user?.id)
    },
    staleTime: 60_000,
  })
}
