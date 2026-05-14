import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-[0_4px_20px_rgba(139,0,0,0.20)] hover:bg-primary/90 hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(139,0,0,0.30)]',
        default:
          'bg-primary text-primary-foreground shadow-[0_4px_20px_rgba(139,0,0,0.20)] hover:bg-primary/90 hover:-translate-y-px',
        secondary:
          'bg-white text-primary border border-border hover:bg-accent',
        destructive:
          'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        danger:
          'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
      },
      size: {
        sm: 'h-9 rounded-full px-4 text-xs',
        md: 'h-12 rounded-2xl px-6 text-sm',
        lg: 'h-14 rounded-full px-8 text-base',
        default: 'h-9 rounded-md px-4 py-2 text-sm',
        icon: 'h-9 w-9 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  fullWidth?: boolean
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      fullWidth = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), fullWidth && 'w-full', className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="inline-block h-[18px] w-[18px] rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : (
          children
        )}
      </Comp>
    )
  }
)

Button.displayName = 'Button'
export { Button, buttonVariants }
export default Button
