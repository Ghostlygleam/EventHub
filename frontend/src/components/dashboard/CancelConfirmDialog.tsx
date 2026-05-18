import { useEffect, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle, ScissorsLineDashed } from 'lucide-react'
import {
  formatEventDate,
  EVENT_TYPE_LABEL,
  type Event,
  type EventType,
} from '@/lib/events'
import { cn } from '@/lib/utils'
import styles from './CancelConfirmDialog.module.css'

const ACCENT_BY_TYPE: Record<EventType, string> = {
  lecture: '217 91% 50%',
  club: '0 100% 30%',
  workshop: '142 60% 38%',
  other: '262 52% 50%',
}

interface CancelConfirmDialogProps {
  event: Event | null
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function CancelConfirmDialog({
  event,
  isPending,
  onConfirm,
  onClose,
}: CancelConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  /* Focus management + ESC key + body scroll lock */
  useEffect(() => {
    if (!event) return

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    confirmBtnRef.current?.focus()

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) {
        e.stopPropagation()
        onClose()
      }
      if (e.key === 'Tab') trapFocus(e, dialogRef.current)
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previouslyFocusedRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id])

  if (!event) return null

  const { day, month, weekday, time } = formatEventDate(event.starts_at)
  const style: CSSProperties & Record<'--card-accent', string> = {
    ['--card-accent']: ACCENT_BY_TYPE[event.event_type],
  }

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isPending) onClose()
  }

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={handleBackdrop}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cancel-dialog-title"
        aria-describedby="cancel-dialog-body"
        style={style}
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          disabled={isPending}
          aria-label="Close dialog"
        >
          <X size={16} strokeWidth={2.3} />
        </button>

        <header className={styles.head}>
          <span className={styles.eyebrow}>
            <ScissorsLineDashed size={12} strokeWidth={2.4} />
            Voiding a ticket
          </span>
          <h2 id="cancel-dialog-title" className={styles.title}>
            Tear this stub?
          </h2>
        </header>

        {/* Micro-preview of the ticket being voided */}
        <div className={styles.previewWrap} aria-hidden="true">
          <div className={cn(styles.preview, styles.previewTearing)}>
            <div className={styles.previewDate}>
              <span className={styles.previewDay}>{day}</span>
              <span className={styles.previewMonth}>{month}</span>
              <span className={styles.previewWeekday}>{weekday}</span>
            </div>
            <div className={styles.previewBody}>
              <span className={styles.previewType}>
                {EVENT_TYPE_LABEL[event.event_type]}
              </span>
              <p className={styles.previewTitle}>{event.title}</p>
              <p className={styles.previewMeta}>
                <span>{time}</span>
                <span className={styles.previewDot} />
                <span>{event.location}</span>
              </p>
            </div>
            <div className={styles.previewVoid}>
              <span>VOID</span>
            </div>
          </div>
        </div>

        <p id="cancel-dialog-body" className={styles.body}>
          Your spot will be released back to the queue. You can register again
          if seats free up — but a waitlist may have formed by then.
        </p>

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={onClose}
            disabled={isPending}
          >
            Keep my spot
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={styles.btnDanger}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : (
              <>
                <AlertTriangle size={14} strokeWidth={2.4} />
                Yes, void it
              </>
            )}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}

/* ─── Focus trap helper ─── */
function trapFocus(e: KeyboardEvent, root: HTMLElement | null) {
  if (!root) return
  const focusables = root.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  if (focusables.length === 0) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  const active = document.activeElement as HTMLElement

  if (e.shiftKey && active === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}
