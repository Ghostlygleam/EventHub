import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-semibold text-foreground tracking-[0.01em]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-[52px] w-full rounded-2xl border border-input bg-background px-4 text-base text-foreground outline-none transition-all placeholder:text-muted-foreground',
            'focus:border-primary focus:ring-2 focus:ring-primary/10',
            error && 'border-destructive focus:border-destructive focus:ring-destructive/10',
            className
          )}
          {...props}
        />
        {error && <p className="text-[13px] text-destructive">{error}</p>}
        {!error && hint && <p className="text-[13px] text-muted-foreground">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export { Input }
export default Input
