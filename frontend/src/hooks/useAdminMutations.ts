import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { AdminUser, AdminUsersResponse } from '@/lib/admin'
import { ROLE_LABEL } from '@/lib/admin'
import type { UserRole } from '@/lib/auth-context'

type UsersCacheMutator = (prev: AdminUsersResponse | undefined) => AdminUsersResponse | undefined

function patchUserInCache(
  qc: ReturnType<typeof useQueryClient>,
  userId: string,
  patch: Partial<AdminUser>
): AdminUsersResponse[] {
  /* Mutate every cached page of admin-users so the row updates wherever it appears. */
  const snapshots: AdminUsersResponse[] = []
  const mutator: UsersCacheMutator = (prev) => {
    if (!prev) return prev
    snapshots.push(prev)
    return {
      ...prev,
      users: prev.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
    }
  }
  qc.setQueriesData<AdminUsersResponse>({ queryKey: ['admin-users'] }, mutator)
  return snapshots
}

function restoreUsersCache(
  qc: ReturnType<typeof useQueryClient>,
  snapshots: AdminUsersResponse[]
) {
  /* Best-effort rollback — keys mutated may have changed in between, that's OK. */
  if (snapshots.length === 0) return
  qc.setQueriesData<AdminUsersResponse>({ queryKey: ['admin-users'] }, (prev) => {
    if (!prev) return prev
    return snapshots.find((s) => s.page === prev.page && s.users.length === prev.users.length) ?? prev
  })
}

/* ─── Change role ─────────────────────────────────────────── */

interface ChangeRoleArgs {
  user: AdminUser
  newRole: UserRole
}

export function useChangeRole() {
  const qc = useQueryClient()

  return useMutation<unknown, Error, ChangeRoleArgs, AdminUsersResponse[]>({
    mutationFn: ({ user, newRole }) =>
      api.patch(`/admin/users/${user.id}/role`, { role: newRole }),
    onMutate: async ({ user, newRole }) => {
      await qc.cancelQueries({ queryKey: ['admin-users'] })
      return patchUserInCache(qc, user.id, { role: newRole })
    },
    onError: (err, _args, snapshots) => {
      if (snapshots) restoreUsersCache(qc, snapshots)
      toast.error(err.message || 'Could not change role.')
    },
    onSuccess: (_data, { user, newRole }) => {
      toast.success(
        `${user.email} → ${ROLE_LABEL[newRole]}`
      )
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-logs'] })
    },
  })
}

/* ─── Deactivate ──────────────────────────────────────────── */

export function useDeactivateUser() {
  const qc = useQueryClient()

  return useMutation<unknown, Error, AdminUser, AdminUsersResponse[]>({
    mutationFn: (user) => api.patch(`/admin/users/${user.id}/deactivate`, {}),
    onMutate: async (user) => {
      await qc.cancelQueries({ queryKey: ['admin-users'] })
      return patchUserInCache(qc, user.id, { is_active: false })
    },
    onError: (err, _user, snapshots) => {
      if (snapshots) restoreUsersCache(qc, snapshots)
      toast.error(err.message || 'Could not deactivate user.')
    },
    onSuccess: (_data, user) => {
      toast.success(`${user.email} deactivated.`)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-logs'] })
    },
  })
}

/* ─── Reactivate ──────────────────────────────────────────── */

export function useReactivateUser() {
  const qc = useQueryClient()

  return useMutation<unknown, Error, AdminUser, AdminUsersResponse[]>({
    mutationFn: (user) => api.patch(`/admin/users/${user.id}/reactivate`, {}),
    onMutate: async (user) => {
      await qc.cancelQueries({ queryKey: ['admin-users'] })
      return patchUserInCache(qc, user.id, { is_active: true })
    },
    onError: (err, _user, snapshots) => {
      if (snapshots) restoreUsersCache(qc, snapshots)
      toast.error(err.message || 'Could not reactivate user.')
    },
    onSuccess: (_data, user) => {
      toast.success(`${user.email} reactivated.`)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-logs'] })
    },
  })
}