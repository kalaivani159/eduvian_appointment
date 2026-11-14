import { cn } from '../../lib/utils'

const toneHex: Record<string, string> = {
  brand: '#7c4dff',
  teal: '#0d9488',
  amber: '#f59e0b',
  rose: '#f43f5e',
  navy: '#1c2b52',
  slate: '#94a3b8',
}

export function TrendChart({
  data,
  height = 190,
}: {
  data: { label: string; invited: number; confirmed: number; declined: number }[]
  height?: number
}) {
  const max = Math.max(...data.map((d) => Math.max(d.invited, d.confirmed, d.declined)), 1)
  const series = [
    { key: 'invited' as const, label: 'Invited', color: 'bg-brand-300' },
    { key: 'confirmed' as const, label: 'Confirmed', color: 'bg-teal-500' },
    { key: 'declined' as const, label: 'Declined', color: 'bg-rose-300' },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        {series.map((item) => (
          <span key={item.key} className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-500">
            <span className={cn('size-2 rounded-sm', item.color)} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3].map((line) => (
            <div key={line} className="h-px w-full bg-slate-100" />
          ))}
        </div>
        <div className="relative flex h-full items-end justify-between gap-2">
          {data.map((point) => (
            <div key={point.label} className="group flex h-full flex-1 flex-col justify-end">
              <div className="flex h-full items-end justify-center gap-1">
                {series.map((item) => (
                  <div key={item.key} className="relative flex h-full w-2.5 items-end sm:w-3">
                    <div
                      className={cn(
                        'w-full rounded-t-[3px] transition-all duration-500 group-hover:opacity-90',
                        item.color,
                      )}
                      style={{ height: `${Math.max((point[item.key] / max) * 100, 2)}%` }}
                      title={`${item.label}: ${point[item.key]}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between gap-2">
        {data.map((point) => (
          <span key={point.label} className="flex-1 text-center text-[11px] font-medium text-slate-400">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function AreaTrend({
  points,
  height = 120,
  tone = 'brand',
  labels,
}: {
  points: number[]
  height?: number
  tone?: string
  labels?: string[]
}) {
  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const range = max - min || 1
  const width = 320
  const step = width / Math.max(points.length - 1, 1)
  const coords = points.map((value, index) => ({
    x: index * step,
    y: height - ((value - min) / range) * (height - 16) - 8,
  }))
  const line = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const area = `0,${height} ${line} ${width},${height}`
  const color = toneHex[tone] ?? toneHex.brand
  const gradientId = `area-${tone}-${points.length}`

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline
          points={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {labels && (
        <div className="mt-1 flex justify-between">
          {labels.map((label) => (
            <span key={label} className="text-[10.5px] font-medium text-slate-400">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function Donut({
  data,
  size = 168,
  thickness = 16,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number; tone: string }[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f0f8" strokeWidth={thickness} />
          {data.map((item) => {
            const length = (item.value / total) * circumference
            const dash = `${length} ${circumference - length}`
            const element = (
              <circle
                key={item.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={toneHex[item.tone] ?? toneHex.brand}
                strokeWidth={thickness}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            )
            offset += length
            return element
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold text-navy-900">{centerValue}</span>
          <span className="text-[11px] font-medium text-slate-400">{centerLabel}</span>
        </div>
      </div>
      <div className="flex-1 space-y-2.5">
        {data.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[12.5px] text-slate-600">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: toneHex[item.tone] ?? toneHex.brand }}
              />
              {item.label}
            </span>
            <span className="text-[12.5px] font-semibold text-navy-900">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProgressBar({
  value,
  tone = 'brand',
  className,
  height = 6,
}: {
  value: number
  tone?: string
  className?: string
  height?: number
}) {
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-slate-100', className)}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.min(Math.max(value, 0), 100)}%`,
          backgroundColor: toneHex[tone] ?? toneHex.brand,
        }}
      />
    </div>
  )
}

export function MiniBars({ points, tone = 'brand' }: { points: number[]; tone?: string }) {
  const max = Math.max(...points, 1)
  return (
    <div className="flex h-8 items-end gap-[3px]">
      {points.map((point, index) => (
        <span
          key={index}
          className="w-1 rounded-sm opacity-80"
          style={{
            height: `${Math.max((point / max) * 100, 8)}%`,
            backgroundColor: toneHex[tone] ?? toneHex.brand,
          }}
        />
      ))}
    </div>
  )
}
