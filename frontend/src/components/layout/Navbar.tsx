import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  /* Close on outside click / ESC */
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

  const initials = user?.email
    ? user.email.split('@')[0].slice(0, 2).toUpperCase()
    : 'U'

  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <div className={styles.logoMark}>D</div>
          <span className={styles.wordmark}>EventHub</span>
        </Link>

        <nav className={styles.navLinks}>
          <Link
            to="/"
            className={pathname === '/' ? styles.activeLink : styles.link}
          >
            Events
          </Link>
          <Link
            to="/me"
            className={pathname === '/me' ? styles.activeLink : styles.link}
          >
            My Events
          </Link>
          {(user?.role === 'organiser' || user?.role === 'admin') && (
            <Link
              to="/organiser"
              className={pathname.startsWith('/organiser') ? styles.activeLink : styles.link}
            >
              Desk
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link
              to="/admin/users"
              className={pathname.startsWith('/admin') ? styles.activeLink : styles.link}
            >
              Console
            </Link>
          )}
        </nav>

        <div className={styles.actions}>
          <button className={styles.iconBtn} aria-label="Notifications">
            <Bell size={18} />
          </button>

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
        </div>
      </div>
    </header>
  )
}