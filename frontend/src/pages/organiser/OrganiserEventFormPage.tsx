import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'

import PageWrapper from '@/components/layout/PageWrapper'
import EventCard from '@/components/events/EventCard'
import EventForm from '@/components/organiser/EventForm'
import StatusBadge from '@/components/organiser/StatusBadge'
import { useEventDetail } from '@/hooks/useEventDetail'
import { useCreateEvent, useUpdateEvent } from '@/hooks/useEventMutations'
import {
  EMPTY_FORM_VALUES,
  deriveOrganiserStatus,
  type Event,
  type EventFormValues,
  type EventType,
} from '@/lib/events'
import { cn } from '@/lib/utils'
import styles from './OrganiserEventFormPage.module.css'

function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function eventToForm(event: Event): EventFormValues {
  return {
    title: event.title,
    description: event.description,
    event_type: event.event_type,
    location: event.location,
    starts_at: isoToLocalInput(event.starts_at),
    ends_at: isoToLocalInput(event.ends_at),
    capacity: event.capacity != null ? String(event.capacity) : '',
    speaker_name: event.speaker_name ?? '',
    cover_image_url: event.cover_image_url ?? '',
    club_id: '',
    is_published: event.is_published,
  }
}

/* ── Build a fake Event object so EventCard can render the live preview. ── */
function buildPreviewEvent(values: EventFormValues, baseEvent?: Event): Event {
  const id = baseEvent?.id ?? 'preview-00000000-0000-0000-0000-000000000000'
  const startsLocal = values.starts_at ? new Date(values.starts_at) : new Date(Date.now() + 7 * 86400_000)
  const endsLocal = values.ends_at ? new Date(values.ends_at) : null
  const capacityNum = values.capacity ? Number(values.capacity) : null

  return {
    id,
    title: values.title || 'Headline goes here',
    description: values.description || 'Standfirst preview — your standfirst will appear in the card below.',
    event_type: values.event_type as EventType,
    location: values.location || 'Venue',
    starts_at: startsLocal.toISOString(),
    ends_at: endsLocal ? endsLocal.toISOString() : null,
    capacity: capacityNum && capacityNum > 0 ? capacityNum : null,
    speaker_name: values.speaker_name || null,
    organiser_id: baseEvent?.organiser_id ?? 'preview',
    cover_image_url: values.cover_image_url || null,
    is_published: values.is_published,
    is_cancelled: baseEvent?.is_cancelled ?? false,
    created_at: baseEvent?.created_at ?? new Date().toISOString(),
    registered_count: baseEvent?.registered_count ?? 0,
    is_registered: false,
  }
}

export default function OrganiserEventFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const mode: 'new' | 'edit' = id ? 'edit' : 'new'

  const { data: existing, isLoading: isLoadingExisting } = useEventDetail(mode === 'edit' ? id : undefined)
  const create = useCreateEvent()
  const update = useUpdateEvent(id)

  const [values, setValues] = useState<EventFormValues>(EMPTY_FORM_VALUES)
  const [initialValues, setInitialValues] = useState<EventFormValues | undefined>(undefined)

  useEffect(() => {
    if (mode === 'edit' && existing) {
      const v = eventToForm(existing)
      setInitialValues(v)
      setValues(v)
    }
  }, [mode, existing])

  const isSubmitting = create.isPending || update.isPending

  const handleSubmit = (next: EventFormValues) => {
    const mutation = mode === 'new' ? create : update
    mutation.mutate(next, {
      onSuccess: (event) => {
        navigate(`/organiser/events/${event.id}`)
      },
    })
  }

  const handleCancel = () => navigate('/organiser')

  const previewEvent = useMemo(
    () => buildPreviewEvent(values, existing ?? undefined),
    [values, existing]
  )

  const currentStatus = existing ? deriveOrganiserStatus(existing) : null

  const isEditingLoading = mode === 'edit' && isLoadingExisting && !existing

  return (
    <PageWrapper>
      <div className={styles.page}>
        <div className={styles.bg} aria-hidden="true">
          <div className={cn(styles.blob, styles.blob1)} />
          <div className={cn(styles.blob, styles.blob2)} />
          <div className={styles.grain} />
        </div>

        <div className={styles.content}>
          {/* ─── BREADCRUMB ─── */}
          <Link to="/organiser" className={styles.back}>
            <ArrowLeft size={14} strokeWidth={2.4} />
            <span>Back to the desk</span>
          </Link>

          {/* ─── MASTHEAD ─── */}
          <header className={styles.masthead}>
            <div className={styles.mastheadTop}>
              <span className={styles.kicker}>
                {mode === 'new' ? (
                  <>N° NEW · COMMISSIONING</>
                ) : (
                  <>N° {(existing?.id ?? '').slice(0, 4).toUpperCase()} · REVISING</>
                )}
              </span>
              {currentStatus && <StatusBadge status={currentStatus} size="md" />}
            </div>

            <h1 className={styles.heading}>
              {mode === 'new' ? (
                <>
                  A <em>new</em> commission.
                </>
              ) : (
                <>
                  Polish the <em>copy</em>.
                </>
              )}
            </h1>

            <p className={styles.lede}>
              {mode === 'new'
                ? 'Set the headline, lock the logistics, and decide whether it ships to readers now or stays in the galley.'
                : 'Tweak any field. Changes take effect the moment you publish.'}
            </p>

            <div className={styles.rule} aria-hidden="true" />
          </header>

          {/* ─── VERSO / RECTO SPREAD ─── */}
          <div className={styles.spread}>
            {/* ─── VERSO: manuscript ─── */}
            <div className={styles.verso}>
              <div className={styles.versoHead}>
                <span className={styles.foliotopic}>VERSO</span>
                <span className={styles.foliotext}>manuscript</span>
              </div>

              {isEditingLoading ? (
                <FormSkeleton />
              ) : (
                <EventForm
                  mode={mode}
                  initialValues={initialValues}
                  values={values}
                  onChange={setValues}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                  onCancel={handleCancel}
                />
              )}
            </div>

            {/* ─── RECTO: live preview ─── */}
            <aside className={styles.recto}>
              <div className={styles.rectoInner}>
                <div className={styles.rectoHead}>
                  <span className={styles.foliotopic}>RECTO</span>
                  <span className={styles.foliotext}>
                    <Sparkles size={11} strokeWidth={2.4} />
                    live preview
                  </span>
                </div>

                <p className={styles.rectoCaption}>
                  How readers will see this card on the front page.
                </p>

                <div className={styles.previewFrame}>
                  <EventCard event={previewEvent} index={0} />
                </div>

                <div className={styles.previewMeta}>
                  <span>
                    <strong>{values.title.length || 0}</strong> chars in headline
                  </span>
                  <span className={styles.dot} />
                  <span>
                    <strong>{values.description.length || 0}</strong> chars in standfirst
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}

function FormSkeleton() {
  return (
    <div className={styles.skel}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={styles.skelBlock} style={{ animationDelay: `${i * 70}ms` }}>
          <div className={styles.skelLabel} />
          <div className={styles.skelInput} />
        </div>
      ))}
    </div>
  )
}