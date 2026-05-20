import { cn } from '@/lib/utils'
import styles from './StatusDot.module.css'

interface StatusDotProps {
  variant: 'active' | 'inactive' | 'pending' | 'info'
  label?: string
  pulse?: boolean
  size?: 'sm' | 'md'
}

export default function StatusDot({
  variant,
  label,
  pulse = false,
  size = 'md',
}: StatusDotProps) {
  return (
    <span className={cn(styles.wrap, styles[variant], styles[size])}>
      <span className={cn(styles.dot, pulse && styles.dotPulse)} aria-hidden="true" />
      {label && <span className={styles.label}>{label}</span>}
    </span>
  )
}