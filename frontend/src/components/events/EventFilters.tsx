import type { CSSProperties } from 'react'
import { Search, X, Layers, BookOpen, Sparkles, Wrench, Calendar } from 'lucide-react'
import {
  EVENT_TYPE_LABEL,
  type EventStatus,
  type EventType,
} from '@/lib/events'
import styles from './EventFilters.module.css'

const PILL_ACCENT: Record<EventType | 'all', string> = {
  all: '0 0% 18%',
  lecture: '217 91% 50%',
  club: '0 100% 30%',
  workshop: '142 60% 38%',
  other: '262 52% 50%',
}

const PILL_ICON: Record<EventType | 'all', typeof Layers> = {
  all: Layers,
  lecture: BookOpen,
  club: Sparkles,
  workshop: Wrench,
  other: Calendar,
}

const TYPES: (EventType | 'all')[] = ['all', 'lecture', 'club', 'workshop', 'other']

interface EventFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  isSearching: boolean

  type: EventType | null
  onTypeChange: (value: EventType | null) => void

  status: EventStatus
  onStatusChange: (value: EventStatus) => void
}

export default function EventFilters({
  search,
  onSearchChange,
  isSearching,
  type,
  onTypeChange,
  status,
  onStatusChange,
}: EventFiltersProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.searchRow}>
        <label className={styles.searchWrap}>
          <Search size={18} strokeWidth={2.2} className={styles.searchIcon} />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search events by title…"
            className={styles.searchInput}
            aria-label="Search events"
            autoComplete="off"
            spellCheck={false}
          />
          {isSearching ? (
            <span className={styles.searchSpinner} aria-hidden="true" />
          ) : search ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className={styles.searchClear}
              aria-label="Clear search"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          ) : null}
        </label>

        <div className={styles.statusGroup} role="tablist" aria-label="Event status">
          <button
            type="button"
            role="tab"
            aria-selected={status === 'upcoming'}
            onClick={() => onStatusChange('upcoming')}
            className={[styles.statusBtn, status === 'upcoming' ? styles.active : ''].join(' ')}
          >
            Upcoming
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={status === 'past'}
            onClick={() => onStatusChange('past')}
            className={[styles.statusBtn, status === 'past' ? styles.active : ''].join(' ')}
          >
            Past
          </button>
        </div>
      </div>

      <div className={styles.typeRow} role="group" aria-label="Filter by event type">
        <span className={styles.typeLabel}>Filter</span>
        {TYPES.map((key) => {
          const Icon = PILL_ICON[key]
          const isActive = key === 'all' ? type === null : type === key
          const accent = PILL_ACCENT[key]
          const label = key === 'all' ? 'All events' : EVENT_TYPE_LABEL[key]
          const style: CSSProperties & Record<'--pill-accent', string> = {
            ['--pill-accent']: accent,
          }
          return (
            <button
              key={key}
              type="button"
              onClick={() => onTypeChange(key === 'all' ? null : key)}
              className={[styles.typePill, isActive ? styles.active : ''].join(' ')}
              style={style}
              aria-pressed={isActive}
            >
              <Icon size={14} strokeWidth={2.3} />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
