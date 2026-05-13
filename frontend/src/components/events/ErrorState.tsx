import { AlertTriangle, RotateCcw } from 'lucide-react'
import styles from './ErrorState.module.css'

interface ErrorStateProps {
  error: Error | null
  onRetry: () => void
}

export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.wrap} role="alert">
      <div className={styles.glyph}>
        <AlertTriangle size={28} strokeWidth={2} />
      </div>
      <h3 className={styles.title}>Couldn't load events</h3>
      <p className={styles.message}>
        Something went wrong while reaching the server. Check your connection and try again.
      </p>
      {error?.message && <code className={styles.detail}>{error.message}</code>}
      <div>
        <button type="button" onClick={onRetry} className={styles.retry}>
          <RotateCcw size={14} strokeWidth={2.5} />
          Try again
        </button>
      </div>
    </div>
  )
}
