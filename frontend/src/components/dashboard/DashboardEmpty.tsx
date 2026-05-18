import { Link } from 'react-router-dom'
import { ArrowRight, Ticket, Archive } from 'lucide-react'
import styles from './DashboardEmpty.module.css'

interface DashboardEmptyProps {
  variant: 'upcoming' | 'past'
}

export default function DashboardEmpty({ variant }: DashboardEmptyProps) {
  if (variant === 'upcoming') {
    return (
      <div className={styles.empty} role="status">
        <div className={styles.illustration} aria-hidden="true">
          <BlankTicket />
        </div>
        <h3 className={styles.title}>Nothing on the agenda. Yet.</h3>
        <p className={styles.body}>
          When you book a spot for a lecture, club night, or workshop, the
          ticket lives right here — easy to find, easy to void.
        </p>
        <Link to="/" className={styles.cta}>
          <Ticket size={14} strokeWidth={2.4} />
          Browse events
          <ArrowRight size={14} strokeWidth={2.4} />
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.empty} role="status">
      <div className={styles.illustration} aria-hidden="true">
        <EmptyArchive />
      </div>
      <h3 className={styles.title}>Your archive is fresh.</h3>
      <p className={styles.body}>
        Every event you attend leaves its stub here — a small collection of
        moments on campus. Start with what's coming up next.
      </p>
      <Link to="/" className={styles.cta}>
        <Archive size={14} strokeWidth={2.4} />
        Find your first event
        <ArrowRight size={14} strokeWidth={2.4} />
      </Link>
    </div>
  )
}

/* ─── Inline illustrations ─── */

function BlankTicket() {
  return (
    <svg width="120" height="78" viewBox="0 0 120 78" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ticketFill" x1="0" y1="0" x2="120" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(0, 100%, 27%)" stopOpacity="0.08" />
          <stop offset="1" stopColor="hsl(0, 100%, 27%)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path
        d="M8 10 H78 V18 A4 4 0 0 0 78 30 V48 A4 4 0 0 0 78 60 V68 H8 V60 A4 4 0 0 0 8 48 V30 A4 4 0 0 0 8 18 Z"
        fill="url(#ticketFill)"
        stroke="hsl(0, 100%, 27%)"
        strokeOpacity="0.32"
        strokeWidth="1.2"
      />
      <path
        d="M88 10 H112 V68 H88 V60 A4 4 0 0 1 88 48 V30 A4 4 0 0 1 88 18 Z"
        fill="url(#ticketFill)"
        stroke="hsl(0, 100%, 27%)"
        strokeOpacity="0.32"
        strokeWidth="1.2"
      />
      <line x1="83" y1="14" x2="83" y2="64" stroke="hsl(0, 100%, 27%)" strokeOpacity="0.32" strokeWidth="1.1" strokeDasharray="3 3" />
      <rect x="20" y="26" width="32" height="3" rx="1.5" fill="hsl(0, 100%, 27%)" fillOpacity="0.22" />
      <rect x="20" y="34" width="48" height="6" rx="2" fill="hsl(0, 100%, 27%)" fillOpacity="0.32" />
      <rect x="20" y="46" width="22" height="3" rx="1.5" fill="hsl(0, 100%, 27%)" fillOpacity="0.18" />
    </svg>
  )
}

function EmptyArchive() {
  return (
    <svg width="120" height="84" viewBox="0 0 120 84" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="binderFill" x1="60" y1="0" x2="60" y2="84" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(0, 100%, 27%)" stopOpacity="0.05" />
          <stop offset="1" stopColor="hsl(0, 100%, 27%)" stopOpacity="0.14" />
        </linearGradient>
      </defs>
      {/* binder */}
      <path
        d="M14 22 H106 V76 A2 2 0 0 1 104 78 H16 A2 2 0 0 1 14 76 Z"
        fill="url(#binderFill)"
        stroke="hsl(0, 100%, 27%)"
        strokeOpacity="0.35"
        strokeWidth="1.2"
      />
      <path
        d="M40 22 V18 A2 2 0 0 1 42 16 H78 A2 2 0 0 1 80 18 V22"
        stroke="hsl(0, 100%, 27%)"
        strokeOpacity="0.35"
        strokeWidth="1.2"
        fill="none"
      />
      {/* divider tabs */}
      <rect x="22" y="32" width="6" height="40" rx="1.5" fill="hsl(0, 100%, 27%)" fillOpacity="0.18" />
      <rect x="32" y="32" width="6" height="40" rx="1.5" fill="hsl(0, 100%, 27%)" fillOpacity="0.14" />
      <rect x="42" y="32" width="6" height="40" rx="1.5" fill="hsl(0, 100%, 27%)" fillOpacity="0.18" />
      <rect x="52" y="32" width="6" height="40" rx="1.5" fill="hsl(0, 100%, 27%)" fillOpacity="0.14" />
      <rect x="62" y="32" width="6" height="40" rx="1.5" fill="hsl(0, 100%, 27%)" fillOpacity="0.18" />
      <rect x="72" y="32" width="6" height="40" rx="1.5" fill="hsl(0, 100%, 27%)" fillOpacity="0.14" />
      <rect x="82" y="32" width="6" height="40" rx="1.5" fill="hsl(0, 100%, 27%)" fillOpacity="0.18" />
      <rect x="92" y="32" width="6" height="40" rx="1.5" fill="hsl(0, 100%, 27%)" fillOpacity="0.14" />
    </svg>
  )
}
