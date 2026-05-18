import { CalendarClock, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './DashboardTabs.module.css'

export type DashboardTab = 'upcoming' | 'past'

interface DashboardTabsProps {
  active: DashboardTab
  upcomingCount: number
  pastCount: number
  onChange: (tab: DashboardTab) => void
}

export default function DashboardTabs({
  active,
  upcomingCount,
  pastCount,
  onChange,
}: DashboardTabsProps) {
  return (
    <div className={styles.wrap} role="tablist" aria-label="My registrations">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'upcoming'}
        className={cn(styles.tab, active === 'upcoming' && styles.tabActive)}
        onClick={() => onChange('upcoming')}
      >
        <span className={styles.icon} aria-hidden="true">
          <CalendarClock size={16} strokeWidth={2.2} />
        </span>
        <span className={styles.text}>
          <span className={styles.label}>Upcoming</span>
          <span className={styles.sublabel}>
            {upcomingCount === 0
              ? 'nothing lined up'
              : `${upcomingCount} ${upcomingCount === 1 ? 'event' : 'events'} lined up`}
          </span>
        </span>
        <span className={styles.count} aria-hidden="true">{upcomingCount}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={active === 'past'}
        className={cn(styles.tab, active === 'past' && styles.tabActive)}
        onClick={() => onChange('past')}
      >
        <span className={styles.icon} aria-hidden="true">
          <Archive size={16} strokeWidth={2.2} />
        </span>
        <span className={styles.text}>
          <span className={styles.label}>Archive</span>
          <span className={styles.sublabel}>
            {pastCount === 0
              ? 'fresh slate'
              : `${pastCount} attended`}
          </span>
        </span>
        <span className={styles.count} aria-hidden="true">{pastCount}</span>
      </button>
    </div>
  )
}
