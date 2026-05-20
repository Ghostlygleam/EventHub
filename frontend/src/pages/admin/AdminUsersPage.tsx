import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react'

import PageWrapper from '@/components/layout/PageWrapper'
import {
  OpsHeader,
  CommandBar,
  UsersTable,
  AdminConfirmDialog,
} from '@/components/admin'
import RoleBadge from '@/components/admin/RoleBadge'
import { useAuth } from '@/hooks/useAuth'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import {
  useChangeRole,
  useDeactivateUser,
  useReactivateUser,
} from '@/hooks/useAdminMutations'
import type { AdminUser } from '@/lib/admin'
import type { UserRole } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import styles from './AdminUsersPage.module.css'

export default function AdminUsersPage() {
  const { user: me } = useAuth()
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminUsers({ page: 1, limit: 200 })
  const changeRole = useChangeRole()
  const deactivate = useDeactivateUser()
  const reactivate = useReactivateUser()

  const [searchInput, setSearchInput] = useState('')
  const [pendingDeactivate, setPendingDeactivate] = useState<AdminUser | null>(null)
  const [pendingPromotion, setPendingPromotion] = useState<{ user: AdminUser; newRole: UserRole } | null>(null)

  /* Role-gate: non-admins are bounced. Hooks always run first, redirect after. */
  if (me && me.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  const allUsers = data?.users ?? []
  const total = data?.total ?? 0

  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase()
    if (!q) return allUsers
    return allUsers.filter((u) =>
      u.email.toLowerCase().includes(q) ||
      (u.full_name ?? '').toLowerCase().includes(q)
    )
  }, [allUsers, searchInput])

  const handleRoleChange = (user: AdminUser, newRole: UserRole) => {
    if (user.role === newRole) return
    /* Promoting to admin is a high-impact action — require confirmation. */
    if (newRole === 'admin') {
      setPendingPromotion({ user, newRole })
      return
    }
    changeRole.mutate({ user, newRole })
  }

  const confirmPromotion = () => {
    if (!pendingPromotion) return
    const args = pendingPromotion
    changeRole.mutate(args, {
      onSuccess: () => setPendingPromotion(null),
    })
  }

  const handleDeactivate = (user: AdminUser) => setPendingDeactivate(user)

  const confirmDeactivate = () => {
    if (!pendingDeactivate) return
    const target = pendingDeactivate
    deactivate.mutate(target, {
      onSuccess: () => setPendingDeactivate(null),
    })
  }

  const handleReactivate = (user: AdminUser) => reactivate.mutate(user)

  const pendingId =
    changeRole.isPending ? changeRole.variables?.user.id ?? null :
    deactivate.isPending ? deactivate.variables?.id ?? null :
    reactivate.isPending ? reactivate.variables?.id ?? null :
    null

  return (
    <PageWrapper>
      <div className={styles.page}>
        <Atmosphere />

        <div className={styles.content}>
          <OpsHeader
            active="users"
            title={<>Population<em>.</em></>}
            lede="Every account on the system. Promote, demote, suspend, restore — every move is logged on the wire."
            recordCount={total}
            recordLabel="users"
          />

          <CommandBar
            searchProps={{
              value: searchInput,
              onChange: (e) => setSearchInput(e.target.value),
              placeholder: 'filter by email or full name…',
              label: 'Filter users',
            }}
            right={
              <button
                type="button"
                className={styles.refreshBtn}
                onClick={() => refetch()}
                disabled={isFetching}
                aria-label="Refresh users"
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
              <TableSkeleton />
            ) : filtered.length === 0 ? (
              <Empty hasQuery={searchInput.trim().length > 0} />
            ) : (
              <UsersTable
                users={filtered}
                onRoleChange={handleRoleChange}
                onDeactivate={handleDeactivate}
                onReactivate={handleReactivate}
                pendingId={pendingId}
              />
            )}
          </section>
        </div>

        {/* Dialogs */}
        <AdminConfirmDialog
          open={!!pendingDeactivate}
          eyebrow="SUSPENDING ACCOUNT"
          title="Deactivate this user?"
          confirmLabel="Deactivate"
          tone="danger"
          isPending={deactivate.isPending}
          onConfirm={confirmDeactivate}
          onClose={() => !deactivate.isPending && setPendingDeactivate(null)}
        >
          {pendingDeactivate && (
            <>
              <p>
                <strong className={styles.bodyEm}>{pendingDeactivate.email}</strong> will be
                signed out and lose access on the next request — even if their session token is still valid.
              </p>
              <p className={styles.bodyMuted}>
                You can restore the account any time. No data is deleted.
              </p>
            </>
          )}
        </AdminConfirmDialog>

        <AdminConfirmDialog
          open={!!pendingPromotion}
          eyebrow="ELEVATING PRIVILEGES"
          title="Promote to admin?"
          confirmLabel="Promote"
          tone="warning"
          isPending={changeRole.isPending}
          onConfirm={confirmPromotion}
          onClose={() => !changeRole.isPending && setPendingPromotion(null)}
        >
          {pendingPromotion && (
            <>
              <p>
                <strong className={styles.bodyEm}>{pendingPromotion.user.email}</strong> will be
                granted full admin privileges: managing users, viewing the audit log, deactivating
                accounts.
              </p>
              <div className={styles.promotionPreview}>
                <RoleBadge role={pendingPromotion.user.role} size="sm" />
                <span className={styles.previewArrow}>→</span>
                <RoleBadge role={pendingPromotion.newRole} size="sm" />
              </div>
              <p className={styles.bodyMuted}>
                Only do this for trusted operators. The change is logged.
              </p>
            </>
          )}
        </AdminConfirmDialog>
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

/* ════════════ Empty ════════════ */

function Empty({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyEyebrow}>NO RESULTS</span>
      <h3 className={styles.emptyTitle}>
        {hasQuery ? 'Nobody matches that query.' : 'No users on file.'}
      </h3>
      <p className={styles.emptyBody}>
        {hasQuery
          ? 'Try a shorter substring of an email or full name.'
          : 'Once anyone signs up, they appear here.'}
      </p>
    </div>
  )
}

/* ════════════ Skeleton ════════════ */

function TableSkeleton() {
  return (
    <div className={styles.skel}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={styles.skelRow} style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  )
}

/* ════════════ Error ════════════ */

function ErrorCard({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className={styles.errorCard} role="alert">
      <div className={styles.errorGlyph}>
        <AlertTriangle size={22} strokeWidth={2} />
      </div>
      <h3 className={styles.errorTitle}>Console couldn't reach the server</h3>
      <p className={styles.errorBody}>
        Check the connection and retry. Last error is shown below for the curious.
      </p>
      {message && <code className={styles.errorDetail}>{message}</code>}
      <button type="button" onClick={onRetry} className={styles.errorBtn}>
        <RotateCcw size={12} strokeWidth={2.4} />
        retry
      </button>
    </div>
  )
}
