import { type ReactNode, type InputHTMLAttributes } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './CommandBar.module.css'

interface CommandBarProps {
  searchProps?: InputHTMLAttributes<HTMLInputElement> & {
    placeholder?: string
    label?: string
  }
  /** Slot rendered at the right edge of the bar (filters, refresh, count). */
  right?: ReactNode
  /** Slot rendered between the search and the right side (extra filters, sorts). */
  middle?: ReactNode
}

export default function CommandBar({
  searchProps,
  right,
  middle,
}: CommandBarProps) {
  return (
    <div className={styles.bar} role="search">
      {searchProps && (
        <label className={styles.searchWrap}>
          <Search size={14} strokeWidth={2.2} aria-hidden="true" />
          <span className={styles.prompt} aria-hidden="true">›</span>
          <input
            {...searchProps}
            type="search"
            className={cn(styles.input, searchProps.className)}
            aria-label={searchProps.label ?? 'Search'}
          />
        </label>
      )}

      {middle && <div className={styles.middle}>{middle}</div>}

      {right && <div className={styles.right}>{right}</div>}
    </div>
  )
}