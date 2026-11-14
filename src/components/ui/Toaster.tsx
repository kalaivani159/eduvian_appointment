import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useApp } from '../../store/AppStore'
import { cn } from '../../lib/utils'

const tones = {
  success: {
    icon: CheckCircle2,
    ring: 'ring-teal-200',
    iconTone: 'text-teal-600 bg-teal-50',
  },
  error: {
    icon: XCircle,
    ring: 'ring-rose-200',
    iconTone: 'text-rose-600 bg-rose-50',
  },
  warning: {
    icon: AlertTriangle,
    ring: 'ring-amber-200',
    iconTone: 'text-amber-600 bg-amber-50',
  },
  info: {
    icon: Info,
    ring: 'ring-brand-200',
    iconTone: 'text-brand-600 bg-brand-50',
  },
}

export function Toaster() {
  const { toasts, dismissToast } = useApp()

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:right-6 sm:bottom-6 sm:left-auto sm:items-end sm:px-0">
      {toasts.map((toast) => {
        const tone = tones[toast.tone]
        const Icon = tone.icon
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-white p-3.5 shadow-pop ring-1 animate-fade-up',
              tone.ring,
            )}
          >
            <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', tone.iconTone)}>
              <Icon className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-navy-900">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
