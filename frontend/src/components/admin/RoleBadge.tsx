import { type CSSProperties } from 'react'
import { ROLE_ACCENT, ROLE_LABEL } from '@/lib/admin'
import type { UserRole } from '@/lib/auth-context'
import styles from './RoleBadge.module.css'

interface RoleBadgeProps {
  role: UserRole
  size?: 'sm' | 'md'
}

export default function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const style: CSSProperties & Record<'--role-accent', string> = {
    ['--role-accent']: ROLE_ACCENT[role],
  }
  const cls = size === 'sm' ? `${styles.badge} ${styles.sm}` : `${styles.badge} ${styles.md}`
  return (
    <span className={cls} style={style}>
      {ROLE_LABEL[role].toUpperCase()}
    </span>
  )
}