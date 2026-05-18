import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Event, MyRegistrationsResponse } from '@/lib/events'
import { myRegistrationsKey } from './useMyRegistrations'

type Snapshot = MyRegistrationsResponse | undefined

export function useCancelRegistration() {
  const qc = useQueryClient()

  return useMutation<unknown, Error, Event, Snapshot>({
    mutationFn: (event) => api.delete(`/registrations/${event.id}`),

    onMutate: async (event) => {
      await qc.cancelQueries({ queryKey: myRegistrationsKey })
      const snapshot = qc.getQueryData<MyRegistrationsResponse>(myRegistrationsKey)

      qc.setQueryData<MyRegistrationsResponse>(myRegistrationsKey, (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          upcoming: prev.upcoming.filter((e) => e.id !== event.id),
        }
      })

      return snapshot
    },

    onError: (err, _event, snapshot) => {
      if (snapshot) qc.setQueryData(myRegistrationsKey, snapshot)
      toast.error(err.message || 'Could not cancel registration.')
    },

    onSuccess: (_data, event) => {
      toast.success(`Voided your spot for "${event.title}".`)
    },

    onSettled: (_data, _err, event) => {
      qc.invalidateQueries({ queryKey: myRegistrationsKey })
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['event', event.id] })
    },
  })
}
