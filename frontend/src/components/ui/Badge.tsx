import type { ReactNode } from 'react'
import styles from './Badge.module.css'

type BadgeVariant = 'crimson' | 'green' | 'gray' | 'blue' | 'red'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

export default function Badge({ children, variant = 'crimson', className }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[variant], className].filter(Boolean).join(' ')}>
      {children}
    </span>
  )
}
