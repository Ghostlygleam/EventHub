import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Event } from '@/lib/events'

type Snapshot = Event | undefined

function patchEvent(prev: Event | undefined, delta: 1 | -1, registered: boolean): Event | undefined {
  if (!prev) return prev
  return {
    ...prev,
    is_registered: registered,
    registered_count: Math.max(0, (prev.registered_count ?? 0) + delta),
  }
}

export function useRegistration(eventId: string | undefined) {
  const qc = useQueryClient()
  const key = ['event', eventId] as const

  const register = useMutation<unknown, Error, void, Snapshot>({
    mutationFn: () => api.post('/registrations', { event_id: eventId }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key })
      const snapshot = qc.getQueryData<Event>(key)
      qc.setQueryData<Event>(key, (prev) => patchEvent(prev, 1, true))
      return snapshot
    },
    onError: (err, _v, snapshot) => {
      qc.setQueryData(key, snapshot)
      toast.error(err.message || 'Could not register. Please try again.')
    },
    onSuccess: () => {
      toast.success("You're registered. See you there.")
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key })
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['my-registrations'] })
    },
  })

  const cancel = useMutation<unknown, Error, void, Snapshot>({
    mutationFn: () => api.delete(`/registrations/${eventId}`),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key })
      const snapshot = qc.getQueryData<Event>(key)
      qc.setQueryData<Event>(key, (prev) => patchEvent(prev, -1, false))
      return snapshot
    },
    onError: (err, _v, snapshot) => {
      qc.setQueryData(key, snapshot)
      toast.error(err.message || 'Could not cancel registration.')
    },
    onSuccess: () => {
      toast.success('Registration cancelled.')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key })
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['my-registrations'] })
    },
  })

  return { register, cancel }
}
