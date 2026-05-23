import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react'

import PageWrapper from '@/components/layout/PageWrapper'
import { OpsHeader, CommandBar, LogsTable } from '@/components/admin'
import { useAuth } from '@/hooks/useAuth'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import { useAdminLogs } from '@/hooks/useAdminLogs'
import { ACTION_LABEL, type AdminUser, type AuditAction } from '@/lib/admin'
import { cn } from '@/lib/utils'
import styles from './AdminLogsPage.module.css'

const ACTION_FILTERS: { value: '' | AuditAction; label: string }[] = [
  { value: '', label: 'all actions' },
  ...Object.keys(ACTION_LABEL).map((key) => ({
    value: key as AuditAction,
    label: ACTION_LABEL[key].toLowerCase(),
  })),
]

export default function AdminLogsPage() {
  const { user: me } = useAuth()
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminLogs({ page: 1, limit: 200 })
  /* Fetch users in parallel so we can enrich target labels for role_changed entries. */
  const { data: usersData } = useAdminUsers({ page: 1, limit: 200 })

  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<'' | AuditAction>('')

  if (me && me.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  const entries = data?.logs ?? []
  const total = data?.total ?? 0

  const usersById = useMemo(() => {
    const map = new Map<string, AdminUser>()
    for (const u of usersData?.users ?? []) map.set(u.id, u)
    return map
  }, [usersData])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((e) => {
      if (actionFilter && e.action !== actionFilter) return false
      if (q) {
        const hay = [
          e.actor_email,
          e.actor_name,
          e.action,
          e.target_id,
          JSON.stringify(e.metadata ?? {}),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [entries, search, actionFilter])

  return (
    <PageWrapper>
      <div className={styles.page}>
        <Atmosphere />

        <div className={styles.content}>
          <OpsHeader
            active="logs"
            title={<>The <em>wire.</em></>}
            lede="Every privileged action lands here as it happens. Most recent first. Filter by action or text to drill in."
            recordCount={total}
            recordLabel="entries"
          />

          <CommandBar
            searchProps={{
              value: search,
              onChange: (e) => setSearch(e.target.value),
              placeholder: 'filter by actor, target, or action…',
              label: 'Filter log entries',
            }}
            middle={
              <label className={styles.actionFilterWrap}>
                <span className={styles.actionFilterLabel}>action</span>
                <select
                  className={styles.actionFilter}
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value as '' | AuditAction)}
                  aria-label="Filter by action"
                >
                  {ACTION_FILTERS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            }
            right={
              <button
                type="button"
                className={styles.refreshBtn}
                onClick={() => refetch()}
                disabled={isFetching}
                aria-label="Refresh logs"
              >
                <RefreshCw size={12} strokeWidth={2.4} className={isFetching ? styles.spinning : undefined} />
                <span>{isFetching ? 'refreshing' : 'refresh'}</span>
              </button>
            }
          />

          <section className={cn(styles.listShell, isFetching && !isLoading && styles.listShellFetching)}>
            {isError ? (
              <ErrorCard
                message={(error as Error | null)?.message}
                onRetry={() => refetch()}
              />
            ) : isLoading ? (
              <FeedSkeleton />
            ) : filtered.length === 0 ? (
              <Empty hasFilter={!!search || !!actionFilter} />
            ) : (
              <LogsTable entries={filtered} usersById={usersById} />
            )}
          </section>
        </div>
      </div>
    </PageWrapper>
  )
}

/* ════════════ Atmosphere ════════════ */

function Atmosphere() {
  return (
    <div className={styles.bg} aria-hidden="true">
      <div className={cn(styles.blob, styles.blob1)} />
      <div className={styles.scanlines} />
      <div className={styles.grid} />
    </div>
  )
}

/* ════════════ States ════════════ */

function Empty({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyEyebrow}>WIRE IS QUIET</span>
      <h3 className={styles.emptyTitle}>
        {hasFilter ? 'Nothing matches that filter.' : 'No entries yet.'}
      </h3>
      <p className={styles.emptyBody}>
        {hasFilter
          ? 'Clear the filter or pick a different action type.'
          : 'Once anything privileged happens — role changes, deactivations — it lands here.'}
      </p>
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className={styles.skel}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={styles.skelRow} style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  )
}

function ErrorCard({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className={styles.errorCard} role="alert">
      <div className={styles.errorGlyph}>
        <AlertTriangle size={22} strokeWidth={2} />
      </div>
      <h3 className={styles.errorTitle}>Wire feed offline</h3>
      <p className={styles.errorBody}>
        Couldn't fetch audit entries. Check the connection and retry.
      </p>
      {message && <code className={styles.errorDetail}>{message}</code>}
      <button type="button" onClick={onRetry} className={styles.errorBtn}>
        <RotateCcw size={12} strokeWidth={2.4} />
        retry
      </button>
    </div>
  )
}