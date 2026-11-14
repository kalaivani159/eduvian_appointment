import { Link } from 'react-router-dom'
import { ArrowLeft, Compass, Home, MessageSquareMore, Search } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl py-6">
      <Card className="overflow-hidden">
        <div className="relative overflow-hidden bg-gradient-to-br from-navy-900 to-navy-800 px-6 py-10 text-center sm:px-10">
          <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-brand-600/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-teal-500/15 blur-3xl" />
          <div className="relative">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/10 text-brand-100 ring-1 ring-white/15">
              <Compass className="size-7" />
            </span>
            <p className="mt-4 font-display text-[46px] leading-none font-extrabold text-white">404</p>
            <h1 className="mt-2 text-[19px] font-bold text-white">That page does not exist</h1>
            <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-white/55">
              The address may be mistyped, or the record it pointed to has moved. Nothing was changed.
            </p>
            <Badge tone="amber" size="sm" className="mt-4">
              UI preview
            </Badge>
          </div>
        </div>

        <div className="space-y-4 px-6 py-6 sm:px-10">
          <div className="flex flex-wrap gap-2">
            <Link
              to="/"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(106,52,240,0.7)] transition-all hover:from-brand-400 hover:to-brand-500"
            >
              <Home className="size-4" />
              Back to overview
            </Link>
            <Link
              to="/agent"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-navy-900 ring-1 ring-line transition-colors hover:bg-brand-50/60 hover:ring-brand-200"
            >
              <MessageSquareMore className="size-4" />
              Ask the agent
            </Link>
            <Link
              to="/schools"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-navy-900"
            >
              <Search className="size-4" />
              Browse schools
            </Link>
          </div>

          <div className="rounded-xl border border-line bg-slate-50/70 p-3">
            <p className="text-[11px] leading-relaxed text-slate-500">
              Tip: use <kbd className="rounded border border-line bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Ctrl</kbd>{' '}
              +{' '}
              <kbd className="rounded border border-line bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">K</kbd>{' '}
              to search pages, schools and appointments from anywhere in the workspace.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-400 hover:text-navy-800"
          >
            <ArrowLeft className="size-3.5" />
            Return to the workspace
          </Link>
        </div>
      </Card>
    </div>
  )
}
