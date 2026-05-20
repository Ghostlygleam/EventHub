import { Link, useLocation } from 'react-router-dom'
import { Home, Calendar, Newspaper, User, Terminal } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import styles from './BottomNav.module.css'

interface Tab {
  path: string
  icon: typeof Home
  label: string
  /** Active when the current pathname starts with this prefix (for nested routes). */
  matchPrefix?: boolean
}

const BASE_TABS: Tab[] = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/me', icon: Calendar, label: 'My Events' },
]

const PROFILE_TAB: Tab = { path: '/profile', icon: User, label: 'Profile' }
const DESK_TAB: Tab = { path: '/organiser', icon: Newspaper, label: 'Desk', matchPrefix: true }
const CONSOLE_TAB: Tab = { path: '/admin/users', icon: Terminal, label: 'Console', matchPrefix: true }

export default function BottomNav() {
  const { pathname } = useLocation()
  const { user } = useAuth()

  const canSeeDesk = user?.role === 'organiser' || user?.role === 'admin'
  const canSeeConsole = user?.role === 'admin'

  /* Console replaces Profile for admins — keeps the bar at four icons max. */
  const tabs: Tab[] = canSeeConsole
    ? [...BASE_TABS, DESK_TAB, CONSOLE_TAB]
    : canSeeDesk
      ? [...BASE_TABS, DESK_TAB, PROFILE_TAB]
      : [...BASE_TABS, PROFILE_TAB]

  const matchPath = (tab: Tab) =>
    tab.path === '/admin/users' ? '/admin' : tab.path

  const isActive = (tab: Tab) =>
    tab.matchPrefix ? pathname.startsWith(matchPath(tab)) : pathname === tab.path

  return (
    <nav className={styles.nav}>
      {tabs.map((tab) => {
        const Icon = tab.icon
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={isActive(tab) ? styles.tabActive : styles.tab}
            aria-label={tab.label}
          >
            <Icon size={22} />
            <span className={styles.label}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
