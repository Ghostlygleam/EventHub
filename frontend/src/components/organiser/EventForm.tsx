import { useEffect, useState, useMemo, type FormEvent } from 'react'
import { ChevronDown, Save, Send } from 'lucide-react'
import {
  EMPTY_FORM_VALUES,
  EVENT_TYPE_LABEL,
  type EventFormValues,
  type EventType,
} from '@/lib/events'
import { cn } from '@/lib/utils'
import {
  TextField,
  TextAreaField,
  SelectField,
  ToggleField,
} from './FormField'
import styles from './EventForm.module.css'

type FormErrors = Partial<Record<keyof EventFormValues, string>>

interface EventFormProps {
  mode: 'new' | 'edit'
  initialValues?: EventFormValues
  /** Lifted state so parent can render live preview. */
  values: EventFormValues
  onChange: (values: EventFormValues) => void
  onSubmit: (values: EventFormValues) => void
  isSubmitting: boolean
  onCancel: () => void
}

export function validateForm(values: EventFormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.title.trim()) errors.title = 'Headline is required'
  else if (values.title.trim().length > 200) errors.title = 'Keep it under 200 characters'

  if (!values.description.trim()) errors.description = 'Add a standfirst'
  else if (values.description.trim().length < 10) errors.description = 'At least 10 characters'

  if (!values.location.trim()) errors.location = 'Where will it happen?'

  if (!values.starts_at) errors.starts_at = 'Pick a start date and time'

  if (values.ends_at) {
    if (!values.starts_at) {
      errors.ends_at = 'Set the start first'
    } else if (new Date(values.ends_at) <= new Date(values.starts_at)) {
      errors.ends_at = 'End must be after start'
    }
  }

  if (values.capacity) {
    const n = Number(values.capacity)
    if (!Number.isInteger(n) || n <= 0) {
      errors.capacity = 'Must be a positive integer'
    }
  }

  if (values.cover_image_url && !/^https?:\/\//i.test(values.cover_image_url.trim())) {
    errors.cover_image_url = 'Use a full URL starting with http(s)://'
  }

  if (values.club_id && values.club_id.trim()) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(values.club_id.trim())) {
      errors.club_id = 'Should be a UUID'
    }
  }

  return errors
}

const TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'lecture',  label: EVENT_TYPE_LABEL.lecture },
  { value: 'club',     label: EVENT_TYPE_LABEL.club },
  { value: 'workshop', label: EVENT_TYPE_LABEL.workshop },
  { value: 'other',    label: EVENT_TYPE_LABEL.other },
]

export default function EventForm({
  mode,
  initialValues,
  values,
  onChange,
  onSubmit,
  isSubmitting,
  onCancel,
}: EventFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(
    !!(initialValues?.club_id || initialValues?.cover_image_url)
  )

  useEffect(() => {
    if (initialValues) onChange(initialValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues])

  const errors = useMemo(() => validateForm(values), [values])
  const showErrors = submitted

  const update = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) => {
    const next = { ...values, [key]: value }
    /* If start moves to or past the current end, wipe ends_at so it doesn't stay invalid. */
    if (key === 'starts_at' && next.ends_at && next.starts_at) {
      if (new Date(next.ends_at) <= new Date(next.starts_at)) {
        next.ends_at = ''
      }
    }
    onChange(next)
  }

  /* Capacity: digits only — strip anything else on paste / IME. */
  const updateCapacity = (raw: string) => {
    const digitsOnly = raw.replace(/\D+/g, '')
    update('capacity', digitsOnly)
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length === 0) {
      onSubmit(values)
    }
  }

  const publishAction = (publish: boolean) => {
    const next = { ...values, is_published: publish }
    onChange(next)
    setSubmitted(true)
    if (Object.keys(validateForm(next)).length === 0) {
      onSubmit(next)
    }
  }

  const hasErrors = Object.keys(errors).length > 0
  const errorCount = Object.keys(errors).length

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {/* ─── HEADLINE SECTION ─── */}
      <section className={styles.section}>
        <header className={styles.sectionHead}>
          <span className={styles.sectionNum}>§ 01</span>
          <h2 className={styles.sectionTitle}>Headline</h2>
          <span className={styles.sectionLead}>the spine of the story</span>
        </header>

        <div className={styles.fields}>
          <TextField
            label="Headline"
            placeholder="Sustainable AI in Energy Systems"
            variant="headline"
            required
            value={values.title}
            onChange={(e) => update('title', e.target.value)}
            error={showErrors ? errors.title : undefined}
            maxLength={200}
          />

          <TextAreaField
            label="Standfirst"
            hint="the lede that draws readers in"
            placeholder="A grounded conversation about how universities can help shape an honest energy transition…"
            required
            rows={5}
            value={values.description}
            onChange={(e) => update('description', e.target.value)}
            error={showErrors ? errors.description : undefined}
          />

          <TextField
            label="Speaker / Byline"
            hint="optional"
            placeholder="Dr. Aliya Karim"
            value={values.speaker_name}
            onChange={(e) => update('speaker_name', e.target.value)}
            error={showErrors ? errors.speaker_name : undefined}
          />
        </div>
      </section>

      {/* ─── LOGISTICS SECTION ─── */}
      <section className={styles.section}>
        <header className={styles.sectionHead}>
          <span className={styles.sectionNum}>§ 02</span>
          <h2 className={styles.sectionTitle}>Logistics</h2>
          <span className={styles.sectionLead}>section, dates, venue, capacity</span>
        </header>

        <div className={styles.fields}>
          <div className={styles.grid2}>
            <SelectField
              label="Section"
              required
              value={values.event_type}
              onChange={(e) => update('event_type', e.target.value as EventType)}
              options={TYPE_OPTIONS}
              error={showErrors ? errors.event_type : undefined}
            />

            <TextField
              label="Venue"
              placeholder="Hall B · Block A"
              required
              value={values.location}
              onChange={(e) => update('location', e.target.value)}
              error={showErrors ? errors.location : undefined}
            />
          </div>

          <div className={styles.grid2}>
            <TextField
              label="Goes live"
              type="datetime-local"
              required
              value={values.starts_at}
              onChange={(e) => update('starts_at', e.target.value)}
              error={showErrors ? errors.starts_at : undefined}
            />

            <TextField
              label="Wraps up"
              type="datetime-local"
              hint="optional · must be after start"
              value={values.ends_at}
              min={values.starts_at || undefined}
              onChange={(e) => update('ends_at', e.target.value)}
              error={showErrors ? errors.ends_at : undefined}
              disabled={!values.starts_at}
            />
          </div>

          <TextField
            label="Print run"
            hint="seats — leave blank for open seating"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="e.g. 120"
            value={values.capacity}
            onChange={(e) => updateCapacity(e.target.value)}
            onKeyDown={(e) => {
              if (
                ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(e.key) ||
                e.metaKey || e.ctrlKey
              ) return
              if (!/^\d$/.test(e.key)) e.preventDefault()
            }}
            error={showErrors ? errors.capacity : undefined}
          />
        </div>
      </section>

      {/* ─── DISTRIBUTION SECTION (advanced + publish) ─── */}
      <section className={styles.section}>
        <header className={styles.sectionHead}>
          <span className={styles.sectionNum}>§ 03</span>
          <h2 className={styles.sectionTitle}>Distribution</h2>
          <span className={styles.sectionLead}>cover, ownership, publish status</span>
        </header>

        <div className={styles.fields}>
          <button
            type="button"
            className={cn(styles.advancedToggle, advancedOpen && styles.advancedOpen)}
            onClick={() => setAdvancedOpen((v) => !v)}
            aria-expanded={advancedOpen}
          >
            <ChevronDown size={14} strokeWidth={2.4} />
            <span>Advanced fields</span>
            <span className={styles.advancedHint}>
              cover image · club id
            </span>
          </button>

          {advancedOpen && (
            <div className={styles.advancedBlock}>
              <TextField
                label="Cover image URL"
                hint="full URL"
                placeholder="https://images.unsplash.com/..."
                value={values.cover_image_url}
                onChange={(e) => update('cover_image_url', e.target.value)}
                error={showErrors ? errors.cover_image_url : undefined}
              />

              <TextField
                label="Club ID"
                hint="UUID — not wired to a clubs index yet"
                placeholder="00000000-0000-…"
                value={values.club_id}
                onChange={(e) => update('club_id', e.target.value)}
                error={showErrors ? errors.club_id : undefined}
                className={styles.monoCompactInput}
              />
            </div>
          )}

          <ToggleField
            label="Publish to the front page"
            description={
              values.is_published
                ? 'Visible to every student. Will appear in the public listing.'
                : 'Sits in the galley as a draft. Only you can see it.'
            }
            checked={values.is_published}
            onChange={(v) => update('is_published', v)}
          />
        </div>
      </section>

      {/* ─── FOOTER ACTIONS ─── */}
      <footer className={styles.footer}>
        {showErrors && hasErrors && (
          <div className={styles.errorBanner} role="alert">
            <strong>{errorCount}</strong> {errorCount === 1 ? 'field needs' : 'fields need'} attention before this goes anywhere.
          </div>
        )}

        <div className={styles.footerActions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Back to the desk
          </button>

          <div className={styles.primaryActions}>
            <button
              type="button"
              className={styles.draftBtn}
              onClick={() => publishAction(false)}
              disabled={isSubmitting}
            >
              <Save size={14} strokeWidth={2.3} />
              {mode === 'new' ? 'Save draft' : 'Save changes'}
            </button>

            <button
              type="button"
              className={styles.publishBtn}
              onClick={() => publishAction(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className={styles.spinner} aria-hidden="true" />
              ) : (
                <>
                  <Send size={14} strokeWidth={2.3} />
                  {values.is_published ? 'Save & republish' : 'Publish to readers'}
                </>
              )}
            </button>
          </div>
        </div>
      </footer>
    </form>
  )
}

export { EMPTY_FORM_VALUES }