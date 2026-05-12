import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Button } from '../ui'
import { Input } from '../ui'
import styles from './LoginForm.module.css'

const VALID_DOMAINS = ['ac.uk', 'edu', 'edu.kz', 'dmu.kz']

function validateEmail(email: string): string {
  if (!email.trim()) return 'Email is required'
  const domain = email.split('@')[1]
  if (!domain) return 'Enter a valid email address'
  const valid = VALID_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))
  if (!valid) return 'Only university emails are allowed (e.g. name@dmu.ac.uk)'
  return ''
}

export default function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const validationError = validateEmail(email)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.post('/auth/send-otp', { email })
      navigate('/login/verify', { state: { email } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <Input
        label="University email"
        type="email"
        value={email}
        onChange={e => {
          setEmail(e.target.value)
          if (error) setError('')
        }}
        placeholder="name@dmu.ac.uk"
        error={error}
        hint="We'll send you a one-time sign-in code"
        autoFocus
        autoComplete="email"
        inputMode="email"
      />
      <Button type="submit" fullWidth loading={loading} size="lg">
        Send code
      </Button>
    </form>
  )
}
