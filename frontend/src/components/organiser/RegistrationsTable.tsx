import { useMemo, useState } from 'react'
import { Search, Copy, CheckCircle2, Users } from 'lucide-react'
import { toast } from 'sonner'
import type { StudentRow } from '@/lib/events'
import { cn } from '@/lib/utils'
import styles from './RegistrationsTable.module.css'

interface RegistrationsTableProps {
  students: StudentRow[]
}

export default function RegistrationsTable({ students }: RegistrationsTableProps) {
  const [query, setQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) =>
      s.email.toLowerCase().includes(q) ||
      (s.full_name ?? '').toLowerCase().includes(q)
    )
  }, [students, query])

  const handleCopy = async (email: string, id: string) => {
    try {
      await navigator.clipboard.writeText(email)
      setCopiedId(id)
      toast.success('Email copied to clipboard.')
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1800)
    } catch {
      toast.error('Could not copy.')
    }
  }

  if (students.length === 0) {
    return (
      <div className={styles.empty} role="status">
        <div className={styles.emptyMark} aria-hidden="true">
          <Users size={24} strokeWidth={1.6} />
        </div>
        <h3 className={styles.emptyTitle}>No subscribers yet.</h3>
        <p className={styles.emptyBody}>
          Once readers start booking their seats, names will land on this roll.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <label className={styles.searchWrap}>
          <Search size={14} strokeWidth={2.2} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Filter by email or name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter subscribers"
          />
          {query && (
            <span className={styles.matchCount}>
              {filtered.length} / {students.length}
            </span>
          )}
        </label>
      </div>

      <div className={styles.tableShell}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={cn(styles.th, styles.thIndex)}>#</th>
              <th className={cn(styles.th, styles.thEmail)}>Email</th>
              <th className={cn(styles.th, styles.thName)}>Reader</th>
              <th className={cn(styles.th, styles.thAction)}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id} className={styles.tr}>
                <td className={cn(styles.td, styles.tdIndex)}>{String(i + 1).padStart(3, '0')}</td>
                <td className={cn(styles.td, styles.tdEmail)}>
                  <span className={styles.emailText}>{s.email}</span>
                </td>
                <td className={cn(styles.td, styles.tdName)}>
                  {s.full_name ? (
                    <span>{s.full_name}</span>
                  ) : (
                    <span className={styles.unnamed}>— unnamed —</span>
                  )}
                </td>
                <td className={cn(styles.td, styles.tdAction)}>
                  <button
                    type="button"
                    className={cn(styles.copyBtn, copiedId === s.id && styles.copyBtnDone)}
                    onClick={() => handleCopy(s.email, s.id)}
                    aria-label={`Copy ${s.email}`}
                  >
                    {copiedId === s.id ? (
                      <CheckCircle2 size={12} strokeWidth={2.6} />
                    ) : (
                      <Copy size={12} strokeWidth={2.4} />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && query && (
          <div className={styles.noMatch}>
            No reader matches <strong>“{query}”</strong>.
          </div>
        )}
      </div>
    </div>
  )
}