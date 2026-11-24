import { useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserRound,
  Video,
  XCircle,
} from 'lucide-react'
import { Logo } from '../components/brand/Logo'
import { Button } from '../components/ui/Button'
import { Badge, DemoTag } from '../components/ui/Badge'
import { Input, Label, Textarea } from '../components/ui/Field'
import { useApp } from '../store/AppStore'
import { employeeById } from '../data/demo'
import { cn, isoDay, longDate, timeLabel, timeRange, weekdayDate } from '../lib/utils'

type View = 'confirm' | 'unavailable' | 'another' | 'confirmed' | 'declined' | 'alternative'

const openStatuses = [
  'Invitation Sent',
  'Awaiting School Response',
  'Alternative Time Requested',
  'Confirmed',
]

export function InviteResponsePage() {
  const { token = '' } = useParams()
  const [params] = useSearchParams()
  const { appointments, updateAppointmentStatus, schoolById } = useApp()

  const appointmentId = token.startsWith('demo-') ? token.slice('demo-'.length) : ''
  const appointment = appointments.find((item) => item.id === appointmentId)

  const choice = params.get('choice')
  const initialView: View =
    choice === 'unavailable' ? 'unavailable' : choice === 'another' ? 'another' : 'confirm'
  const [view, setView] = useState<View>(initialView)
  const [note, setNote] = useState('')
  const [preferredDate, setPreferredDate] = useState(isoDay(3))
  const [preferredTime, setPreferredTime] = useState('15:00')

  const invalid = !appointment
  const closed =
    appointment && !openStatuses.includes(appointment.status)
      ? appointment.status
      : null
  const alreadyConfirmed = appointment?.status === 'Confirmed' && !choice

  function respond(next: View, status: 'Confirmed' | 'Declined' | 'Alternative Time Requested', detail?: string) {
    if (!appointment) return
    updateAppointmentStatus(appointment.id, status, detail)
    setView(next)
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-line bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-2">
            <Badge tone="navy" size="sm">
              <ShieldCheck className="size-3" />
              Secure response link
            </Badge>
            <DemoTag />
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-2xl">
          {invalid ? (
            <StateCard
              tone="rose"
              icon={<XCircle className="size-6" />}
              title="This response link is not valid"
              body="The link may be incomplete, already used, or it may have expired with the invitation. Response links are single-use and expire when the appointment hold ends."
              footer={
                <Link
                  to="/login"
                  className="text-[12px] font-semibold text-brand-600 hover:underline"
                >
                  Eduvian team sign in
                </Link>
              }
            />
          ) : appointment ? (
            <>
              <div className="mb-5 text-center">
                <p className="text-[10.5px] font-bold tracking-[0.16em] text-brand-600 uppercase">
                  Appointment response
                </p>
                <h1 className="mt-1.5 text-[24px] leading-tight font-bold text-navy-900 sm:text-[28px]">
                  {alreadyConfirmed ? 'This appointment is already confirmed' : `Hello, ${appointment.contactName}`}
                </h1>
                <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-slate-500">
                  {alreadyConfirmed
                    ? 'No further action is needed. The Eduvian team has the confirmed time on record.'
                    : 'Eduvian Solutions has proposed the appointment below. Please confirm whether it works for you — no account or login is needed.'}
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                <div className="relative overflow-hidden bg-gradient-to-br from-navy-900 to-navy-800 px-5 py-5 text-white sm:px-6">
                  <div className="pointer-events-none absolute -top-16 -right-10 size-44 rounded-full bg-brand-600/25 blur-3xl" />
                  <div className="relative">
                    <p className="text-[10px] font-bold tracking-[0.14em] text-white/40 uppercase">
                      {schoolById(appointment.schoolId)?.name ?? 'School appointment'}
                    </p>
                    <p className="mt-1.5 font-display text-[20px] font-bold">
                      {longDate(appointment.date)}
                    </p>
                    <p className="mt-0.5 text-[13px] text-white/70">
                      {timeRange(appointment.startTime, appointment.endTime)} IST
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10.5px] font-semibold">
                        {appointment.format}
                      </span>
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10.5px] font-semibold">
                        30 minutes
                      </span>
                      <span className="rounded-md bg-teal-400/15 px-2 py-0.5 text-[10.5px] font-semibold text-teal-200">
                        {appointment.purpose}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 px-5 py-5 sm:px-6">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <Detail
                      icon={appointment.format === 'Online' ? <Video className="size-3.5" /> : <MapPin className="size-3.5" />}
                      label={appointment.format === 'Online' ? 'Meeting link' : 'Location'}
                      value={appointment.location}
                    />
                    <Detail
                      icon={<UserRound className="size-3.5" />}
                      label="Eduvian representative"
                      value={`${employeeById(appointment.employeeId)?.name ?? 'Eduvian team'} · ${
                        employeeById(appointment.employeeId)?.phone ?? ''
                      }`}
                    />
                    <Detail
                      icon={<Mail className="size-3.5" />}
                      label="Contact address"
                      value={appointment.contactEmail || 'Not provided'}
                    />
                    <Detail
                      icon={<Clock3 className="size-3.5" />}
                      label="Time zone"
                      value={appointment.timezone}
                    />
                  </div>

                  {alreadyConfirmed ? (
                    <div className="rounded-xl bg-teal-50 p-4 ring-1 ring-teal-200 ring-inset">
                      <p className="flex items-center gap-2 text-[12.5px] font-semibold text-teal-800">
                        <CheckCircle2 className="size-4" />
                        Confirmed
                      </p>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-teal-700">
                        Your confirmation is on record. If something changes, reply to the invitation
                        email and the team will help.
                      </p>
                    </div>
                  ) : closed ? (
                    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-line ring-inset">
                      <p className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-700">
                        <TriangleAlert className="size-4 text-amber-500" />
                        This invitation is no longer open
                      </p>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">
                        The appointment is marked “{closed}”. Response links expire with the invitation
                        and cannot be reused. Please reply to the invitation email if you would like to
                        arrange a new time.
                      </p>
                    </div>
                  ) : view === 'confirmed' ? (
                    <SuccessPanel
                      tone="teal"
                      title="Thank you — your confirmation is recorded"
                      body={`${weekdayDate(appointment.date)} at ${timeLabel(
                        appointment.startTime,
                      )} IST is recorded in this preview session. In production the Eduvian team is notified in the workspace and a calendar invitation follows. This demo link sends no email.`}
                    />
                  ) : view === 'declined' ? (
                    <SuccessPanel
                      tone="slate"
                      title="Thank you for letting us know"
                      body="Your response is recorded in this preview session. In production the Eduvian team is notified and a follow-up is created so someone can find a better time. No further action is needed from you."
                    />
                  ) : view === 'alternative' ? (
                    <SuccessPanel
                      tone="brand"
                      title="Your preferred time is recorded"
                      body={`We have recorded ${weekdayDate(preferredDate)} at ${timeLabel(
                        preferredTime,
                      )} as your preference for this preview. In production the team would check availability and reply by email. This is a request, not a confirmed booking, and no email is sent from this demo link.`}
                    />
                  ) : view === 'unavailable' ? (
                    <div className="space-y-3 rounded-xl border border-line p-4">
                      <div>
                        <Label hint="Optional">Let the team know why</Label>
                        <Textarea
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          placeholder="For example: the time clashes with our annual day rehearsal…"
                          className="min-h-20"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            respond(
                              'declined',
                              'Declined',
                              note ? `School not available: ${note}` : 'School not available',
                            )
                          }
                        >
                          Send response
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setView('confirm')}>
                          Back
                        </Button>
                      </div>
                    </div>
                  ) : view === 'another' ? (
                    <div className="space-y-3 rounded-xl border border-line p-4">
                      <p className="text-[12px] leading-relaxed text-slate-500">
                        Suggest one or two times that suit the school. The Eduvian team will confirm
                        availability before anything is locked in.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label>Preferred date</Label>
                          <Input
                            type="date"
                            min={isoDay(1)}
                            value={preferredDate}
                            onChange={(event) => setPreferredDate(event.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Preferred start time</Label>
                          <Input
                            type="time"
                            value={preferredTime}
                            onChange={(event) => setPreferredTime(event.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <Label hint="Optional">Anything else the team should know?</Label>
                        <Textarea
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          placeholder="Access instructions, preferred contact number, other suitable days…"
                          className="min-h-20"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            respond(
                              'alternative',
                              'Alternative Time Requested',
                              `School requested ${preferredDate} at ${preferredTime}${
                                note ? ` — ${note}` : ''
                              }`,
                            )
                          }
                        >
                          Request this time
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setView('confirm')}>
                          Back
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Button
                        size="lg"
                        fullWidth
                        iconLeft={<CheckCircle2 className="size-4" />}
                        onClick={() =>
                          respond(
                            'confirmed',
                            'Confirmed',
                            'School confirmed through the secure response link (demo)',
                          )
                        }
                      >
                        Confirm this time
                      </Button>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          size="md"
                          variant="secondary"
                          onClick={() => {
                            setNote('')
                            setView('unavailable')
                          }}
                        >
                          I am not available
                        </Button>
                        <Button
                          size="md"
                          variant="secondary"
                          onClick={() => {
                            setNote('')
                            setView('another')
                          }}
                        >
                          Request another time
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2 rounded-xl bg-amber-50/70 p-3 ring-1 ring-amber-200 ring-inset">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                    <p className="text-[10.5px] leading-relaxed text-amber-900">
                      <strong className="font-semibold">Preview link.</strong> This is the school-facing
                      screen rendered with demonstration data. In production the link is unique,
                      single-use, expiring and tied to the invitation email. No calendar invitation is
                      sent in this preview.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10.5px] text-slate-400">
                <Sparkles className="size-3.5" />
                A real school would see this page without creating an account.
              </p>
            </>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-line bg-white px-4 py-4 text-center text-[10.5px] text-slate-400">
        Eduvian Solutions · Academic Mastery · Civic Empowerment · Life Skills
      </footer>
    </div>
  )
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-line bg-slate-50/60 px-3 py-2.5">
      <p className="flex items-center gap-1 text-[9.5px] font-bold tracking-[0.08em] text-slate-400 uppercase">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-[11.5px] leading-snug font-medium text-navy-900">{value}</p>
    </div>
  )
}

function SuccessPanel({
  tone,
  title,
  body,
}: {
  tone: 'teal' | 'brand' | 'slate'
  title: string
  body: string
}) {
  const styles = {
    teal: 'bg-teal-50 ring-teal-200 text-teal-800',
    brand: 'bg-brand-50 ring-brand-200 text-brand-800',
    slate: 'bg-slate-50 ring-line text-slate-700',
  }
  return (
    <div className={cn('rounded-xl p-4 ring-1 ring-inset', styles[tone])}>
      <p className="flex items-center gap-2 text-[12.5px] font-semibold">
        <CheckCircle2 className="size-4" />
        {title}
      </p>
      <p className="mt-1 text-[11.5px] leading-relaxed opacity-80">{body}</p>
    </div>
  )
}

function StateCard({
  tone,
  icon,
  title,
  body,
  footer,
}: {
  tone: 'rose'
  icon: ReactNode
  title: string
  body: string
  footer?: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <span
          className={cn(
            'mb-4 flex size-14 items-center justify-center rounded-2xl ring-1 ring-inset',
            tone === 'rose' ? 'bg-rose-50 text-rose-500 ring-rose-100' : 'bg-slate-50 text-slate-500 ring-line',
          )}
        >
          {icon}
        </span>
        <h1 className="text-[19px] font-bold text-navy-900">{title}</h1>
        <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-slate-500">{body}</p>
        {footer && <div className="mt-5">{footer}</div>}
        <p className="mt-5 text-[10.5px] text-slate-400">
          Need help? Email appointments@eduvian.in
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line bg-slate-50/60 px-5 py-3">
        <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <CalendarClock className="size-3.5" />
          Eduvian appointment responses
        </span>
        <Badge tone="amber" size="sm">
          Demo link
        </Badge>
      </div>
    </div>
  )
}
