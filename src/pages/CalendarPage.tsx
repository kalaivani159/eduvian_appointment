import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  addDays,
  addMonths,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
} from 'date-fns'
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  Plus,
  Settings2,
  Video,
  XCircle,
} from 'lucide-react'
import { PageHeader, Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ClassBadge } from '../components/ui/Badge'
import { SegmentedControl, Select } from '../components/ui/Field'
import { Avatar, EmptyState } from '../components/ui/Avatar'
import { UserChip } from '../components/layout/Topbar'
import { useApp } from '../store/AppStore'
import { employeeById, employees } from '../data/demo'
import {
  appointmentStatusTone,
  cn,
  isoDay,
  timeLabel,
  timeRange,
  weekStart,
} from '../lib/utils'
import {
  DAY_NAMES,
  describeWorkingDays,
  generateSlots,
  isBlocked,
  isHoliday,
  suggestDates,
  toMinutes,
  validateDate,
  type SchedulingPolicy,
} from '../lib/scheduling'
import type { Appointment } from '../lib/types'

const HOUR_HEIGHT = 46
type View = 'day' | 'week' | 'month'

/* ─── per-date availability summary ───────────────────────────────────────── */
interface DayAvailability {
  status: 'available' | 'partial' | 'full' | 'non-working' | 'past'
  totalSlots: number
  availableSlots: number
  bookedCount: number
  reason?: string
}

/** Pure function — no hooks. Safe to call in useMemo over an array of dates. */
function computeDayAvailability(
  iso: string,
  today: string,
  employeeId: string,
  appointments: Appointment[],
  policy: SchedulingPolicy,
): DayAvailability {
  if (iso < today) {
    const booked = appointments.filter(
      (a) => a.date === iso && (employeeId === 'all' || a.employeeId === employeeId),
    ).length
    return { status: 'past', totalSlots: 0, availableSlots: 0, bookedCount: booked }
  }

  const dayNum = getDay(parseISO(iso))

  if (dayNum === 0) {
    return { status: 'non-working', totalSlots: 0, availableSlots: 0, bookedCount: 0, reason: 'Sunday — non-working' }
  }
  if (!policy.workingDays.includes(dayNum)) {
    return { status: 'non-working', totalSlots: 0, availableSlots: 0, bookedCount: 0, reason: `${DAY_NAMES[dayNum]} — non-working day` }
  }

  const holiday = isHoliday(policy, iso)
  if (holiday) {
    return { status: 'non-working', totalSlots: 0, availableSlots: 0, bookedCount: 0, reason: `Holiday — ${holiday.label}` }
  }

  if (employeeId !== 'all') {
    const blocked = isBlocked(policy, iso, employeeId)
    if (blocked) {
      return { status: 'non-working', totalSlots: 0, availableSlots: 0, bookedCount: 0, reason: `Blocked — ${blocked.label}` }
    }
  }

  const eid = employeeId === 'all' ? 'emp-1' : employeeId
  const aptsForEid = employeeId === 'all'
    ? appointments.filter((a) => a.employeeId === 'emp-1')
    : appointments

  const slots = generateSlots(iso, policy, aptsForEid, eid)
  const total = slots.length
  const available = slots.filter((s) => s.available).length
  const booked = appointments.filter(
    (a) => a.date === iso && (employeeId === 'all' || a.employeeId === employeeId),
  ).length

  if (total === 0) {
    return { status: 'non-working', totalSlots: 0, availableSlots: 0, bookedCount: booked, reason: 'No working slots configured' }
  }
  if (available === 0) {
    return { status: 'full', totalSlots: total, availableSlots: 0, bookedCount: booked, reason: 'All slots occupied or inside buffer' }
  }
  if (available < total) {
    return { status: 'partial', totalSlots: total, availableSlots: available, bookedCount: booked }
  }
  return { status: 'available', totalSlots: total, availableSlots: available, bookedCount: booked }
}

function statusStyle(av: DayAvailability, inMonth: boolean) {
  if (!inMonth) return { dot: '', label: '', cellBg: '', text: '' }
  switch (av.status) {
    case 'available':
      return {
        dot: 'bg-emerald-400',
        label: av.availableSlots > 0 ? `${av.availableSlots} slot${av.availableSlots === 1 ? '' : 's'}` : 'Available',
        cellBg: 'bg-emerald-50/60',
        text: 'text-emerald-700',
      }
    case 'partial':
      return {
        dot: 'bg-amber-400',
        label: `${av.availableSlots} left`,
        cellBg: 'bg-amber-50/60',
        text: 'text-amber-700',
      }
    case 'full':
      return {
        dot: 'bg-rose-400',
        label: 'Fully booked',
        cellBg: 'bg-rose-50/50',
        text: 'text-rose-600',
      }
    case 'non-working':
      return {
        dot: 'bg-slate-300',
        label: av.reason ?? 'Unavailable',
        cellBg: 'bg-slate-50/80',
        text: 'text-slate-400',
      }
    case 'past':
      return {
        dot: av.bookedCount > 0 ? 'bg-slate-400' : '',
        label: av.bookedCount > 0 ? `${av.bookedCount} held` : '',
        cellBg: '',
        text: 'text-slate-400',
      }
  }
}

export function CalendarPage() {
  const { appointments, user, isAdmin, schedulingPolicy, schoolById } = useApp()
  const navigate = useNavigate()
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState(new Date())
  const [employeeId, setEmployeeId] = useState(isAdmin ? 'emp-1' : (user?.id ?? 'emp-1'))
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const workStart = Math.floor(toMinutes(schedulingPolicy.workStart) / 60)
  const workEnd = Math.ceil(toMinutes(schedulingPolicy.workEnd) / 60)
  const workHours = Math.max(1, workEnd - workStart)

  const visible = useMemo(
    () => appointments.filter((a) => employeeId === 'all' || a.employeeId === employeeId),
    [appointments, employeeId],
  )

  const weekDays = useMemo(() => {
    const start = weekStart(cursor)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [cursor])

  const monthDays = useMemo(() => {
    const first = startOfMonth(cursor)
    const gridStart = weekStart(first)
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  }, [cursor])

  /** Compute availability for all 42 month cells in one memo — not per-cell. */
  const monthAvailability = useMemo(() => {
    const today = isoDay(0)
    return monthDays.map((day) =>
      computeDayAvailability(
        format(day, 'yyyy-MM-dd'),
        today,
        employeeId,
        appointments,
        schedulingPolicy,
      ),
    )
  }, [monthDays, employeeId, appointments, schedulingPolicy])

  const dayAppointments = (day: Date) =>
    visible.filter((a) => isSameDay(parseISO(a.date), day))

  const title =
    view === 'month'
      ? format(cursor, 'MMMM yyyy')
      : view === 'week'
        ? `${format(weekDays[0], 'dd MMM')} – ${format(weekDays[6], 'dd MMM yyyy')}`
        : format(cursor, 'EEEE, dd MMMM yyyy')

  function shift(dir: -1 | 1) {
    if (view === 'month') setCursor(addMonths(cursor, dir))
    else if (view === 'week') setCursor(addDays(cursor, dir * 7))
    else setCursor(addDays(cursor, dir))
  }

  const upcoming = visible
    .filter((a) => a.status === 'Confirmed')
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    .slice(0, 4)

  /* ── selected date detail ── */
  const selectedIso = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null

  const selectedSlots = useMemo(() => {
    if (!selectedIso || employeeId === 'all') return []
    return generateSlots(selectedIso, schedulingPolicy, appointments, employeeId)
  }, [selectedIso, employeeId, appointments, schedulingPolicy])

  const selectedDateCheck = useMemo(() => {
    if (!selectedIso || employeeId === 'all') return null
    return validateDate(selectedIso, schedulingPolicy, appointments, employeeId)
  }, [selectedIso, employeeId, appointments, schedulingPolicy])

  const selectedDayAppts = useMemo(
    () =>
      selectedDate
        ? appointments.filter(
            (a) => a.date === selectedIso && (employeeId === 'all' || a.employeeId === employeeId),
          )
        : [],
    [selectedDate, selectedIso, employeeId, appointments],
  )

  const alternativeDates = useMemo(() => {
    if (!selectedIso || employeeId === 'all' || selectedDateCheck?.ok) return []
    // suggestDates is now safe — it uses _skipSuggestions internally
    return suggestDates(schedulingPolicy, appointments, employeeId, selectedIso, 4)
  }, [selectedIso, selectedDateCheck, employeeId, schedulingPolicy, appointments])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendar"
        description={`Appointment availability — ${schedulingPolicy.workStart}–${schedulingPolicy.workEnd} · ${schedulingPolicy.durationMinutes}-min slots · ${schedulingPolicy.bufferMinutes}-min buffer`}
        action={
          <>
            <Button
              variant="secondary"
              size="md"
              iconLeft={<Settings2 className="size-4" />}
              onClick={() => navigate('/settings?tab=appointments')}
            >
              Calendar settings
            </Button>
            <Button size="md" iconLeft={<Plus className="size-4" />} onClick={() => navigate('/appointments')}>
              New appointment
            </Button>
          </>
        }
      />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5 text-[11.5px]">
        <span className="font-semibold text-navy-800">Availability:</span>
        {[
          { dot: 'bg-emerald-400', label: 'Available' },
          { dot: 'bg-amber-400', label: 'Partially booked' },
          { dot: 'bg-rose-400', label: 'Fully booked' },
          { dot: 'bg-slate-300', label: 'Non-working / Holiday' },
          { dot: 'ring-2 ring-brand-500 bg-brand-50', label: 'Selected' },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-slate-600">
            <span className={cn('size-2.5 rounded-full', item.dot)} />
            {item.label}
          </span>
        ))}
        <span className="ml-auto text-slate-400">Click any date to see slot details</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── Calendar grid ── */}
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <div className="flex items-center gap-1">
              <button onClick={() => shift(-1)} aria-label="Previous"
                className="rounded-lg border border-line p-1.5 text-slate-500 hover:bg-slate-50 hover:text-navy-900">
                <ChevronLeft className="size-4" />
              </button>
              <button onClick={() => setCursor(new Date())}
                className="rounded-lg border border-line px-2.5 py-1.5 text-[11.5px] font-semibold text-navy-800 hover:bg-slate-50">
                Today
              </button>
              <button onClick={() => shift(1)} aria-label="Next"
                className="rounded-lg border border-line p-1.5 text-slate-500 hover:bg-slate-50 hover:text-navy-900">
                <ChevronRight className="size-4" />
              </button>
            </div>
            <p className="text-[13px] font-bold text-navy-900">{title}</p>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {isAdmin && (
                <Select
                  value={employeeId}
                  onChange={(e) => { setEmployeeId(e.target.value); setSelectedDate(null) }}
                  className="h-8 w-auto min-w-[150px] text-[12px]"
                >
                  {employees.filter((e) => e.role === 'employee').map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </Select>
              )}
              <SegmentedControl size="sm" value={view} onChange={setView}
                options={[
                  { value: 'day', label: 'Day' },
                  { value: 'week', label: 'Week' },
                  { value: 'month', label: 'Month' },
                ]}
              />
            </div>
          </div>

          {/* Week view */}
          {view === 'week' && (
            <div className="scrollbar-thin overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-line">
                  <div />
                  {weekDays.map((day) => (
                    <div key={day.toISOString()}
                      className={cn('border-l border-line px-2 py-2 text-center', isToday(day) && 'bg-brand-50/60')}>
                      <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">{format(day, 'EEE')}</p>
                      <p className={cn('mt-0.5 mx-auto flex size-6 items-center justify-center rounded-full text-[12.5px] font-bold',
                        isToday(day) ? 'bg-brand-600 text-white' : 'text-navy-900')}>
                        {format(day, 'd')}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
                  <div>
                    {Array.from({ length: workHours }, (_, i) => (
                      <div key={i} className="relative border-b border-line/70 pr-2 text-right" style={{ height: HOUR_HEIGHT }}>
                        <span className="absolute -top-1.5 right-2 text-[10px] font-medium text-slate-400">
                          {timeLabel(`${String(workStart + i).padStart(2, '0')}:00`)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {weekDays.map((day) => {
                    const items = dayAppointments(day)
                    return (
                      <div key={day.toISOString()}
                        className={cn('relative border-l border-line', isToday(day) && 'bg-brand-50/25')}
                        style={{ height: workHours * HOUR_HEIGHT }}>
                        {Array.from({ length: workHours }, (_, i) => (
                          <div key={i} className="border-b border-line/70" style={{ height: HOUR_HEIGHT }} />
                        ))}
                        {items.map((a) => {
                          const [hour, minute] = a.startTime.split(':').map(Number)
                          const top = ((hour - workStart) * 60 + minute) / 60 * HOUR_HEIGHT
                          return (
                            <button key={a.id} onClick={() => navigate(`/appointments/${a.id}`)}
                              className={cn(
                                'absolute inset-x-1 overflow-hidden rounded-lg border px-1.5 py-1 text-left shadow-sm transition-transform hover:z-10 hover:-translate-y-px hover:shadow-md',
                                a.status === 'Confirmed' ? 'border-teal-200 bg-teal-50'
                                  : a.status === 'Awaiting School Response' ? 'border-amber-200 bg-amber-50'
                                  : a.status === 'Declined' || a.status === 'Cancelled' ? 'border-slate-200 bg-slate-50'
                                  : 'border-brand-200 bg-brand-50',
                              )}
                              style={{ top: top + 2, height: (schedulingPolicy.durationMinutes / 60) * HOUR_HEIGHT - 4 }}>
                              <p className="truncate text-[10px] font-bold text-navy-900">{timeLabel(a.startTime)}</p>
                              <p className="truncate text-[10px] leading-tight text-slate-600">{schoolById(a.schoolId)?.name}</p>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Day view */}
          {view === 'day' && (
            <div className="p-4">
              {Array.from({ length: workHours }, (_, i) => {
                const hour = workStart + i
                const items = dayAppointments(cursor).filter(
                  (a) => Number(a.startTime.split(':')[0]) === hour,
                )
                return (
                  <div key={hour} className="flex gap-3 border-b border-line/70 py-1.5 last:border-0">
                    <span className="w-14 shrink-0 pt-1 text-right text-[10.5px] font-medium text-slate-400">
                      {timeLabel(`${String(hour).padStart(2, '0')}:00`)}
                    </span>
                    <div className="min-h-[44px] flex-1 space-y-1">
                      {items.length === 0 ? (
                        <button onClick={() => navigate('/appointments')}
                          className="h-8 w-full rounded-lg border border-dashed border-transparent text-left text-[10.5px] text-slate-300 transition-colors hover:border-brand-200 hover:bg-brand-50/40 hover:text-brand-500">
                          + Available
                        </button>
                      ) : (
                        items.map((a) => (
                          <AppointmentChip key={a.id} appointment={a} onClick={() => navigate(`/appointments/${a.id}`)} />
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Month view */}
          {view === 'month' && (
            <div className="p-3">
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-line">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
                  <div key={label} className="bg-slate-50 py-1.5 text-center text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                    {label}
                  </div>
                ))}
                {monthDays.map((day, idx) => (
                  <MonthCell
                    key={day.toISOString()}
                    day={day}
                    cursor={cursor}
                    availability={monthAvailability[idx]}
                    appointments={appointments}
                    employeeId={employeeId}
                    selected={selectedDate ? isSameDay(day, selectedDate) : false}
                    onClick={() => setSelectedDate(isSameDay(day, selectedDate ?? new Date(0)) ? null : day)}
                    onOpenAppointment={(id) => navigate(`/appointments/${id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* ── Right column ── */}
        <div className="space-y-4">
          {/* Selected-date detail */}
          {selectedDate && view === 'month' && (
            <Card>
              <CardHeader
                title={format(selectedDate, 'EEE, dd MMM yyyy')}
                subtitle="Slot-by-slot availability"
                icon={<CalendarDays className="size-4.5" />}
                action={
                  <button onClick={() => setSelectedDate(null)}
                    className="text-slate-400 hover:text-navy-900">
                    <XCircle className="size-4" />
                  </button>
                }
              />
              <CardBody className="pt-0">
                {employeeId === 'all' ? (
                  <p className="text-[12px] text-slate-500">Select an employee to see slot availability.</p>
                ) : selectedDateCheck && !selectedDateCheck.ok ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                      <div>
                        <p className="text-[12.5px] font-semibold text-amber-900">Date unavailable</p>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-amber-800">
                          {selectedDateCheck.message ?? 'This date cannot be booked.'}
                        </p>
                      </div>
                    </div>
                    {alternativeDates.length > 0 && (
                      <div>
                        <p className="mb-2 text-[11px] font-bold tracking-[0.1em] text-slate-500 uppercase">Nearest available dates</p>
                        <div className="space-y-1.5">
                          {alternativeDates.map((iso) => {
                            const altSlots = generateSlots(iso, schedulingPolicy, appointments, employeeId)
                            const avail = altSlots.filter((s) => s.available).length
                            return (
                              <button key={iso}
                                onClick={() => setSelectedDate(parseISO(iso))}
                                className="flex w-full items-center justify-between rounded-xl border border-line bg-white px-3 py-2 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/40">
                                <span className="text-[12px] font-semibold text-navy-900">{format(parseISO(iso), 'EEE, dd MMM')}</span>
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                  {avail} slot{avail !== 1 ? 's' : ''}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDayAppts.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold tracking-[0.1em] text-slate-500 uppercase">Existing appointments</p>
                        {selectedDayAppts.map((a) => (
                          <button key={a.id} onClick={() => navigate(`/appointments/${a.id}`)}
                            className="mb-1.5 flex w-full items-center gap-2.5 rounded-xl border border-line bg-slate-50/60 px-3 py-2 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/30">
                            <ClassBadge className={appointmentStatusTone(a.status)} size="sm">{a.status}</ClassBadge>
                            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-navy-900">
                              {timeRange(a.startTime, a.endTime)} — {schoolById(a.schoolId)?.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div>
                      <p className="mb-1.5 text-[11px] font-bold tracking-[0.1em] text-slate-500 uppercase">Time slots</p>
                      <div className="overflow-hidden rounded-xl border border-line">
                        <table className="w-full text-[11.5px]">
                          <thead>
                            <tr className="border-b border-line bg-slate-50">
                              <th className="px-3 py-2 text-left font-semibold text-slate-500">Time</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-500">Status</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-500">School</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedSlots.map((slot, i) => {
                              const matchedAppt = appointments.find(
                                (a) => a.date === selectedIso && a.startTime === slot.start &&
                                  (employeeId === 'all' || a.employeeId === employeeId),
                              )
                              return (
                                <tr key={slot.start}
                                  className={cn(
                                    'border-b border-line/60 last:border-0',
                                    i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40',
                                  )}>
                                  <td className="px-3 py-2 font-mono text-[11px] font-semibold text-navy-900">
                                    {timeLabel(slot.start)}
                                  </td>
                                  <td className="px-3 py-2">
                                    {slot.available ? (
                                      <span className="flex items-center gap-1 text-emerald-700">
                                        <CheckCircle2 className="size-3.5" /> Available
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-rose-600">
                                        <Ban className="size-3.5" />
                                        <span className="max-w-[90px] truncate text-[10.5px]">{slot.reason ?? 'Booked'}</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-[11px] text-slate-500">
                                    {matchedAppt ? (schoolById(matchedAppt.schoolId)?.name ?? '—') : '—'}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <Button size="sm" fullWidth onClick={() => navigate('/appointments')}>
                      Book on this date
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Upcoming confirmed */}
          <Card>
            <CardHeader title="Upcoming confirmed" subtitle="Next four appointments" icon={<CalendarDays className="size-4.5" />} />
            <CardBody className="space-y-2 pt-0">
              {upcoming.length === 0 ? (
                <EmptyState icon={<CalendarDays className="size-5" />} title="Nothing confirmed yet" compact />
              ) : (
                upcoming.map((a) => {
                  const school = schoolById(a.schoolId)
                  return (
                    <button key={a.id} onClick={() => navigate(`/appointments/${a.id}`)}
                      className="w-full rounded-xl border border-line p-2.5 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/30">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[12px] font-semibold text-navy-900">{school?.name}</p>
                        <ClassBadge className={appointmentStatusTone(a.status)} size="sm">
                          {a.format === 'Online' ? 'Online' : 'In-person'}
                        </ClassBadge>
                      </div>
                      <p className="mt-0.5 text-[10.5px] text-slate-500">
                        {format(parseISO(a.date), 'EEE, dd MMM')} · {timeRange(a.startTime, a.endTime)}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <UserChip employeeId={a.employeeId} size="xs" />
                        {a.format === 'Online' && <Video className="size-3 text-slate-400" />}
                      </div>
                    </button>
                  )
                })
              )}
            </CardBody>
          </Card>

          {/* Working hours */}
          <Card>
            <CardHeader title="Working hours" subtitle="Applied to availability calculations" icon={<Clock3 className="size-4.5" />} />
            <CardBody className="space-y-2 pt-0">
              {[
                [describeWorkingDays(schedulingPolicy), 'Working days'],
                ['Sunday', 'Never offered'],
                [`${schedulingPolicy.workStart} – ${schedulingPolicy.workEnd}`, 'Working hours'],
                [`${schedulingPolicy.breakStart} – ${schedulingPolicy.breakEnd}`, 'Break'],
                [`${schedulingPolicy.durationMinutes} min`, 'Appointment length'],
                [`${schedulingPolicy.bufferMinutes} min`, 'Buffer'],
                [`${schedulingPolicy.minNoticeHours} h`, 'Min notice'],
                [`${schedulingPolicy.maxAdvanceDays} days`, 'Booking window'],
              ].map(([label, value]) => (
                <div key={value} className="flex items-center justify-between gap-3 border-b border-line pb-1.5 last:border-0 last:pb-0">
                  <span className="text-[11.5px] text-slate-500">{value}</span>
                  <span className="text-right text-[11.5px] font-medium text-navy-900">{label}</span>
                </div>
              ))}
              {schedulingPolicy.holidays.length > 0 && (
                <div className="rounded-lg bg-slate-50 p-2 ring-1 ring-line ring-inset">
                  <p className="mb-1 text-[10.5px] font-semibold text-slate-600">Holidays</p>
                  {schedulingPolicy.holidays.map((h) => (
                    <p key={h.date} className="flex items-center gap-1.5 text-[10.5px] text-slate-500">
                      <span className="size-1.5 shrink-0 rounded-full bg-slate-300" />
                      {h.date} — {h.label}
                    </p>
                  ))}
                </div>
              )}
              {schedulingPolicy.blockedDates.length > 0 && (
                <div className="rounded-lg bg-slate-50 p-2 ring-1 ring-line ring-inset">
                  <p className="mb-1 text-[10.5px] font-semibold text-slate-600">Blocked dates</p>
                  {schedulingPolicy.blockedDates.map((b) => (
                    <p key={`${b.date}-${b.employeeId}`} className="flex items-center gap-1.5 text-[10.5px] text-slate-500">
                      <span className="size-1.5 shrink-0 rounded-full bg-amber-400" />
                      {b.date} — {b.label}
                      {b.employeeId ? ` (${employeeById(b.employeeId)?.name ?? b.employeeId})` : ' (all)'}
                    </p>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Team */}
          <Card>
            <CardHeader title="Team availability" icon={<Clock3 className="size-4.5" />} />
            <CardBody className="space-y-2.5 pt-0">
              {employees
                .filter((e) => e.role === 'employee' && e.status === 'active')
                .map((e) => (
                  <div key={e.id} className="flex items-center gap-2.5">
                    <Avatar name={e.name} tone={e.avatarTone} size="xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-medium text-navy-900">{e.name}</p>
                      <p className="text-[10px] text-slate-400">{e.workingHours}</p>
                    </div>
                    <span className="text-[9.5px] text-slate-400">{employeeById(e.id)?.lastActive}</span>
                  </div>
                ))}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-2.5">
        <Info className="size-4 shrink-0 text-brand-500" />
        <p className="text-[11.5px] text-brand-800">
          Availability is calculated from the scheduling policy and existing appointments.
          Live calendar provider data requires the backend integration.
        </p>
      </div>
    </div>
  )
}

/* ─── Month cell ─────────────────────────────────────────────────────────── */
function MonthCell({
  day, cursor, availability, appointments, employeeId, selected, onClick, onOpenAppointment,
}: {
  day: Date
  cursor: Date
  availability: DayAvailability
  appointments: Appointment[]
  employeeId: string
  selected: boolean
  onClick: () => void
  onOpenAppointment: (id: string) => void
}) {
  const { schoolById } = useApp()
  const inMonth = isSameMonth(day, cursor)
  const style = statusStyle(availability, inMonth)
  const iso = format(day, 'yyyy-MM-dd')
  const items = appointments.filter(
    (a) => a.date === iso && (employeeId === 'all' || a.employeeId === employeeId),
  )

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'min-h-[90px] w-full cursor-pointer p-1.5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
        inMonth ? style.cellBg : 'bg-slate-50/40',
        selected && 'ring-2 ring-inset ring-brand-500 bg-brand-50/70',
        inMonth && !selected && 'hover:ring-1 hover:ring-inset hover:ring-brand-300',
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className={cn(
          'flex size-5 items-center justify-center rounded-full text-[11px] font-semibold',
          selected ? 'bg-brand-600 text-white'
            : isToday(day) ? 'bg-brand-100 text-brand-700 ring-1 ring-brand-300'
            : inMonth ? 'text-navy-900' : 'text-slate-300',
        )}>
          {format(day, 'd')}
        </span>
        {inMonth && style.dot && (
          <span className={cn('size-2 rounded-full', style.dot)} />
        )}
      </div>
      {inMonth && style.label && (
        <p className={cn('mb-0.5 text-[9px] font-semibold leading-tight', style.text)}>
          {style.label}
        </p>
      )}
      <div className="space-y-0.5">
        {items.slice(0, 2).map((a) => (
          <button
            key={a.id}
            onClick={(e) => { e.stopPropagation(); onOpenAppointment(a.id) }}
            className={cn(
              'block w-full truncate rounded px-1 py-0.5 text-left text-[9.5px] font-medium',
              a.status === 'Confirmed' ? 'bg-teal-100/80 text-teal-800'
                : a.status === 'Awaiting School Response' ? 'bg-amber-100/80 text-amber-800'
                : 'bg-brand-100/80 text-brand-800',
            )}
          >
            {timeLabel(a.startTime)} {schoolById(a.schoolId)?.name.split(' ')[0]}
          </button>
        ))}
        {items.length > 2 && (
          <p className="px-1 text-[9px] text-slate-400">+{items.length - 2} more</p>
        )}
      </div>
    </div>
  )
}

/* ─── Week/Day appointment chip ──────────────────────────────────────────── */
function AppointmentChip({ appointment, onClick }: { appointment: Appointment; onClick: () => void }) {
  const { schoolById } = useApp()
  const school = schoolById(appointment.schoolId)
  return (
    <button onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors',
        appointment.status === 'Confirmed' ? 'border-teal-200 bg-teal-50 hover:bg-teal-100/60'
          : appointment.status === 'Awaiting School Response' ? 'border-amber-200 bg-amber-50 hover:bg-amber-100/60'
          : 'border-brand-200 bg-brand-50 hover:bg-brand-100/60',
      )}>
      <span className="font-mono text-[10px] font-bold text-slate-500">{timeLabel(appointment.startTime)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11.5px] font-semibold text-navy-900">{school?.name}</span>
        <span className="block truncate text-[10px] text-slate-500">{appointment.contactName} · {appointment.format}</span>
      </span>
      <UserChip employeeId={appointment.employeeId} size="xs" />
    </button>
  )
}
