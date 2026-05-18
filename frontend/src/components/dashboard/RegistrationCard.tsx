import { Link } from 'react-router-dom'
import { type CSSProperties } from 'react'
import {
  MapPin,
  Clock,
  Mic2,
  Ban,
  ArrowUpRight,
  BookOpen,
  Sparkles,
  Wrench,
  Calendar,
  Check,
} from 'lucide-react'
import {
  EVENT_TYPE_LABEL,
  formatEventDate,
  type Event,
  type EventType,
} from '@/lib/events'
import { cn } from '@/lib/utils'
import styles from './RegistrationCard.module.css'

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

interface RegistrationCardProps {
  event: Event
  variant: 'upcoming' | 'past'
  index?: number
  onCancel?: (event: Event) => void
  isCancelling?: boolean
}

export default function RegistrationCard({
  event,
  variant,
  index = 0,
  onCancel,
  isCancelling = false,
}: RegistrationCardProps) {
  const { day, month, weekday, time } = formatEventDate(event.starts_at)
  const TypeIcon = ICON_BY_TYPE[event.event_type]
  const serial = formatSerial(event.id)
  const isCancelled = event.is_cancelled

  const style: CSSProperties & Record<'--card-accent', string> = {
    ['--card-accent']: ACCENT_BY_TYPE[event.event_type],
    animationDelay: `${Math.min(index, 11) * 60}ms`,
  }

  return (
    <article
      className={cn(
        styles.card,
        variant === 'past' && styles.cardPast,
        isCancelled && styles.cardCancelled
      )}
      style={style}
    >
      {/* ───── MAIN (left) ───── */}
      <Link
        to={`/events/${event.id}`}
        className={styles.main}
        aria-label={`Open ${event.title}`}
      >
        <div className={styles.dateBlock} aria-hidden="true">
          <span className={styles.dateDay}>{day}</span>
          <span className={styles.dateMonth}>{month}</span>
          <span className={styles.dateWeekday}>{weekday}</span>
        </div>

        <div className={styles.body}>
          <div className={styles.bodyTop}>
            <span className={styles.typePill}>
              <TypeIcon size={11} strokeWidth={2.5} />
              {EVENT_TYPE_LABEL[event.event_type]}
            </span>
            <span className={styles.serial} aria-hidden="true">N° {serial}</span>
          </div>

          <h3 className={styles.title}>{event.title}</h3>

          {event.speaker_name && (
            <p className={styles.speaker}>
              <Mic2 size={11} strokeWidth={2.2} />
              <span>{event.speaker_name}</span>
            </p>
          )}

          <div className={styles.metaRow}>
            <span className={styles.metaItem}>
              <Clock size={12} strokeWidth={2.2} />
              <span>{time}</span>
            </span>
            <span className={styles.metaItem}>
              <MapPin size={12} strokeWidth={2.2} />
              <span>{event.location}</span>
            </span>
          </div>

          <span className={styles.openHint}>
            View details
            <ArrowUpRight size={12} strokeWidth={2.5} />
          </span>
        </div>
      </Link>

      {/* ───── PERFORATION ───── */}
      <div className={styles.perforation} aria-hidden="true">
        <span className={styles.notchTop} />
        <span className={styles.perfLine} />
        <span className={styles.notchBottom} />
      </div>

      {/* ───── STUB (right) ───── */}
      <div className={styles.stub}>
        {variant === 'upcoming' ? (
          isCancelled ? (
            <div className={styles.stubVoided} role="status">
              <Ban size={18} strokeWidth={2.4} />
              <span className={styles.stubVoidedLabel}>Event<br />cancelled</span>
            </div>
          ) : (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => onCancel?.(event)}
              disabled={isCancelling}
              aria-label={`Cancel registration for ${event.title}`}
            >
              {isCancelling ? (
                <span className={styles.spinner} aria-hidden="true" />
              ) : (
                <>
                  <Ban size={14} strokeWidth={2.4} />
                  <span>Cancel</span>
                  <span className={styles.cancelHint}>void this ticket</span>
                </>
              )}
            </button>
          )
        ) : (
          <div className={styles.stamp} aria-label="Attended">
            <span className={styles.stampInner}>
              <Check size={14} strokeWidth={3} />
              <span>ATTENDED</span>
              <span className={styles.stampDate}>{day} {month}</span>
            </span>
          </div>
        )}
      </div>
    </article>
  )
}

function formatSerial(id: string): string {
  /* Stable 4-char hex serial from UUID — purely decorative. */
  const hex = id.replace(/-/g, '').slice(0, 4).toUpperCase()
  return hex
}
