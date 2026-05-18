import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, RotateCcw, Compass, Sparkles } from 'lucide-react'

import PageWrapper from '@/components/layout/PageWrapper'
import {
  RegistrationCard,
  CancelConfirmDialog,
  DashboardTabs,
  DashboardEmpty,
  RegistrationSkeleton,
  type DashboardTab,
} from '@/components/dashboard'
import { useAuth } from '@/hooks/useAuth'
import { useMyRegistrations } from '@/hooks/useMyRegistrations'
import { useCancelRegistration } from '@/hooks/useCancelRegistration'
import type { Event } from '@/lib/events'
import { cn } from '@/lib/utils'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading, isError, error, refetch, isFetching } = useMyRegistrations()
  const cancel = useCancelRegistration()

  const [tab, setTab] = useState<DashboardTab>('upcoming')
  const [pendingCancel, setPendingCancel] = useState<Event | null>(null)

  const upcoming = data?.upcoming ?? []
  const past = data?.past ?? []

  const list = tab === 'upcoming' ? upcoming : past

  const { initials, firstName, residentSince, serial } = useMemo(
    () => deriveIdentity(user?.email, user?.id),
    [user?.email, user?.id]
  )

  const handleConfirm = () => {
    if (!pendingCancel) return
    cancel.mutate(pendingCancel, {
      onSuccess: () => setPendingCancel(null),
    })
  }

  return (
    <PageWrapper>
      <div className={styles.page}>
        {/* ─── Background atmosphere ─── */}
        <div className={styles.bg} aria-hidden="true">
          <div className={cn(styles.blob, styles.blob1)} />
          <div className={cn(styles.blob, styles.blob2)} />
          <div className={cn(styles.blob, styles.blob3)} />
          <div className={styles.dots} />
        </div>

        <div className={styles.content}>
          {/* ════════════════ HERO — Campus Pass ════════════════ */}
          <section className={styles.pass} aria-label="Your campus pass">
            <div className={styles.passPerf} aria-hidden="true">
              {Array.from({ length: 32 }).map((_, i) => (
                <span key={i} className={styles.passPerfDot} />
              ))}
            </div>

            <div className={styles.passInner}>
              <div className={styles.passHeader}>
                <div className={styles.passBrand}>
                  <span className={styles.passBrandMark}>DMUK</span>
                  <span className={styles.passBrandDot} />
                  <span className={styles.passBrandWord}>EventHub Pass</span>
                </div>
                <div className={styles.passSerial}>
                  <span className={styles.passSerialLabel}>N°</span>
                  <span className={styles.passSerialValue}>{serial}</span>
                </div>
              </div>

              <div className={styles.passMain}>
                <div className={styles.identity}>
                  <div className={styles.avatar} aria-hidden="true">
                    <span className={styles.avatarInitials}>{initials}</span>
                    <span className={styles.avatarRing} />
                  </div>
                  <div className={styles.identityText}>
                    <span className={styles.eyebrow}>
                      <Sparkles size={11} strokeWidth={2.4} />
                      Resident · {residentSince}
                    </span>
                    <h1 className={styles.heading}>
                      Hey, <em>{firstName}</em>.
                    </h1>
                    <p className={styles.tagline}>
                      Your tickets, your archive — everything from the campus,
                      kept in one pass.
                    </p>
                  </div>
                </div>

                <div className={styles.stats}>
                  <Stat
                    value={upcoming.length}
                    label="Upcoming"
                    sublabel={upcoming.length === 0 ? 'on the way' : 'lined up'}
                  />
                  <Stat
                    value={past.length}
                    label="Attended"
                    sublabel={past.length === 0 ? 'so far' : 'in the books'}
                    muted
                  />
                </div>
              </div>

              <div className={styles.passFooter}>
                <span className={styles.passFooterCode}>
                  ◆ DMUK · 2026 · MEMBER ◆ {serial}
                </span>
                <span className={styles.passFooterMeta}>
                  Valid while you study with us
                </span>
              </div>
            </div>
          </section>

          {/* ════════════════ TABS ════════════════ */}
          <div className={styles.tabsWrap}>
            <DashboardTabs
              active={tab}
              upcomingCount={upcoming.length}
              pastCount={past.length}
              onChange={setTab}
            />
          </div>

          {/* ════════════════ LIST ════════════════ */}
          <div
            className={cn(styles.listShell, isFetching && !isLoading && styles.listShellFetching)}
            aria-live="polite"
          >
            {isError ? (
              <ErrorCard
                message={(error as Error | null)?.message}
                onRetry={() => refetch()}
              />
            ) : isLoading ? (
              <div className={styles.list}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <RegistrationSkeleton key={i} index={i} />
                ))}
              </div>
            ) : list.length === 0 ? (
              <DashboardEmpty variant={tab} />
            ) : (
              <div className={styles.list}>
                {list.map((event, i) => (
                  <RegistrationCard
                    key={event.id}
                    event={event}
                    variant={tab}
                    index={i}
                    onCancel={tab === 'upcoming' ? setPendingCancel : undefined}
                    isCancelling={cancel.isPending && pendingCancel?.id === event.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <CancelConfirmDialog
          event={pendingCancel}
          isPending={cancel.isPending}
          onConfirm={handleConfirm}
          onClose={() => !cancel.isPending && setPendingCancel(null)}
        />
      </div>
    </PageWrapper>
  )
}

/* ════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════ */

interface StatProps {
  value: number
  label: string
  sublabel: string
  muted?: boolean
}

function Stat({ value, label, sublabel, muted }: StatProps) {
  return (
    <div className={cn(styles.stat, muted && styles.statMuted)}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statSublabel}>{sublabel}</span>
    </div>
  )
}

function ErrorCard({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className={styles.errorCard} role="alert">
      <div className={styles.errorGlyph}>
        <AlertTriangle size={26} strokeWidth={2} />
      </div>
      <h3 className={styles.errorTitle}>Couldn't load your pass</h3>
      <p className={styles.errorBody}>
        Something went wrong reaching the server. Check your connection and try again.
      </p>
      {message && <code className={styles.errorDetail}>{message}</code>}
      <div className={styles.errorActions}>
        <button type="button" onClick={onRetry} className={styles.errorBtn}>
          <RotateCcw size={14} strokeWidth={2.4} />
          Try again
        </button>
        <Link to="/" className={styles.errorBtnSecondary}>
          <Compass size={14} strokeWidth={2.4} />
          Back to events
        </Link>
      </div>
    </div>
  )
}

/* ─── Identity derivation ─── */
interface Identity {
  initials: string
  firstName: string
  residentSince: string
  serial: string
}

function deriveIdentity(email: string | undefined, userId: string | undefined): Identity {
  const local = email?.split('@')[0] ?? 'student'

  /* Title-case any "firstname.lastname" or "firstname_lastname" handle. */
  const cleaned = local
    .replace(/[._-]+/g, ' ')
    .replace(/\d+$/g, '')
    .trim()

  const firstWord = cleaned.split(/\s+/)[0] || 'there'
  const firstName = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase()

  const initials = cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'DM'

  /* No backend join date yet — fall back to current academic year. */
  const now = new Date()
  const academicYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  const residentSince = `since ${academicYear}/${String(academicYear + 1).slice(-2)}`

  /* Serial derived from user id (or fallback). Decorative. */
  const idSeed = (userId ?? email ?? 'guest').replace(/[^a-z0-9]/gi, '')
  const serial = (idSeed.slice(0, 4).toUpperCase() || 'DMUK').padEnd(4, '0')

  return { initials, firstName, residentSince, serial }
}
