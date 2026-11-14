import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { AreaTrend } from '../ui/Charts'

export function StatCard({
  label,
  value,
  delta,
  trend = 'flat',
  hint,
  icon,
  tone = 'brand',
  spark,
  onClick,
}: {
  label: string
  value: string
  delta?: string
  trend?: 'up' | 'down' | 'flat'
  hint?: string
  icon: ReactNode
  tone?: 'brand' | 'teal' | 'amber' | 'rose' | 'navy'
  spark?: number[]
  onClick?: () => void
}) {
  const tones = {
    brand: 'from-brand-50 to-white text-brand-600 ring-brand-100',
    teal: 'from-teal-50 to-white text-teal-600 ring-teal-100',
    amber: 'from-amber-50 to-white text-amber-600 ring-amber-100',
    rose: 'from-rose-50 to-white text-rose-600 ring-rose-100',
    navy: 'from-navy-50 to-white text-navy-700 ring-navy-100',
  }

  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : ArrowRight

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-card transition-all',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-inset',
            tones[tone],
          )}
        >
          {icon}
        </span>
        {delta && (
          <span
            className={cn(
              'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold',
              trend === 'up' && 'bg-teal-50 text-teal-700',
              trend === 'down' && 'bg-rose-50 text-rose-600',
              trend === 'flat' && 'bg-slate-100 text-slate-500',
            )}
          >
            <TrendIcon className="size-3" />
            {delta}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="font-display text-[26px] leading-none font-bold tracking-[-0.03em] text-navy-900">
            {value}
          </p>
          <p className="mt-1.5 text-[12px] font-medium text-slate-500">{label}</p>
        </div>
        {spark && (
          <div className="w-16 shrink-0 opacity-70">
            <AreaTrend points={spark} height={34} tone={tone} />
          </div>
        )}
      </div>

      {hint && <p className="mt-2 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

export function MetricRow({
  label,
  value,
  total,
  tone = 'brand',
}: {
  label: string
  value: number
  total: number
  tone?: 'brand' | 'teal' | 'amber' | 'rose' | 'navy'
}) {
  const bar = {
    brand: 'bg-brand-500',
    teal: 'bg-teal-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    navy: 'bg-navy-700',
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="truncate text-[12.5px] text-slate-600">{label}</span>
        <span className="text-[12px] font-semibold text-navy-900">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full transition-all duration-700', bar[tone])}
          style={{ width: `${Math.min((value / Math.max(total, 1)) * 100, 100)}%` }}
        />
      </div>
    </div>
  )
}
