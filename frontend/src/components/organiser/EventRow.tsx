import { Link } from 'react-router-dom'
import { type CSSProperties } from 'react'
import { MapPin, CalendarDays, Users, Pencil, ListChecks, Ban, ArrowUpRight } from 'lucide-react'
import {
  EVENT_TYPE_LABEL,
  deriveOrganiserStatus,
  type Event,
  type EventType,
} from '@/lib/events'
import { cn } from '@/lib/utils'
import StatusBadge from './StatusBadge'
import styles from './EventRow.module.css'

const ACCENT_BY_TYPE: Record<EventType, string> = {
  lecture: '217 91% 50%',
  club: '0 100% 30%',
  workshop: '142 60% 38%',
  other: '262 52% 50%',
}

interface EventRowProps {
  event: Event
  index?: number
  onSpike: (event: Event) => void
}

function formatRowDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function shortSerial(id: string): string {
  return id.replace(/-/g, '').slice(0, 4).toUpperCase()
}

export default function EventRow({ event, index = 0, onSpike }: EventRowProps) {
  const status = deriveOrganiserStatus(event)
  const serial = shortSerial(event.id)
  const isSpiked = status === 'spiked'
  const canSpike = !isSpiked && status !== 'past'

  const registered = event.registered_count ?? 0
  const capacity = event.capacity ?? null
  const pct =
    capacity != null && capacity > 0
      ? Math.min(100, Math.round((registered / capacity) * 100))
      : null

  const style: CSSProperties & Record<'--card-accent', string> = {
    ['--card-accent']: ACCENT_BY_TYPE[event.event_type],
    animationDelay: `${Math.min(index, 11) * 55}ms`,
  }

  return (
    <article className={cn(styles.row, isSpiked && styles.rowSpiked)} style={style}>
      {/* ─── HEAD STRIP: kicker · type · status ─── */}
      <div className={styles.head}>
        <div className={styles.kickerGroup}>
          <span className={styles.kicker}>N° {serial}</span>
          <span className={styles.kickerSep}>·</span>
          <span className={styles.type}>{EVENT_TYPE_LABEL[event.event_type]}</span>
        </div>

        <StatusBadge status={status} size="sm" />
      </div>

      {/* ─── HEADLINE ─── */}
      <Link to={`/organiser/events/${event.id}`} className={styles.headline}>
        <h3 className={styles.title}>{event.title}</h3>
        <ArrowUpRight className={styles.arrow} size={18} strokeWidth={2.2} />
      </Link>

      {event.description && (
        <p className={styles.dek}>{event.description}</p>
      )}

      {/* ─── METADATA STRIP ─── */}
      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <CalendarDays size={13} strokeWidth={2.2} />
          {formatRowDate(event.starts_at)}
        </span>
        <span className={styles.metaSep} aria-hidden="true" />
        <span className={styles.metaItem}>
          <MapPin size={13} strokeWidth={2.2} />
          {event.location}
        </span>
      </div>

      {/* ─── CAPACITY READOUT ─── */}
      <div className={styles.capacity}>
        <div className={styles.capacityHead}>
          <span className={styles.capacityIcon}>
            <Users size={13} strokeWidth={2.2} />
          </span>
          <span className={styles.capacityValue}>
            <strong>{registered}</strong>
            {capacity != null ? (
              <>
                <span className={styles.capacitySlash}>/</span>
                <span className={styles.capacityCap}>{capacity}</span>
              </>
            ) : (
              <span className={styles.capacityOpen}>open seating</span>
            )}
          </span>
          <span className={styles.capacityLabel}>
            {registered === 1 ? 'registration' : 'registrations'}
          </span>
          {pct != null && (
            <span className={styles.capacityPct}>{pct}%</span>
          )}
        </div>

        {pct != null && (
          <div className={styles.bar} aria-hidden="true">
            <div
              className={cn(
                styles.barFill,
                pct >= 100 && styles.barFull,
                pct >= 80 && pct < 100 && styles.barWarn
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {/* ─── ACTIONS ─── */}
      <div className={styles.actions}>
        <Link
          to={`/organiser/events/${event.id}`}
          className={styles.actionLink}
        >
          <ListChecks size={14} strokeWidth={2.3} />
          View list
        </Link>

        {!isSpiked && (
          <Link
            to={`/organiser/events/${event.id}/edit`}
            className={styles.actionLink}
          >
            <Pencil size={14} strokeWidth={2.3} />
            Edit
          </Link>
        )}

        {canSpike && (
          <button
            type="button"
            className={styles.spikeBtn}
            onClick={() => onSpike(event)}
          >
            <Ban size={14} strokeWidth={2.3} />
            Spike
          </button>
        )}
      </div>
    </article>
  )
}