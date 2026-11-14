import type { ReactNode } from 'react'
import { cn, initials } from '../../lib/utils'

export function Avatar({
  name,
  tone = 'from-brand-500 to-brand-700',
  size = 'md',
  ring,
  className,
}: {
  name: string
  tone?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  ring?: boolean
  className?: string
}) {
  const sizes = {
    xs: 'size-6 text-[10px]',
    sm: 'size-8 text-[11px]',
    md: 'size-9.5 text-[12px]',
    lg: 'size-11 text-sm',
    xl: 'size-16 text-lg',
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white',
        tone,
        sizes[size],
        ring && 'ring-2 ring-white',
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}

export function AvatarStack({ names, tones }: { names: string[]; tones?: string[] }) {
  return (
    <div className="flex items-center">
      {names.slice(0, 3).map((name, index) => (
        <Avatar
          key={name}
          name={name}
          size="sm"
          ring
          tone={tones?.[index] ?? 'from-brand-500 to-brand-700'}
          className={index > 0 ? '-ml-2' : ''}
        />
      ))}
      {names.length > 3 && (
        <span className="-ml-2 inline-flex size-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 ring-2 ring-white">
          +{names.length - 3}
        </span>
      )}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 text-center',
        compact ? 'py-8' : 'py-14',
      )}
    >
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-500 ring-1 ring-brand-100 ring-inset">
        {icon}
      </div>
      <p className="text-[14.5px] font-semibold text-navy-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-gradient-to-r from-slate-100 via-slate-200/70 to-slate-100',
        className,
      )}
    />
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-white px-1.5 font-sans text-[10.5px] font-semibold text-slate-500 shadow-[0_1px_0_rgba(16,24,55,0.06)]">
      {children}
    </kbd>
  )
}
