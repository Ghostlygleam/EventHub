import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ClipboardEvent,
  type ChangeEvent,
} from 'react'
import styles from './OTPInput.module.css'

interface OTPInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  error?: boolean
  disabled?: boolean
  success?: boolean
  /** ID of the element labelling this group (for aria-labelledby) */
  labelId?: string
  /** Whether to focus the first input on mount. Default true. */
  autoFocus?: boolean
}

export default function OTPInput({
  value,
  onChange,
  length = 6,
  error = false,
  disabled = false,
  success = false,
  labelId,
  autoFocus = true,
}: OTPInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus()
  }, [autoFocus])

  const digits = value
    .split('')
    .concat(Array<string>(length).fill(''))
    .slice(0, length)

  const focus = (index: number) => {
    inputsRef.current[index]?.focus()
  }

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = char
    onChange(next.join(''))
    if (char && index < length - 1) focus(index + 1)
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) focus(index - 1)
    if (e.key === 'ArrowLeft' && index > 0) focus(index - 1)
    if (e.key === 'ArrowRight' && index < length - 1) focus(index + 1)
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(pasted)
    focus(Math.min(pasted.length, length - 1))
  }

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-label={labelId ? undefined : `Enter ${length}-digit verification code`}
      className={[
        styles.row,
        error ? styles.shake : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={el => { inputsRef.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          disabled={disabled || success}
          className={[
            styles.box,
            success && digit ? styles.successBox : '',
            error && !success ? styles.errorBox : '',
            digit && !success && !error ? styles.filled : '',
          ]
            .filter(Boolean)
            .join(' ')}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1} of ${length}`}
        />
      ))}
    </div>
  )
}
