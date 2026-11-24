import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Mail,
  Search,
  Send,
  Sparkles,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import { PageHeader, Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, ClassBadge, DemoTag } from '../components/ui/Badge'
import { Input, Label, SegmentedControl, Select, Textarea } from '../components/ui/Field'
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/Avatar'
import { UserChip } from '../components/layout/Topbar'
import { useApp, type NewAppointmentInput } from '../store/AppStore'
import { DEMO_EMPLOYEE_ID, employeeById } from '../data/demo'
import {
  generateSlots,
  suggestDates,
  validateDate,
} from '../lib/scheduling'
import {
  appointmentStatusTone,
  cn,
  emailStatusTone,
  isoDay,
  shortDate,
  timeLabel,
  timeRange,
  weekdayDate,
} from '../lib/utils'
import type { AppointmentFormat, AppointmentStatus } from '../lib/types'

const groups = {
  all: () => true,
  open: (status: AppointmentStatus) =>
    ['Invitation Sent', 'Awaiting School Response', 'Alternative Time Requested', 'Invitation Sending'].includes(status),
  action: (status: AppointmentStatus) =>
    ['Pending Approval', 'Pending Employee Confirmation', 'Failed', 'Alternative Time Requested'].includes(status),
  confirmed: (status: AppointmentStatus) => status === 'Confirmed',
  closed: (status: AppointmentStatus) =>
    ['Declined', 'Cancelled', 'Expired', 'Rescheduled'].includes(status),
}

export function AppointmentsPage() {
  const { appointments, user, isAdmin, schoolById } = useApp()
  const [group, setGroup] = useState<keyof typeof groups>('all')
  const [query, setQuery] = useState('')
  const [owner, setOwner] = useState('all')
  const [format, setFormat] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()

  const mine = appointments.filter((appointment) => isAdmin || appointment.employeeId === user?.id)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return mine
      .filter((appointment) => groups[group](appointment.status))
      .filter((appointment) => {
        if (owner !== 'all' && appointment.employeeId !== owner) return false
        if (format !== 'all' && appointment.format !== format) return false
        if (!q) return true
        const school = schoolById(appointment.schoolId)
        return (
          school?.name.toLowerCase().includes(q) ||
          appointment.contactName.toLowerCase().includes(q) ||
          appointment.contactEmail.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`))
  }, [mine, group, owner, format, query, schoolById])

  const counts = {
    all: mine.length,
    open: mine.filter((appointment) => groups.open(appointment.status)).length,
    action: mine.filter((appointment) => groups.action(appointment.status)).length,
    confirmed: mine.filter((appointment) => groups.confirmed(appointment.status)).length,
    closed: mine.filter((appointment) => groups.closed(appointment.status)).length,
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Appointments"
        description="Every outbound Eduvian → school appointment, with its full status history, email state and calendar link."
        action={
          <Button size="md" iconLeft={<CalendarPlus className="size-4" />} onClick={() => setCreateOpen(true)}>
            New appointment
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total appointments', value: counts.all, icon: CalendarClock, tone: 'brand' },
          { label: 'Awaiting school response', value: counts.open, icon: Clock3, tone: 'amber' },
          { label: 'Needs your action', value: counts.action, icon: TriangleAlert, tone: 'rose' },
          { label: 'Confirmed', value: counts.confirmed, icon: CheckCircle2, tone: 'teal' },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
            <span
              className={cn(
                'flex size-9 items-center justify-center rounded-xl ring-1 ring-inset',
                stat.tone === 'brand' && 'bg-brand-50 text-brand-600 ring-brand-100',
                stat.tone === 'amber' && 'bg-amber-50 text-amber-600 ring-amber-100',
                stat.tone === 'rose' && 'bg-rose-50 text-rose-600 ring-rose-100',
                stat.tone === 'teal' && 'bg-teal-50 text-teal-600 ring-teal-100',
              )}
            >
              <stat.icon className="size-4.5" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-navy-900">{stat.value}</p>
              <p className="text-[11.5px] text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <SegmentedControl
            value={group}
            onChange={setGroup}
            options={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'open', label: 'Awaiting', count: counts.open },
              { value: 'action', label: 'Action', count: counts.action },
              { value: 'confirmed', label: 'Confirmed', count: counts.confirmed },
              { value: 'closed', label: 'Closed', count: counts.closed },
            ]}
          />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="min-w-[190px]">
              <Input
                iconLeft={<Search className="size-4" />}
                placeholder="School, contact or email…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Select value={format} onChange={(event) => setFormat(event.target.value)} className="w-auto min-w-[130px]">
              <option value="all">All formats</option>
              <option value="In-person">In-person</option>
              <option value="Online">Online</option>
            </Select>
            {isAdmin && (
              <Select value={owner} onChange={(event) => setOwner(event.target.value)} className="w-auto min-w-[150px]">
                <option value="all">All employees</option>
                {['emp-1', 'emp-2', 'emp-3'].map((id) => (
                  <option key={id} value={id}>
                    {employeeById(id)?.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="size-5" />}
            title="No appointments in this view"
            description="Adjust the filters, or create a new appointment with the agent."
            action={
              <Button size="sm" variant="secondary" onClick={() => setCreateOpen(true)}>
                New appointment
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <TH>School &amp; contact</TH>
              <TH>Date &amp; time</TH>
              <TH>Format</TH>
              <TH>Status</TH>
              <TH>Email</TH>
              {isAdmin && <TH>Owner</TH>}
              <TH />
            </THead>
            <TBody>
              {filtered.map((appointment) => {
                const school = schoolById(appointment.schoolId)
                return (
                  <TR key={appointment.id} onClick={() => navigate(`/appointments/${appointment.id}`)}>
                    <TD>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-navy-900">
                          {school?.name}
                          <DemoTag />
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {appointment.contactName} · {appointment.contactDesignation}
                        </p>
                      </div>
                    </TD>
                    <TD>
                      <span className="block text-[12.5px] font-medium text-navy-800">
                        {weekdayDate(appointment.date)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {timeRange(appointment.startTime, appointment.endTime)} IST
                      </span>
                    </TD>
                    <TD>
                      <Badge tone="slate" size="sm">
                        {appointment.format}
                      </Badge>
                    </TD>
                    <TD>
                      <ClassBadge className={appointmentStatusTone(appointment.status)} size="sm">
                        {appointment.status}
                      </ClassBadge>
                    </TD>
                    <TD>
                      <ClassBadge className={emailStatusTone(appointment.emailStatus)} size="sm">
                        {appointment.emailStatus}
                      </ClassBadge>
                    </TD>
                    {isAdmin && (
                      <TD>
                        <UserChip employeeId={appointment.employeeId} size="xs" />
                      </TD>
                    )}
                    <TD align="right">
                      <Link
                        to={`/appointments/${appointment.id}`}
                        className="text-[11.5px] font-semibold text-brand-600 hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Open
                      </Link>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-[11.5px] text-slate-400">
          <span>{filtered.length} appointments shown · all times IST</span>
          <span>Appointment → school only. No school-initiated booking exists.</span>
        </div>
      </Card>

      <CreateAppointmentModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}

function CreateAppointmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { appointments, createAppointment, pushToast, schedulingPolicy, user, schools } = useApp()
  const navigate = useNavigate()
  const employeeId = user?.id ?? DEMO_EMPLOYEE_ID
  const eligible = schools.filter((school) => school.contacts.some((contact) => contact.verification === 'verified'))
  const [schoolId, setSchoolId] = useState(eligible[0]?.id ?? schools[0].id)
  const school = schools.find((item) => item.id === schoolId)
  const [contactId, setContactId] = useState(school?.contacts[0]?.id ?? '')
  const [date, setDate] = useState(
    () => suggestDates(schedulingPolicy, appointments, employeeId, isoDay(0), 1)[0] ?? isoDay(1),
  )
  const [start, setStart] = useState('')
  const [format, setFormat] = useState<AppointmentFormat>('In-person')
  const [purpose, setPurpose] = useState('Civic curriculum walkthrough')
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState('')

  const contact = school?.contacts.find((item) => item.id === contactId) ?? school?.contacts[0]

  const dateCheck = useMemo(
    () => validateDate(date, schedulingPolicy, appointments, employeeId),
    [date, schedulingPolicy, appointments, employeeId],
  )
  const slots = useMemo(
    () => (dateCheck.ok ? generateSlots(date, schedulingPolicy, appointments, employeeId) : []),
    [dateCheck.ok, date, schedulingPolicy, appointments, employeeId],
  )
  const available = slots.filter((slot) => slot.available)
  const selectedSlot = slots.find((slot) => slot.start === start && slot.available)

  function pickDate(next: string) {
    setDate(next)
    setStart('')
    setChecked(false)
    setError('')
  }

  function submit() {
    if (!school || !contact) return
    if (!dateCheck.ok) {
      setError(dateCheck.message ?? 'Choose an eligible working day.')
      return
    }
    if (!selectedSlot) {
      setError('Choose an available time slot before creating the draft.')
      return
    }
    setError('')
    const input: NewAppointmentInput = {
      schoolId: school.id,
      contactId: contact.id,
      contactName: contact.name,
      contactDesignation: contact.designation,
      contactEmail: contact.email,
      date,
      startTime: selectedSlot.start,
      endTime: selectedSlot.end,
      format,
      location: format === 'Online' ? 'Online · meeting link pending' : school.address,
      purpose,
      workflow: school.isNewResearch ? 'research' : 'existing',
    }
    const created = createAppointment(input)
    onClose()
    pushToast({
      tone: 'success',
      title: 'Appointment draft created',
      description: 'Review the details and prepare the invitation. Nothing has been emailed.',
    })
    navigate(`/appointments/${created.id}`)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New appointment"
      description="Existing-school booking. The date is validated against the scheduling policy before any time is offered."
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={!checked || !contact?.email || !dateCheck.ok || !selectedSlot}
          >
            Create draft
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label required>School</Label>
          <Select
            value={schoolId}
            onChange={(event) => {
              setSchoolId(event.target.value)
              const next = schools.find((item) => item.id === event.target.value)
              setContactId(next?.contacts[0]?.id ?? '')
              setChecked(false)
            }}
          >
            {eligible.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.city}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-[10.5px] text-slate-400">
            Schools without a verified contact are excluded until verification is complete.
          </p>
        </div>

        <div>
          <Label required>Contact</Label>
          <Select value={contactId} onChange={(event) => setContactId(event.target.value)}>
            {school?.contacts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.designation}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label required>Format</Label>
          <Select value={format} onChange={(event) => setFormat(event.target.value as AppointmentFormat)}>
            <option value="In-person">In-person</option>
            <option value="Online">Online</option>
          </Select>
        </div>

        <div>
          <Label required>Date</Label>
          <Input
            type="date"
            value={date}
            min={isoDay(0)}
            max={isoDay(schedulingPolicy.maxAdvanceDays)}
            onChange={(event) => pickDate(event.target.value)}
            className={cn(!dateCheck.ok && date ? 'border-amber-400 ring-1 ring-amber-300' : '')}
          />
          {!dateCheck.ok && date && (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="flex items-start gap-1.5 text-[11.5px] font-medium leading-relaxed text-amber-800">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                {dateCheck.message ?? 'That date is not available.'}
              </p>
              {dateCheck.suggestions.length > 0 && (
                <div className="mt-2">
                  <p className="mb-1.5 text-[10.5px] font-semibold tracking-wide text-amber-700 uppercase">
                    Suggested dates
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {dateCheck.suggestions.slice(0, 4).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => pickDate(suggestion)}
                        className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
                      >
                        {weekdayDate(suggestion)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <Label required hint={`${schedulingPolicy.durationMinutes} min · ${schedulingPolicy.bufferMinutes} min buffer`}>
            Start time
          </Label>
          <Select
            value={start}
            onChange={(event) => {
              setStart(event.target.value)
              setChecked(false)
            }}
            disabled={!dateCheck.ok || available.length === 0}
          >
            <option value="">Select a time</option>
            {available.map((slot) => (
              <option key={slot.start} value={slot.start}>
                {timeLabel(slot.start)} – {timeLabel(slot.end)}
              </option>
            ))}
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label>Email preview recipient</Label>
          <div className="rounded-xl border border-line bg-slate-50/70 p-3">
            <p className="text-[12px] font-medium text-navy-900">{contact?.email || 'No verified email'}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {contact?.name} · {contact?.designation} · {school?.name}
            </p>
            {!contact?.email && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-rose-600">
                <XCircle className="size-3.5" />
                The agent will not prepare an invitation without a verified email address.
              </p>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label>Purpose / reference</Label>
          <Textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} />
        </div>

        <div className="sm:col-span-2 rounded-xl border border-line p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-navy-900">
            <Sparkles className="size-3.5 text-brand-500" />
            Availability check · {shortDate(date)}
          </p>
          {!dateCheck.ok ? (
            <div className="rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200 ring-inset">
              <p className="flex items-start gap-1.5 text-[11.5px] font-medium leading-relaxed text-amber-800">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                {dateCheck.message ?? 'That date is not available.'}
              </p>
              {dateCheck.suggestions.length > 0 && (
                <div className="mt-2.5">
                  <p className="mb-1.5 text-[10px] font-bold tracking-[0.12em] text-amber-700 uppercase">
                    Try one of these dates
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {dateCheck.suggestions.slice(0, 4).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => pickDate(suggestion)}
                        className="rounded-full border border-amber-300 bg-white px-3 py-1 text-[11px] font-semibold text-amber-800 shadow-sm transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 active:scale-95"
                      >
                        {weekdayDate(suggestion)}
                        <span className="ml-1 text-[10px] font-normal opacity-70">
                          {shortDate(suggestion)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : available.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800 ring-1 ring-amber-200 ring-inset">
              No open windows on this date. Choose another working day.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {slots.map((slot) => {
                const selected = slot.start === start
                return (
                  <button
                    key={slot.start}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => {
                      setStart(slot.start)
                      setChecked(false)
                    }}
                    className={cn(
                      'rounded-lg border px-1.5 py-1 text-[11px] font-semibold transition-colors',
                      !slot.available && 'cursor-not-allowed border-dashed border-slate-200 bg-slate-50 text-slate-300 line-through',
                      slot.available && selected && 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-100',
                      slot.available && !selected && 'border-line bg-white text-navy-800 hover:border-brand-300',
                    )}
                  >
                    {timeLabel(slot.start)}
                  </button>
                )
              })}
            </div>
          )}
          <p className="mt-2 text-[10.5px] text-slate-400">
            Sundays, configured holidays, blocked dates, past dates and times inside the{' '}
            {schedulingPolicy.minNoticeHours}-hour notice window are rejected. The backend must repeat
            this check immediately before confirmation.
          </p>
        </div>

        {error && (
          <p className="flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] text-rose-700 ring-1 ring-rose-200 ring-inset sm:col-span-2">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </p>
        )}

        <label className="flex cursor-pointer items-start gap-2.5 sm:col-span-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
            className="mt-0.5 size-4 accent-brand-600"
          />
          <span className="text-[11.5px] leading-relaxed text-slate-600">
            I have reviewed the school, contact, date and time. I understand the invitation is not sent
            until I confirm it, and approval may be required.
          </span>
        </label>
      </div>
    </Modal>
  )
}

export function AppointmentBadgeStrip({
  status,
  emailStatus,
}: {
  status: AppointmentStatus
  emailStatus: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ClassBadge className={appointmentStatusTone(status)}>{status}</ClassBadge>
      <Badge tone="slate" size="sm">
        <Mail className="size-3" />
        {emailStatus}
      </Badge>
      <Badge tone="slate" size="sm">
        <Send className="size-3" />
        Outbound only
      </Badge>
    </div>
  )
}
