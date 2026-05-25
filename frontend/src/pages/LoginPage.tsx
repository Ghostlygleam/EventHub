import { Navigate } from 'react-router-dom'
import LoginForm from '../components/auth/LoginForm'
import { useAuth } from '../hooks/useAuth'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const { token } = useAuth()
  if (token) return <Navigate to="/" replace />

  return (
    <div className={styles.page}>
      <div className={`${styles.blob} ${styles.blob1}`} />
      <div className={`${styles.blob} ${styles.blob2}`} />

      <div className={styles.card}>
        <header className={styles.header}>
          <img
            src="/dmu-crest.png"
            alt="De Montfort University"
            className={styles.crest}
            loading="eager"
            decoding="async"
          />
          <h1 className={styles.title}>EventHub</h1>
          <p className={styles.university}>De Montfort University Kazakhstan</p>
        </header>

        <div className={styles.divider} />

        <p className={styles.prompt}>Sign in with your university email</p>
        <div className={styles.formWrap}>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
