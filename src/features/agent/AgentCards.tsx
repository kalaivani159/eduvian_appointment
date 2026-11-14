import { Component, type ReactNode, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type {
  AgentCard,
  AgentCardAction,
  AppointmentDraft,
  AppointmentFormat,
  ResearchResult,
  SummaryStatus,
  TimeSlot,
} from '../../lib/types'
import { employeeById, schoolById } from '../../data/demo'
import {
  cn,
  isValidEmail,
  isValidPhone,
  longDate,
  timeLabel,
  timeRange,
  verificationTone,
  weekdayDate,
} from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { ClassBadge, DemoTag } from '../../components/ui/Badge'
import { Input, Label, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'

export interface AgentCardHandlers {
  onStartExisting: () => void
  onStartResearch: () => void
  onSelectExistingSchool: (schoolId: string) => void
  onSelectResearchResult: (resultId: string) => void
  onVerifyContact: (resultId: string) => void
  onChooseContact: (schoolId: string, contactId: string) => void
  onChooseDate: (date: string) => void
  onChooseSlot: (start: string, end: string, date: string) => void
  onConfirmSend: (draft: AppointmentDraft) => void
  onEditDraft: (patch: Partial<AppointmentDraft>) => Promise<{ ok: boolean; error?: string }>
  onChangeTime: () => void
  onConfirmContact: () => void
  onStartContactReplacement: () => void
  onSubmitContact: (details: {
    name: string
    designation: string
    email: string
    phone: string
  }) => void
  onRetry: (action?: AgentCardAction) => void
}

type Handlers = AgentCardHandlers

/* ---- Error boundary so a card crash shows a recoverable message, not a blank ---- */
interface CardBoundaryState { error: string | null }
class CardErrorBoundary extends Component<{ children: ReactNode }, CardBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: unknown): CardBoundaryState {
    return { error: String(error) }
  }
  override render() {
    if (this.state.error) {
      return (
        <div className="mt-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          <strong>Card render error:</strong> {this.state.error}
        </div>
      )
    }
    return this.props.children
  }
}

const statusTone: Record<SummaryStatus, string> = {
  'Awaiting Your Confirmation': 'bg-brand-50 text-brand-700 ring-brand-200',
  'Pending Approval': 'bg-amber-50 text-amber-700 ring-amber-200',
  'Ready to Send': 'bg-teal-50 text-teal-700 ring-teal-200',
  Sending: 'bg-sky-50 text-sky-700 ring-sky-200',
  Sent: 'bg-teal-50 text-teal-700 ring-teal-200',
  Failed: 'bg-rose-50 text-rose-700 ring-rose-200',
}

function StatusBadge({ status }: { status: SummaryStatus }) {
  return (
    <span
      className={cn(
        'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide uppercase ring-1',
        statusTone[status],
      )}
    >
      {status === 'Awaiting Your Confirmation' && <Sparkles className="size-2.5" />}
      {status === 'Pending Approval' && <ShieldCheck className="size-2.5" />}
      {(status === 'Ready to Send' || status === 'Sent') && <CheckCircle2 className="size-2.5" />}
      {status === 'Failed' && <AlertTriangle className="size-2.5" />}
      {status}
    </span>
  )
}

export function AgentCardView({ card, handlers }: { card: AgentCard; handlers: Handlers }) {
  return (
    <CardErrorBoundary>
      <AgentCardInner card={card} handlers={handlers} />
    </CardErrorBoundary>
  )
}

function AgentCardInner({ card, handlers }: { card: AgentCard; handlers: Handlers }) {
  switch (card.kind) {
    case 'workflow-choice':
      return (
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          <button
            onClick={handlers.onStartExisting}
            className="group rounded-xl border border-line bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <CalendarPlus className="size-4" />
            </span>
            <span className="mt-2.5 block text-[12.5px] font-bold text-navy-900">Book appointment</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
              School already in your records
            </span>
            <span className="mt-2 flex items-center gap-1 text-[10.5px] font-bold tracking-wide text-brand-600 uppercase">
              Workflow 1
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
          <button
            onClick={handlers.onStartResearch}
            className="group rounded-xl border border-line bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-card"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 ring-1 ring-teal-100">
              <Search className="size-4" />
            </span>
            <span className="mt-2.5 block text-[12.5px] font-bold text-navy-900">Research &amp; book</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
              Find a new school, verify contacts, then book
            </span>
            <span className="mt-2 flex items-center gap-1 text-[10.5px] font-bold tracking-wide text-teal-600 uppercase">
              Workflow 2
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        </div>
      )

    case 'existing-schools':
      return (
        <div className="mt-1 space-y-1.5">
          {card.schoolIds.map((schoolId) => {
            const school = schoolById(schoolId)
            if (!school) return null
            return (
              <button
                key={schoolId}
                onClick={() => handlers.onSelectExistingSchool(schoolId)}
                className="group flex w-full items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 text-left transition-all hover:border-brand-300 hover:bg-brand-50/30"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-brand-100 group-hover:text-brand-600">
                  <GraduationCap className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-navy-900">
                    {school.name}
                  </span>
                  <span className="block truncate text-[10.5px] text-slate-400">
                    {school.type} · {school.city} · {school.contacts.length} contact
                    {school.contacts.length > 1 ? 's' : ''}
                  </span>
                </span>
                <ClassBadge className={verificationTone(school.verification)} size="sm">
                  {school.verification === 'verified'
                    ? 'Verified'
                    : school.verification === 'needs-review'
                      ? 'Review'
                      : 'Unverified'}
                </ClassBadge>
                <ArrowRight className="size-3.5 shrink-0 text-slate-300 group-hover:text-brand-500" />
              </button>
            )
          })}
        </div>
      )

    case 'school-results':
      return (
        <div className="mt-1 space-y-2">
          {card.results.map((result) => (
            <ResearchCard
              key={result.id}
              result={result}
              onSelect={handlers.onSelectResearchResult}
              onVerify={handlers.onVerifyContact}
            />
          ))}
          <p className="flex items-start gap-1.5 px-0.5 pt-1 text-[10.5px] leading-relaxed text-slate-400">
            <ShieldAlert className="mt-0.5 size-3 shrink-0" />
            Contact details are never guessed. Anything marked unverified or review requires your
            confirmation before an invitation can be prepared.
          </p>
        </div>
      )

    case 'contact': {
      const school = schoolById(card.schoolId)
      if (!school) return null
      return (
        <div className="mt-1 space-y-1.5">
          {school.contacts.map((contact) => (
            <div
              key={contact.id}
              className="rounded-xl border border-line bg-white p-3 transition-colors hover:border-brand-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-navy-700 to-navy-900 text-white">
                    <UserRound className="size-4" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-semibold text-navy-900">{contact.name}</p>
                    <p className="text-[11px] text-slate-500">{contact.designation}</p>
                  </div>
                </div>
                <ClassBadge className={verificationTone(contact.verification)} size="sm">
                  {contact.verification === 'verified' ? 'Verified' : 'Review needed'}
                </ClassBadge>
              </div>
              <div className="mt-2.5 space-y-1">
                <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Mail className="size-3 text-slate-400" />
                  {contact.email || <span className="text-rose-500">No email on record</span>}
                </p>
                <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Phone className="size-3 text-slate-400" />
                  {contact.phone}
                </p>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="truncate text-[10px] text-slate-400">{contact.source}</span>
                <Button
                  size="xs"
                  variant={contact.verification === 'verified' ? 'primary' : 'secondary'}
                  onClick={() => handlers.onChooseContact(school.id, contact.id)}
                  iconRight={<ArrowRight className="size-3" />}
                >
                  Use this contact
                </Button>
              </div>
            </div>
          ))}
        </div>
      )
    }

    case 'contact-confirm': {
      const { contact } = card
      const emailOk = isValidEmail(contact.email)
      const phoneOk = isValidPhone(contact.phone)
      return (
        <div className="mt-1 overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex items-center gap-2 border-b border-line bg-gradient-to-r from-brand-50 to-white px-3 py-2">
            <UserRound className="size-4 text-brand-600" />
            <span className="text-[12px] font-semibold text-navy-900">
              {card.mode === 'replacement' ? 'Confirm replacement contact' : 'Confirm contact details'}
            </span>
            <ClassBadge
              className={contact.verified ? 'text-teal-700 bg-teal-50 ring-teal-200' : 'text-amber-700 bg-amber-50 ring-amber-200'}
              size="sm"
            >
              {contact.verified ? 'Verified' : 'Awaiting your confirmation'}
            </ClassBadge>
          </div>
          <div className="space-y-2 p-3">
            {card.mode === 'replacement' && card.previousName && (
              <p className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10.5px] text-slate-500 ring-1 ring-line ring-inset">
                Replacing <strong className="font-semibold text-navy-800">{card.previousName}</strong> on
                this invitation only. The school record is not overwritten.
              </p>
            )}
            <div>
              <p className="text-[12.5px] font-semibold text-navy-900">{contact.name || 'Name missing'}</p>
              <p className="text-[11px] text-slate-500">{contact.designation || 'Designation missing'}</p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Mail className="size-3 text-slate-400" />
                {contact.email || <span className="text-rose-500">No email provided</span>}
              </p>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Phone className="size-3 text-slate-400" />
                {contact.phone || <span className="text-rose-500">No phone provided</span>}
              </p>
              <p className="text-[10px] text-slate-400">
                Source: {contact.source === 'employee' ? 'Provided by you' : contact.source === 'research' ? 'Research result' : 'Existing school record'}
              </p>
            </div>
            {(!emailOk || !phoneOk) && (
              <p className="flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10.5px] text-rose-700 ring-1 ring-rose-200 ring-inset">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                A valid official email and phone are required before an invitation can be prepared.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <Button
                size="sm"
                onClick={handlers.onConfirmContact}
                disabled={!emailOk || !phoneOk}
                iconLeft={<Check className="size-3.5" />}
              >
                {card.mode === 'replacement' ? 'Use these details' : 'These details are correct'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handlers.onStartContactReplacement}
                iconLeft={<Pencil className="size-3.5" />}
              >
                {card.mode === 'replacement' ? 'Edit contact' : 'Replace contact'}
              </Button>
            </div>
          </div>
        </div>
      )
    }

    case 'contact-form':
      return <ContactFormCard schoolName={card.schoolName} reason={card.reason} onSubmit={handlers.onSubmitContact} />

    case 'date-picker':
      return <DatePickerCard card={card} onChooseDate={handlers.onChooseDate} />

    case 'slots':
      return (
        <div className="mt-1 rounded-xl border border-line bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
            <p className="text-[12px] font-semibold text-navy-900">
              {weekdayDate(card.date)} · {card.timezone}
            </p>
            <span className="flex items-center gap-1 text-[10.5px] text-slate-400">
              <Clock3 className="size-3" />
              {card.durationMinutes} min · {card.bufferMinutes} min buffer
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {card.slots.map((slot: TimeSlot) => (
              <button
                key={slot.start}
                type="button"
                disabled={!slot.available}
                onClick={() => handlers.onChooseSlot(slot.start, slot.end, card.date)}
                className={cn(
                  'rounded-lg border px-2 py-1.5 text-center transition-all',
                  slot.available
                    ? 'border-line bg-white hover:-translate-y-px hover:border-brand-400 hover:bg-brand-50 hover:shadow-sm'
                    : 'cursor-not-allowed border-dashed border-slate-200 bg-slate-50',
                )}
              >
                <span
                  className={cn(
                    'block text-[11.5px] font-semibold',
                    slot.available ? 'text-navy-900' : 'text-slate-400 line-through',
                  )}
                >
                  {timeLabel(slot.start)}
                </span>
                <span className="block text-[9.5px] text-slate-400">
                  {slot.available ? 'Available' : slot.reason}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <Check className="size-3 text-teal-500" />
              Working hours {card.workingHours} · lunch break, buffers and existing holds excluded
            </p>
            <button
              type="button"
              onClick={handlers.onChangeTime}
              className="text-[10.5px] font-semibold text-brand-600 hover:text-brand-700"
            >
              Try another date
            </button>
          </div>
        </div>
      )

    case 'summary':
      return <SummaryCard card={card} handlers={handlers} />

    case 'approval':
      return (
        <div className="mt-1 overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex items-center gap-2 border-b border-line bg-amber-50/70 px-3 py-2">
            <ShieldCheck className="size-4 text-amber-600" />
            <span className="text-[12px] font-semibold text-amber-900">Pending management approval</span>
            <span className="ml-auto rounded-md bg-white px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide text-amber-700 uppercase ring-1 ring-amber-200">
              Not sent
            </span>
          </div>
          <div className="p-3">
            <SummaryGrid draft={card.draft} />
            <div className="mt-2.5 rounded-lg bg-slate-50 p-2.5 ring-1 ring-line ring-inset">
              <p className="text-[10.5px] leading-relaxed text-slate-500">
                This invitation is saved as{' '}
                <strong className="font-semibold text-navy-800">Pending Approval</strong> and management
                has been notified in the workspace. No email has been sent — the email provider is not
                connected in this preview.
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {card.appointmentId && (
                <Link
                  to={`/appointments/${card.appointmentId}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line py-1.5 text-[11px] font-semibold text-navy-700 hover:border-brand-200 hover:bg-brand-50/40"
                >
                  Open appointment <ArrowRight className="size-3" />
                </Link>
              )}
              <Link
                to="/approvals"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line py-1.5 text-[11px] font-semibold text-navy-700 hover:border-brand-200 hover:bg-brand-50/40"
              >
                Approval queue <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      )

    case 'invitation':
      return (
        <div className="mt-1 overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex items-center gap-2 border-b border-line bg-gradient-to-r from-teal-50 to-white px-3 py-2">
            <Send className="size-4 text-teal-600" />
            <span className="text-[12px] font-semibold text-navy-900">Invitation prepared</span>
            <span className="ml-auto">
              <StatusBadge status={card.status} />
            </span>
          </div>
          <div className="p-3">
            <SummaryGrid draft={card.draft} />
            <p className="mt-2.5 rounded-lg bg-teal-50/60 px-2.5 py-2 text-[10.5px] leading-relaxed text-teal-900 ring-1 ring-teal-200 ring-inset">
              {card.detail}
            </p>
            {card.appointmentId && (
              <Link
                to={`/appointments/${card.appointmentId}`}
                className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-line py-1.5 text-[11px] font-semibold text-navy-700 hover:border-brand-200 hover:bg-brand-50/40"
              >
                Open appointment <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
        </div>
      )

    case 'sent':
      return (
        <div className="mt-1 rounded-xl border border-line bg-white p-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <Send className="size-3.5" />
            </span>
            <p className="text-[12px] font-semibold text-navy-900">Invitation prepared</p>
            <DemoTag className="ml-auto" />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            Preview only — this interface does not send email. With the email provider connected, the
            school would receive a single email containing three secure response options.
          </p>
        </div>
      )

    case 'confirmed':
      return (
        <div className="mt-1 overflow-hidden rounded-xl border border-teal-200 bg-teal-50/60">
          <div className="flex items-center gap-2 border-b border-teal-200/70 px-3 py-2">
            <CheckCircle2 className="size-4 text-teal-600" />
            <span className="text-[12px] font-semibold text-teal-900">Appointment confirmed</span>
          </div>
          <div className="p-3">
            <p className="text-[11.5px] leading-relaxed text-teal-800">
              {card.draft.schoolName} confirmed {weekdayDate(card.draft.date)} at{' '}
              {timeLabel(card.draft.startTime)}. The response was recorded through the school response
              link; calendar sync is not connected in this preview.
            </p>
          </div>
        </div>
      )

    case 'error':
      return (
        <div className="mt-1 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60">
          <div className="flex items-center gap-2 px-3 py-2">
            <AlertTriangle className="size-4 text-amber-600" />
            <span className="text-[12px] font-semibold text-amber-900">{card.title}</span>
          </div>
          <div className="px-3 pb-2.5">
            <p className="text-[11px] leading-relaxed text-amber-800">{card.detail}</p>
            {card.retryLabel && (
              <Button
                size="xs"
                variant="secondary"
                className="mt-2"
                onClick={() => handlers.onRetry(card.action)}
                iconLeft={<RefreshCw className="size-3" />}
              >
                {card.retryLabel}
              </Button>
            )}
          </div>
        </div>
      )

    default:
      return null
  }
}

/* ------------------------------- sub-components ------------------------------- */

function ResearchCard({
  result,
  onSelect,
  onVerify,
}: {
  result: ResearchResult
  onSelect: (id: string) => void
  onVerify: (id: string) => void
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-3 transition-all',
        result.selected ? 'border-brand-300 ring-2 ring-brand-100' : 'border-line hover:border-brand-200',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-navy-900">
            {result.name}
            {result.duplicateOf && (
              <span className="rounded bg-rose-50 px-1 py-0.5 text-[9px] font-bold text-rose-600 ring-1 ring-rose-200">
                POSSIBLE DUPLICATE
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[10.5px] text-slate-400">
            {result.type} · {result.city}
          </p>
        </div>
        <ClassBadge className={verificationTone(result.verification)} size="sm">
          {result.verification === 'verified'
            ? 'Verified'
            : result.verification === 'needs-review'
              ? 'Needs review'
              : 'Unverified'}
        </ClassBadge>
      </div>

      <div className="mt-2 space-y-1">
        <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
          <MapPin className="mt-0.5 size-3 shrink-0 text-slate-400" />
          {result.address}
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <UserRound className="size-3 text-slate-400" />
          {result.contactName} · {result.contactDesignation}
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Mail className="size-3 text-slate-400" />
          {result.contactEmail || <span className="text-rose-500">Not found — do not guess</span>}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
        <span className="truncate text-[9.5px] text-slate-400">{result.source}</span>
        <div className="flex items-center gap-1.5">
          {result.verification !== 'verified' && (
            <Button
              size="xs"
              variant="secondary"
              onClick={() => onVerify(result.id)}
              iconLeft={<BadgeCheck className="size-3" />}
            >
              Verify
            </Button>
          )}
          <Button size="xs" onClick={() => onSelect(result.id)} iconRight={<ArrowRight className="size-3" />}>
            Select
          </Button>
        </div>
      </div>
    </div>
  )
}

function DatePickerCard({
  card,
  onChooseDate,
}: {
  card: Extract<AgentCard, { kind: 'date-picker' }>
  onChooseDate: (date: string) => void
}) {
  const [date, setDate] = useState('')

  return (
    <div className="mt-1 rounded-xl border border-line bg-white p-3">
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <CalendarDays className="size-4 text-brand-600" />
        <p className="text-[12px] font-semibold text-navy-900">Choose an appointment date</p>
        <span className="ml-auto text-[10px] text-slate-400">IST</span>
      </div>

      {card.reason && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10.5px] leading-relaxed text-amber-800 ring-1 ring-amber-200 ring-inset">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          {card.reason}
        </p>
      )}

      <p className="mt-2 text-[10.5px] text-slate-500">
        Eligible days: <span className="font-semibold text-navy-800">{card.workingDaysLabel}</span>
      </p>

      {card.suggestions.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {card.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onChooseDate(suggestion)}
              className="rounded-lg border border-line bg-white px-2 py-1.5 text-center transition-all hover:-translate-y-px hover:border-brand-400 hover:bg-brand-50 hover:shadow-sm"
            >
              <span className="block text-[11px] font-semibold text-navy-900">
                {weekdayDate(suggestion)}
              </span>
              <span className="block text-[9.5px] text-slate-400">Next eligible</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-end gap-2">
        <div className="min-w-[150px] flex-1">
          <Label htmlFor={`date-${card.minDate}`}>Or pick a date</Label>
          <Input
            id={`date-${card.minDate}`}
            type="date"
            min={card.minDate}
            max={card.maxDate}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <Button
          size="sm"
          onClick={() => onChooseDate(date)}
          disabled={!date}
          iconLeft={<CalendarDays className="size-3.5" />}
        >
          Check availability
        </Button>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
        Past dates, Sundays, configured holidays and blocked dates are rejected. Availability is checked
        before any time is offered.
      </p>
    </div>
  )
}

function ContactFormCard({
  schoolName,
  reason,
  onSubmit,
}: {
  schoolName: string
  reason?: string
  onSubmit: Handlers['onSubmitContact']
}) {
  const [form, setForm] = useState({ name: '', designation: '', email: '', phone: '' })
  const [error, setError] = useState('')

  function submit() {
    const problems: string[] = []
    if (form.name.trim().length < 2) problems.push('full name')
    if (form.designation.trim().length < 2) problems.push('designation')
    if (!isValidEmail(form.email)) problems.push('valid official email')
    if (!isValidPhone(form.phone)) problems.push('valid phone number')
    if (problems.length) {
      setError(`Enter a ${problems.join(', ')}.`)
      return
    }
    setError('')
    onSubmit({
      name: form.name.trim(),
      designation: form.designation.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    })
  }

  return (
    <div className="mt-1 rounded-xl border border-line bg-white p-3">
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <UserRound className="size-4 text-brand-600" />
        <p className="text-[12px] font-semibold text-navy-900">Replace contact</p>
        <span className="ml-auto truncate text-[10px] text-slate-400">{schoolName}</span>
      </div>
      {reason && <p className="mt-2 text-[10.5px] leading-relaxed text-amber-800">{reason}</p>}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div>
          <Label required>Full name</Label>
          <Input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="e.g. R. Kumar"
          />
        </div>
        <div>
          <Label required>Designation</Label>
          <Input
            value={form.designation}
            onChange={(event) => setForm({ ...form, designation: event.target.value })}
            placeholder="e.g. Correspondent"
          />
        </div>
        <div>
          <Label required>Official email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="name@school.edu.in"
          />
        </div>
        <div>
          <Label required>Phone</Label>
          <Input
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            placeholder="+91 98400 12345"
          />
        </div>
      </div>
      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-[10.5px] text-rose-600">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          {error}
        </p>
      )}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] leading-relaxed text-slate-400">
          Applied to this invitation only. The school record is not overwritten.
        </p>
        <Button size="sm" onClick={submit} iconLeft={<Check className="size-3.5" />}>
          Validate contact
        </Button>
      </div>
    </div>
  )
}

function SummaryGrid({ draft }: { draft: AppointmentDraft }) {
  const school = schoolById(draft.schoolId)
  const employee = employeeById(draft.employeeId)
  const online = draft.format === 'Online'

  const rows: { label: string; value: string }[] = [
    { label: 'School', value: draft.schoolName },
    { label: 'Contact', value: `${draft.contactName} · ${draft.contactDesignation}` },
    { label: 'Official email', value: draft.contactEmail || 'Not verified' },
    ...(draft.contactPhone ? [{ label: 'Phone', value: draft.contactPhone }] : []),
    { label: 'Assigned to', value: employee?.name ?? 'Unassigned' },
    { label: 'Date', value: longDate(draft.date) },
    { label: 'Time', value: `${timeRange(draft.startTime, draft.endTime)} IST` },
    { label: 'Format', value: draft.format },
    online
      ? {
          label: 'Meeting link',
          value: draft.meetingLink || 'Generated after the school confirms',
        }
      : {
          label: 'Visit location',
          value: school?.address || draft.location || 'School address unavailable',
        },
    ...(draft.purpose ? [{ label: 'Purpose', value: draft.purpose }] : []),
  ]

  return (
    <dl className="grid grid-cols-1 gap-x-3 gap-y-1.5 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="text-[9.5px] font-bold tracking-[0.08em] text-slate-400 uppercase">
            {row.label}
          </dt>
          <dd className="truncate text-[11.5px] font-medium text-navy-900">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function SummaryCard({
  card,
  handlers,
}: {
  card: Extract<AgentCard, { kind: 'summary' }>
  handlers: Handlers
}) {
  const status = card.status ?? 'Awaiting Your Confirmation'
  const actionable = status === 'Awaiting Your Confirmation'
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <div className="mt-1 overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex items-center gap-2 border-b border-line bg-gradient-to-r from-brand-50 to-white px-3 py-2">
          <CalendarCheck2 className="size-4 text-brand-600" />
          <span className="text-[12px] font-semibold text-navy-900">Appointment summary</span>
          <span className="ml-auto">
            <StatusBadge status={status} />
          </span>
        </div>
        <div className="p-3">
          <SummaryGrid draft={card.draft} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => handlers.onConfirmSend(card.draft)}
              disabled={!actionable}
              iconLeft={<Send className="size-3.5" />}
            >
              Confirm &amp; prepare email
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditOpen(true)}
              disabled={!actionable}
              iconLeft={<Pencil className="size-3.5" />}
            >
              Edit details
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handlers.onChangeTime}
              disabled={!actionable}
              iconLeft={<Clock3 className="size-3.5" />}
            >
              Change time
            </Button>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
            Sending requires your explicit confirmation. If the invitation needs approval, it is saved
            for management and the school receives nothing until it is approved.
          </p>
        </div>
      </div>

      <EditDraftModal
        open={editOpen}
        draft={card.draft}
        onClose={() => setEditOpen(false)}
        onSave={handlers.onEditDraft}
      />
    </>
  )
}

function EditDraftModal({
  open,
  draft,
  onClose,
  onSave,
}: {
  open: boolean
  draft: AppointmentDraft
  onClose: () => void
  onSave: Handlers['onEditDraft']
}) {
  const [form, setForm] = useState({
    contactName: draft.contactName,
    contactDesignation: draft.contactDesignation,
    contactEmail: draft.contactEmail,
    contactPhone: draft.contactPhone ?? '',
    format: draft.format,
    purpose: draft.purpose ?? '',
    date: draft.date,
    startTime: draft.startTime,
    meetingLink: draft.meetingLink ?? '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({
      contactName: draft.contactName,
      contactDesignation: draft.contactDesignation,
      contactEmail: draft.contactEmail,
      contactPhone: draft.contactPhone ?? '',
      format: draft.format,
      purpose: draft.purpose ?? '',
      date: draft.date,
      startTime: draft.startTime,
      meetingLink: draft.meetingLink ?? '',
    })
    setError('')
  }, [open, draft])

  async function save() {
    const problems: string[] = []
    if (!form.contactName.trim()) problems.push('contact name')
    if (!isValidEmail(form.contactEmail)) problems.push('valid official email')
    if (!isValidPhone(form.contactPhone)) problems.push('valid phone number')
    if (!form.date) problems.push('date')
    if (!form.startTime) problems.push('start time')
    if (problems.length) {
      setError(`Enter a ${problems.join(', ')}.`)
      return
    }

    setSaving(true)
    const result = await onSave({
      contactName: form.contactName.trim(),
      contactDesignation: form.contactDesignation.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim(),
      format: form.format as AppointmentFormat,
      purpose: form.purpose.trim() || undefined,
      date: form.date,
      startTime: form.startTime,
      meetingLink:
        form.format === 'Online' && form.meetingLink.trim() ? form.meetingLink.trim() : undefined,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error ?? 'Could not update the draft.')
      return
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit appointment details"
      description="Changes are revalidated against the scheduling policy and shown again for your confirmation. Nothing is sent automatically."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void save()} loading={saving} iconLeft={<Check className="size-3.5" />}>
            Save and revalidate
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label required>Contact name</Label>
            <Input
              value={form.contactName}
              onChange={(event) => setForm({ ...form, contactName: event.target.value })}
            />
          </div>
          <div>
            <Label>Designation</Label>
            <Input
              value={form.contactDesignation}
              onChange={(event) => setForm({ ...form, contactDesignation: event.target.value })}
            />
          </div>
          <div>
            <Label required>Official email</Label>
            <Input
              type="email"
              value={form.contactEmail}
              onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
            />
          </div>
          <div>
            <Label required>Phone</Label>
            <Input
              value={form.contactPhone}
              onChange={(event) => setForm({ ...form, contactPhone: event.target.value })}
            />
          </div>
          <div>
            <Label required>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />
          </div>
          <div>
            <Label required>Start time</Label>
            <Input
              type="time"
              value={form.startTime}
              onChange={(event) => setForm({ ...form, startTime: event.target.value })}
            />
          </div>
          <div>
            <Label>Format</Label>
            <Select
              value={form.format}
              onChange={(event) =>
                setForm({ ...form, format: event.target.value as AppointmentFormat })
              }
            >
              <option value="In-person">In-person</option>
              <option value="Online">Online</option>
            </Select>
          </div>
          <div>
            <Label hint="Optional">Meeting link</Label>
            <Input
              value={form.meetingLink}
              onChange={(event) => setForm({ ...form, meetingLink: event.target.value })}
              placeholder="Only if one already exists"
              disabled={form.format !== 'Online'}
            />
          </div>
        </div>
        <div>
          <Label>Purpose</Label>
          <Textarea
            rows={2}
            value={form.purpose}
            onChange={(event) => setForm({ ...form, purpose: event.target.value })}
            placeholder="What will you discuss?"
          />
        </div>
        {error && (
          <p className="flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] text-rose-700 ring-1 ring-rose-200 ring-inset">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
