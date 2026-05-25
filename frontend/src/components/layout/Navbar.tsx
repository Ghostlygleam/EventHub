import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LogOut,
  Menu,
  X,
  Home,
  Calendar,
  Newspaper,
  Terminal,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '@/lib/utils'
import styles from './Navbar.module.css'

interface NavItem {
  to: string
  label: string
  icon: typeof Home
  /** Active when pathname starts with this prefix (for nested routes). */
  matchPrefix?: boolean
  /** Role gating — undefined means everybody. */
  requires?: 'organiser-or-admin' | 'admin'
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',            label: 'Events',    icon: Home },
  { to: '/me',          label: 'My Events', icon: Calendar },
  { to: '/organiser',   label: 'Desk',      icon: Newspaper, matchPrefix: true, requires: 'organiser-or-admin' },
  { to: '/admin/users', label: 'Console',   icon: Terminal,  matchPrefix: true, requires: 'admin' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  /* User popover: close on outside click / ESC */
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  /* Mobile sheet: body scroll lock + ESC + close on route change */
  useEffect(() => {
    if (!sheetOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [sheetOpen])

  /* Close sheet whenever route changes — clicking a link should "navigate and close" */
  useEffect(() => {
    setSheetOpen(false)
  }, [pathname])

  const initials = user?.email
    ? user.email.split('@')[0].slice(0, 2).toUpperCase()
    : 'U'

  const canSee = (item: NavItem): boolean => {
    if (!item.requires) return true
    if (item.requires === 'organiser-or-admin') {
      return user?.role === 'organiser' || user?.role === 'admin'
    }
    if (item.requires === 'admin') return user?.role === 'admin'
    return false
  }

  const isItemActive = (item: NavItem): boolean =>
    item.matchPrefix ? pathname.startsWith(item.to) || (item.to === '/admin/users' && pathname.startsWith('/admin'))
                     : pathname === item.to

  return (
    <>
      <header className={styles.navbar}>
        <div className={styles.inner}>
          <Link to="/" className={styles.brand}>
            <div className={styles.logoMark}>D</div>
            <span className={styles.wordmark}>EventHub</span>
          </Link>

          <nav className={styles.navLinks}>
            {NAV_ITEMS.filter(canSee).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={isItemActive(item) ? styles.activeLink : styles.link}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={styles.actions}>
            <div className={styles.userMenu} ref={menuRef}>
              <button
                type="button"
                className={styles.avatar}
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
              >
                {initials}
              </button>

              {menuOpen && (
                <div className={styles.popover} role="menu">
                  <div className={styles.popoverHead}>
                    <span className={styles.popoverEmail}>{user?.email ?? 'Signed in'}</span>
                    {user?.role && (
                      <span className={styles.popoverRole}>{user.role.toUpperCase()}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.popoverItem}
                    onClick={() => {
                      setMenuOpen(false)
                      logout()
                    }}
                    role="menuitem"
                  >
                    <LogOut size={14} strokeWidth={2.3} />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Hamburger — only visible on mobile via CSS */}
            <button
              ref={hamburgerRef}
              type="button"
              className={styles.hamburger}
              onClick={() => setSheetOpen((v) => !v)}
              aria-label={sheetOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={sheetOpen}
              aria-controls="mobile-sheet"
            >
              {sheetOpen ? <X size={20} strokeWidth={2.3} /> : <Menu size={20} strokeWidth={2.3} />}
            </button>
          </div>
        </div>
      </header>

      {/* ───── MOBILE SHEET ───── */}
      {sheetOpen && (
        <>
          <div
            className={styles.sheetBackdrop}
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={sheetRef}
            id="mobile-sheet"
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className={styles.sheetHead}>
              <span className={styles.sheetAvatar}>{initials}</span>
              <div className={styles.sheetIdentity}>
                <span className={styles.sheetEmail}>{user?.email ?? 'Signed in'}</span>
                {user?.role && (
                  <span className={styles.sheetRole}>{user.role.toUpperCase()}</span>
                )}
              </div>
            </div>

            <nav className={styles.sheetLinks} aria-label="Primary">
              {NAV_ITEMS.filter(canSee).map((item) => {
                const Icon = item.icon
                const active = isItemActive(item)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(styles.sheetLink, active && styles.sheetLinkActive)}
                  >
                    <span className={styles.sheetLinkIcon}>
                      <Icon size={18} strokeWidth={2.2} />
                    </span>
                    <span className={styles.sheetLinkLabel}>{item.label}</span>
                    {active && <span className={styles.sheetLinkDot} aria-hidden="true" />}
                  </Link>
                )
              })}
            </nav>

            <button
              type="button"
              className={styles.sheetSignOut}
              onClick={() => {
                setSheetOpen(false)
                logout()
              }}
            >
              <LogOut size={14} strokeWidth={2.4} />
              Sign out
            </button>
          </div>
        </>
      )}
    </>
  )
}
