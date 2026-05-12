import LoginForm from '../components/auth/LoginForm'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={`${styles.blob} ${styles.blob1}`} />
      <div className={`${styles.blob} ${styles.blob2}`} />

      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.logoWrap}>
            <div className={styles.logo}>D</div>
          </div>
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
