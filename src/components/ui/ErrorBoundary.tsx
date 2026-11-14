import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  /** Optional label shown in the error panel to identify which part crashed */
  label?: string
}

interface State {
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Catches runtime errors inside any descendant component tree and shows a
 * recovery panel instead of a blank white screen.
 *
 * Usage:
 *   <PageErrorBoundary label="Appointments">
 *     <AppointmentsPage />
 *   </PageErrorBoundary>
 */
export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo })
    // In production this would be sent to Sentry / Datadog.
    console.error('[Eduvian] Page render error', error, errorInfo)
  }

  reset() {
    this.setState({ error: null, errorInfo: null })
  }

  override render() {
    const { error, errorInfo } = this.state
    if (!error) return this.props.children

    const label = this.props.label ? `${this.props.label} page` : 'page'

    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/50 px-6 py-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 ring-1 ring-rose-200">
          <AlertTriangle className="size-7" />
        </span>
        <h2 className="mt-4 text-[18px] font-bold text-navy-900">
          This {label} encountered an error
        </h2>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-slate-600">
          A runtime error prevented the {label} from rendering. This is a UI-phase preview — the
          error is not a backend failure.
        </p>

        <div className="mt-5 max-w-xl overflow-auto rounded-xl bg-white p-4 text-left ring-1 ring-rose-200">
          <p className="font-mono text-[11.5px] font-semibold text-rose-700">
            {error.name}: {error.message}
          </p>
          {errorInfo?.componentStack && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] font-semibold text-slate-500 hover:text-navy-900">
                Component stack
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto text-[10px] leading-relaxed whitespace-pre-wrap text-slate-500">
                {errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => this.reset()}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(106,52,240,0.7)] hover:bg-brand-500"
          >
            <RefreshCw className="size-4" />
            Try again
          </button>
          <button
            onClick={() => { window.location.href = '/' }}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-[13px] font-semibold text-navy-900 ring-1 ring-line hover:bg-slate-50"
          >
            Go to Overview
          </button>
        </div>
      </div>
    )
  }
}
