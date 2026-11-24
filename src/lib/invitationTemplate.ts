import type { Appointment, AppointmentDraft, AppointmentFormat } from './types'
import { longDate, timeRange } from './utils'

/**
 * Standard appointment invitation template.
 *
 * The company introduction, meeting purpose, response options and closing are
 * fixed content shared by every invitation. Only the five appointment detail
 * fields are populated per appointment — they are always derived from the
 * appointment record so the preview can never drift from the booking.
 */

/** The configured Eduvian office account that sends appointment invitations. */
export const INVITATION_SENDER = 'appointments@eduvian.in'

/** Fixed subject line used for every appointment invitation. */
export const INVITATION_SUBJECT = 'Request for an Appointment – Eduvian Solutions'

/** Fixed company introduction — identical in every invitation, never edited per school. */
export const INVITATION_INTRO_PARAGRAPHS: readonly string[] = [
  'Dear Sir/Madam,',
  'Greetings from Eduvian Solutions!',
  "We are reaching out to introduce our educational solutions and discuss how we can support your institution in enhancing students' learning experiences and overall development.",
  "Eduvian Solutions focuses on providing educational programmes and value-added learning initiatives for students. Our programmes aim to develop students' knowledge, practical skills, confidence, good habits and essential life skills through structured and engaging learning experiences.",
]

/** Fixed lead-in for the meeting purpose. */
export const INVITATION_PURPOSE_LEAD =
  'We would appreciate an opportunity to meet with your school management or the concerned representative to:'

/** Fixed meeting-purpose bullets. */
export const INVITATION_PURPOSE_BULLETS: readonly string[] = [
  'Introduce Eduvian Solutions and our educational initiatives.',
  'Explain our programmes and their benefits for students.',
  "Discuss how our programmes can be incorporated into your school's learning environment.",
  "Understand your institution's requirements and explore possible opportunities for collaboration.",
]

/** Fixed confirmation request that follows the purpose. */
export const INVITATION_CONFIRM_LINE =
  'We would be grateful if you could confirm your availability for the proposed appointment.'

/** Fixed heading above the auto-populated detail fields. */
export const INVITATION_DETAILS_HEADING = 'Appointment Details:'

/** The five appointment-specific fields — populated from the appointment record. */
export interface InvitationDetails {
  schoolName: string
  date: string
  time: string
  mode: string
  location: string
}

export const INVITATION_DETAIL_FIELDS: readonly {
  readonly key: keyof InvitationDetails
  readonly label: string
}[] = [
  { key: 'schoolName', label: 'School Name' },
  { key: 'date', label: 'Proposed Date' },
  { key: 'time', label: 'Proposed Time' },
  { key: 'mode', label: 'Meeting Mode' },
  { key: 'location', label: 'Meeting Location / Link' },
]

/** Fixed lead-in for the response options. */
export const INVITATION_OPTIONS_LEAD = 'Please select one of the following options:'

export interface InvitationResponseOption {
  readonly label: string
  /** `null` uses the plain response link; otherwise appended as `?choice=…`. */
  readonly choice: string | null
}

/** The three secure response options included in every invitation. */
export const INVITATION_RESPONSE_OPTIONS: readonly InvitationResponseOption[] = [
  { label: 'Confirm This Time', choice: null },
  { label: 'Not Available', choice: 'unavailable' },
  { label: 'Request Another Time', choice: 'another' },
]

/** Fixed closing of every invitation. */
export const INVITATION_CLOSING_PARAGRAPHS: readonly string[] = [
  'We look forward to the opportunity to connect with your institution.',
  'Best Regards,',
  'Team Eduvian Solutions',
]

/** Raw record fields the template needs — works for appointments and agent drafts alike. */
export interface InvitationDetailsInput {
  schoolName: string
  date: string
  startTime: string
  endTime: string
  format: AppointmentFormat
  location: string
}

/** Auto-fills the five detail fields from the record. */
export function invitationDetails(input: InvitationDetailsInput): InvitationDetails {
  const location = input.location.trim()
  return {
    schoolName: input.schoolName.trim() || '—',
    date: input.date ? longDate(input.date) : '—',
    time: input.startTime ? `${timeRange(input.startTime, input.endTime)} IST` : '—',
    mode: input.format,
    location:
      location ||
      (input.format === 'Online'
        ? 'Meeting link shared on confirmation'
        : 'Address shared on confirmation'),
  }
}

/** Detail values for a stored appointment record. */
export function appointmentInvitationDetails(
  appointment: Appointment,
  schoolName?: string | null,
): InvitationDetails {
  return invitationDetails({
    schoolName: schoolName ?? '',
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    format: appointment.format,
    location: appointment.location,
  })
}

/** Detail values for an agent draft (before the appointment record exists). */
export function draftInvitationDetails(draft: AppointmentDraft): InvitationDetails {
  return invitationDetails({
    schoolName: draft.schoolName,
    date: draft.date,
    startTime: draft.startTime,
    endTime: draft.endTime,
    format: draft.format,
    location: draft.location || draft.meetingLink || '',
  })
}

/** Secure response path for one of the three options (`demo-` links run without a backend). */
export function invitationResponsePath(appointmentId: string, choice?: string | null): string {
  const base = `/invite/demo-${appointmentId}`
  return choice ? `${base}?choice=${choice}` : base
}

/**
 * Plain-text rendering of the full invitation — used for copy-to-clipboard so the
 * copied text matches the on-screen preview exactly.
 */
export function composeInvitationBody(details: InvitationDetails, responseBase?: string): string {
  const optionLines = INVITATION_RESPONSE_OPTIONS.map((option) =>
    responseBase
      ? `- ${option.label}: ${responseBase}${option.choice ? `?choice=${option.choice}` : ''}`
      : `- ${option.label}`,
  )
  return [
    ...INVITATION_INTRO_PARAGRAPHS,
    '',
    INVITATION_PURPOSE_LEAD,
    ...INVITATION_PURPOSE_BULLETS.map((bullet) => `- ${bullet}`),
    '',
    INVITATION_CONFIRM_LINE,
    '',
    INVITATION_DETAILS_HEADING,
    ...INVITATION_DETAIL_FIELDS.map((field) => `- ${field.label}: ${details[field.key]}`),
    '',
    INVITATION_OPTIONS_LEAD,
    ...optionLines,
    '',
    ...INVITATION_CLOSING_PARAGRAPHS,
  ].join('\n')
}
