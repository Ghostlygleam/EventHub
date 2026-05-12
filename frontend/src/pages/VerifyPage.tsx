import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import OTPInput from '../components/auth/OTPInput'
import { Button } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import styles from './VerifyPage.module.css'

interface TokenResponse {
  access_token: string
  user_id: string
  email: string
  role: string
}

export default function VerifyPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { login } = useAuth()
  const email = (state as { email?: string } | null)?.email ?? ''

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [shakeError, setShakeError] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (!email) {
    navigate('/login', { replace: true })
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (code.length < 6) return

    setLoading(true)
    setShakeError(false)
    setErrorMsg('')

    try {
      const data = await api.post<TokenResponse>('/auth/verify-otp', {
        email,
        token: code,
      })
      login(data.access_token, {
        id: data.user_id,
        email: data.email,
        role: data.role as 'student' | 'organiser' | 'admin',
      })
      navigate('/', { replace: true })
    } catch (err) {
      setShakeError(true)
      setErrorMsg(err instanceof Error ? err.message : 'Invalid code. Try again.')
      setCode('')
      setTimeout(() => setShakeError(false), 500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.logoWrap}>
            <div className={styles.logo}>D</div>
          </div>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.subtitle}>
            We sent a 6-digit code to
            <br />
            <strong>{email}</strong>
          </p>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          <OTPInput
            value={code}
            onChange={val => {
              setCode(val)
              if (errorMsg) setErrorMsg('')
            }}
            error={shakeError}
            disabled={loading}
          />

          {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}

          <Button
            type="submit"
            fullWidth
            loading={loading}
            size="lg"
            disabled={code.length < 6}
          >
            Verify code
          </Button>
        </form>

        <div className={styles.footer}>
          <Link to="/login" className={styles.back}>
            ← Use a different email
          </Link>
        </div>
      </div>
    </div>
  )
}
