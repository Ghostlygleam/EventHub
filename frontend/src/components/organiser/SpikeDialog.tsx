import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle, Mail, Scissors } from 'lucide-react'
import type { Event } from '@/lib/events'
import styles from './SpikeDialog.module.css'

interface SpikeDialogProps {
  event: Event | null
  registeredCount: number
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function SpikeDialog({
  event,
  registeredCount,
  isPending,
  onConfirm,
  onClose,
}: SpikeDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!event) return
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    confirmBtnRef.current?.focus()

    const prev = document.body.style.overflow
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
      document.body.style.overflow = prev
      previouslyFocusedRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id])

  if (!event) return null

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isPending) onClose()
  }

  const hasReaders = registeredCount > 0

  return createPortal(
    <div className={styles.backdrop} onMouseDown={handleBackdrop} role="presentation">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="spike-title"
        aria-describedby="spike-body"
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          disabled={isPending}
          aria-label="Close"
        >
          <X size={16} strokeWidth={2.3} />
        </button>

        <header className={styles.head}>
          <span className={styles.eyebrow}>
            <Scissors size={11} strokeWidth={2.4} />
            SPIKING A STORY
          </span>
          <h2 id="spike-title" className={styles.title}>
            Spike this event?
          </h2>
          <p className={styles.subtitle}>
            <span className={styles.subtitleQuote}>“{event.title}”</span>
            <span className={styles.subtitleDate}>
              {new Date(event.starts_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </p>
        </header>

        <div id="spike-body" className={styles.body}>
          <p>
            Spiking an event takes it off the front page permanently.
            {hasReaders ? (
              <>
                {' '}
                <strong className={styles.bodyEmphasis}>
                  {registeredCount} {registeredCount === 1 ? 'reader' : 'readers'}
                </strong>{' '}
                already booked their seat — they'll receive an email letting
                them know it's been cancelled.
              </>
            ) : (
              <> No one had booked a seat yet, so no emails will be sent.</>
            )}
          </p>

          {hasReaders && (
            <div className={styles.notice}>
              <Mail size={14} strokeWidth={2.3} />
              <span>
                <strong>{registeredCount}</strong>{' '}
                {registeredCount === 1 ? 'cancellation notice' : 'cancellation notices'} will go out.
              </span>
            </div>
          )}

          <div className={styles.warning}>
            <AlertTriangle size={14} strokeWidth={2.3} />
            <span>This cannot be undone.</span>
          </div>
        </div>

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={onClose}
            disabled={isPending}
          >
            Keep on the schedule
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
                <Scissors size={14} strokeWidth={2.4} />
                Yes, spike it
              </>
            )}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}

function trapFocus(e: KeyboardEvent, root: HTMLElement | null) {
  if (!root) return
  const focusables = root.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])'
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