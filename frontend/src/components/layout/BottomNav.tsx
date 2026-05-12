import { Link, useLocation } from 'react-router-dom'
import { Home, Calendar, Search, User } from 'lucide-react'
import styles from './BottomNav.module.css'

const TABS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/me', icon: Calendar, label: 'My Events' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/profile', icon: User, label: 'Profile' },
] as const

export default function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav className={styles.nav}>
      {TABS.map(({ path, icon: Icon, label }) => (
        <Link
          key={path}
          to={path}
          className={pathname === path ? styles.tabActive : styles.tab}
          aria-label={label}
        >
          <Icon size={22} />
          <span className={styles.label}>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
