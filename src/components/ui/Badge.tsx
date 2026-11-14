import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Tone = 'brand' | 'teal' | 'amber' | 'rose' | 'navy' | 'slate' | 'sky' | 'emerald' | 'indigo' | 'violet' | 'orange'

const tones: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  navy: 'bg-navy-50 text-navy-800 ring-navy-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
}

export function Badge({
  children,
  tone = 'slate',
  className,
  dot,
  size = 'md',
}: {
  children: ReactNode
  tone?: Tone
  className?: string
  dot?: boolean
  size?: 'sm' | 'md'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 whitespace-nowrap ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-[11.5px]',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** Accepts a tailwind class string such as "bg-teal-50 text-teal-700 ring-teal-200". */
export function ClassBadge({
  children,
  className,
  size = 'md',
  dot,
}: {
  children: ReactNode
  className: string
  size?: 'sm' | 'md'
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 whitespace-nowrap ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-[11.5px]',
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function DemoTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-dashed border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-700 uppercase',
        className,
      )}
    >
      Demo
    </span>
  )
}
