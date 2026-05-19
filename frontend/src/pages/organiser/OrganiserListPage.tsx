import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, AlertTriangle, RotateCcw, Newspaper } from 'lucide-react'

import PageWrapper from '@/components/layout/PageWrapper'
import EventRow from '@/components/organiser/EventRow'
import SpikeDialog from '@/components/organiser/SpikeDialog'
import { useOrganiserEvents } from '@/hooks/useOrganiserEvents'
import { useCancelEvent } from '@/hooks/useEventMutations'
import { deriveOrganiserStatus, type Event, type OrganiserStatus } from '@/lib/events'
import { cn } from '@/lib/utils'
import styles from './OrganiserListPage.module.css'

type ListTab = 'all' | 'draft' | 'live' | 'past'

const TABS: { id: ListTab; label: string; description: string }[] = [
  { id: 'all',   label: 'All',        description: 'every assignment' },
  { id: 'draft', label: 'In galley',  description: 'unpublished drafts' },
  { id: 'live',  label: 'Live',       description: 'published & upcoming' },
  { id: 'past',  label: 'Archived',   description: 'past editions' },
]

function tabMatch(tab: ListTab, status: OrganiserStatus): boolean {
  if (tab === 'all') return true
  if (tab === 'draft') return status === 'draft'
  if (tab === 'live') return status === 'live' || status === 'happening'
  if (tab === 'past') return status === 'past'
  return true
}

export default function OrganiserListPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useOrganiserEvents()
  const cancel = useCancelEvent()
  const [tab, setTab] = useState<ListTab>('all')
  const [spikeTarget, setSpikeTarget] = useState<Event | null>(null)

  const events = data ?? []

  const counts = useMemo(() => {
    const c: Record<ListTab, number> = { all: 0, draft: 0, live: 0, past: 0 }
    events.forEach((e) => {
      const s = deriveOrganiserStatus(e)
      c.all += 1
      if (tabMatch('draft', s)) c.draft += 1
      if (tabMatch('live', s)) c.live += 1
      if (tabMatch('past', s)) c.past += 1
    })
    return c
  }, [events])

  const filtered = useMemo(
    () => events.filter((e) => tabMatch(tab, deriveOrganiserStatus(e))),
    [events, tab]
  )

  const issueNumber = String(events.length).padStart(3, '0')

  const handleConfirmSpike = () => {
    if (!spikeTarget) return
    cancel.mutate(spikeTarget, {
      onSuccess: () => setSpikeTarget(null),
    })
  }

  return (
    <PageWrapper>
      <div className={styles.page}>
        <div className={styles.bg} aria-hidden="true">
          <div className={cn(styles.blob, styles.blob1)} />
          <div className={cn(styles.blob, styles.blob2)} />
          <div className={styles.grain} />
        </div>

        <div className={styles.content}>
          {/* ────── MASTHEAD ────── */}
          <header className={styles.masthead}>
            <div className={styles.mastheadTop}>
              <span className={styles.tagline}>
                <Newspaper size={11} strokeWidth={2.5} />
                THE EVENTHUB DESK
              </span>
              <span className={styles.issue}>ISSUE N° {issueNumber}</span>
            </div>

            <div className={styles.mastheadMain}>
              <div className={styles.mastheadLeft}>
                <h1 className={styles.heading}>
                  Your <em>front page.</em>
                </h1>
                <p className={styles.lede}>
                  Every event you commission lives here — from first draft to
                  the moment it goes live. Edit, monitor, or spike when plans
                  shift.
                </p>
              </div>

              <Link to="/organiser/events/new" className={styles.newBtn}>
                <Plus size={16} strokeWidth={2.5} />
                <span>New event</span>
              </Link>
            </div>

            <div className={styles.rule} aria-hidden="true" />
          </header>

          {/* ────── TABS ────── */}
          <nav className={styles.tabs} role="tablist" aria-label="Filter events">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={cn(styles.tab, tab === t.id && styles.tabActive)}
                onClick={() => setTab(t.id)}
              >
                <span className={styles.tabLabel}>{t.label}</span>
                <span className={styles.tabCount}>{counts[t.id]}</span>
                <span className={styles.tabHint}>{t.description}</span>
              </button>
            ))}
          </nav>

          {/* ────── LIST ────── */}
          <section className={cn(styles.list, isFetching && !isLoading && styles.listFetching)}>
            {isError ? (
              <ErrorCard
                message={(error as Error | null)?.message}
                onRetry={() => refetch()}
              />
            ) : isLoading ? (
              <div className={styles.rows}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <RowSkeleton key={i} index={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Empty tab={tab} />
            ) : (
              <div className={styles.rows}>
                {filtered.map((event, i) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    index={i}
                    onSpike={setSpikeTarget}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <SpikeDialog
          event={spikeTarget}
          registeredCount={spikeTarget?.registered_count ?? 0}
          isPending={cancel.isPending}
          onConfirm={handleConfirmSpike}
          onClose={() => !cancel.isPending && setSpikeTarget(null)}
        />
      </div>
    </PageWrapper>
  )
}

/* ════════════ Empty state ════════════ */

function Empty({ tab }: { tab: ListTab }) {
  const copy: Record<ListTab, { title: string; body: string }> = {
    all: {
      title: 'Nothing on the press. Yet.',
      body: 'When you commission your first event, it shows up here — drafts and all.',
    },
    draft: {
      title: 'No drafts in the galley.',
      body: 'Every event you start without publishing waits here.',
    },
    live: {
      title: 'Nothing live right now.',
      body: 'Publish a draft to send it out into the world.',
    },
    past: {
      title: 'The archive is empty.',
      body: 'Past editions land here once their date has passed.',
    },
  }
  const c = copy[tab]

  return (
    <div className={styles.empty}>
      <div className={styles.emptyMark} aria-hidden="true">
        <Newspaper size={28} strokeWidth={1.6} />
      </div>
      <h3 className={styles.emptyTitle}>{c.title}</h3>
      <p className={styles.emptyBody}>{c.body}</p>
      <Link to="/organiser/events/new" className={styles.emptyCta}>
        <Plus size={14} strokeWidth={2.4} />
        Commission a new event
      </Link>
    </div>
  )
}

/* ════════════ Row skeleton ════════════ */

function RowSkeleton({ index }: { index: number }) {
  return (
    <div className={styles.skel} style={{ animationDelay: `${index * 80}ms` }}>
      <div className={styles.skelHead}>
        <div className={styles.skelLine} style={{ width: 110, height: 12 }} />
        <div className={styles.skelLine} style={{ width: 84, height: 16 }} />
      </div>
      <div className={styles.skelLine} style={{ width: '70%', height: 26 }} />
      <div className={styles.skelLine} style={{ width: '90%', height: 12 }} />
      <div className={styles.skelLine} style={{ width: '40%', height: 12 }} />
    </div>
  )
}

/* ════════════ Error card ════════════ */

function ErrorCard({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className={styles.errorCard} role="alert">
      <div className={styles.errorGlyph}>
        <AlertTriangle size={24} strokeWidth={2} />
      </div>
      <h3 className={styles.errorTitle}>The desk couldn't load</h3>
      <p className={styles.errorBody}>
        We couldn't fetch your assignments. Check the connection and try again.
      </p>
      {message && <code className={styles.errorDetail}>{message}</code>}
      <button type="button" onClick={onRetry} className={styles.errorBtn}>
        <RotateCcw size={14} strokeWidth={2.4} />
        Retry
      </button>
    </div>
  )
}