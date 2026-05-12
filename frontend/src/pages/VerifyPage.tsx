import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import OTPInput from '../components/auth/OTPInput'
import { Button } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import styles from './VerifyPage.module.css'

const RESEND_DELAY = 60

interface TokenResponse {
  access_token: string
  user_id: string
  email: string
  role: string
}

export default function VerifyPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { token, login } = useAuth()
  const email = (state as { email?: string } | null)?.email ?? ''

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [shakeError, setShakeError] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Resend countdown
  const [secondsLeft, setSecondsLeft] = useState(RESEND_DELAY)
  const [resendMsg, setResendMsg] = useState('')

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  const verifyOTP = useCallback(
    async (otp: string) => {
      if (loading) return
      setLoading(true)
      setShakeError(false)
      setErrorMsg('')

      try {
        const data = await api.post<TokenResponse>('/auth/verify-otp', {
          email,
          token: otp,
        })
        setSuccess(true)
        await new Promise(resolve => setTimeout(resolve, 480))
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
    },
    [email, loading, login, navigate]
  )

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    if (code.length === 6 && !loading && !success) {
      const timer = setTimeout(() => verifyOTP(code), 180)
      return () => clearTimeout(timer)
    }
  }, [code, loading, success, verifyOTP])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (code.length === 6 && !loading) void verifyOTP(code)
  }

  const handleResend = useCallback(async () => {
    if (secondsLeft > 0) return
    setSecondsLeft(RESEND_DELAY)
    setCode('')
    setErrorMsg('')
    setResendMsg('')
    try {
      await api.post('/auth/send-otp', { email })
      setResendMsg('Code sent!')
      setTimeout(() => setResendMsg(''), 3000)
    } catch {
      setErrorMsg('Failed to resend. Try again.')
    }
  }, [email, secondsLeft])

  // Already authenticated → bounce home
  if (token) return <Navigate to="/" replace />
  // No email in navigation state → back to /login
  if (!email) return <Navigate to="/login" replace />

  return (
    <div className={styles.page}>
      <div className={`${styles.blob} ${styles.blob1}`} />
      <div className={`${styles.blob} ${styles.blob2}`} />

      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.logoWrap}>
            <div className={styles.logo}>D</div>
          </div>
          <h1 className={styles.title}>Check your inbox</h1>

          <a
            href="/login"
            onClick={e => { e.preventDefault(); navigate('/login') }}
            className={styles.emailChip}
          >
            <span className={styles.chipArrow}>←</span>
            {email}
          </a>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          <p className={styles.label} id="otp-label">Enter the 6-digit code</p>

          <OTPInput
            value={code}
            onChange={val => {
              setCode(val)
              if (errorMsg) setErrorMsg('')
            }}
            error={shakeError}
            disabled={loading}
            success={success}
            labelId="otp-label"
          />

          {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}

          <Button
            type="submit"
            fullWidth
            loading={loading}
            size="lg"
            disabled={code.length < 6 || success}
          >
            {success ? 'Verified ✓' : 'Verify code'}
          </Button>
        </form>

        <div className={styles.resend}>
          {resendMsg ? (
            <p className={styles.successToast}>✓ {resendMsg}</p>
          ) : secondsLeft > 0 ? (
            <p className={styles.resendTimer}>
              Resend code in <strong>{secondsLeft}s</strong>
            </p>
          ) : (
            <button
              className={styles.resendBtn}
              onClick={() => void handleResend()}
              type="button"
            >
              Resend code →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
