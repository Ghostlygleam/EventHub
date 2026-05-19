import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Ban,
  Download,
  MapPin,
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  RotateCcw,
  Newspaper,
} from 'lucide-react'

import PageWrapper from '@/components/layout/PageWrapper'
import { useEventDetail } from '@/hooks/useEventDetail'
import { useEventRegistrations } from '@/hooks/useEventRegistrations'
import { useCancelEvent } from '@/hooks/useEventMutations'
import {
  EVENT_TYPE_LABEL,
  deriveOrganiserStatus,
  type EventType,
} from '@/lib/events'
import { cn } from '@/lib/utils'
import StatusBadge from '@/components/organiser/StatusBadge'
import RegistrationsTable from '@/components/organiser/RegistrationsTable'
import SpikeDialog from '@/components/organiser/SpikeDialog'
import styles from './OrganiserEventDetailPage.module.css'

const ACCENT_BY_TYPE: Record<EventType, string> = {
  lecture: '217 91% 50%',
  club: '0 100% 30%',
  workshop: '142 60% 38%',
  other: '262 52% 50%',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTimeRange(starts: string, ends: string | null): string {
  const s = new Date(starts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (!ends) return s
  const e = new Date(ends).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${s} – ${e}`
}

export default function OrganiserEventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: event, isLoading: isLoadingEvent, isError: isEventError, error: eventError, refetch } = useEventDetail(id)
  const { data: registrations, isLoading: isLoadingRegs, refetch: refetchRegs } = useEventRegistrations(id)
  const cancel = useCancelEvent()

  const [spikeOpen, setSpikeOpen] = useState(false)

  const handleSpikeConfirm = () => {
    if (!event) return
    cancel.mutate(event, {
      onSuccess: () => {
        setSpikeOpen(false)
        refetch()
      },
    })
  }

  const handleExport = () => {
    if (!id) return
    const token = localStorage.getItem('token')
    const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
    fetch(`${baseUrl}/events/${id}/registrations/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('Export failed')
        return res.blob()
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `registrations_${id}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .catch(() => {
        // Toast handled by api client elsewhere if needed; keep silent fallback.
      })
  }

  if (isLoadingEvent && !event) {
    return (
      <PageWrapper>
        <DetailFallback>
          <Skeleton />
        </DetailFallback>
      </PageWrapper>
    )
  }

  if (isEventError || !event) {
    const msg = (eventError as Error | null)?.message
    return (
      <PageWrapper>
        <DetailFallback>
          <ErrorCard message={msg} onRetry={() => refetch()} onBack={() => navigate('/organiser')} />
        </DetailFallback>
      </PageWrapper>
    )
  }

  const status = deriveOrganiserStatus(event)
  const serial = event.id.replace(/-/g, '').slice(0, 4).toUpperCase()
  const accent = ACCENT_BY_TYPE[event.event_type]
  const isSpiked = status === 'spiked'
  const isPast = status === 'past'
  const canEdit = !isSpiked
  const canSpike = !isSpiked && !isPast

  const totalReaders = registrations?.total ?? 0
  const capacityPct =
    event.capacity != null && event.capacity > 0
      ? Math.min(100, Math.round(((event.registered_count ?? 0) / event.capacity) * 100))
      : null

  return (
    <PageWrapper>
      <div className={styles.page} style={{ ['--card-accent' as never]: accent }}>
        <div className={styles.bg} aria-hidden="true">
          <div className={cn(styles.blob, styles.blob1)} />
          <div className={cn(styles.blob, styles.blob2)} />
          <div className={styles.grain} />
        </div>

        <div className={styles.content}>
          <Link to="/organiser" className={styles.back}>
            <ArrowLeft size={14} strokeWidth={2.4} />
            Back to the desk
          </Link>

          {/* ─── MASTHEAD ─── */}
          <header className={styles.masthead}>
            <div className={styles.mastheadTop}>
              <span className={styles.kicker}>
                N° {serial} · {EVENT_TYPE_LABEL[event.event_type].toUpperCase()}
              </span>
              <StatusBadge status={status} size="md" />
            </div>

            <h1 className={styles.title}>{event.title}</h1>

            <div className={styles.metaStrip}>
              <span className={styles.metaItem}>
                <Calendar size={13} strokeWidth={2.2} />
                {formatDate(event.starts_at)}
              </span>
              <span className={styles.metaDot} />
              <span className={styles.metaItem}>
                <Clock size={13} strokeWidth={2.2} />
                {formatTimeRange(event.starts_at, event.ends_at)}
              </span>
              <span className={styles.metaDot} />
              <span className={styles.metaItem}>
                <MapPin size={13} strokeWidth={2.2} />
                {event.location}
              </span>
            </div>

            <div className={styles.rule} aria-hidden="true" />
          </header>

          {/* ─── STATS STRIP ─── */}
          <section className={styles.stats}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Subscribers</span>
              <span className={styles.statValue}>
                <strong>{event.registered_count ?? 0}</strong>
                {event.capacity != null && (
                  <span className={styles.statCap}>/ {event.capacity}</span>
                )}
              </span>
              {capacityPct != null && (
                <div className={styles.statBar} aria-hidden="true">
                  <div
                    className={cn(
                      styles.statBarFill,
                      capacityPct >= 100 && styles.statBarFull,
                      capacityPct >= 80 && capacityPct < 100 && styles.statBarWarn
                    )}
                    style={{ width: `${capacityPct}%` }}
                  />
                </div>
              )}
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Status</span>
              <span className={styles.statText}>
                {status === 'live' && 'Published & upcoming'}
                {status === 'draft' && 'Sitting in the galley'}
                {status === 'happening' && 'On air right now'}
                {status === 'past' && 'Archived edition'}
                {status === 'spiked' && 'Spiked from the schedule'}
              </span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Commissioned</span>
              <span className={styles.statText}>
                {new Date(event.created_at).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </section>

          {/* ─── ACTIONS BAR ─── */}
          <div className={styles.actions}>
            {canEdit && (
              <Link to={`/organiser/events/${event.id}/edit`} className={cn(styles.action, styles.actionPrimary)}>
                <Pencil size={14} strokeWidth={2.4} />
                Edit copy
              </Link>
            )}

            <button
              type="button"
              onClick={handleExport}
              className={styles.action}
              disabled={totalReaders === 0}
              title={totalReaders === 0 ? 'No subscribers to export' : 'Download CSV'}
            >
              <Download size={14} strokeWidth={2.4} />
              Export CSV
            </button>

            {canSpike && (
              <button
                type="button"
                onClick={() => setSpikeOpen(true)}
                className={cn(styles.action, styles.actionDanger)}
              >
                <Ban size={14} strokeWidth={2.4} />
                Spike event
              </button>
            )}
          </div>

          {/* ─── REGISTRATIONS ─── */}
          <section className={styles.regSection}>
            <header className={styles.regHead}>
              <div>
                <span className={styles.regKicker}>ROLL N° {serial}</span>
                <h2 className={styles.regTitle}>The subscribers</h2>
              </div>
              <span className={styles.regCount}>
                <Users size={13} strokeWidth={2.4} />
                <strong>{totalReaders}</strong>
                <span>{totalReaders === 1 ? 'name' : 'names'} on file</span>
              </span>
            </header>

            {isLoadingRegs ? (
              <div className={styles.regSkel}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={styles.regSkelRow} style={{ animationDelay: `${i * 60}ms` }} />
                ))}
              </div>
            ) : (
              <RegistrationsTable students={registrations?.students ?? []} />
            )}

            {!isLoadingRegs && totalReaders > 0 && (
              <button
                type="button"
                className={styles.regRefresh}
                onClick={() => refetchRegs()}
              >
                <RotateCcw size={11} strokeWidth={2.4} />
                Refresh roll
              </button>
            )}
          </section>
        </div>

        <SpikeDialog
          event={spikeOpen ? event : null}
          registeredCount={totalReaders}
          isPending={cancel.isPending}
          onConfirm={handleSpikeConfirm}
          onClose={() => !cancel.isPending && setSpikeOpen(false)}
        />
      </div>
    </PageWrapper>
  )
}

/* ────── Helpers ────── */

function DetailFallback({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden="true">
        <div className={cn(styles.blob, styles.blob1)} />
        <div className={cn(styles.blob, styles.blob2)} />
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className={styles.skel}>
      <div className={styles.skelLine} style={{ width: 140, height: 12 }} />
      <div className={styles.skelLine} style={{ width: '80%', height: 40 }} />
      <div className={styles.skelLine} style={{ width: '60%', height: 14 }} />
      <div className={styles.skelGrid}>
        <div className={styles.skelLine} style={{ height: 80 }} />
        <div className={styles.skelLine} style={{ height: 80 }} />
        <div className={styles.skelLine} style={{ height: 80 }} />
      </div>
    </div>
  )
}

function ErrorCard({
  message,
  onRetry,
  onBack,
}: {
  message?: string
  onRetry: () => void
  onBack: () => void
}) {
  return (
    <div className={styles.errorCard} role="alert">
      <div className={styles.errorGlyph}>
        <AlertTriangle size={26} strokeWidth={2} />
      </div>
      <h2 className={styles.errorTitle}>Couldn't open this assignment</h2>
      <p className={styles.errorBody}>
        Either it was spiked, or the link is wrong, or the server is napping. Try again, or head back to the desk.
      </p>
      {message && <code className={styles.errorDetail}>{message}</code>}
      <div className={styles.errorActions}>
        <button type="button" onClick={onRetry} className={styles.errorBtn}>
          <RotateCcw size={14} strokeWidth={2.4} />
          Try again
        </button>
        <button type="button" onClick={onBack} className={styles.errorBtnSecondary}>
          <Newspaper size={14} strokeWidth={2.4} />
          Back to the desk
        </button>
      </div>
    </div>
  )
}