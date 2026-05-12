import { Link } from 'react-router-dom'
import { Button } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  const { token } = useAuth()
  const homeHref = token ? '/' : '/login'

  return (
    <div className={styles.page}>
      <div className={`${styles.blob} ${styles.blob1}`} />
      <div className={`${styles.blob} ${styles.blob2}`} />

      <div className={styles.card}>
        <div className={styles.bigCode}>404</div>
        <h1 className={styles.heading}>Lost your way?</h1>
        <p className={styles.subtitle}>
          We couldn't find the page you're looking for. It might have been moved,
          or it never existed.
        </p>
        <div className={styles.actions}>
          <Link to={homeHref}>
            <Button size="lg">Take me home →</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
