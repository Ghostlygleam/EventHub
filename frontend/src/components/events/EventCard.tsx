import { Link } from 'react-router-dom'
import { MapPin, Users, ArrowUpRight, CheckCircle2, BookOpen, Sparkles, Wrench, Calendar, Ban, Library } from 'lucide-react'
import type { CSSProperties } from 'react'
import {
  EVENT_TYPE_LABEL,
  formatEventDate,
  spotsLeft,
  type Event,
  type EventType,
} from '@/lib/events'
import styles from './EventCard.module.css'

/* Per-type accent — HSL triplets so we can drive the card via a single CSS var. */
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

interface EventCardProps {
  event: Event
  /** Stagger index — used to compute animation-delay so the grid reveals in cascade. */
  index?: number
}

export default function EventCard({ event, index = 0 }: EventCardProps) {
  const { day, month, weekday, time } = formatEventDate(event.starts_at)
  const remaining = spotsLeft(event)
  const TypeIcon = ICON_BY_TYPE[event.event_type]
  const initial = EVENT_TYPE_LABEL[event.event_type].charAt(0)

  const style: CSSProperties & Record<'--card-accent', string> = {
    ['--card-accent']: ACCENT_BY_TYPE[event.event_type],
    animationDelay: `${Math.min(index, 11) * 55}ms`,
  }

  const spotsState = remaining == null
    ? 'muted'
    : remaining === 0
      ? 'full'
      : remaining <= 5
        ? 'warning'
        : ''

  return (
    <Link
      to={`/events/${event.id}`}
      className={[styles.card, event.is_cancelled ? styles.cancelled : ''].join(' ')}
      style={style}
      aria-label={`Open ${event.title}`}
    >
      <div className={styles.cover}>
        {event.cover_image_url && (
          <img src={event.cover_image_url} alt="" className={styles.coverImage} loading="lazy" />
        )}

        {!event.cover_image_url && (
          <span className={styles.serial} aria-hidden="true">{initial}</span>
        )}

        <div className={styles.coverTop}>
          <span className={styles.typePill}>
            <span className={styles.typeDot} />
            <TypeIcon size={12} strokeWidth={2.5} />
            {EVENT_TYPE_LABEL[event.event_type]}
          </span>

          {event.is_cancelled ? (
            <span className={[styles.registeredPill, styles.cancelledPill].join(' ')}>
              <Ban size={12} strokeWidth={2.5} />
              Cancelled
            </span>
          ) : event.is_registered ? (
            <span className={styles.registeredPill}>
              <CheckCircle2 size={12} strokeWidth={2.8} />
              Registered
            </span>
          ) : null}
        </div>

        <div className={styles.dateBlock}>
          <span className={styles.dateDay}>{day}</span>
          <span className={styles.dateMeta}>
            <span className={styles.dateMonth}>{month}</span>
            <span className={styles.dateWeekday}>{weekday} · {time}</span>
          </span>
        </div>
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{event.title}</h3>

        {event.club && (
          <span className={styles.societyChip} title={`Hosted by ${event.club.name}`}>
            <Library size={11} strokeWidth={2.4} />
            <span className={styles.societyLabel}>hosted by</span>
            <span className={styles.societyName}>{event.club.name}</span>
          </span>
        )}

        {event.speaker_name && (
          <p className={styles.speaker}>
            <em>Speaker</em>
            {event.speaker_name}
          </p>
        )}

        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <MapPin strokeWidth={2.2} />
            <span>{event.location}</span>
          </span>

          <span className={[styles.metaItem, spotsState && styles[spotsState]].filter(Boolean).join(' ')}>
            <Users strokeWidth={2.2} />
            {remaining == null ? (
              <span>Open seating</span>
            ) : remaining === 0 ? (
              <span><span className={styles.spotsValue}>Fully booked</span></span>
            ) : (
              <span>
                <span className={styles.spotsValue}>{remaining}</span>
                {' '}of {event.capacity} spots left
              </span>
            )}
          </span>
        </div>

        <div className={styles.cta}>
          <span>View details</span>
          <span className={styles.ctaArrow}>
            <ArrowUpRight strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </Link>
  )
}
