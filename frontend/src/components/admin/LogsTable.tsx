import { type CSSProperties } from 'react'
import { User as UserIcon, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ACTION_ACCENT,
  ACTION_LABEL,
  deriveTargetLabel,
  type AdminUser,
  type AuditLogEntry,
} from '@/lib/admin'
import { isUserRole } from '@/lib/admin'
import { ROLE_LABEL } from '@/lib/admin'
import styles from './LogsTable.module.css'

interface LogsTableProps {
  entries: AuditLogEntry[]
  /** Map of user id → user, used to enrich target labels for role_changed entries. */
  usersById: Map<string, AdminUser>
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '—'
  const now = Date.now()
  const t = new Date(iso).getTime()
  const diff = Math.max(0, now - t)
  const sec = Math.floor(diff / 1000)
  if (sec < 60)   return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60)   return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)    return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7)    return `${day}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatAbsoluteTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatDeltaValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '∅'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'string') return v.length > 40 ? v.slice(0, 40) + '…' : v
  return String(v)
}

function renderDelta(entry: AuditLogEntry): React.ReactNode {
  if (!entry.metadata) return null

  if (entry.action === 'role_changed') {
    const oldRole = entry.metadata.old_role
    const newRole = entry.metadata.new_role
    if (typeof oldRole !== 'string' || typeof newRole !== 'string') return null
    const oldLabel = isUserRole(oldRole) ? ROLE_LABEL[oldRole] : oldRole
    const newLabel = isUserRole(newRole) ? ROLE_LABEL[newRole] : newRole
    return (
      <span className={styles.delta}>
        <span className={styles.deltaOld}>{oldLabel}</span>
        <span className={styles.deltaArrow}>→</span>
        <span className={styles.deltaNew}>{newLabel}</span>
      </span>
    )
  }

  /* Clubs amend → per-field diff stored as { changes: { field: { old, new } } } */
  if (entry.action === 'club_amended') {
    const changes = entry.metadata.changes as Record<string, { old: unknown; new: unknown }> | undefined
    if (!changes || typeof changes !== 'object') return null
    const fields = Object.keys(changes)
    if (!fields.length) return null
    return (
      <span className={styles.delta}>
        {fields.map((f, i) => (
          <span key={f} className={styles.deltaField}>
            {i > 0 && <span className={styles.deltaSep}>·</span>}
            <span className={styles.deltaFieldName}>{f}</span>
            <span className={styles.deltaOld}>{formatDeltaValue(changes[f].old)}</span>
            <span className={styles.deltaArrow}>→</span>
            <span className={styles.deltaNew}>{formatDeltaValue(changes[f].new)}</span>
          </span>
        ))}
      </span>
    )
  }

  return null
}

export default function LogsTable({ entries, usersById }: LogsTableProps) {
  return (
    <ol className={styles.feed}>
      {entries.map((entry, i) => {
        const accent = ACTION_ACCENT[entry.action] ?? '0 0% 45%'
        const actionLabel = ACTION_LABEL[entry.action] ?? entry.action.toUpperCase()
        const actorLabel = entry.actor_email ?? '—system—'
        const targetLabel = deriveTargetLabel(entry, usersById)

        const style: CSSProperties & Record<'--entry-accent', string> = {
          ['--entry-accent']: accent,
          animationDelay: `${Math.min(i, 12) * 40}ms`,
        }

        return (
          <li key={entry.id} className={styles.entry} style={style}>
            <div className={styles.timeCol}>
              <span className={styles.time}>{formatAbsoluteTime(entry.created_at)}</span>
              <span className={styles.relative}>{formatRelativeTime(entry.created_at)}</span>
            </div>

            <div className={styles.body}>
              <span className={cn(styles.actionChip)}>{actionLabel}</span>

              <div className={styles.row}>
                <span className={styles.rowLabel}>
                  <UserIcon size={11} strokeWidth={2.4} />
                  actor
                </span>
                <span className={styles.rowValue}>{actorLabel}</span>
              </div>

              <div className={styles.row}>
                <span className={styles.rowLabel}>
                  <Target size={11} strokeWidth={2.4} />
                  target
                </span>
                <span className={styles.rowValue}>{targetLabel}</span>
              </div>

              {renderDelta(entry) && (
                <div className={styles.row}>
                  <span className={styles.rowLabel}>delta</span>
                  {renderDelta(entry)}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}