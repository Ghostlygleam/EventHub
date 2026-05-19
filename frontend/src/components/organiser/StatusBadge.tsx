import { cn } from '@/lib/utils'
import { ORGANISER_STATUS_LABEL, type OrganiserStatus } from '@/lib/events'
import styles from './StatusBadge.module.css'

interface StatusBadgeProps {
  status: OrganiserStatus
  size?: 'sm' | 'md' | 'lg'
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  return (
    <span className={cn(styles.badge, styles[status], styles[size])}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>{ORGANISER_STATUS_LABEL[status]}</span>
    </span>
  )
}