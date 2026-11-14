import clsx, { type ClassValue } from 'clsx'
import {
  addDays,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfWeek,
} from 'date-fns'
import type {
  AppointmentStatus,
  EmailStatus,
  FollowUpStatus,
  SalesStage,
  VerificationStatus,
} from './types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** ISO date (yyyy-MM-dd) for `offset` days from today. */
export function isoDay(offset = 0) {
  return format(addDays(new Date(), offset), 'yyyy-MM-dd')
}

export function shortDate(iso: string) {
  try {
    return format(parseISO(iso), 'dd MMM yyyy')
  } catch {
    return iso
  }
}

export function weekdayDate(iso: string) {
  try {
    return format(parseISO(iso), 'EEE, dd MMM')
  } catch {
    return iso
  }
}

export function longDate(iso: string) {
  try {
    return format(parseISO(iso), 'EEEE, dd MMMM yyyy')
  } catch {
    return iso
  }
}

export function timeLabel(time: string) {
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

export function timeRange(start: string, end: string) {
  return `${timeLabel(start)} – ${timeLabel(end)}`
}

export function relativeTime(iso: string) {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return shortDate(iso.slice(0, 10))
}

export function clockTime(date: Date = new Date()) {
  return format(date, 'HH:mm')
}

export function weekStart(date: Date = new Date()) {
  return startOfWeek(date, { weekStartsOn: 1 })
}

export { isSameDay, isToday, parseISO, addDays, format }

const statusTone: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-600 ring-slate-200',
  'Pending Employee Confirmation': 'bg-amber-50 text-amber-700 ring-amber-200',
  'Pending Approval': 'bg-amber-50 text-amber-700 ring-amber-200',
  'Invitation Sending': 'bg-sky-50 text-sky-700 ring-sky-200',
  'Invitation Sent': 'bg-brand-50 text-brand-700 ring-brand-200',
  'Awaiting School Response': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  'Alternative Time Requested': 'bg-orange-50 text-orange-700 ring-orange-200',
  Confirmed: 'bg-teal-50 text-teal-700 ring-teal-200',
  Declined: 'bg-rose-50 text-rose-700 ring-rose-200',
  Rescheduled: 'bg-violet-50 text-violet-700 ring-violet-200',
  Cancelled: 'bg-slate-100 text-slate-500 ring-slate-200',
  Expired: 'bg-slate-100 text-slate-500 ring-slate-200',
  Failed: 'bg-rose-50 text-rose-700 ring-rose-200',
}

export function appointmentStatusTone(status: AppointmentStatus) {
  return statusTone[status] ?? 'bg-slate-100 text-slate-600 ring-slate-200'
}

export function emailStatusTone(status: EmailStatus) {
  switch (status) {
    case 'Delivered':
      return 'bg-teal-50 text-teal-700 ring-teal-200'
    case 'Sent':
      return 'bg-brand-50 text-brand-700 ring-brand-200'
    case 'Sending':
      return 'bg-sky-50 text-sky-700 ring-sky-200'
    case 'Failed':
      return 'bg-rose-50 text-rose-700 ring-rose-200'
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-200'
  }
}

export function verificationTone(status: VerificationStatus) {
  switch (status) {
    case 'verified':
      return 'bg-teal-50 text-teal-700 ring-teal-200'
    case 'needs-review':
      return 'bg-amber-50 text-amber-700 ring-amber-200'
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-200'
  }
}

export function stageTone(stage: SalesStage) {
  const map: Record<SalesStage, string> = {
    'New Lead': 'bg-sky-50 text-sky-700 ring-sky-200',
    Researching: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    'Contact Verified': 'bg-brand-50 text-brand-700 ring-brand-200',
    'Ready for Appointment': 'bg-brand-50 text-brand-700 ring-brand-200',
    'Invitation Sent': 'bg-violet-50 text-violet-700 ring-violet-200',
    'Waiting for Response': 'bg-amber-50 text-amber-700 ring-amber-200',
    'Appointment Confirmed': 'bg-teal-50 text-teal-700 ring-teal-200',
    'Appointment Completed': 'bg-teal-50 text-teal-700 ring-teal-200',
    'Follow-up Required': 'bg-orange-50 text-orange-700 ring-orange-200',
    Interested: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    Converted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    'Not Interested': 'bg-rose-50 text-rose-700 ring-rose-200',
    'On Hold': 'bg-slate-100 text-slate-600 ring-slate-200',
  }
  return map[stage]
}

export function followUpTone(status: FollowUpStatus) {
  switch (status) {
    case 'Overdue':
      return 'bg-rose-50 text-rose-700 ring-rose-200'
    case 'Due Today':
      return 'bg-amber-50 text-amber-700 ring-amber-200'
    case 'Completed':
      return 'bg-teal-50 text-teal-700 ring-teal-200'
    case 'Cancelled':
      return 'bg-slate-100 text-slate-500 ring-slate-200'
    default:
      return 'bg-sky-50 text-sky-700 ring-sky-200'
  }
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escape(row[header] ?? '')).join(',')),
  ].join('\r\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function pct(value: number, total: number) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

/** Basic syntactic checks shared by forms and the agent. */
export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value.trim())
}

export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15
}

