import { addDays, differenceInCalendarDays, format, getDay, parseISO } from 'date-fns'
import type { Appointment, TimeSlot } from './types'
import { isoDay, longDate, weekdayDate } from './utils'

/**
 * Appointment scheduling policy.
 *
 * These rules are configurable in Settings → Appointments and are applied by
 * every client-side availability calculation in this preview. The production
 * backend must enforce the same rules again before an invitation is sent.
 */
export interface PolicyBlock {
  date: string
  label: string
  employeeId: string | null
}

export interface SchedulingPolicy {
  /** 0 = Sunday … 6 = Saturday. Sunday is never offered, even if present. */
  workingDays: number[]
  workStart: string
  workEnd: string
  breakStart: string
  breakEnd: string
  durationMinutes: number
  bufferMinutes: number
  minNoticeHours: number
  maxAdvanceDays: number
  holdHours: number
  timezone: string
  holidays: PolicyBlock[]
  blockedDates: PolicyBlock[]
  avoidOverlap: boolean
  requireResearchApproval: boolean
  requireTemplateApproval: boolean
}

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]

/** A working weekday `offset` days ahead, used for clearly-labelled demo holidays. */
function demoWorkingDay(offset: number, workingDays: number[]) {
  let cursor = offset
  for (let index = 0; index < 14; index += 1) {
    const iso = isoDay(cursor)
    if (workingDays.includes(getDay(parseISO(iso)))) return iso
    cursor += 1
  }
  return isoDay(offset)
}

export function createDefaultPolicy(): SchedulingPolicy {
  return {
    workingDays: [...DEFAULT_WORKING_DAYS],
    workStart: '09:00',
    workEnd: '17:00',
    breakStart: '13:00',
    breakEnd: '14:00',
    durationMinutes: 30,
    bufferMinutes: 15,
    minNoticeHours: 2,
    maxAdvanceDays: 60,
    holdHours: 24,
    timezone: 'Asia/Kolkata (IST)',
    holidays: [
      {
        date: demoWorkingDay(9, DEFAULT_WORKING_DAYS),
        label: 'Regional school holiday (demo)',
        employeeId: null,
      },
    ],
    blockedDates: [
      {
        date: demoWorkingDay(12, DEFAULT_WORKING_DAYS),
        label: 'Employee training day (demo)',
        employeeId: 'emp-1',
      },
    ],
    avoidOverlap: true,
    requireResearchApproval: true,
    requireTemplateApproval: false,
  }
}

export function mergePolicy(stored: Partial<SchedulingPolicy> | null): SchedulingPolicy {
  const base = createDefaultPolicy()
  if (!stored) return base
  return {
    ...base,
    ...stored,
    workingDays: Array.isArray(stored.workingDays) ? stored.workingDays : base.workingDays,
    holidays: Array.isArray(stored.holidays) ? stored.holidays : base.holidays,
    blockedDates: Array.isArray(stored.blockedDates) ? stored.blockedDates : base.blockedDates,
  }
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

const pad = (value: number) => String(value).padStart(2, '0')

export function toMinutes(time: string) {
  const [hour, minute] = time.split(':').map(Number)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return 0
  return hour * 60 + minute
}

export function fromMinutes(total: number) {
  const minutes = Math.max(0, Math.min(24 * 60 - 1, total))
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

/** End time for a start time using the configured appointment duration. */
export function endTimeFor(start: string, policy: SchedulingPolicy) {
  return fromMinutes(toMinutes(start) + policy.durationMinutes)
}

/** Human-readable working-day summary, e.g. "Mon–Fri · Sunday never offered". */
export function describeWorkingDays(policy: SchedulingPolicy) {
  const days = [...policy.workingDays].filter((day) => day !== 0).sort((a, b) => a - b)
  if (days.length === 0) return 'No working days configured · Sunday never offered'
  const groups: string[] = []
  let runStart = days[0]
  let previous = days[0]
  for (let index = 1; index <= days.length; index += 1) {
    const day = days[index]
    if (day === previous + 1) {
      previous = day
      continue
    }
    groups.push(runStart === previous ? DAY_LABELS[runStart] : `${DAY_LABELS[runStart]}–${DAY_LABELS[previous]}`)
    runStart = day
    previous = day
  }
  return `${groups.join(', ')} · Sunday never offered`
}

export function policySummary(policy: SchedulingPolicy) {
  return `${describeWorkingDays(policy)} · ${policy.workStart}–${policy.workEnd} · ${policy.durationMinutes} min · ${policy.bufferMinutes} min buffer`
}

export function isHoliday(policy: SchedulingPolicy, date: string) {
  return policy.holidays.find((holiday) => holiday.date === date) ?? null
}

export function isBlocked(policy: SchedulingPolicy, date: string, employeeId: string) {
  return (
    policy.blockedDates.find(
      (block) => block.date === date && (block.employeeId === null || block.employeeId === employeeId),
    ) ?? null
  )
}

export type DateIssue =
  | 'missing'
  | 'invalid'
  | 'past'
  | 'sunday'
  | 'non-working'
  | 'holiday'
  | 'blocked'
  | 'too-soon'
  | 'too-far'
  | 'fully-booked'

export interface DateValidation {
  ok: boolean
  issue?: DateIssue
  message?: string
  suggestions: string[]
  isToday?: boolean
}

const ACTIVE_STATUSES = new Set([
  'Draft',
  'Pending Employee Confirmation',
  'Pending Approval',
  'Invitation Sending',
  'Invitation Sent',
  'Awaiting School Response',
  'Alternative Time Requested',
  'Confirmed',
  'Rescheduled',
])

function invalidDateIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return true
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) || format(parsed, 'yyyy-MM-dd') !== value
}

/** Calendar days from today (negative = past). */
export function daysFromToday(date: string) {
  return differenceInCalendarDays(parseISO(date), parseISO(isoDay(0)))
}

interface SlotOptions {
  excludeAppointmentId?: string
  respectNotice?: boolean
}

function overlapping(start: number, end: number, otherStart: number, otherEnd: number) {
  return start < otherEnd && end > otherStart
}

/**
 * Generates every configured slot for the date. Unavailable slots are returned
 * with a reason so the UI can show them as disabled (never selectable).
 */
export function generateSlots(
  date: string,
  policy: SchedulingPolicy,
  appointments: Appointment[],
  employeeId: string,
  options: SlotOptions = {},
): TimeSlot[] {
  if (invalidDateIso(date)) return []
  if (getDay(parseISO(date)) === 0) return []

  const workStart = toMinutes(policy.workStart)
  const workEnd = toMinutes(policy.workEnd)
  const duration = policy.durationMinutes
  const breakStart = toMinutes(policy.breakStart)
  const breakEnd = toMinutes(policy.breakEnd)
  const today = isoDay(0)
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const earliestToday = nowMinutes + policy.minNoticeHours * 60

  const booked = appointments.filter(
    (appointment) =>
      appointment.employeeId === employeeId &&
      appointment.date === date &&
      appointment.id !== options.excludeAppointmentId &&
      ACTIVE_STATUSES.has(appointment.status),
  )

  const slots: TimeSlot[] = []
  for (let start = workStart; start + duration <= workEnd; start += duration) {
    const end = start + duration
    let reason: string | undefined

    if (breakEnd > breakStart && overlapping(start, end, breakStart, breakEnd)) {
      reason = 'Lunch break'
    }

    if (!reason) {
      for (const appointment of booked) {
        const bookedStart = toMinutes(appointment.startTime)
        const bookedEnd = toMinutes(appointment.endTime)
        const bufferedStart = bookedStart - policy.bufferMinutes
        const bufferedEnd = bookedEnd + policy.bufferMinutes
        if (overlapping(start, end, bookedStart, bookedEnd)) {
          reason = `Existing appointment · ${appointment.contactName}`
          break
        }
        if (overlapping(start, end, bufferedStart, bufferedEnd)) {
          reason = `${policy.bufferMinutes}-minute buffer`
          break
        }
      }
    }

    if (!reason && date === today && options.respectNotice !== false && start < earliestToday) {
      reason = `Inside ${policy.minNoticeHours}-hour notice`
    }

    slots.push({
      start: fromMinutes(start),
      end: fromMinutes(end),
      available: !reason,
      reason,
    })
  }
  return slots
}

/** Scans forward for the next eligible dates (does not check full booking). */
export function suggestDates(
  policy: SchedulingPolicy,
  appointments: Appointment[],
  employeeId: string,
  from: string = isoDay(0),
  count = 4,
) {
  const suggestions: string[] = []
  let cursor = from
  for (let index = 0; index < 120 && suggestions.length < count; index += 1) {
    const check = validateDate(cursor, policy, appointments, employeeId, {
      checkCapacity: false,
      _skipSuggestions: true,
    })
    if (check.ok && daysFromToday(cursor) >= 0) suggestions.push(cursor)
    cursor = format(addDays(parseISO(cursor), 1), 'yyyy-MM-dd')
  }
  return suggestions
}

export function validateDate(
  date: string,
  policy: SchedulingPolicy,
  appointments: Appointment[],
  employeeId: string,
  options: { checkCapacity?: boolean; _skipSuggestions?: boolean } = {},
): DateValidation {
  const checkCapacity = options.checkCapacity !== false

  const build = (issue: DateIssue, message: string, from = date): DateValidation => ({
    ok: false,
    issue,
    message,
    // When called from inside suggestDates, skip the recursive suggestions
    // call to prevent a mutual-recursion stack overflow.
    suggestions: options._skipSuggestions
      ? []
      : suggestDates(policy, appointments, employeeId, from, 4),
  })

  if (!date || !date.trim()) return build('missing', 'Please choose a date first.', isoDay(0))
  if (invalidDateIso(date)) return build('invalid', 'That is not a valid calendar date.', isoDay(0))

  const parsed = parseISO(date)
  const day = getDay(parsed)
  const offset = daysFromToday(date)

  if (offset < 0) {
    return build('past', `${longDate(date)} has already passed. Choose a future working day.`, isoDay(0))
  }

  if (day === 0) {
    return build('sunday', 'Sunday is not available for school appointments. Please select a working day.', isoDay(1))
  }

  if (!policy.workingDays.includes(day)) {
    return build(
      'non-working',
      `${DAY_NAMES[day]} is not a configured school appointment day under the current policy.`,
      isoDay(1),
    )
  }

  const holiday = isHoliday(policy, date)
  if (holiday) {
    return build('holiday', `${longDate(date)} is a configured holiday — ${holiday.label}.`, isoDay(1))
  }

  const blocked = isBlocked(policy, date, employeeId)
  if (blocked) {
    return build('blocked', `${longDate(date)} is blocked on your calendar — ${blocked.label}.`, isoDay(1))
  }

  if (offset > policy.maxAdvanceDays) {
    return build(
      'too-far',
      `Appointments can only be booked up to ${policy.maxAdvanceDays} days in advance.`,
      isoDay(1),
    )
  }

  if (offset === 0) {
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    if (nowMinutes + policy.minNoticeHours * 60 >= toMinutes(policy.workEnd)) {
      return build(
        'too-soon',
        `Today no longer has enough notice for a ${policy.durationMinutes}-minute appointment. Choose the next working day.`,
        isoDay(1),
      )
    }
  }

  if (checkCapacity) {
    const slots = generateSlots(date, policy, appointments, employeeId)
    if (slots.length === 0 || slots.every((slot) => !slot.available)) {
      const next = format(addDays(parsed, 1), 'yyyy-MM-dd')
      return build(
        'fully-booked',
        `Every appointment window on ${weekdayDate(date)} is already taken, inside a buffer or outside working hours.`,
        next,
      )
    }
  }

  return { ok: true, suggestions: [], isToday: offset === 0 }
}

/* ------------------------- natural-language parsing ------------------------ */

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

const isoDayValue = (date: Date) => format(date, 'yyyy-MM-dd')

/**
 * Parses the date expressions employees actually type. Returns null when the
 * message contains no date, so the agent can ask only for what is missing.
 */
export function parseDateInput(text: string): string | null {
  const value = text.trim().toLowerCase().replace(/,/g, ' ')
  if (!value) return null

  const iso = value.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const candidate = `${iso[1]}-${iso[2]}-${iso[3]}`
    if (!invalidDateIso(candidate)) return candidate
  }

  const slash = value.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/)
  if (slash) {
    const first = Number(slash[1])
    const second = Number(slash[2])
    let year = Number(slash[3])
    if (year < 100) year += 2000
    // Indian convention: dd/mm/yyyy. Swap only when the first part cannot be a month.
    const day = first > 12 ? first : second > 12 ? second : first
    const month = first > 12 ? second : second > 12 ? first : first
    const candidate = `${year}-${pad(month)}-${pad(day)}`
    if (!invalidDateIso(candidate)) return candidate
  }

  if (/\bday after tomorrow\b/.test(value)) return isoDay(2)
  if (/\btomorrow\b/.test(value)) return isoDay(1)
  if (/\btoday\b/.test(value)) return isoDay(0)

  // "20 November", "20th of Nov 2026", "November 20"
  const dayMonth = value.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]{3,9})(?:\s+(\d{4}))?\b/,
  )
  const monthDay = value.match(
    /\b([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?\b/,
  )
  const match = dayMonth ?? monthDay
  if (match) {
    const monthName = dayMonth ? match[2] : match[1]
    const dayNumber = Number(dayMonth ? match[1] : match[2])
    const yearPart = match[3]
    const month = MONTHS[monthName]
    if (month !== undefined && dayNumber >= 1 && dayNumber <= 31) {
      const currentYear = new Date().getFullYear()
      let year = yearPart ? Number(yearPart) : currentYear
      let candidate = `${year}-${pad(month + 1)}-${pad(dayNumber)}`
      if (!yearPart && daysFromToday(candidate) < 0) {
        year += 1
        candidate = `${year}-${pad(month + 1)}-${pad(dayNumber)}`
      }
      if (!invalidDateIso(candidate)) return candidate
    }
  }

  if (/\bnext week\b/.test(value) || /\bany\b.*\b(working|available|week)\b/.test(value)) {
    // Next Monday (or the first working day after it) is the natural anchor.
    const today = new Date()
    const start = addDays(today, ((8 - getDay(today)) % 7) || 7)
    return isoDayValue(start)
  }

  const weekdayMatch = value.match(/\b(next|this|coming)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/)
  if (weekdayMatch) {
    const target = WEEKDAYS[weekdayMatch[2]]
    const today = new Date()
    const current = getDay(today)
    let diff = (target - current + 7) % 7
    if (diff === 0) diff = 7
    const candidate = isoDayValue(addDays(today, diff))
    if (weekdayMatch[1] === 'next') {
      // "Next Monday" said on Saturday still means the coming Monday.
      return candidate
    }
    return candidate
  }

  return null
}

/** Parses "11", "11:30", "2 pm", "14:00" into a HH:mm string. */
export function parseTimeInput(text: string): string | null {
  const value = text.trim().toLowerCase()
  if (!value) return null

  const meridiem = value.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/)
  if (meridiem) {
    let hour = Number(meridiem[1])
    const minute = meridiem[2] ? Number(meridiem[2]) : 0
    if (hour >= 1 && hour <= 12 && minute <= 59) {
      if (meridiem[3] === 'pm' && hour < 12) hour += 12
      if (meridiem[3] === 'am' && hour === 12) hour = 0
      return `${pad(hour)}:${pad(minute)}`
    }
  }

  const colon = value.match(/\b(\d{1,2}):(\d{2})\b/)
  if (colon) {
    const hour = Number(colon[1])
    const minute = Number(colon[2])
    if (hour <= 23 && minute <= 59) return `${pad(hour)}:${pad(minute)}`
  }

  if (/\b(noon|midday)\b/.test(value)) return '12:00'

  const bare = value.match(/\b(\d{1,2})\b/)
  if (bare) {
    const hour = Number(bare[1])
    if (hour >= 7 && hour <= 20) return `${pad(hour)}:00`
  }

  return null
}

/** Formats a slot for conversation copy, e.g. "11:00 AM". */
export function slotLabel(start: string) {
  const [hour, minute] = start.split(':').map(Number)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display}:${pad(minute)} ${suffix}`
}
