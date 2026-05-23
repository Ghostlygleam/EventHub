import { Link, useLocation } from 'react-router-dom'
import { Users, Activity, Library } from 'lucide-react'
import { cn } from '@/lib/utils'
import StatusDot from './StatusDot'
import styles from './OpsHeader.module.css'

interface OpsHeaderProps {
  /** Current section — drives the active state of the segmented nav. */
  active: 'users' | 'clubs' | 'logs'
  /** Page title in serif (e.g. "Population.", "The wire."). */
  title: React.ReactNode
  /** Subtitle / supporting line. */
  lede: React.ReactNode
  /** Optional record count for the live chip. */
  recordCount?: number
  /** Optional label for the chip (e.g. "users", "entries"). */
  recordLabel?: string
  isLive?: boolean
}

const NAV_ITEMS = [
  { id: 'users', label: 'Users',     path: '/admin/users', icon: Users },
  { id: 'clubs', label: 'Societies', path: '/admin/clubs', icon: Library },
  { id: 'logs',  label: 'Audit log', path: '/admin/logs',  icon: Activity },
] as const

export default function OpsHeader({
  active,
  title,
  lede,
  recordCount,
  recordLabel = 'records',
  isLive = true,
}: OpsHeaderProps) {
  const { pathname } = useLocation()

  return (
    <header className={styles.header}>
      <div className={styles.brandStrip}>
        <span className={styles.brandKey}>EVENTHUB</span>
        <span className={styles.brandSep}>·</span>
        <span className={styles.brandSection}>OPS</span>
        <span className={styles.brandSep}>·</span>
        <span className={styles.brandSection}>
          {active === 'users' ? 'USERS' : active === 'clubs' ? 'CLUBS' : 'WIRE'}
        </span>

        <span className={styles.brandSpacer} />

        {recordCount != null && (
          <span className={styles.chip}>
            <StatusDot variant={isLive ? 'active' : 'pending'} pulse={isLive} size="sm" />
            <strong>{recordCount.toLocaleString('en-GB')}</strong>
            <span className={styles.chipLabel}>{recordLabel}</span>
          </span>
        )}
      </div>

      <div className={styles.body}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lede}>{lede}</p>
      </div>

      <nav className={styles.tabs} role="tablist" aria-label="Console sections">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.path) || item.id === active
          return (
            <Link
              key={item.id}
              to={item.path}
              role="tab"
              aria-selected={isActive}
              className={cn(styles.tab, isActive && styles.tabActive)}
            >
              <Icon size={13} strokeWidth={2.3} />
              <span>{item.label.toUpperCase()}</span>
            </Link>
          )
        })}
      </nav>
    </header>
  )
}