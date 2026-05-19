import { Link, useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

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
        </nav>

        <div className={styles.actions}>
          <button className={styles.iconBtn} aria-label="Notifications">
            <Bell size={18} />
          </button>
          <button
            className={styles.avatar}
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
          >
            {initials}
          </button>
        </div>
      </div>
    </header>
  )
}
