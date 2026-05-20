import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './AdminConfirmDialog.module.css'

interface AdminConfirmDialogProps {
  open: boolean
  /** Eyebrow above the title — uppercase, mono. */
  eyebrow: string
  title: string
  /** Main body (subject email, consequence text). */
  children: ReactNode
  /** Confirm button label. */
  confirmLabel: string
  /** "danger" → red CTA, "warning" → amber CTA. */
  tone?: 'danger' | 'warning'
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function AdminConfirmDialog({
  open,
  eyebrow,
  title,
  children,
  confirmLabel,
  tone = 'danger',
  isPending,
  onConfirm,
  onClose,
}: AdminConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    prevFocusRef.current = document.activeElement as HTMLElement | null
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
      prevFocusRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isPending) onClose()
  }

  return createPortal(
    <div className={styles.backdrop} onMouseDown={handleBackdrop} role="presentation">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
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

        <span className={cn(styles.eyebrow, tone === 'warning' && styles.eyebrowWarning)}>
          <AlertTriangle size={11} strokeWidth={2.4} />
          {eyebrow}
        </span>

        <h2 id="admin-dialog-title" className={styles.title}>{title}</h2>

        <div className={styles.body}>{children}</div>

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={cn(styles.btnConfirm, tone === 'warning' && styles.btnWarning)}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : (
              confirmLabel
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
    'button:not([disabled]), [href], input, select, [tabindex]:not([tabindex="-1"])'
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