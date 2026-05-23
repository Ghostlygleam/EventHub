import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Club, ClubFormValues } from '@/lib/clubs'

function buildCreateBody(values: ClubFormValues) {
  const body: Record<string, unknown> = {
    name: values.name.trim(),
    description: values.description.trim() || null,
  }
  if (values.owner_id.trim()) body.owner_id = values.owner_id.trim()
  return body
}

function buildUpdateBody(values: ClubFormValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
  }
}

/* ─── Create ─────────────────────────────────────────────── */

export function useCreateClub() {
  const qc = useQueryClient()
  return useMutation<Club, Error, ClubFormValues>({
    mutationFn: (values) => api.post<Club>('/clubs', buildCreateBody(values)),
    onSuccess: (club) => {
      toast.success(`Society "${club.name}" founded.`)
    },
    onError: (err) => {
      toast.error(err.message || 'Could not found the society.')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['clubs'] })
    },
  })
}

/* ─── Update ─────────────────────────────────────────────── */

interface UpdateArgs {
  id: string
  values: ClubFormValues
}

export function useUpdateClub() {
  const qc = useQueryClient()
  return useMutation<Club, Error, UpdateArgs>({
    mutationFn: ({ id, values }) => api.patch<Club>(`/clubs/${id}`, buildUpdateBody(values)),
    onSuccess: (club) => {
      toast.success(`Society "${club.name}" amended.`)
    },
    onError: (err) => {
      toast.error(err.message || 'Could not save changes.')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['clubs'] })
    },
  })
}

/* ─── Disband (soft delete) ──────────────────────────────── */

export function useDisbandClub() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, Club>({
    mutationFn: (club) => api.delete(`/clubs/${club.id}`),
    onSuccess: (_data, club) => {
      toast.success(`Society "${club.name}" disbanded.`)
    },
    onError: (err) => {
      /* 409 with linked-events message bubbles up here — let the dialog show it inline. */
      toast.error(err.message || 'Could not disband the society.')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['clubs'] })
    },
  })
}
