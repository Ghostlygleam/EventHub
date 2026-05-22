import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Scissors, AlertTriangle, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Club } from '@/lib/clubs'
import styles from './DisbandClubDialog.module.css'

interface DisbandClubDialogProps {
  club: Club | null
  isPending: boolean
  /** Inline error (e.g. 409 from backend with linked-events message). */
  serverError: string | null
  onConfirm: () => void
  onClose: () => void
}

export default function DisbandClubDialog({
  club,
  isPending,
  serverError,
  onConfirm,
  onClose,
}: DisbandClubDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const [shakeError, setShakeError] = useState(false)

  /* Trigger a small shake on the error banner whenever a new server error appears. */
  useEffect(() => {
    if (!serverError) return
    setShakeError(true)
    const t = setTimeout(() => setShakeError(false), 400)
    return () => clearTimeout(t)
  }, [serverError])

  useEffect(() => {
    if (!club) return
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
  }, [club?.id])

  if (!club) return null

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isPending) onClose()
  }

  const hasEvents = club.events_count > 0

  return createPortal(
    <div className={styles.backdrop} onMouseDown={handleBackdrop} role="presentation">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="disband-title"
        aria-describedby="disband-body"
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
            DISBANDING A SOCIETY
          </span>
          <h2 id="disband-title" className={styles.title}>
            Disband "{club.name}"?
          </h2>
        </header>

        <div id="disband-body" className={styles.body}>
          <p>
            The society will be marked inactive — it disappears from the public roster and
            organisers can't attach new events to it. Existing past events keep their link.
          </p>

          {hasEvents && (
            <div className={styles.linkedNotice}>
              <Calendar size={14} strokeWidth={2.3} />
              <span>
                <strong>{club.events_count}</strong>{' '}
                {club.events_count === 1 ? 'event is' : 'events are'} currently linked to this society.
              </span>
            </div>
          )}

          <div className={styles.warning}>
            <AlertTriangle size={13} strokeWidth={2.3} />
            <span>Soft delete — can be restored from the audit log.</span>
          </div>

          {serverError && (
            <div
              className={cn(styles.serverError, shakeError && styles.serverErrorShake)}
              role="alert"
            >
              <AlertTriangle size={13} strokeWidth={2.4} />
              <span>{serverError}</span>
            </div>
          )}
        </div>

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={onClose}
            disabled={isPending}
          >
            Keep the society
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
                Yes, disband
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
