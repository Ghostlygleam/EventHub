import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertTriangle, RefreshCw, RotateCcw, Plus, Library } from 'lucide-react'

import PageWrapper from '@/components/layout/PageWrapper'
import {
  OpsHeader,
  CommandBar,
  ClubCard,
  ClubFormDialog,
  DisbandClubDialog,
} from '@/components/admin'
import { useAuth } from '@/hooks/useAuth'
import { useClubs } from '@/hooks/useClubs'
import {
  useCreateClub,
  useUpdateClub,
  useDisbandClub,
} from '@/hooks/useClubMutations'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { Club, ClubFormValues } from '@/lib/clubs'
import { cn } from '@/lib/utils'
import styles from './AdminClubsPage.module.css'

type FormState = null | 'new' | Club

export default function AdminClubsPage() {
  const { user: me } = useAuth()

  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300)
  const isSearching = searchInput !== search

  const { data, isLoading, isError, error, refetch, isFetching } = useClubs({
    page: 1,
    size: 100,
    search,
  })

  const create   = useCreateClub()
  const update   = useUpdateClub()
  const disband  = useDisbandClub()

  const [formState, setFormState] = useState<FormState>(null)
  const [pendingDisband, setPendingDisband] = useState<Club | null>(null)
  const [disbandError, setDisbandError] = useState<string | null>(null)

  if (me && me.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  const clubs = data?.clubs ?? []
  const total = data?.total ?? 0

  const handleSubmit = (values: ClubFormValues) => {
    if (formState === 'new') {
      create.mutate(values, {
        onSuccess: () => setFormState(null),
      })
    } else if (formState !== null) {
      /* formState is a Club here (narrowed by the 'new' branch above). */
      update.mutate(
        { id: formState.id, values },
        { onSuccess: () => setFormState(null) }
      )
    }
  }

  const handleDisbandConfirm = () => {
    if (!pendingDisband) return
    setDisbandError(null)
    disband.mutate(pendingDisband, {
      onSuccess: () => {
        setPendingDisband(null)
      },
      onError: (err) => {
        /* Backend returns 409 with explanatory message — surface inline instead of toasting only. */
        setDisbandError(err.message || 'Could not disband the society.')
      },
    })
  }

  const closeDisband = () => {
    if (disband.isPending) return
    setPendingDisband(null)
    setDisbandError(null)
  }

  const formOpen = formState !== null
  const formEditing = formState && formState !== 'new' ? formState : null
  const formPending = create.isPending || update.isPending

  const hasResults = clubs.length > 0
  const hasQuery = search.trim().length > 0

  return (
    <PageWrapper>
      <div className={styles.page}>
        <Atmosphere />

        <div className={styles.content}>
          <OpsHeader
            active="clubs"
            title={<>Societies<em>.</em></>}
            lede="Every recognised club on campus. Found new ones, amend the manifesto, disband when the chapter closes — every move is logged on the wire."
            recordCount={total}
            recordLabel={total === 1 ? 'society' : 'societies'}
          />

          <CommandBar
            searchProps={{
              value: searchInput,
              onChange: (e) => setSearchInput(e.target.value),
              placeholder: 'filter by society name…',
              label: 'Filter clubs',
            }}
            middle={
              <button
                type="button"
                className={styles.foundBtn}
                onClick={() => setFormState('new')}
              >
                <Plus size={12} strokeWidth={2.4} />
                <span>Found a society</span>
              </button>
            }
            right={
              <button
                type="button"
                className={styles.refreshBtn}
                onClick={() => refetch()}
                disabled={isFetching}
                aria-label="Refresh"
              >
                <RefreshCw
                  size={12}
                  strokeWidth={2.4}
                  className={isFetching ? styles.spinning : undefined}
                />
                <span>{isFetching ? 'refreshing' : 'refresh'}</span>
              </button>
            }
          />

          <section className={cn(styles.listShell, (isFetching || isSearching) && !isLoading && styles.listShellFetching)}>
            {isError ? (
              <ErrorCard
                message={(error as Error | null)?.message}
                onRetry={() => refetch()}
              />
            ) : isLoading ? (
              <GridSkeleton />
            ) : !hasResults ? (
              <Empty hasQuery={hasQuery} onFound={() => setFormState('new')} />
            ) : (
              <div className={styles.grid}>
                {clubs.map((club, i) => (
                  <ClubCard
                    key={club.id}
                    club={club}
                    index={i}
                    onEdit={(c) => setFormState(c)}
                    onDisband={(c) => {
                      setDisbandError(null)
                      setPendingDisband(c)
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <ClubFormDialog
          open={formOpen}
          editing={formEditing}
          isPending={formPending}
          onSubmit={handleSubmit}
          onClose={() => !formPending && setFormState(null)}
        />

        <DisbandClubDialog
          club={pendingDisband}
          isPending={disband.isPending}
          serverError={disbandError}
          onConfirm={handleDisbandConfirm}
          onClose={closeDisband}
        />
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
      <div className={styles.grid_bg} />
    </div>
  )
}

/* ════════════ Empty ════════════ */

function Empty({ hasQuery, onFound }: { hasQuery: boolean; onFound: () => void }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyGlyph}>
        <Library size={26} strokeWidth={1.8} />
      </div>
      <span className={styles.emptyEyebrow}>
        {hasQuery ? 'NO MATCHES' : 'NO SOCIETIES YET'}
      </span>
      <h3 className={styles.emptyTitle}>
        {hasQuery ? 'Nothing matches that name.' : 'Found the first society.'}
      </h3>
      <p className={styles.emptyBody}>
        {hasQuery
          ? 'Try a shorter substring or clear the filter.'
          : 'Once a club is on file, organisers can attach events to it. Start the registry here.'}
      </p>
      {!hasQuery && (
        <button type="button" className={styles.emptyCta} onClick={onFound}>
          <Plus size={13} strokeWidth={2.4} />
          Found a society
        </button>
      )}
    </div>
  )
}

/* ════════════ Skeleton ════════════ */

function GridSkeleton() {
  return (
    <div className={styles.grid}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={styles.skelCard} style={{ animationDelay: `${i * 80}ms` }}>
          <div className={styles.skelLine} style={{ width: 110, height: 12 }} />
          <div className={styles.skelLine} style={{ width: '70%', height: 24 }} />
          <div className={styles.skelLine} style={{ width: '100%', height: 12 }} />
          <div className={styles.skelLine} style={{ width: '85%', height: 12 }} />
        </div>
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
      <h3 className={styles.errorTitle}>Couldn't load the registry</h3>
      <p className={styles.errorBody}>Check the connection and retry.</p>
      {message && <code className={styles.errorDetail}>{message}</code>}
      <button type="button" onClick={onRetry} className={styles.errorBtn}>
        <RotateCcw size={12} strokeWidth={2.4} />
        retry
      </button>
    </div>
  )
}
