import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserRound,
  Video,
  XCircle,
} from 'lucide-react'
import { PageHeader, Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, ClassBadge, DemoTag } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input, Label, Select, Textarea } from '../components/ui/Field'
import { EmptyState } from '../components/ui/Avatar'
import { UserChip } from '../components/layout/Topbar'
import { InvitationEmailPreview } from '../components/invitation/InvitationEmailPreview'
import { useApp } from '../store/AppStore'
import { employeeById } from '../data/demo'
import { generateSlots, suggestDates, validateDate } from '../lib/scheduling'
import {
  appointmentInvitationDetails,
  composeInvitationBody,
  INVITATION_INTRO_PARAGRAPHS,
  INVITATION_SUBJECT,
} from '../lib/invitationTemplate'
import type { Appointment, AppointmentFormat } from '../lib/types'
import {
  appointmentStatusTone,
  cn,
  emailStatusTone,
  isoDay,
  longDate,
  relativeTime,
  shortDate,
  timeLabel,
  timeRange,
  weekdayDate,
} from '../lib/utils'

export function AppointmentDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const {
    appointments,
    cancelAppointment,
    rescheduleAppointment,
    updateAppointmentDetails,
    updateAppointmentStatus,
    pushToast,
    schoolById,
  } = useApp()
  const appointment = appointments.find((item) => item.id === id)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [outcomeOpen, setOutcomeOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  if (!appointment) {
    return (
      <div className="rounded-2xl border border-line bg-white">
        <EmptyState
          icon={<CalendarClock className="size-5" />}
          title="Appointment not found"
          description="This record does not exist, or it is not visible to your account."
          action={
            <Button size="sm" variant="secondary" onClick={() => navigate('/appointments')}>
              Back to appointments
            </Button>
          }
        />
      </div>
    )
  }

  const school = schoolById(appointment.schoolId)
  const owner = employeeById(appointment.employeeId)
  const cancelled = ['Cancelled', 'Declined', 'Expired'].includes(appointment.status)

  return (
    <div className="space-y-5">
      <Link
        to="/appointments"
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-navy-900"
      >
        <ArrowLeft className="size-3.5" />
        All appointments
      </Link>

      <PageHeader
        title={school?.name ?? 'Appointment'}
        description={`${appointment.contactName} · ${appointment.contactDesignation} · ${weekdayDate(appointment.date)} at ${timeLabel(appointment.startTime)} IST`}
        action={
          <>
            <Button
              variant="secondary"
              size="md"
              iconLeft={<RotateCcw className="size-4" />}
              onClick={() => setRescheduleOpen(true)}
              disabled={cancelled}
            >
              Reschedule
            </Button>
            <Button
              variant="secondary"
              size="md"
              iconLeft={<CalendarPlus className="size-4" />}
              onClick={() => setOutcomeOpen(true)}
            >
              Record outcome
            </Button>
            <Button
              variant="danger"
              size="md"
              iconLeft={<XCircle className="size-4" />}
              onClick={() => setCancelOpen(true)}
              disabled={appointment.status === 'Cancelled'}
            >
              Cancel
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ClassBadge className={appointmentStatusTone(appointment.status)}>{appointment.status}</ClassBadge>
        <ClassBadge className={emailStatusTone(appointment.emailStatus)}>Email: {appointment.emailStatus}</ClassBadge>
        <Badge tone="slate" size="sm">
          {appointment.workflow === 'research' ? 'Workflow 2 · researched school' : 'Workflow 1 · existing school'}
        </Badge>
        <Badge tone={appointment.approvalRequired ? 'amber' : 'slate'} size="sm">
          {appointment.approvalRequired ? 'Approval required' : 'Standard policy'}
        </Badge>
        <DemoTag />
        <span className="ml-auto flex items-center gap-2">
          <UserChip employeeId={appointment.employeeId} />
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Appointment details"
              subtitle={`Created ${relativeTime(appointment.createdAt)} by ${appointment.createdBy}`}
              icon={<CalendarClock className="size-4.5" />}
              action={
                <span className="font-mono text-[10.5px] text-slate-400">
                  {appointment.id.toUpperCase()}
                </span>
              }
            />
            <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: 'School', value: school?.name ?? '—' },
                { label: 'Contact', value: appointment.contactName },
                { label: 'Designation', value: appointment.contactDesignation },
                { label: 'Email', value: appointment.contactEmail || 'Not verified' },
                { label: 'Assigned employee', value: owner?.name ?? 'Unassigned' },
                { label: 'Time zone', value: appointment.timezone },
                { label: 'Date', value: longDate(appointment.date) },
                { label: 'Start – end', value: timeRange(appointment.startTime, appointment.endTime) },
                { label: 'Format', value: appointment.format },
                { label: 'Purpose', value: appointment.purpose },
                { label: 'Created', value: relativeTime(appointment.createdAt) },
                { label: 'Updated', value: relativeTime(appointment.updatedAt) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-slate-50/70 p-2.5 ring-1 ring-line ring-inset">
                  <p className="text-[9.5px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                    {item.label}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] font-medium text-navy-900">{item.value}</p>
                </div>
              ))}
              <div className="col-span-2 rounded-xl bg-slate-50/70 p-2.5 ring-1 ring-line ring-inset sm:col-span-3">
                <p className="flex items-center gap-1 text-[9.5px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                  {appointment.format === 'Online' ? <Video className="size-3" /> : <MapPin className="size-3" />}
                  {appointment.format === 'Online' ? 'Meeting link' : 'Location'}
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-navy-900">{appointment.location}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Invitation email"
              subtitle="Standard Eduvian introduction and meeting purpose — appointment details auto-filled from this record"
              icon={<Mail className="size-4.5" />}
              action={
                <Badge tone={appointment.emailStatus === 'Failed' ? 'rose' : 'brand'} size="sm" dot>
                  {appointment.emailStatus}
                </Badge>
              }
            />
            <CardBody>
              <p className="mb-2 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-slate-400">
                <Lock className="mt-0.5 size-3.5 shrink-0" />
                The company introduction and meeting purpose are fixed template content. Only the
                appointment details below can be edited.
              </p>
              <InvitationEmailPreview
                to={appointment.contactEmail}
                details={appointmentInvitationDetails(appointment, school?.name)}
                appointmentId={appointment.id}
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[10.5px] text-slate-400">
                  <ShieldCheck className="size-3.5" />
                  Secure single-use response links · they expire with the invitation
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="xs"
                    variant="secondary"
                    iconLeft={<Pencil className="size-3" />}
                    onClick={() => setDetailsOpen(true)}
                  >
                    Edit details
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    iconLeft={<Copy className="size-3" />}
                    onClick={() => {
                      const details = appointmentInvitationDetails(appointment, school?.name)
                      const link = `${window.location.origin}/invite/demo-${appointment.id}`
                      navigator.clipboard.writeText(composeInvitationBody(details, link)).then(
                        () =>
                          pushToast({
                            tone: 'success',
                            title: 'Invitation email copied',
                            description: 'The full standard template was copied to the clipboard.',
                          }),
                        () =>
                          pushToast({
                            tone: 'info',
                            title: 'Copy unavailable',
                            description: 'Your browser blocked clipboard access.',
                          }),
                      )
                    }}
                  >
                    Copy email
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    iconLeft={<Copy className="size-3" />}
                    onClick={() => {
                      const link = `${window.location.origin}/invite/demo-${appointment.id}`
                      navigator.clipboard.writeText(link).then(
                        () =>
                          pushToast({
                            tone: 'success',
                            title: 'Response link copied',
                            description: 'Demo link copied to clipboard.',
                          }),
                        () =>
                          pushToast({
                            tone: 'info',
                            title: 'Response link',
                            description: link,
                          }),
                      )
                    }}
                  >
                    Copy link
                  </Button>
                  <Link
                    to={`/invite/demo-${appointment.id}`}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 text-[12px] font-semibold text-brand-700 ring-1 ring-brand-100 transition-colors hover:bg-brand-100"
                  >
                    Preview school view
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
              </div>
              <p className="mt-2 text-[10.5px] leading-relaxed text-slate-400">
                Preview before sending — nothing is delivered until the email provider reports
                Connected.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Status history" subtitle="Every transition is recorded" icon={<Clock3 className="size-4.5" />} />
            <CardBody>
              <ol className="relative space-y-4 border-l border-line pl-4">
                {[...appointment.history].reverse().map((entry, index) => (
                  <li key={`${entry.status}-${entry.at}-${index}`} className="relative">
                    <span
                      className={cn(
                        'absolute top-1 -left-[22px] flex size-3 items-center justify-center rounded-full ring-4 ring-white',
                        index === 0 ? 'bg-brand-500' : 'bg-slate-300',
                      )}
                    />
                    <p className="text-[12.5px] font-semibold text-navy-900">{entry.status}</p>
                    <p className="text-[11px] text-slate-500">
                      {relativeTime(entry.at)} · {entry.by}
                    </p>
                    {entry.note && <p className="mt-0.5 text-[11px] text-slate-400">{entry.note}</p>}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="School record" icon={<UserRound className="size-4.5" />} />
            <CardBody className="space-y-2.5 pt-0">
              <p className="text-[13px] font-semibold text-navy-900">{school?.name}</p>
              <p className="text-[11.5px] text-slate-500">
                {school?.type} · {school?.city}
              </p>
              <div className="space-y-1.5 border-t border-line pt-2.5">
                <p className="flex items-center gap-1.5 text-[11.5px] text-slate-600">
                  <Mail className="size-3.5 text-slate-400" />
                  {appointment.contactEmail || 'No verified email'}
                </p>
                <p className="flex items-center gap-1.5 text-[11.5px] text-slate-600">
                  <Phone className="size-3.5 text-slate-400" />
                  {school?.phone ?? '—'}
                </p>
                <p className="flex items-start gap-1.5 text-[11.5px] text-slate-600">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                  {school?.address}
                </p>
              </div>
              <Link
                to={`/schools?school=${school?.id}`}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-[11.5px] font-semibold text-navy-800 hover:border-brand-200 hover:bg-brand-50/40"
              >
                Open school record <ExternalLink className="size-3" />
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Calendar" icon={<CalendarClock className="size-4.5" />} />
            <CardBody className="space-y-2.5 pt-0">
              <div className="rounded-xl bg-gradient-to-br from-navy-900 to-navy-800 p-3.5 text-white">
                <p className="text-[10px] font-bold tracking-[0.12em] text-white/40 uppercase">
                  {weekdayDate(appointment.date)}
                </p>
                <p className="mt-0.5 font-display text-lg font-bold">
                  {timeRange(appointment.startTime, appointment.endTime)}
                </p>
                <p className="mt-1 text-[11px] text-white/50">Asia/Kolkata · IST</p>
              </div>
              <div className="space-y-1.5">
                <Row label="Temporary hold" value={appointment.holdExpiresAt ? 'Active' : 'None'} />
                <Row label="Hold expires" value={appointment.holdExpiresAt ? relativeTime(appointment.holdExpiresAt) : '—'} />
                <Row label="Double-booking check" value="Re-checked before confirm" />
                <Row label="Buffer" value="15 minutes" />
              </div>
              <p className="text-[10.5px] leading-relaxed text-slate-400">
                Holds are temporary. They release automatically on decline, expiry, cancellation or when
                the hold window ends.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Policy & approval" icon={<ShieldCheck className="size-4.5" />} />
            <CardBody className="space-y-2.5 pt-0">
              <div
                className={cn(
                  'rounded-xl p-3 ring-1 ring-inset',
                  appointment.approvalRequired
                    ? 'bg-amber-50 ring-amber-200'
                    : 'bg-teal-50 ring-teal-200',
                )}
              >
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-navy-900">
                  {appointment.approvalRequired ? (
                    <>
                      <TriangleAlert className="size-3.5 text-amber-600" />
                      Management approval required
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5 text-teal-600" />
                      Standard policy applies
                    </>
                  )}
                </p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-slate-600">
                  {appointment.approvalRequired
                    ? 'Nothing is sent to the school until an approver approves this invitation.'
                    : 'Approved templates may be sent by authorised employees without per-email approval.'}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                fullWidth
                iconLeft={<Send className="size-3.5" />}
                onClick={() =>
                  pushToast({
                    tone: 'warning',
                    title: 'Email provider not connected',
                    description: 'Configure the email integration before invitations can be sent.',
                  })
                }
              >
                Send invitation
              </Button>
              <p className="text-[10px] text-slate-400">
                Sending is blocked until the email provider reports Connected.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Quick actions" icon={<Sparkles className="size-4.5" />} />
            <CardBody className="space-y-2 pt-0">
              <Button size="sm" variant="secondary" fullWidth onClick={() => setRescheduleOpen(true)}>
                Propose another time
              </Button>
              <Button
                size="sm"
                variant="secondary"
                fullWidth
                onClick={() => setOutcomeOpen(true)}
              >
                Record appointment outcome
              </Button>
              <Button
                size="sm"
                variant="ghost"
                fullWidth
                onClick={() => {
                  updateAppointmentStatus(appointment.id, 'Confirmed', 'Demo confirmation by employee')
                  pushToast({ tone: 'success', title: 'Marked confirmed (demo)' })
                }}
              >
                Simulate school confirmation
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      <RescheduleModal
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        currentDate={appointment.date}
        currentStart={appointment.startTime}
        appointmentId={appointment.id}
        onConfirm={(date, start, end) => {
          rescheduleAppointment(appointment.id, date, start, end)
          setRescheduleOpen(false)
          pushToast({
            tone: 'success',
            title: 'Appointment rescheduled',
            description: `${weekdayDate(date)} at ${timeLabel(start)}. Re-confirm with the school next.`,
          })
        }}
      />

      {detailsOpen && (
        <EditInvitationDetailsModal
          appointment={appointment}
          schoolName={school?.name ?? ''}
          onClose={() => setDetailsOpen(false)}
          onSave={(patch) => {
            updateAppointmentDetails(appointment.id, patch)
            setDetailsOpen(false)
            pushToast({
              tone: 'success',
              title: 'Invitation details updated',
              description:
                'The appointment record now shows the new details — the standard introduction is unchanged.',
            })
          }}
        />
      )}

      <CancelModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => {
          cancelAppointment(appointment.id)
          setCancelOpen(false)
          pushToast({
            tone: 'info',
            title: 'Appointment cancelled',
            description: reason ? `Reason recorded: ${reason}` : 'The slot has been released.',
          })
        }}
      />

      <OutcomeModal
        open={outcomeOpen}
        onClose={() => setOutcomeOpen(false)}
        onSave={(outcome) => {
          setOutcomeOpen(false)
          pushToast({
            tone: 'success',
            title: 'Outcome recorded',
            description: outcome,
          })
        }}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className="text-[11px] font-medium text-navy-900">{value}</span>
    </div>
  )
}

/**
 * Edits only the appointment-specific detail fields shown in the invitation.
 * The company introduction, meeting purpose, response options and closing are
 * fixed template content, displayed here as locked reference — never editable.
 */
function EditInvitationDetailsModal({
  appointment,
  schoolName,
  onClose,
  onSave,
}: {
  appointment: Appointment
  schoolName: string
  onClose: () => void
  onSave: (
    patch: Pick<Appointment, 'date' | 'startTime' | 'endTime' | 'format' | 'location'>,
  ) => void
}) {
  const { schedulingPolicy } = useApp()
  const [date, setDate] = useState(appointment.date)
  const [start, setStart] = useState(appointment.startTime)
  const [end, setEnd] = useState(appointment.endTime)
  const [format, setFormat] = useState<AppointmentFormat>(appointment.format)
  const [location, setLocation] = useState(appointment.location)
  const [error, setError] = useState('')

  function save() {
    if (!date) {
      setError('Choose the proposed date.')
      return
    }
    if (!start || !end) {
      setError('Enter both the proposed start and end time.')
      return
    }
    if (end <= start) {
      setError('The proposed end time must be after the start time.')
      return
    }
    if (!location.trim()) {
      setError('Enter the meeting location or link.')
      return
    }
    setError('')
    onSave({ date, startTime: start, endTime: end, format, location: location.trim() })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit invitation details"
      description="Only the appointment-specific fields below change — the standard introduction stays fixed."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} iconLeft={<Check className="size-3.5" />}>
            Save details
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-line ring-inset">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-navy-900">
            <Lock className="size-3.5 text-slate-400" />
            Fixed template content — locked
          </p>
          <p className="mt-1.5 text-[11.5px] text-slate-600">
            <span className="font-semibold text-navy-800">Subject:</span> {INVITATION_SUBJECT}
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">
            {INVITATION_INTRO_PARAGRAPHS.slice(0, 2).join(' ')} The company introduction, meeting
            purpose, response options and closing are shared by every invitation and cannot be
            edited here.
          </p>
        </div>

        <div>
          <Label>School Name</Label>
          <Input value={schoolName} disabled />
          <p className="mt-1 text-[10.5px] text-slate-400">
            Taken from the school record — rename it on the school page.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Proposed Date</Label>
            <Input
              type="date"
              value={date}
              min={isoDay(0)}
              max={isoDay(schedulingPolicy.maxAdvanceDays)}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div>
            <Label>Meeting Mode</Label>
            <Select
              value={format}
              onChange={(event) => setFormat(event.target.value as AppointmentFormat)}
            >
              <option value="In-person">In-person</option>
              <option value="Online">Online</option>
            </Select>
          </div>
          <div>
            <Label>Proposed start time</Label>
            <Input type="time" value={start} onChange={(event) => setStart(event.target.value)} />
          </div>
          <div>
            <Label>Proposed end time</Label>
            <Input type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
          </div>
        </div>

        <div>
          <Label>Meeting Location / Link</Label>
          <Input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder={
              format === 'Online' ? 'Meeting link or platform' : 'School address for the visit'
            }
          />
        </div>

        {error && <p className="text-[11.5px] text-rose-600">{error}</p>}
      </div>
    </Modal>
  )
}

function RescheduleModal({
  open,
  onClose,
  currentDate,
  currentStart,
  appointmentId,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  currentDate: string
  currentStart: string
  appointmentId: string
  onConfirm: (date: string, start: string, end: string) => void
}) {
  const { schedulingPolicy, appointments, user } = useApp()
  const employeeId = user?.id ?? 'emp-1'
  const [date, setDate] = useState(() =>
    suggestDates(schedulingPolicy, appointments, employeeId, isoDay(0), 1)[0] ?? isoDay(1),
  )
  const [start, setStart] = useState('')
  const [checked, setChecked] = useState(false)

  const dateCheck = validateDate(date, schedulingPolicy, appointments, employeeId, {
    checkCapacity: true,
  })
  const slots = dateCheck.ok
    ? generateSlots(date, schedulingPolicy, appointments, employeeId, {
        excludeAppointmentId: appointmentId,
      })
    : []
  const available = slots.filter((slot) => slot.available)
  const selectedSlot = slots.find((slot) => slot.start === start && slot.available)

  function pickDate(next: string) {
    setDate(next)
    setStart('')
    setChecked(false)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reschedule appointment"
      description={`Currently ${weekdayDate(currentDate)} at ${timeLabel(currentStart)} IST`}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Keep current
          </Button>
          <Button
            size="sm"
            disabled={!checked || !selectedSlot}
            onClick={() =>
              selectedSlot && onConfirm(date, selectedSlot.start, selectedSlot.end)
            }
          >
            Propose new time
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>New date</Label>
            <Input
              type="date"
              value={date}
              min={isoDay(0)}
              max={isoDay(schedulingPolicy.maxAdvanceDays)}
              onChange={(event) => pickDate(event.target.value)}
            />
          </div>
          <div>
            <Label>Start time</Label>
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
        </div>

        <div className="rounded-xl border border-line p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-navy-900">
            <Sparkles className="size-3.5 text-brand-500" />
            Availability · {weekdayDate(date)}
          </p>
          {!dateCheck.ok ? (
            <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800 ring-1 ring-amber-200 ring-inset">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {dateCheck.message ?? 'That date is not available.'}
              {dateCheck.suggestions.length > 0 && (
                <span className="ml-1">
                  Try {dateCheck.suggestions.slice(0, 3).map((d) => shortDate(d)).join(', ')}.
                </span>
              )}
            </p>
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
                      setChecked(true)
                    }}
                    className={cn(
                      'rounded-lg border px-1.5 py-1 text-[11px] font-semibold transition-colors',
                      !slot.available &&
                        'cursor-not-allowed border-dashed border-slate-200 bg-slate-50 text-slate-300 line-through',
                      slot.available &&
                        selected &&
                        'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-100',
                      slot.available &&
                        !selected &&
                        'border-line bg-white text-navy-800 hover:border-brand-300',
                    )}
                  >
                    {timeLabel(slot.start)}
                  </button>
                )
              })}
            </div>
          )}
          <p className="mt-2 text-[10.5px] text-slate-400">
            Sundays, configured holidays, blocked dates and the {schedulingPolicy.minNoticeHours}-hour
            notice window are rejected. The existing appointment's slot is excluded from conflict checks.
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200 ring-inset">
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-amber-800">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            A reschedule is only final after both the employee and the school agree. The previous
            appointment details are preserved in the status history.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
            className="mt-0.5 size-4 accent-brand-600"
          />
          <span className="text-[11.5px] leading-relaxed text-slate-600">
            I have checked availability and want to propose this new time.
          </span>
        </label>
      </div>
    </Modal>
  )
}

function CancelModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancel appointment"
      description="The slot is released and both parties are notified. History is preserved."
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Keep appointment
          </Button>
          <Button variant="danger" size="sm" onClick={() => onConfirm(reason)}>
            Cancel appointment
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label>Reason (internal)</Label>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is this appointment being cancelled?"
          />
        </div>
        <div className="rounded-xl bg-rose-50 p-3 ring-1 ring-rose-200 ring-inset">
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-rose-700">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            Reminders stop immediately. Any temporary hold on the slot is released. A confirmation email
            is sent by the backend once the email provider is connected.
          </p>
        </div>
      </div>
    </Modal>
  )
}

function OutcomeModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (outcome: string) => void
}) {
  const [outcome, setOutcome] = useState('Appointment completed')
  const [notes, setNotes] = useState('')
  const [followUp, setFollowUp] = useState(isoDay(7))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record appointment outcome"
      description="AI-generated summaries must be reviewed by you before they are saved as final records."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onSave(outcome)}
            iconLeft={<Check className="size-3.5" />}
          >
            Save outcome
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Outcome</Label>
          <Select value={outcome} onChange={(event) => setOutcome(event.target.value)}>
            {[
              'Appointment completed',
              'School unavailable',
              'Employee unavailable',
              'No-show',
              'Rescheduled',
              'Cancelled',
            ].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What happened, what was agreed, what comes next…"
          />
        </div>
        <div>
          <Label>Next follow-up date</Label>
          <Input type="date" value={followUp} onChange={(event) => setFollowUp(event.target.value)} />
        </div>
        <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100 ring-inset">
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-brand-900">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand-500" />
            Lengthy business-development reports are optional and can be enabled by management.
          </p>
        </div>
      </div>
    </Modal>
  )
}
