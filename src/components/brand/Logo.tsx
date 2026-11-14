import { useState } from 'react'
import { cn } from '../../lib/utils'

export function Logo({
  variant = 'dark',
  compact = false,
  className,
}: {
  variant?: 'dark' | 'light'
  compact?: boolean
  className?: string
}) {
  const [missing, setMissing] = useState(false)

  if (!missing) {
    return (
      <div className={cn('flex items-center gap-2.5', className)}>
        {/* Logo image — no container box, no background, blends into whatever surface it sits on */}
        <img
          src="/eduvian-logo.svg"
          alt="Eduvian"
          onError={() => setMissing(true)}
          className={cn(
            'shrink-0 object-contain',
            compact ? 'h-9 w-9' : 'h-11 w-auto max-w-[52px]',
          )}
        />
        {!compact && (
          <div className="flex flex-col leading-none">
            <span
              className={cn(
                'font-display text-[16px] font-extrabold tracking-[-0.02em]',
                variant === 'light' ? 'text-white' : 'text-navy-900',
              )}
            >
              EDUVIAN
            </span>
            <span
              className={cn(
                'mt-0.5 text-[10px] font-bold tracking-[-0.01em]',
                variant === 'light' ? 'text-white/70' : 'text-navy-600',
              )}
            >
              SOLUTIONS
            </span>
          </div>
        )}
      </div>
    )
  }

  /* ── Fallback wordmark shown only when the SVG file cannot be loaded ── */
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'relative flex shrink-0 items-center justify-center rounded-xl',
          compact ? 'size-9' : 'h-11 w-11',
          'bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 shadow-[0_6px_20px_-6px_rgba(124,77,255,0.9)]',
        )}
      >
        <span className="absolute inset-0 rounded-xl ring-1 ring-white/20 ring-inset" />
        <svg viewBox="0 0 32 32" className="size-6 text-white" fill="none">
          {/* Book pages */}
          <path
            d="M6 8C6 6.9 6.9 6 8 6h7v20H8c-1.1 0-2-.9-2-2V8z"
            fill="currentColor"
            fillOpacity="0.5"
          />
          <path
            d="M26 8c0-1.1-.9-2-2-2h-7v20h7c1.1 0 2-.9 2-2V8z"
            fill="currentColor"
            fillOpacity="0.8"
          />
          {/* Spine */}
          <rect x="14.5" y="6" width="3" height="20" fill="currentColor" />
          {/* Graduation cap hint */}
          <path
            d="M10 10h5M10 13.5h4M10 17h3"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />
        </svg>
      </span>
      {!compact && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              'font-display text-[16px] font-extrabold tracking-[-0.02em]',
              variant === 'light' ? 'text-white' : 'text-navy-900',
            )}
          >
            EDUVIAN
          </span>
          <span
            className={cn(
              'mt-0.5 text-[10px] font-bold tracking-[-0.01em]',
              variant === 'light' ? 'text-white/70' : 'text-navy-600',
            )}
          >
            SOLUTIONS
          </span>
        </div>
      )}
    </div>
  )
}
