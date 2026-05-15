import { CalendarSearch, RotateCcw } from 'lucide-react'
import styles from './EmptyState.module.css'

interface EmptyStateProps {
  title?: string
  message?: string
  onReset?: () => void
  resetLabel?: string
}

export default function EmptyState({
  title = 'Nothing on the agenda',
  message = 'No events match your filters yet. Try a different category, drop the search query, or check back soon.',
  onReset,
  resetLabel = 'Clear filters',
}: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.glyph}>
        <CalendarSearch size={36} strokeWidth={1.8} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
      {onReset && (
        <button type="button" onClick={onReset} className={styles.action}>
          <RotateCcw size={14} strokeWidth={2.5} />
          {resetLabel}
        </button>
      )}
    </div>
  )
}
