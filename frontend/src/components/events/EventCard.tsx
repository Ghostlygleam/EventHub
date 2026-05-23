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

/* Magazine-style dek: snip the first ~95 chars at a word boundary, append ellipsis. */
function buildDek(text: string, maxLen = 95): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (t.length <= maxLen) return t
  const cut = t.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(' ')
  const sliced = lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut
  return sliced.replace(/[,.;:!\-—]+$/, '') + '…'
}

/* Editorial sign-off countdown — used as a fallback when there's no dek source. */
function relativeUntil(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now()
  if (diffMs < 0) return 'already happened'
  const min = Math.round(diffMs / 60000)
  if (min < 60)  return min <= 1 ? 'starting now' : `in ${min} minutes`
  const hr = Math.round(min / 60)
  if (hr < 24)   return hr === 1 ? 'in an hour' : `in ${hr} hours`
  const day = Math.round(hr / 24)
  if (day === 1) return 'tomorrow'
  if (day < 7)   return `in ${day} days`
  const wk = Math.round(day / 7)
  if (wk === 1)  return 'next week'
  if (wk < 5)    return `in ${wk} weeks`
  return 'next month'
}

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

        {(() => {
          const isSparse = !event.club && !event.speaker_name
          const hasDescription = event.description && event.description.trim().length >= 10

          if (hasDescription) {
            /* Sparse middle → render the dek as the lede (bigger, roman, accent rule).
               Rich middle → keep it compact as a secondary italic tease. */
            return (
              <p className={isSparse ? styles.dekLede : styles.dek}>
                {buildDek(event.description, isSparse ? 220 : 95)}
              </p>
            )
          }
          if (isSparse) {
            return <p className={styles.countdown}>{relativeUntil(event.starts_at)}</p>
          }
          return null
        })()}

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
