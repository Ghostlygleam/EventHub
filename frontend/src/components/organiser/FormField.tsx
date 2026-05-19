import { type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import styles from './FormField.module.css'

/* ─── Common shell ─────────────────────────────────────── */

interface FieldShellProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  htmlFor?: string
  children: ReactNode
  className?: string
}

export function FieldShell({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={cn(styles.shell, error && styles.shellError, className)}>
      <label className={styles.label} htmlFor={htmlFor}>
        <span className={styles.labelText}>{label}</span>
        {required && <span className={styles.required} aria-hidden="true">*</span>}
        {hint && !error && <span className={styles.hint}>{hint}</span>}
      </label>
      {children}
      {error && <span className={styles.error} role="alert">{error}</span>}
    </div>
  )
}

/* ─── Text input ───────────────────────────────────────── */

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  hint?: string
  error?: string
  variant?: 'default' | 'headline'
  type?: string
}

export function TextField({
  label,
  hint,
  error,
  required,
  variant = 'default',
  type = 'text',
  id,
  className,
  ...rest
}: TextFieldProps) {
  const inputId = id ?? `f-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <input
        {...rest}
        id={inputId}
        type={type}
        className={cn(
          styles.input,
          variant === 'headline' && styles.inputHeadline,
          className
        )}
      />
    </FieldShell>
  )
}

/* ─── Textarea ─────────────────────────────────────────── */

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
}

export function TextAreaField({
  label,
  hint,
  error,
  required,
  id,
  className,
  rows = 5,
  ...rest
}: TextAreaFieldProps) {
  const inputId = id ?? `f-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <textarea
        {...rest}
        id={inputId}
        rows={rows}
        className={cn(styles.input, styles.textarea, className)}
      />
    </FieldShell>
  )
}

/* ─── Select ───────────────────────────────────────────── */

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
  error?: string
  options: { value: string; label: string }[]
}

export function SelectField({
  label,
  hint,
  error,
  required,
  options,
  id,
  className,
  ...rest
}: SelectFieldProps) {
  const inputId = id ?? `f-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <select
        {...rest}
        id={inputId}
        className={cn(styles.input, styles.select, className)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FieldShell>
  )
}

/* ─── Toggle ───────────────────────────────────────────── */

interface ToggleFieldProps {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  id?: string
}

export function ToggleField({
  label,
  description,
  checked,
  onChange,
  disabled,
  id,
}: ToggleFieldProps) {
  const inputId = id ?? `f-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className={cn(styles.toggle, checked && styles.toggleOn, disabled && styles.toggleDisabled)}>
      <label htmlFor={inputId} className={styles.toggleLabel}>
        <span className={styles.toggleTextWrap}>
          <span className={styles.toggleTitle}>{label}</span>
          {description && (
            <span className={styles.toggleDescription}>{description}</span>
          )}
        </span>
        <button
          type="button"
          id={inputId}
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={styles.switch}
        >
          <span className={styles.switchThumb} />
        </button>
      </label>
    </div>
  )
}