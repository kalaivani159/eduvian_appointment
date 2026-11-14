import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'navy' | 'soft'
type Size = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_1px_2px_rgba(58,28,133,0.35),0_8px_20px_-8px_rgba(106,52,240,0.7)] hover:from-brand-400 hover:to-brand-500 active:from-brand-600 active:to-brand-700',
  secondary:
    'bg-white text-navy-900 ring-1 ring-line shadow-[0_1px_2px_rgba(16,24,55,0.05)] hover:bg-brand-50/60 hover:ring-brand-200',
  ghost: 'text-slate-600 hover:bg-slate-100/80 hover:text-navy-900',
  danger:
    'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_8px_20px_-8px_rgba(225,29,72,0.6)] hover:from-rose-400 hover:to-rose-500',
  navy: 'bg-navy-900 text-white hover:bg-navy-800 shadow-[0_8px_20px_-10px_rgba(11,18,40,0.7)]',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100 ring-1 ring-brand-100',
}

const sizes: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-[12px] gap-1.5 rounded-lg',
  sm: 'h-8.5 px-3 text-[13px] gap-1.5 rounded-xl',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-11.5 px-5 text-[15px] gap-2 rounded-xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  iconLeft,
  iconRight,
  fullWidth,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold tracking-[-0.01em] transition-all duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  )
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-xl text-slate-500 transition-colors',
        'hover:bg-slate-100 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  )
}
