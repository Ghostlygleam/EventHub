import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Power, RotateCcw, ShieldAlert, MoreVertical } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { ROLE_ACCENT, ROLE_LABEL, type AdminUser } from '@/lib/admin'
import type { UserRole } from '@/lib/auth-context'
import StatusDot from './StatusDot'
import RoleBadge from './RoleBadge'
import styles from './UsersTable.module.css'

interface UsersTableProps {
  users: AdminUser[]
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

function deriveInitials(user: AdminUser): string {
  const source = user.full_name?.trim() || user.email.split('@')[0]
  const parts = source.replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return (parts[0]?.slice(0, 2) || 'US').toUpperCase()
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
          {users.map((u, i) => (
            <UserRow
              key={u.id}
              user={u}
              index={i}
              isSelf={me?.id === u.id}
              isPending={pendingId === u.id}
              onRoleChange={onRoleChange}
              onDeactivate={onDeactivate}
              onReactivate={onReactivate}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ════════════════ Row ════════════════ */

interface UserRowProps {
  user: AdminUser
  index: number
  isSelf: boolean
  isPending: boolean
  onRoleChange: (user: AdminUser, newRole: UserRole) => void
  onDeactivate: (user: AdminUser) => void
  onReactivate: (user: AdminUser) => void
}

function UserRow({
  user,
  index,
  isSelf,
  isPending,
  onRoleChange,
  onDeactivate,
  onReactivate,
}: UserRowProps) {
  const initials = deriveInitials(user)
  const accent = ROLE_ACCENT[user.role]
  const avatarStyle: CSSProperties & Record<'--role-accent', string> = {
    ['--role-accent']: accent,
  }

  return (
    <tr
      className={cn(
        styles.tr,
        !user.is_active && styles.trInactive,
        isPending && styles.trPending
      )}
    >
      <td className={cn(styles.td, styles.tdNum)}>
        {String(index + 1).padStart(3, '0')}
      </td>

      <td className={cn(styles.td, styles.tdEmail)}>
        <span className={styles.avatar} style={avatarStyle} aria-hidden="true">
          <span className={styles.avatarInitials}>{initials}</span>
        </span>
        <span className={styles.identity}>
          <span className={styles.email}>{user.email}</span>
          {user.full_name && <span className={styles.fullName}>{user.full_name}</span>}
          {isSelf && <span className={styles.youTag}>you</span>}
        </span>
      </td>

      <td className={cn(styles.td, styles.tdRole)}>
        <label className={styles.roleLabel}>
          <RoleBadge role={user.role} size="sm" />
          <select
            className={styles.roleSelect}
            value={user.role}
            disabled={isPending}
            onChange={(e) => onRoleChange(user, e.target.value as UserRole)}
            aria-label={`Change role for ${user.email}`}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </label>
      </td>

      <td className={cn(styles.td, styles.tdStatus)}>
        <StatusDot
          variant={user.is_active ? 'active' : 'inactive'}
          pulse={user.is_active}
          label={user.is_active ? 'ACTIVE' : 'SUSPENDED'}
          size="sm"
        />
      </td>

      <td className={cn(styles.td, styles.tdDate)}>{formatDate(user.created_at)}</td>

      <td className={cn(styles.td, styles.tdAction)}>
        {/* Desktop: inline button. Mobile (CSS-controlled): overflow menu instead. */}
        <span className={styles.desktopAction}>
          {user.is_active ? (
            <button
              type="button"
              className={styles.actionDanger}
              disabled={isSelf || isPending}
              onClick={() => onDeactivate(user)}
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
              onClick={() => onReactivate(user)}
              title="Reactivate user"
            >
              <RotateCcw size={12} strokeWidth={2.4} />
              <span>Reactivate</span>
            </button>
          )}
        </span>

        <RowOverflowMenu
          user={user}
          isSelf={isSelf}
          isPending={isPending}
          onDeactivate={onDeactivate}
          onReactivate={onReactivate}
        />
      </td>
    </tr>
  )
}

/* ════════════════ Overflow menu (mobile) ════════════════ */

interface OverflowProps {
  user: AdminUser
  isSelf: boolean
  isPending: boolean
  onDeactivate: (user: AdminUser) => void
  onReactivate: (user: AdminUser) => void
}

function RowOverflowMenu({ user, isSelf, isPending, onDeactivate, onReactivate }: OverflowProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const canDeactivate = user.is_active && !isSelf
  const canReactivate = !user.is_active

  return (
    <div className={styles.overflowWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.overflowBtn}
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${user.email}`}
      >
        <MoreVertical size={16} strokeWidth={2.2} />
      </button>

      {open && (
        <div className={styles.overflowMenu} role="menu">
          {canDeactivate && (
            <button
              type="button"
              className={cn(styles.overflowItem, styles.overflowItemDanger)}
              onClick={() => {
                setOpen(false)
                onDeactivate(user)
              }}
              role="menuitem"
            >
              <Power size={13} strokeWidth={2.3} />
              <span>Deactivate</span>
            </button>
          )}
          {canReactivate && (
            <button
              type="button"
              className={cn(styles.overflowItem, styles.overflowItemSuccess)}
              onClick={() => {
                setOpen(false)
                onReactivate(user)
              }}
              role="menuitem"
            >
              <RotateCcw size={13} strokeWidth={2.3} />
              <span>Reactivate</span>
            </button>
          )}
          {isSelf && user.is_active && (
            <span className={cn(styles.overflowItem, styles.overflowItemDisabled)}>
              <ShieldAlert size={13} strokeWidth={2.3} />
              <span>Can't suspend yourself</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
