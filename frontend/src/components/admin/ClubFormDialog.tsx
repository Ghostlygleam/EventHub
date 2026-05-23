import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { X, Library, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  TextField,
  TextAreaField,
  SelectField,
} from '@/components/organiser/FormField'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import { EMPTY_CLUB_FORM, type Club, type ClubFormValues } from '@/lib/clubs'
import { useAuth } from '@/hooks/useAuth'
import styles from './ClubFormDialog.module.css'

type Errors = Partial<Record<keyof ClubFormValues, string>>

interface ClubFormDialogProps {
  open: boolean
  /** When provided → edit mode. When null → create mode. */
  editing: Club | null
  isPending: boolean
  onSubmit: (values: ClubFormValues) => void
  onClose: () => void
}

function validate(values: ClubFormValues): Errors {
  const errors: Errors = {}
  const name = values.name.trim()
  if (!name) errors.name = 'Name is required'
  else if (name.length > 100) errors.name = 'Keep it under 100 characters'

  if (values.description.trim() && values.description.trim().length < 10) {
    errors.description = 'At least 10 characters or leave blank'
  }
  return errors
}

export default function ClubFormDialog({
  open,
  editing,
  isPending,
  onSubmit,
  onClose,
}: ClubFormDialogProps) {
  const { user: me } = useAuth()
  /* Owner select needs the cached users list — only privileged roles can own a club. */
  const { data: usersData } = useAdminUsers({ page: 1, limit: 200 })

  const [values, setValues] = useState<ClubFormValues>(EMPTY_CLUB_FORM)
  const [submitted, setSubmitted] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  /* Reset form on open / when target changes. */
  useEffect(() => {
    if (!open) return
    if (editing) {
      setValues({
        name: editing.name,
        description: editing.description ?? '',
        owner_id: editing.owner_id,
      })
    } else {
      setValues({ ...EMPTY_CLUB_FORM, owner_id: me?.id ?? '' })
    }
    setSubmitted(false)
  }, [open, editing, me?.id])

  /* Focus + ESC + body lock */
  useEffect(() => {
    if (!open) return
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null

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

    /* Focus the close button by default — submit is the dangerous one, don't auto-focus it */
    closeBtnRef.current?.focus()

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      previouslyFocusedRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const ownerOptions = useMemo(() => {
    const eligible = (usersData?.users ?? []).filter(
      (u) => u.role === 'organiser' || u.role === 'admin'
    )
    return eligible.map((u) => ({
      value: u.id,
      label: `${u.email}${u.role === 'admin' ? '  (admin)' : ''}`,
    }))
  }, [usersData])

  const errors = useMemo(() => validate(values), [values])
  const hasErrors = Object.keys(errors).length > 0

  if (!open) return null

  const update = <K extends keyof ClubFormValues>(key: K, val: ClubFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: val }))
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitted(true)
    if (!hasErrors) onSubmit(values)
  }

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isPending) onClose()
  }

  const isEdit = !!editing
  const eyebrow = isEdit ? 'AMENDING A SOCIETY' : 'FOUNDING A SOCIETY'
  const title   = isEdit ? `Amend "${editing!.name}"` : 'Found a new society'
  const submitLabel = isEdit ? 'Save amendments' : 'Found society'
  const Icon = isEdit ? ScrollText : Library

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={handleBackdrop}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="club-form-title"
      >
        <button
          ref={closeBtnRef}
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
            <Icon size={11} strokeWidth={2.4} />
            {eyebrow}
          </span>
          <h2 id="club-form-title" className={styles.title}>{title}</h2>
        </header>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <TextField
            label="Society name"
            placeholder="Chess Society"
            variant="headline"
            required
            value={values.name}
            onChange={(e) => update('name', e.target.value)}
            error={submitted ? errors.name : undefined}
            maxLength={100}
          />

          <TextAreaField
            label="Manifesto"
            hint="what is the society about?"
            placeholder="Weekly chess club for students of all skill levels. Friendly tournaments, casual play, occasional grandmaster visits."
            rows={4}
            value={values.description}
            onChange={(e) => update('description', e.target.value)}
            error={submitted ? errors.description : undefined}
          />

          {!isEdit && ownerOptions.length > 0 && (
            <SelectField
              label="Owner"
              hint="organiser or admin only"
              required
              value={values.owner_id || ownerOptions[0]?.value || ''}
              onChange={(e) => update('owner_id', e.target.value)}
              options={ownerOptions}
            />
          )}

          {isEdit && (
            <div className={styles.ownerReadonly}>
              <span className={styles.ownerLabel}>OWNER</span>
              <span className={styles.ownerEmail}>
                {editing.owner_email ?? '— unassigned —'}
              </span>
              <span className={styles.ownerHint}>
                Ownership transfers are a separate concern, not part of amendments.
              </span>
            </div>
          )}

          {submitted && hasErrors && (
            <div className={styles.errorBanner} role="alert">
              Check the fields highlighted above before submitting.
            </div>
          )}

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
              type="submit"
              className={cn(styles.btnPrimary)}
              disabled={isPending}
            >
              {isPending ? (
                <span className={styles.spinner} aria-hidden="true" />
              ) : (
                submitLabel
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body
  )
}

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
