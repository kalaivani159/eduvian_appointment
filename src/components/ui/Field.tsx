import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from '../../lib/utils'
import { ChevronDown } from 'lucide-react'

const fieldBase =
  'w-full rounded-xl border border-line bg-white text-sm text-navy-900 placeholder:text-slate-400 transition-colors ' +
  'hover:border-slate-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'

export function Label({
  children,
  htmlFor,
  hint,
  required,
  className,
}: {
  children: ReactNode
  htmlFor?: string
  hint?: ReactNode
  required?: boolean
  className?: string
}) {
  return (
    <div className={cn('mb-1.5 flex items-baseline justify-between gap-3', className)}>
      <label htmlFor={htmlFor} className="text-[12.5px] font-semibold text-navy-800">
        {children}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {hint && <span className="text-[11.5px] text-slate-400">{hint}</span>}
    </div>
  )
}

export function Input({
  className,
  iconLeft,
  invalid,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { iconLeft?: ReactNode; invalid?: boolean }) {
  return (
    <div className="relative">
      {iconLeft && (
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
          {iconLeft}
        </span>
      )}
      <input
        {...rest}
        className={cn(
          fieldBase,
          'h-10 px-3.5',
          iconLeft && 'pl-9.5',
          invalid && 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/10',
          className,
        )}
      />
    </div>
  )
}

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cn(fieldBase, 'min-h-24 resize-y px-3.5 py-2.5', className)} />
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...rest}
        className={cn(fieldBase, 'h-10 cursor-pointer appearance-none pr-9 pl-3.5', className)}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold text-navy-900">{label}</p>
        {description && <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40',
          checked ? 'bg-brand-600' : 'bg-slate-300',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: ReactNode
  description?: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <span className="relative mt-0.5 flex size-4.5 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer size-4.5 cursor-pointer appearance-none rounded-[5px] border border-slate-300 bg-white transition-colors checked:border-brand-600 checked:bg-brand-600"
        />
        <svg
          viewBox="0 0 16 16"
          className="pointer-events-none absolute size-3 text-white opacity-0 peer-checked:opacity-100"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M3 8.5 6.2 11.5 13 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>
        <span className="block text-[13px] leading-snug font-medium text-navy-900">{label}</span>
        {description && <span className="mt-0.5 block text-[12px] text-slate-500">{description}</span>}
      </span>
    </label>
  )
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: {
  options: { value: T; label: string; count?: number }[]
  value: T
  onChange: (next: T) => void
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl bg-slate-100/80 p-0.5 ring-1 ring-line ring-inset',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-[10px] font-semibold whitespace-nowrap transition-all',
            size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3 text-[12.5px]',
            value === option.value
              ? 'bg-white text-navy-900 shadow-[0_1px_2px_rgba(16,24,55,0.1)]'
              : 'text-slate-500 hover:text-navy-800',
          )}
        >
          {option.label}
          {typeof option.count === 'number' && (
            <span
              className={cn(
                'ml-1.5 rounded-full px-1.5 py-px text-[10px]',
                value === option.value ? 'bg-brand-50 text-brand-700' : 'bg-slate-200/70 text-slate-500',
              )}
            >
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
