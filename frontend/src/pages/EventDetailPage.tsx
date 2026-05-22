import { useMemo, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Wrench,
  Calendar,
  MapPin,
  Clock,
  Users,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Mic2,
  Building2,
  Library,
  RotateCcw,
} from 'lucide-react'

import PageWrapper from '@/components/layout/PageWrapper'
import EventDetailSkeleton from '@/components/events/EventDetailSkeleton'
import { Button } from '@/components/ui/Button'
import { useEventDetail } from '@/hooks/useEventDetail'
import { useRegistration } from '@/hooks/useRegistration'
import {
  EVENT_TYPE_LABEL,
  formatEventDate,
  spotsLeft,
  type Event,
  type EventType,
} from '@/lib/events'
import { cn } from '@/lib/utils'
import styles from './EventDetailPage.module.css'

const ACCENT_BY_TYPE: Record<EventType, string> = {
  lecture: '217 91% 50%',
  club: '0 100% 30%',
  workshop: '142 60% 38%',
  other: '262 52% 50%',
}

const ICON_BY_TYPE: Record<EventType, typeof BookOpen> = {
  lecture: BookOpen,
  club: Sparkles,
  workshop: Wrench,
  other: Calendar,
}

function formatTimeRange(startsAt: string, endsAt: string | null): string {
  const start = new Date(startsAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  if (!endsAt) return start
  const end = new Date(endsAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${start} – ${end}`
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: event, isLoading, isError, error, refetch } = useEventDetail(id)
  const { register, cancel } = useRegistration(id)

  const isNotFound = useMemo(
    () => isError && error instanceof Error && /not found|404/i.test(error.message),
    [isError, error]
  )

  return (
    <PageWrapper>
      <div className={styles.page}>
        <div className={styles.bg} aria-hidden="true">
          <div className={cn(styles.blob, styles.blob1)} />
          <div className={cn(styles.blob, styles.blob2)} />
          <div className={cn(styles.blob, styles.blob3)} />
        </div>

        <div className={styles.content}>
          <Link to="/" className={styles.back}>
            <ArrowLeft size={16} strokeWidth={2.5} />
            <span>Back to events</span>
          </Link>

          {isLoading ? (
            <EventDetailSkeleton />
          ) : isNotFound ? (
            <NotFoundCard />
          ) : isError ? (
            <ErrorCard message={(error as Error | null)?.message} onRetry={() => refetch()} />
          ) : event ? (
            <EventDetailView
              event={event}
              onRegister={() => register.mutate()}
              onCancel={() => cancel.mutate()}
              isRegistering={register.isPending}
              isCancelling={cancel.isPending}
            />
          ) : null}
        </div>
      </div>
    </PageWrapper>
  )
}

interface ViewProps {
  event: Event
  onRegister: () => void
  onCancel: () => void
  isRegistering: boolean
  isCancelling: boolean
}

function EventDetailView({ event, onRegister, onCancel, isRegistering, isCancelling }: ViewProps) {
  const { day, month, weekday, time } = formatEventDate(event.starts_at)
  const remaining = spotsLeft(event)
  const TypeIcon = ICON_BY_TYPE[event.event_type]

  const style: CSSProperties & Record<'--card-accent', string> = {
    ['--card-accent']: ACCENT_BY_TYPE[event.event_type],
  }

  const isPast = new Date(event.starts_at) < new Date()
  const isFull = remaining === 0
  const isCancelled = event.is_cancelled
  const isRegistered = !!event.is_registered

  const disabledReason: string | null = isCancelled
    ? 'This event has been cancelled.'
    : isPast
      ? 'This event has already started or ended.'
      : isFull && !isRegistered
        ? 'No spots left.'
        : null

  const ctaDisabled = disabledReason !== null
  const mutationPending = isRegistering || isCancelling

  const capacityPct = event.capacity != null && event.capacity > 0
    ? Math.min(100, Math.round(((event.registered_count ?? 0) / event.capacity) * 100))
    : null

  return (
    <article className={styles.article} style={style}>
      {/* ───── HERO ───── */}
      <header className={cn(styles.hero, isCancelled && styles.heroCancelled)}>
        {event.cover_image_url && (
          <img src={event.cover_image_url} alt="" className={styles.heroImage} />
        )}

        <div className={styles.heroOverlay} aria-hidden="true" />
        <span className={styles.heroSerial} aria-hidden="true">
          {EVENT_TYPE_LABEL[event.event_type].charAt(0)}
        </span>

        <div className={styles.heroTop}>
          <span className={styles.typePill}>
            <span className={styles.typeDot} aria-hidden="true" />
            <TypeIcon size={12} strokeWidth={2.5} />
            {EVENT_TYPE_LABEL[event.event_type]}
          </span>

          <div className={styles.statusPills}>
            {isCancelled && (
              <span className={cn(styles.statusPill, styles.statusCancelled)}>
                <Ban size={12} strokeWidth={2.5} />
                Cancelled
              </span>
            )}
            {isRegistered && !isCancelled && (
              <span className={cn(styles.statusPill, styles.statusRegistered)}>
                <CheckCircle2 size={12} strokeWidth={2.8} />
                Registered
              </span>
            )}
          </div>
        </div>

        <div className={styles.heroBottom}>
          <div className={styles.dateBadge} aria-hidden="true">
            <span className={styles.dateDay}>{day}</span>
            <span className={styles.dateMeta}>
              <span>{month}</span>
              <span className={styles.dateWeekday}>{weekday}</span>
            </span>
          </div>

          <div className={styles.heroTitleWrap}>
            <span className={styles.overline}>
              {weekday} · {time}
            </span>
            <h1 className={styles.heroTitle}>{event.title}</h1>
          </div>
        </div>
      </header>

      {/* ───── MAIN GRID ───── */}
      <div className={styles.grid}>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>About this event</h2>
            <p className={styles.description}>{event.description}</p>
          </section>

          {event.speaker_name && (
            <section className={cn(styles.section, styles.sectionBlock)}>
              <div className={styles.blockHead}>
                <Mic2 size={16} strokeWidth={2.2} />
                <h2 className={styles.blockTitle}>Speaker</h2>
              </div>
              <p className={styles.blockBody}>{event.speaker_name}</p>
            </section>
          )}

          {event.club && (
            <section className={cn(styles.section, styles.sectionBlock, styles.sectionSociety)}>
              <div className={styles.blockHead}>
                <Library size={16} strokeWidth={2.2} />
                <h2 className={styles.blockTitle}>Hosted by</h2>
              </div>
              <p className={styles.blockBody}>
                <span className={styles.societyName}>{event.club.name}</span>
                <span className={styles.societyHint}>society</span>
              </p>
            </section>
          )}

          <section className={cn(styles.section, styles.sectionBlock)}>
            {/* TODO: hydrate organiser name when /users/{id} endpoint lands */}
            <div className={styles.blockHead}>
              <Building2 size={16} strokeWidth={2.2} />
              <h2 className={styles.blockTitle}>Organiser</h2>
            </div>
            <p className={styles.blockBody}>
              TBA
              <span className={styles.organiserId}>ID: {event.organiser_id.slice(0, 8)}…</span>
            </p>
          </section>
        </main>

        {/* ───── ASIDE ───── */}
        <aside className={styles.aside}>
          <div className={styles.asideInner}>
            <div className={styles.factRow}>
              <span className={styles.factIcon}>
                <Calendar size={16} strokeWidth={2.2} />
              </span>
              <div>
                <span className={styles.factLabel}>Date</span>
                <span className={styles.factValue}>{formatFullDate(event.starts_at)}</span>
              </div>
            </div>

            <div className={styles.factRow}>
              <span className={styles.factIcon}>
                <Clock size={16} strokeWidth={2.2} />
              </span>
              <div>
                <span className={styles.factLabel}>Time</span>
                <span className={styles.factValue}>{formatTimeRange(event.starts_at, event.ends_at)}</span>
              </div>
            </div>

            <div className={styles.factRow}>
              <span className={styles.factIcon}>
                <MapPin size={16} strokeWidth={2.2} />
              </span>
              <div>
                <span className={styles.factLabel}>Location</span>
                <span className={styles.factValue}>{event.location}</span>
              </div>
            </div>

            <div className={styles.capacityBlock}>
              <div className={styles.capacityHead}>
                <span className={styles.factIcon}>
                  <Users size={16} strokeWidth={2.2} />
                </span>
                <div>
                  <span className={styles.factLabel}>Capacity</span>
                  <span className={styles.factValue}>
                    {event.capacity == null ? (
                      'Unlimited'
                    ) : (
                      <>
                        <strong>{event.registered_count ?? 0}</strong> out of {event.capacity} registered
                      </>
                    )}
                  </span>
                </div>
              </div>

              {capacityPct != null && (
                <div className={styles.capacityTrack} aria-hidden="true">
                  <div
                    className={cn(
                      styles.capacityFill,
                      capacityPct >= 100 && styles.capacityFull,
                      capacityPct >= 80 && capacityPct < 100 && styles.capacityWarn
                    )}
                    style={{ width: `${capacityPct}%` }}
                  />
                </div>
              )}
            </div>

            <div className={styles.ctaWrap}>
              {isRegistered ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="lg"
                  fullWidth
                  loading={isCancelling}
                  disabled={mutationPending || isCancelled || isPast}
                  onClick={onCancel}
                >
                  <Ban size={16} strokeWidth={2.5} />
                  Cancel registration
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={isRegistering}
                  disabled={ctaDisabled || mutationPending}
                  onClick={onRegister}
                >
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                  {isFull ? 'Fully booked' : 'Register'}
                </Button>
              )}

              {disabledReason && !isRegistered && (
                <p className={styles.disabledHint}>
                  <AlertTriangle size={12} strokeWidth={2.4} />
                  {disabledReason}
                </p>
              )}
              {isRegistered && !isCancelled && !isPast && (
                <p className={styles.registeredHint}>
                  <CheckCircle2 size={12} strokeWidth={2.4} />
                  You're on the list. We'll see you there.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </article>
  )
}

function NotFoundCard() {
  return (
    <div className={styles.errorCard} role="alert">
      <div className={styles.errorGlyph}>
        <Calendar size={28} strokeWidth={2} />
      </div>
      <h2 className={styles.errorTitle}>Event not found</h2>
      <p className={styles.errorMessage}>
        This event might have been removed, or the link is wrong. Head back to the list to see what's on.
      </p>
      <Link to="/" className={styles.errorAction}>
        <ArrowLeft size={14} strokeWidth={2.5} />
        Back to events
      </Link>
    </div>
  )
}

function ErrorCard({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className={styles.errorCard} role="alert">
      <div className={styles.errorGlyph}>
        <AlertTriangle size={28} strokeWidth={2} />
      </div>
      <h2 className={styles.errorTitle}>Couldn't load this event</h2>
      <p className={styles.errorMessage}>
        Something went wrong while reaching the server. Check your connection and try again.
      </p>
      {message && <code className={styles.errorDetail}>{message}</code>}
      <button type="button" onClick={onRetry} className={styles.errorAction}>
        <RotateCcw size={14} strokeWidth={2.5} />
        Try again
      </button>
    </div>
  )
}
