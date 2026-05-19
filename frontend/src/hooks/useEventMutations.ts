import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Event, EventFormValues } from '@/lib/events'
import { organiserEventsKey } from './useOrganiserEvents'

export interface EventCreatePayload {
  title: string
  description: string
  event_type: string
  location: string
  starts_at: string
  ends_at: string | null
  capacity: number | null
  speaker_name: string | null
  cover_image_url: string | null
  club_id: string | null
  is_published: boolean
}

export function buildPayload(values: EventFormValues): EventCreatePayload {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    event_type: values.event_type,
    location: values.location.trim(),
    starts_at: new Date(values.starts_at).toISOString(),
    ends_at: values.ends_at ? new Date(values.ends_at).toISOString() : null,
    capacity: values.capacity ? Number(values.capacity) : null,
    speaker_name: values.speaker_name.trim() || null,
    cover_image_url: values.cover_image_url.trim() || null,
    club_id: values.club_id.trim() || null,
    is_published: values.is_published,
  }
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, eventId?: string) {
  qc.invalidateQueries({ queryKey: organiserEventsKey })
  qc.invalidateQueries({ queryKey: ['events'] })
  if (eventId) {
    qc.invalidateQueries({ queryKey: ['event', eventId] })
    qc.invalidateQueries({ queryKey: ['event-registrations', eventId] })
  }
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation<Event, Error, EventFormValues>({
    mutationFn: (values) => api.post<Event>('/events', buildPayload(values)),
    onSuccess: (event) => {
      toast.success(
        event.is_published
          ? 'Event published. The desk is live.'
          : 'Draft saved to the galley.'
      )
      invalidateAll(qc, event.id)
    },
    onError: (err) => {
      toast.error(err.message || 'Could not create the event.')
    },
  })
}

export function useUpdateEvent(eventId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<Event, Error, EventFormValues>({
    mutationFn: (values) => api.patch<Event>(`/events/${eventId}`, buildPayload(values)),
    onSuccess: (event) => {
      toast.success('Changes saved.')
      invalidateAll(qc, event.id)
    },
    onError: (err) => {
      toast.error(err.message || 'Could not save changes.')
    },
  })
}

interface CancelResponse {
  message: string
  notified: number
}

export function useCancelEvent() {
  const qc = useQueryClient()
  return useMutation<CancelResponse, Error, Event>({
    mutationFn: (event) => api.delete<CancelResponse>(`/events/${event.id}`),
    onSuccess: (data, event) => {
      const note =
        data.notified > 0
          ? `Spiked. ${data.notified} ${data.notified === 1 ? 'reader was' : 'readers were'} notified.`
          : 'Event spiked.'
      toast.success(note)
      invalidateAll(qc, event.id)
    },
    onError: (err) => {
      toast.error(err.message || 'Could not spike the event.')
    },
  })
}