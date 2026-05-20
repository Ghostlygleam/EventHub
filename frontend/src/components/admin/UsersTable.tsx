import { Power, RotateCcw, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { ROLE_LABEL, type AdminUser } from '@/lib/admin'
import type { UserRole } from '@/lib/auth-context'
import StatusDot from './StatusDot'
import RoleBadge from './RoleBadge'
import styles from './UsersTable.module.css'

interface UsersTableProps {
  users: AdminUser[]
  /** Called when role changes — parent decides whether to confirm (for admin promotions) or apply directly. */
  onRoleChange: (user: AdminUser, newRole: UserRole) => void
  onDeactivate: (user: AdminUser) => void
  onReactivate: (user: AdminUser) => void
  pendingId?: string | null
}

const ROLE_OPTIONS: UserRole[] = ['student', 'organiser', 'admin']

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function UsersTable({
  users,
  onRoleChange,
  onDeactivate,
  onReactivate,
  pendingId,
}: UsersTableProps) {
  const { user: me } = useAuth()

  return (
    <div className={styles.shell}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={cn(styles.th, styles.thNum)}>#</th>
            <th className={styles.th}>Email</th>
            <th className={styles.th}>Role</th>
            <th className={styles.th}>Status</th>
            <th className={styles.th}>Joined</th>
            <th className={cn(styles.th, styles.thAction)}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {users.map((u, i) => {
            const isSelf = me?.id === u.id
            const isPending = pendingId === u.id
            return (
              <tr
                key={u.id}
                className={cn(
                  styles.tr,
                  !u.is_active && styles.trInactive,
                  isPending && styles.trPending
                )}
              >
                <td className={cn(styles.td, styles.tdNum)}>
                  {String(i + 1).padStart(3, '0')}
                </td>

                <td className={cn(styles.td, styles.tdEmail)}>
                  <span className={styles.email}>{u.email}</span>
                  {u.full_name && <span className={styles.fullName}>{u.full_name}</span>}
                  {isSelf && <span className={styles.youTag}>you</span>}
                </td>

                <td className={cn(styles.td, styles.tdRole)}>
                  <label className={styles.roleLabel}>
                    <RoleBadge role={u.role} size="sm" />
                    <select
                      className={styles.roleSelect}
                      value={u.role}
                      disabled={isPending}
                      onChange={(e) => onRoleChange(u, e.target.value as UserRole)}
                      aria-label={`Change role for ${u.email}`}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </select>
                  </label>
                </td>

                <td className={cn(styles.td, styles.tdStatus)}>
                  <StatusDot
                    variant={u.is_active ? 'active' : 'inactive'}
                    pulse={u.is_active}
                    label={u.is_active ? 'ACTIVE' : 'SUSPENDED'}
                    size="sm"
                  />
                </td>

                <td className={cn(styles.td, styles.tdDate)}>{formatDate(u.created_at)}</td>

                <td className={cn(styles.td, styles.tdAction)}>
                  {u.is_active ? (
                    <button
                      type="button"
                      className={styles.actionDanger}
                      disabled={isSelf || isPending}
                      onClick={() => onDeactivate(u)}
                      title={isSelf ? "You can't deactivate yourself" : 'Deactivate user'}
                    >
                      {isSelf ? (
                        <ShieldAlert size={12} strokeWidth={2.4} />
                      ) : (
                        <Power size={12} strokeWidth={2.4} />
                      )}
                      <span>Deactivate</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.actionRestore}
                      disabled={isPending}
                      onClick={() => onReactivate(u)}
                      title="Reactivate user"
                    >
                      <RotateCcw size={12} strokeWidth={2.4} />
                      <span>Reactivate</span>
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}