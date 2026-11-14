import { useRef, useState } from 'react'
import { addDays, format } from 'date-fns'
import type {
  AgentCard,
  AgentCardAction,
  AgentContactDetails,
  AgentContactSource,
  AgentMessage,
  AppointmentDraft,
  AppointmentFormat,
} from '../../lib/types'
import {
  DEMO_EMPLOYEE_ID,
  registerResearchSchool,
  researchResults,
  schoolById,
  schools,
} from '../../data/demo'
import {
  describeWorkingDays,
  endTimeFor,
  generateSlots,
  parseDateInput,
  parseTimeInput,
  slotLabel,
  suggestDates,
  validateDate,
} from '../../lib/scheduling'
import {
  isoDay,
  isValidEmail,
  isValidPhone,
  shortDate,
  timeLabel,
  weekdayDate,
} from '../../lib/utils'
import { useApp } from '../../store/AppStore'

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

export type AgentStage =
  | 'idle'
  | 'researching'
  | 'awaiting-school'
  | 'awaiting-contact'
  | 'awaiting-verification'
  | 'awaiting-contact-details'
  | 'awaiting-contact-confirm'
  | 'awaiting-date'
  | 'awaiting-slot'
  | 'awaiting-confirm'
  | 'awaiting-approval'
  | 'sent'

export interface PendingContact {
  name: string
  designation: string
  email: string
  phone: string
}

export interface AgentContext {
  workflow: 'existing' | 'research' | null
  stage: AgentStage
  schoolId: string | null
  schoolName: string | null
  schoolCity: string | null
  contactId: string | null
  contactName: string | null
  contactDesignation: string | null
  contactEmail: string | null
  contactPhone: string | null
  contactVerified: boolean | null
  contactSource: AgentContactSource | null
  date: string | null
  startTime: string | null
  endTime: string | null
  slot: string | null
  format: AppointmentFormat
  meetingLink: string | null
  purpose: string | null
  draft: AppointmentDraft | null
  appointmentId: string | null
  pendingContact: PendingContact | null
}

const emptyContext: AgentContext = {
  workflow: null,
  stage: 'idle',
  schoolId: null,
  schoolName: null,
  schoolCity: null,
  contactId: null,
  contactName: null,
  contactDesignation: null,
  contactEmail: null,
  contactPhone: null,
  contactVerified: null,
  contactSource: null,
  date: null,
  startTime: null,
  endTime: null,
  slot: null,
  format: 'In-person',
  meetingLink: null,
  purpose: null,
  draft: null,
  appointmentId: null,
  pendingContact: null,
}

const EXISTING_SCHOOL_IDS = ['sch-1', 'sch-2', 'sch-3', 'sch-5', 'sch-8']

const greeting = (): AgentMessage => ({
  id: 'msg-greeting',
  from: 'agent',
  at: new Date().toISOString(),
  text:
    "I'm your Eduvian appointment agent. I can book a meeting with a school that's already in your records, or research a new school first and then book. Which would you like to do?",
  card: { kind: 'workflow-choice' },
})

const defaultChips = [
  'Book an appointment with ABC International School',
  'Find CBSE schools in Chennai',
  'Show my appointments this week',
]

let counter = 0
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${++counter}`

/* --------------------------- natural-language helpers --------------------------- */

const ORDINALS: Record<string, number> = {
  first: 0,
  '1st': 0,
  second: 1,
  '2nd': 1,
  third: 2,
  '3rd': 2,
  fourth: 3,
  '4th': 3,
  fifth: 4,
  '5th': 4,
}

function ordinalIndex(text: string) {
  const word = text.match(/\b(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)\b/)?.[1]
  if (word) return ORDINALS[word] ?? null
  const number = text.match(/\b([1-5])\b/)?.[1]
  return number ? Number(number) - 1 : null
}

const GENERIC_SCHOOL_WORDS = new Set([
  'school',
  'schools',
  'international',
  'public',
  'senior',
  'secondary',
  'higher',
  'matriculation',
  'academy',
  'global',
  'vidya',
  'vidyalaya',
  'the',
  'and',
  'of',
])

function distinctiveTokens(name: string) {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !GENERIC_SCHOOL_WORDS.has(token))
}

function findSchoolInText(text: string) {
  const lower = text.toLowerCase()
  const exact = schools.find((school) => lower.includes(school.name.toLowerCase()))
  if (exact) return exact
  const tokens = new Set(lower.split(/[^a-z0-9]+/).filter(Boolean))
  return (
    schools.find((school) =>
      distinctiveTokens(school.name).some((token) => tokens.has(token)),
    ) ?? null
  )
}

function findResearchInText(text: string) {
  const lower = text.toLowerCase()
  const exact = researchResults.find((result) => lower.includes(result.name.toLowerCase()))
  if (exact) return exact
  const tokens = new Set(lower.split(/[^a-z0-9]+/).filter(Boolean))
  return (
    researchResults.find((result) =>
      distinctiveTokens(result.name).some((token) => tokens.has(token)),
    ) ?? null
  )
}

function parseContactDetails(text: string): Partial<PendingContact> {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? ''
  const phone = text.match(/(?:\+?\d[\d\s()-]{7,}\d)/)?.[0]?.trim() ?? ''

  const labelledName = text.match(/\bname\s*[:=-]\s*([^,;\n]+)/i)?.[1]?.trim() ?? ''
  const labelledDesignation =
    text.match(/\b(?:designation|role|title)\s*[:=-]\s*([^,;\n]+)/i)?.[1]?.trim() ?? ''

  let rest = text
    .replace(email, ' ')
    .replace(phone, ' ')
    .replace(/\b(replace|change|use|the|contact|with|details|please|official)\b/gi, ' ')
  rest = rest.replace(/\b(name|designation|role|title|email|phone)\b\s*[:=-]?/gi, ' ')

  const parts = rest
    .split(/[,;\n]+/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  return {
    name: labelledName || parts[0] || '',
    designation: labelledDesignation || parts[1] || '',
    email,
    phone,
  }
}

function sameDraft(left: AppointmentDraft, right: AppointmentDraft) {
  return (
    left.schoolId === right.schoolId &&
    left.date === right.date &&
    left.startTime === right.startTime &&
    left.contactEmail === right.contactEmail &&
    left.format === right.format
  )
}

/**
 * Front-end demonstration engine.
 *
 * This reproduces the conversation flow, cards and context tracking the backend
 * agent will drive through tool calls. It performs no network requests, sends no
 * email and writes no calendar events — every outcome is labelled as a preview.
 *
 * Booking order is intentionally date-first: the agent never assumes tomorrow,
 * validates the chosen date against the scheduling policy, then shows the slots
 * that are actually open before preparing a summary.
 */
export function useAgentDemo() {
  const {
    appointments,
    createAppointment,
    pushToast,
    requestApproval,
    schedulingPolicy,
    user,
  } = useApp()

  const [messages, setMessages] = useState<AgentMessage[]>([greeting()])
  const [thinking, setThinking] = useState(false)
  const [context, setContext] = useState<AgentContext>(emptyContext)
  const [promptChips, setPromptChips] = useState<string[]>(defaultChips)

  const contextRef = useRef<AgentContext>(emptyContext)
  const busy = useRef(false)
  const policyRef = useRef(schedulingPolicy)
  policyRef.current = schedulingPolicy
  const appointmentsRef = useRef(appointments)
  appointmentsRef.current = appointments
  const employeeIdRef = useRef(user?.id ?? DEMO_EMPLOYEE_ID)
  employeeIdRef.current = user?.id ?? DEMO_EMPLOYEE_ID

  function updateContext(patch: Partial<AgentContext>) {
    const next = { ...contextRef.current, ...patch }
    contextRef.current = next
    setContext(next)
  }

  function push(message: Omit<AgentMessage, 'id' | 'at'>) {
    setMessages((current) => [
      ...current,
      { ...message, id: nextId('msg'), at: new Date().toISOString() },
    ])
  }

  async function tool(text: string, meta: string, delay = 350) {
    await sleep(delay)
    push({ from: 'system', text, meta })
  }

  function maxAdvanceDate() {
    return format(addDays(new Date(), policyRef.current.maxAdvanceDays), 'yyyy-MM-dd')
  }

  function datePickerCard(reason?: string): AgentCard {
    const policy = policyRef.current
    return {
      kind: 'date-picker',
      suggestions: suggestDates(policy, appointmentsRef.current, employeeIdRef.current),
      workingDaysLabel: describeWorkingDays(policy),
      minDate: isoDay(0),
      maxDate: maxAdvanceDate(),
      schoolName: contextRef.current.schoolName ?? undefined,
      reason,
    }
  }

  async function askForDate(intro?: string) {
    updateContext({ stage: 'awaiting-date' })
    await tool(
      'Checked the scheduling policy · eligible days, holidays and blocked dates',
      'get_scheduling_policy()',
    )
    let card: AgentCard
    try {
      card = datePickerCard()
    } catch {
      card = {
        kind: 'date-picker',
        suggestions: [],
        workingDaysLabel: describeWorkingDays(policyRef.current),
        minDate: isoDay(0),
        maxDate: isoDay(policyRef.current.maxAdvanceDays),
        schoolName: contextRef.current.schoolName ?? undefined,
      }
    }
    push({
      from: 'agent',
      text:
        intro ??
        `Which date works for the appointment with ${contextRef.current.schoolName ?? 'the school'}? I will only offer configured working days in IST — Sunday is never available.`,
      card,
    })
    try {
      setPromptChips(
        suggestDates(policyRef.current, appointmentsRef.current, employeeIdRef.current, isoDay(0), 3).map(
          shortDate,
        ),
      )
    } catch {
      setPromptChips(['Next Monday', 'Next Tuesday', 'Next Wednesday'])
    }
  }

  async function showSlots(date: string, note?: string) {
    const policy = policyRef.current
    const employeeId = employeeIdRef.current
    const slots = generateSlots(date, policy, appointmentsRef.current, employeeId)
    const available = slots.filter((slot) => slot.available)

    if (!available.length) {
      const check = validateDate(date, policy, appointmentsRef.current, employeeId)
      updateContext({ stage: 'awaiting-date', date: null, startTime: null, endTime: null, slot: null })
      push({
        from: 'agent',
        text:
          check.message ??
          `${weekdayDate(date)} has no open appointment windows. Choose another working day.`,
        card: datePickerCard(check.message),
      })
      return false
    }

    updateContext({ stage: 'awaiting-slot', date, startTime: null, endTime: null, slot: null })
    await tool(
      `Checked ${weekdayDate(date)} availability · ${available.length} open window${
        available.length === 1 ? '' : 's'
      }`,
      'check_calendar_availability()',
    )
    push({
      from: 'agent',
      text:
        note ??
        `${weekdayDate(date)} has ${available.length} open window${
          available.length === 1 ? '' : 's'
        } in IST. I've excluded the lunch break, your existing appointments and the ${
          policy.bufferMinutes
        }-minute buffer. Which time suits you?`,
      card: {
        kind: 'slots',
        slots,
        date,
        employeeId,
        workingHours: `${policy.workStart}–${policy.workEnd}`,
        durationMinutes: policy.durationMinutes,
        bufferMinutes: policy.bufferMinutes,
        timezone: policy.timezone,
      },
    })
    setPromptChips(available.slice(0, 3).map((slot) => slotLabel(slot.start)))
    return true
  }

  function buildDraft(
    date: string,
    start: string,
    end?: string,
    purpose?: string,
  ): AppointmentDraft | null {
    const current = contextRef.current
    const school = current.schoolId ? schoolById(current.schoolId) : null
    if (!school || !current.contactName || !current.contactEmail) return null

    const policy = policyRef.current
    const endTime = end || endTimeFor(start, policy)
    const online = current.format === 'Online'

    return {
      schoolId: school.id,
      schoolName: school.name,
      contactId: current.contactId ?? `draft-${school.id}`,
      contactName: current.contactName,
      contactDesignation: current.contactDesignation ?? '',
      contactEmail: current.contactEmail,
      contactPhone: current.contactPhone ?? undefined,
      contactVerified: current.contactVerified ?? true,
      contactSource: current.contactSource ?? 'record',
      date,
      startTime: start,
      endTime,
      format: current.format,
      location: online ? '' : school.address,
      meetingLink: online ? current.meetingLink ?? undefined : undefined,
      employeeId: employeeIdRef.current,
      workflow: current.workflow ?? 'existing',
      purpose: purpose ?? current.purpose ?? `Introductory appointment · ${school.type}`,
      edited: false,
    }
  }

  async function showSummary(
    draft: AppointmentDraft,
    options: { edited?: boolean; note?: string } = {},
  ) {
    updateContext({
      stage: 'awaiting-confirm',
      draft,
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      slot: `${slotLabel(draft.startTime)} – ${slotLabel(draft.endTime)}`,
      schoolId: draft.schoolId,
      schoolName: draft.schoolName,
      contactId: draft.contactId,
      contactName: draft.contactName,
      contactDesignation: draft.contactDesignation,
      contactEmail: draft.contactEmail,
      contactPhone: draft.contactPhone ?? null,
      contactVerified: draft.contactVerified ?? true,
      contactSource: draft.contactSource ?? 'record',
      format: draft.format,
      meetingLink: draft.meetingLink ?? null,
      purpose: draft.purpose ?? null,
      appointmentId: null,
    })
    await tool(
      options.edited
        ? 'Revalidated the edited draft · nothing sent'
        : 'Prepared the appointment summary · awaiting employee confirmation',
      options.edited ? 'update_appointment_draft()' : 'prepare_appointment_summary()',
    )
    push({
      from: 'agent',
      text:
        options.note ??
        (options.edited
          ? 'I updated the summary and rechecked the date, slot and contact. Nothing has been sent — review it and confirm when you are ready.'
          : 'Here is the appointment I will propose. Please check every detail — I will only prepare the invitation after you confirm.'),
      card: { kind: 'summary', draft, status: 'Awaiting Your Confirmation' },
    })
    setPromptChips(['Confirm and prepare email', 'Edit details', 'Change time'])
  }

  async function showSummaryFromContext(edited = false, note?: string) {
    const current = contextRef.current
    if (!current.date || !current.startTime || !current.endTime) {
      await askForDate()
      return
    }
    const draft = buildDraft(current.date, current.startTime, current.endTime)
    if (!draft) {
      await startContactReplacementInternal(
        'I need a verified official contact before I can prepare the invitation.',
      )
      return
    }
    await showSummary(draft, { edited, note })
  }

  async function showContactConfirm(mode: 'confirm' | 'verify' | 'replacement') {
    const current = contextRef.current
    const pending = current.pendingContact
    const contact: AgentContactDetails =
      mode === 'replacement' && pending
        ? {
            id: current.contactId,
            name: pending.name,
            designation: pending.designation,
            email: pending.email,
            phone: pending.phone,
            source: 'employee',
            verified: false,
          }
        : {
            id: current.contactId,
            name: current.contactName ?? '',
            designation: current.contactDesignation ?? '',
            email: current.contactEmail ?? '',
            phone: current.contactPhone ?? '',
            source: current.contactSource ?? 'record',
            verified: current.contactVerified ?? false,
          }

    updateContext({
      stage: mode === 'replacement' ? 'awaiting-contact-confirm' : 'awaiting-verification',
    })
    await tool(
      mode === 'replacement'
        ? 'Validated the replacement contact · awaiting employee confirmation'
        : 'Contact requires employee verification',
      'validate_school_contact()',
    )
    push({
      from: 'agent',
      text:
        mode === 'replacement'
          ? `Please confirm the replacement contact for ${current.schoolName ?? 'this school'}. I will apply it to this invitation only — the school record stays unchanged.`
          : `Before I prepare the invitation, please confirm these contact details for ${
              current.schoolName ?? 'this school'
            }. I never guess email addresses or phone numbers.`,
      card: {
        kind: 'contact-confirm',
        schoolName: current.schoolName ?? 'the school',
        contact,
        mode,
        previousName: mode === 'replacement' ? current.contactName ?? undefined : undefined,
      },
    })
    setPromptChips(['Use these details', 'Replace contact'])
  }

  async function startContactReplacementInternal(reason?: string) {
    const current = contextRef.current
    if (!current.schoolId) {
      push({
        from: 'agent',
        text: 'Choose a school first, then I can replace the contact on the invitation.',
      })
      return
    }
    updateContext({ stage: 'awaiting-contact-details', pendingContact: null })
    push({
      from: 'agent',
      text:
        reason ??
        `Share the official contact for ${current.schoolName}: full name, designation, official email and phone. I will validate the details and show them for your confirmation before changing anything.`,
      card: { kind: 'contact-form', schoolName: current.schoolName ?? 'the school', reason },
    })
    setPromptChips(['Name, designation, email, phone'])
  }

  async function advanceAfterContact() {
    const current = contextRef.current
    if (current.date && current.startTime && current.endTime) {
      await showSummaryFromContext(
        Boolean(current.draft),
        current.draft
          ? 'Contact updated and the date and slot rechecked. Nothing has been sent — review the latest summary.'
          : undefined,
      )
      return
    }
    await askForDate()
  }

  async function chooseContactInternal(schoolId: string, contactId: string) {
    const school = schoolById(schoolId)
    const contact = school?.contacts.find((item) => item.id === contactId)
    if (!school || !contact) return

    updateContext({
      contactId: contact.id,
      contactName: contact.name,
      contactDesignation: contact.designation,
      contactEmail: contact.email,
      contactPhone: contact.phone,
      contactSource: 'record',
      contactVerified: contact.verification === 'verified',
      stage: 'awaiting-contact',
    })
    await tool('Matched the contact to the existing school record', 'identify_school_contacts()')

    if (!contact.email || !isValidEmail(contact.email)) {
      await startContactReplacementInternal(
        `${contact.name} has no valid official email on record. Add the correct contact details before I prepare the invitation.`,
      )
      return
    }
    if (contact.verification !== 'verified') {
      await showContactConfirm('verify')
      return
    }
    await advanceAfterContact()
  }

  async function advanceAfterTime() {
    const current = contextRef.current
    if (!current.schoolId) return
    const school = schoolById(current.schoolId)

    if (current.workflow === 'research' && current.contactName) {
      if (!current.contactEmail || !isValidEmail(current.contactEmail)) {
        await startContactReplacementInternal(
          'The researched record has no verified official email. Add the correct contact before I prepare the invitation.',
        )
        return
      }
      if (!current.contactVerified) {
        await showContactConfirm('verify')
        return
      }
      await showSummaryFromContext()
      return
    }

    if (!school) return
    if (school.contacts.length === 0) {
      await startContactReplacementInternal(
        'This school has no contact on record. Add the official contact for this invitation.',
      )
      return
    }
    if (school.contacts.length > 1) {
      updateContext({ stage: 'awaiting-contact' })
      push({
        from: 'agent',
        text: `${school.name} has ${school.contacts.length} contacts on record. Which one should receive this invitation?`,
        card: { kind: 'contact', contactId: school.contacts[0].id, schoolId: school.id },
      })
      setPromptChips(
        school.contacts.slice(0, 3).map((contact) => `${contact.name} · ${contact.designation}`),
      )
      return
    }
    await chooseContactInternal(school.id, school.contacts[0].id)
  }

  async function handleDateSelection(date: string, time?: string | null) {
    const policy = policyRef.current
    const employeeId = employeeIdRef.current
    const check = validateDate(date, policy, appointmentsRef.current, employeeId)

    if (!check.ok) {
      updateContext({
        stage: 'awaiting-date',
        date: null,
        startTime: null,
        endTime: null,
        slot: null,
      })
      await tool('Rejected the date · scheduling policy validation failed', 'validate_appointment_date()')
      push({
        from: 'agent',
        text: `${check.message ?? 'That date is not available.'}${
          check.suggestions.length ? ' Here are the next eligible dates:' : ''
        }`,
        card: datePickerCard(check.message),
      })
      return false
    }

    updateContext({ date })
    if (time) {
      const slots = generateSlots(date, policy, appointmentsRef.current, employeeId)
      const match = slots.find((slot) => slot.start === time)
      if (match?.available) {
        await selectSlot(match.start, match.end, date)
        return true
      }
      if (match) {
        await showSlots(
          date,
          `${slotLabel(time)} is not available — ${
            match.reason?.toLowerCase() ?? 'that window is taken'
          }. These are the open windows on ${weekdayDate(date)}.`,
        )
        return true
      }
      await showSlots(
        date,
        `${slotLabel(time)} is outside the configured appointment windows. These are the open windows on ${weekdayDate(
          date,
        )}.`,
      )
      return true
    }
    return showSlots(date)
  }

  async function selectSlot(start: string, end: string, date: string) {
    const policy = policyRef.current
    const employeeId = employeeIdRef.current
    const check = validateDate(date, policy, appointmentsRef.current, employeeId)
    if (!check.ok) {
      updateContext({
        stage: 'awaiting-date',
        date: null,
        startTime: null,
        endTime: null,
        slot: null,
      })
      push({
        from: 'agent',
        text: `I could not hold that slot: ${check.message ?? 'the date is no longer valid.'}`,
        card: datePickerCard(check.message),
      })
      return
    }

    const slots = generateSlots(date, policy, appointmentsRef.current, employeeId)
    const match = slots.find((slot) => slot.start === start)
    if (!match?.available) {
      await showSlots(
        date,
        `${slotLabel(start)} is no longer available${
          match?.reason ? ` — ${match.reason.toLowerCase()}` : ''
        }. I rechecked the calendar immediately before proposing it.`,
      )
      return
    }

    const endTime = end || match.end
    updateContext({
      date,
      startTime: start,
      endTime,
      slot: `${slotLabel(start)} – ${slotLabel(endTime)}`,
      stage: 'awaiting-confirm',
    })
    await tool(
      'Rechecked conflicts, buffers and holds immediately before proposing the slot',
      'recheck_slot_conflicts()',
    )
    await advanceAfterTime()
  }

  async function chooseDateWithTime(date: string, time: string | null) {
    if (busy.current) return
    busy.current = true
    try {
      await handleDateSelection(date, time)
    } finally {
      busy.current = false
    }
  }

  async function chooseSlotByTime(time: string) {
    const current = contextRef.current
    if (!current.date) {
      push({
        from: 'agent',
        text: `I have ${slotLabel(time)} noted, but I need a date first. Which working day should I check?`,
        card: datePickerCard(),
      })
      return
    }
    if (busy.current) return
    busy.current = true
    try {
      const policy = policyRef.current
      const slots = generateSlots(current.date, policy, appointmentsRef.current, employeeIdRef.current)
      const match = slots.find((slot) => slot.start === time)
      if (match?.available) {
        await selectSlot(match.start, match.end, current.date)
        return
      }
      if (match) {
        await showSlots(
          current.date,
          `${slotLabel(time)} is not available — ${
            match.reason?.toLowerCase() ?? 'that window is taken'
          }. These are the open windows.`,
        )
        return
      }
      await showSlots(
        current.date,
        `${slotLabel(time)} is outside the configured windows. These are the open windows on ${weekdayDate(
          current.date,
        )}.`,
      )
    } finally {
      busy.current = false
    }
  }

  async function setFormatIntent(nextFormat: AppointmentFormat) {
    const current = contextRef.current
    if (!current.schoolId) {
      push({ from: 'agent', text: 'Choose a school first, then I can set the meeting format.' })
      return
    }
    const school = schoolById(current.schoolId)
    updateContext({
      format: nextFormat,
      meetingLink: nextFormat === 'Online' ? current.meetingLink : null,
    })

    if (nextFormat === 'Online') {
      push({
        from: 'agent',
        text: 'Switched to an online meeting. I only show a meeting link when one actually exists — it is generated after the school confirms, so I will not invent a placeholder link.',
      })
    } else {
      push({
        from: 'agent',
        text: `Switched to an in-person visit at ${
          school?.address ?? 'the school address on record'
        }. This is the school's verified address, never your office or another school.`,
      })
    }

    if (current.stage === 'awaiting-confirm' && current.date && current.startTime && current.endTime) {
      const draft = buildDraft(current.date, current.startTime, current.endTime)
      if (draft) {
        await showSummary(draft, {
          edited: true,
          note: 'Format updated. Nothing has been sent — confirm the latest summary.',
        })
      }
    }
  }

  async function confirmSend(draft: AppointmentDraft) {
    if (busy.current) return
    busy.current = true
    try {
      const current = contextRef.current

      if (current.appointmentId || current.stage === 'sent' || current.stage === 'awaiting-approval') {
        push({
          from: 'agent',
          text: 'This invitation has already been prepared. Nothing further was sent — the email provider is not connected in this preview.',
        })
        return
      }

      if (!current.draft || !sameDraft(draft, current.draft)) {
        push({
          from: 'agent',
          text: 'That summary is out of date. I will show the latest draft — please confirm the newest summary instead.',
          card: current.draft
            ? { kind: 'summary', draft: current.draft, status: 'Awaiting Your Confirmation' }
            : undefined,
        })
        return
      }

      const policy = policyRef.current
      const employeeId = employeeIdRef.current
      const check = validateDate(current.date ?? '', policy, appointmentsRef.current, employeeId)
      if (!check.ok) {
        updateContext({
          stage: 'awaiting-date',
          date: null,
          startTime: null,
          endTime: null,
          slot: null,
          draft: null,
        })
        push({
          from: 'agent',
          text: `I could not confirm this appointment: ${
            check.message ?? 'the date is no longer available.'
          }`,
          card: datePickerCard(check.message),
        })
        return
      }

      const slots = generateSlots(current.date ?? '', policy, appointmentsRef.current, employeeId)
      const slot = slots.find((item) => item.start === current.startTime)
      if (!slot?.available) {
        await showSlots(
          current.date ?? '',
          `${slotLabel(current.startTime ?? '')} is no longer available${
            slot?.reason ? ` — ${slot.reason.toLowerCase()}` : ''
          }. Choose another window; nothing has been sent.`,
        )
        return
      }

      const school = schoolById(current.schoolId ?? '')
      const needsApproval = current.workflow === 'research' && policy.requireResearchApproval
      const appointment = createAppointment({
        schoolId: current.schoolId ?? '',
        contactId: current.contactId ?? `draft-${current.schoolId}`,
        contactName: current.contactName ?? '',
        contactDesignation: current.contactDesignation ?? '',
        contactEmail: current.contactEmail ?? '',
        date: current.date ?? '',
        startTime: current.startTime ?? '',
        endTime: current.endTime ?? '',
        format: current.format,
        location:
          current.format === 'In-person'
            ? school?.address ?? ''
            : current.meetingLink ?? 'Online · meeting link pending',
        purpose: current.purpose ?? 'Introductory appointment',
        workflow: current.workflow ?? 'existing',
        status: needsApproval ? 'Pending Approval' : 'Draft',
        approvalRequired: needsApproval,
        emailStatus: 'Pending',
      })

      setThinking(true)
      if (needsApproval) {
        requestApproval(
          appointment.id,
          current.schoolId ?? '',
          'Research-sourced invitation requires management review before sending',
        )
        updateContext({ appointmentId: appointment.id, stage: 'awaiting-approval' })
        await sleep(500)
        push({ from: 'system', text: 'Saved as Pending Approval · no email sent', meta: 'request_approval()' })
        await sleep(500)
        push({
          from: 'system',
          text: 'Notified management approvers in the workspace',
          meta: 'notify_approver()',
        })
        await sleep(500)
        setThinking(false)
        push({
          from: 'agent',
          text: 'I saved this invitation as Pending Approval and notified management. No email has been sent — the email provider is not connected in this preview.',
          card: {
            kind: 'approval',
            state: 'pending',
            draft: current.draft,
            appointmentId: appointment.id,
          },
        })
        setPromptChips(['Show pending approvals', 'Change the contact', 'Cancel this request'])
        pushToast({
          tone: 'info',
          title: 'Invitation saved for approval',
          description: 'No email was sent. Sending requires the email provider.',
        })
      } else {
        updateContext({ appointmentId: appointment.id, stage: 'sent' })
        await sleep(500)
        push({
          from: 'system',
          text: 'Saved as a draft · email provider not connected',
          meta: 'prepare_appointment_email()',
        })
        await sleep(500)
        setThinking(false)
        push({
          from: 'agent',
          text: 'The invitation is ready to send. It is saved as a draft and nothing has been emailed — the email provider is not connected in this preview.',
          card: {
            kind: 'invitation',
            draft: current.draft,
            status: 'Ready to Send',
            detail:
              'Saved as a draft. The email provider is not connected, so the school has not received anything.',
            appointmentId: appointment.id,
          },
        })
        setPromptChips(['Open appointments', 'Change the contact', 'Start a new conversation'])
        pushToast({
          tone: 'success',
          title: 'Invitation ready to send',
          description: 'Draft saved. No email was sent in this preview.',
        })
      }
    } finally {
      busy.current = false
    }
  }

  async function editDraft(
    patch: Partial<AppointmentDraft>,
  ): Promise<{ ok: boolean; error?: string }> {
    if (busy.current) return { ok: false, error: 'Another action is in progress.' }
    const current = contextRef.current
    const active = current.draft
    if (!active) return { ok: false, error: 'There is no active appointment to edit.' }

    const merged: AppointmentDraft = { ...active, ...patch, edited: true }
    if (!merged.contactName.trim()) return { ok: false, error: 'Enter the contact name.' }
    if (!isValidEmail(merged.contactEmail)) {
      return { ok: false, error: 'Enter a valid official email address.' }
    }
    if (merged.contactPhone && !isValidPhone(merged.contactPhone)) {
      return { ok: false, error: 'Enter a valid phone number.' }
    }

    busy.current = true
    try {
      const policy = policyRef.current
      const employeeId = employeeIdRef.current
      const check = validateDate(merged.date, policy, appointmentsRef.current, employeeId)
      if (!check.ok) {
        updateContext({
          stage: 'awaiting-date',
          date: null,
          startTime: null,
          endTime: null,
          slot: null,
          draft: null,
        })
        push({
          from: 'agent',
          text: `The edited date could not be accepted: ${check.message ?? 'invalid date.'}`,
          card: datePickerCard(check.message),
        })
        return { ok: false, error: check.message ?? 'Invalid date.' }
      }

      const slots = generateSlots(merged.date, policy, appointmentsRef.current, employeeId)
      const slot = slots.find((item) => item.start === merged.startTime)
      if (!slot?.available) {
        await showSlots(
          merged.date,
          `${slotLabel(merged.startTime)} is not available${
            slot?.reason ? ` — ${slot.reason.toLowerCase()}` : ''
          }. Pick another window for the edited appointment.`,
        )
        return { ok: false, error: 'That time is not available.' }
      }

      merged.endTime = slot.end
      merged.location = merged.format === 'In-person' ? schoolById(merged.schoolId)?.address ?? '' : ''
      merged.meetingLink = merged.format === 'Online' ? merged.meetingLink : undefined

      updateContext({
        contactId: merged.contactId,
        contactName: merged.contactName,
        contactDesignation: merged.contactDesignation,
        contactEmail: merged.contactEmail,
        contactPhone: merged.contactPhone ?? null,
        contactVerified: true,
        contactSource: merged.contactSource ?? 'employee',
        date: merged.date,
        startTime: merged.startTime,
        endTime: merged.endTime,
        slot: `${slotLabel(merged.startTime)} – ${slotLabel(merged.endTime)}`,
        format: merged.format,
        meetingLink: merged.meetingLink ?? null,
        purpose: merged.purpose ?? null,
      })
      push({
        from: 'system',
        text: 'Draft edited by employee · nothing sent',
        meta: 'update_appointment_draft()',
      })
      await showSummary(merged, {
        edited: true,
        note: 'I updated the summary and rechecked the date, slot and contact. Nothing has been sent — confirm the latest summary when you are ready.',
      })
      return { ok: true }
    } finally {
      busy.current = false
    }
  }

  async function requestChangeTime() {
    if (busy.current) return
    const current = contextRef.current
    if (!current.schoolId) {
      push({ from: 'agent', text: 'Choose a school first, then I can check dates for the appointment.' })
      return
    }
    busy.current = true
    try {
      updateContext({
        stage: 'awaiting-date',
        startTime: null,
        endTime: null,
        slot: null,
        draft: null,
      })
      await askForDate(
        `Let's pick a different date for ${current.schoolName}. Your contact and format stay the same, and nothing is sent until you confirm the new summary.`,
      )
    } finally {
      busy.current = false
    }
  }

  async function startContactReplacement() {
    if (busy.current) return
    busy.current = true
    try {
      await startContactReplacementInternal()
    } finally {
      busy.current = false
    }
  }

  async function submitContactDetails(input: Partial<PendingContact>) {
    if (busy.current) return
    const current = contextRef.current
    const merged: PendingContact = {
      name: (input.name ?? current.pendingContact?.name ?? '').trim(),
      designation: (input.designation ?? current.pendingContact?.designation ?? '').trim(),
      email: (input.email ?? current.pendingContact?.email ?? '').trim(),
      phone: (input.phone ?? current.pendingContact?.phone ?? '').trim(),
    }

    const missing: string[] = []
    if (merged.name.length < 2) missing.push('full name')
    if (merged.designation.length < 2) missing.push('designation')
    if (!isValidEmail(merged.email)) missing.push('valid official email')
    if (!isValidPhone(merged.phone)) missing.push('valid phone number')

    if (missing.length) {
      updateContext({ pendingContact: merged, stage: 'awaiting-contact-details' })
      push({
        from: 'agent',
        text: `I still need a ${missing.join(', ')}. I won't use an unverified address.`,
        card: {
          kind: 'error',
          title: 'Contact details incomplete',
          detail: `Missing or invalid: ${missing.join(', ')}.`,
          retryLabel: 'Re-enter contact details',
          action: 'contact-replacement',
        },
      })
      return
    }

    busy.current = true
    try {
      updateContext({ pendingContact: merged, stage: 'awaiting-contact-confirm' })
      await tool(
        'Validated the replacement contact against format checks',
        'validate_school_contact()',
      )
      await showContactConfirm('replacement')
    } finally {
      busy.current = false
    }
  }

  async function confirmContact() {
    if (busy.current) return
    busy.current = true
    try {
      const current = contextRef.current
      if (current.pendingContact) {
        const pending = current.pendingContact
        updateContext({
          contactId: current.contactId ?? `draft-${current.schoolId}`,
          contactName: pending.name,
          contactDesignation: pending.designation,
          contactEmail: pending.email,
          contactPhone: pending.phone,
          contactSource: 'employee',
          contactVerified: true,
          pendingContact: null,
          stage: 'awaiting-contact',
        })
        await tool(
          'Employee confirmed the replacement contact · applies to this invitation only',
          'confirm_school_contact()',
        )
        push({
          from: 'agent',
          text: `I've applied ${pending.name} (${pending.designation}) to this invitation. The school record itself is unchanged.`,
        })
      } else {
        updateContext({ contactVerified: true, stage: 'awaiting-contact' })
        await tool('Employee confirmed the contact details', 'confirm_school_contact()')
        push({
          from: 'agent',
          text: `I've recorded your confirmation for ${
            current.contactName ?? 'the contact'
          } on this invitation.`,
        })
      }
      await advanceAfterContact()
    } finally {
      busy.current = false
    }
  }

  async function chooseDate(date: string) {
    if (busy.current) return
    busy.current = true
    try {
      await handleDateSelection(date)
    } finally {
      busy.current = false
    }
  }

  async function chooseSlot(start: string, end: string, date: string) {
    if (busy.current) return
    busy.current = true
    try {
      await selectSlot(start, end, date)
    } finally {
      busy.current = false
    }
  }

  async function chooseExistingSchool(
    schoolId: string,
    prefill?: { date?: string | null; time?: string | null },
  ) {
    if (busy.current) return
    const school = schools.find((item) => item.id === schoolId)
    if (!school) return
    busy.current = true
    try {
      updateContext({
        workflow: 'existing',
        stage: 'awaiting-date',
        schoolId: school.id,
        schoolName: school.name,
        schoolCity: `${school.city}, ${school.state}`,
        contactId: null,
        contactName: null,
        contactDesignation: null,
        contactEmail: null,
        contactPhone: null,
        contactVerified: null,
        contactSource: null,
        date: null,
        startTime: null,
        endTime: null,
        slot: null,
        format: 'In-person',
        meetingLink: null,
        purpose: null,
        draft: null,
        appointmentId: null,
        pendingContact: null,
      })
      await tool('Loaded the existing school record and verified address', 'get_school_record()')
      push({
        from: 'system',
        text: `${school.name} · ${school.address}`,
        meta: 'school.address',
      })

      if (prefill?.date) {
        await handleDateSelection(prefill.date, prefill.time)
        return
      }
      await askForDate(
        `I have ${school.name} in your records. The verified visit address is ${school.address}. Which date works for the appointment? I'll validate the date before showing any times.`,
      )
    } finally {
      busy.current = false
    }
  }

  async function chooseResearchResult(
    resultId: string,
    prefill?: { date?: string | null; time?: string | null },
  ) {
    if (busy.current) return
    const result = researchResults.find((item) => item.id === resultId)
    if (!result) return
    busy.current = true
    try {
      const school = registerResearchSchool(result, employeeIdRef.current)
      updateContext({
        workflow: 'research',
        stage: 'awaiting-date',
        schoolId: school.id,
        schoolName: school.name,
        schoolCity: `${school.city}, ${school.state}`,
        contactId: school.contacts[0]?.id ?? null,
        contactName: result.contactName,
        contactDesignation: result.contactDesignation,
        contactEmail: result.contactEmail,
        contactPhone: result.phone,
        contactSource: 'research',
        contactVerified: result.verification === 'verified',
        date: null,
        startTime: null,
        endTime: null,
        slot: null,
        format: 'In-person',
        meetingLink: null,
        purpose: null,
        draft: null,
        appointmentId: null,
        pendingContact: null,
      })
      await tool(
        'Registered the research result without duplicating an existing school',
        'check_duplicate_school()',
      )
      if (result.duplicateOf) {
        push({
          from: 'system',
          text: `Matched to the existing record ${school.name}`,
          meta: 'duplicate_of',
        })
      }
      if (prefill?.date) {
        await handleDateSelection(prefill.date, prefill.time)
        return
      }
      await askForDate(
        `I've added ${school.name} to your records and kept the existing duplicate check intact. Which date should I check? I'll validate the date before showing slots.`,
      )
    } finally {
      busy.current = false
    }
  }

  async function chooseContact(schoolId: string, contactId: string) {
    if (busy.current) return
    busy.current = true
    try {
      await chooseContactInternal(schoolId, contactId)
    } finally {
      busy.current = false
    }
  }

  async function verifyContact(resultId: string) {
    if (busy.current) return
    const result = researchResults.find((item) => item.id === resultId)
    if (!result) return
    busy.current = true
    try {
      const school = registerResearchSchool(result, employeeIdRef.current)
      updateContext({
        workflow: 'research',
        stage: 'awaiting-date',
        schoolId: school.id,
        schoolName: school.name,
        schoolCity: `${school.city}, ${school.state}`,
        contactId: school.contacts[0]?.id ?? null,
        contactName: result.contactName,
        contactDesignation: result.contactDesignation,
        contactEmail: result.contactEmail,
        contactPhone: result.phone,
        contactSource: 'research',
        contactVerified: true,
        date: null,
        startTime: null,
        endTime: null,
        slot: null,
        format: 'In-person',
        meetingLink: null,
        purpose: null,
        draft: null,
        appointmentId: null,
        pendingContact: null,
      })
      await tool('Contact marked as verified by the employee', 'verify_school_contact()')
      push({
        from: 'agent',
        text: `Thank you — I've recorded ${result.contactName} (${result.contactDesignation}) as verified for ${result.name}. Which date works for the appointment?`,
      })
      await askForDate()
    } finally {
      busy.current = false
    }
  }

  async function runResearch(query: string) {
    if (busy.current) return
    busy.current = true
    try {
      setThinking(true)
      updateContext({
        ...emptyContext,
        workflow: 'research',
        stage: 'researching',
      })
      await sleep(450)
      setThinking(false)
      push({
        from: 'system',
        text: 'Research started · approved sources only',
        meta: 'search_new_schools()',
      })
      await sleep(550)
      push({
        from: 'system',
        text: 'Checked existing records for duplicates',
        meta: 'check_duplicate_school()',
      })
      await sleep(550)
      push({
        from: 'system',
        text: 'Retrieved official contact details for 5 schools',
        meta: 'identify_school_contacts()',
      })
      await sleep(500)
      updateContext({ stage: 'awaiting-school' })
      push({
        from: 'agent',
        text: `I found 5 schools matching “${query}”. Two contacts still need verification before an invitation can be prepared. Which school would you like to book?`,
        card: { kind: 'school-results', results: researchResults },
      })
      setPromptChips(['The third one', 'Sri Chaitanya Vidyalaya', 'Show unverified contacts only'])
    } finally {
      busy.current = false
    }
  }

  async function startExisting() {
    if (busy.current) return
    busy.current = true
    try {
      setThinking(true)
      updateContext({ ...emptyContext, workflow: 'existing', stage: 'awaiting-school' })
      await sleep(450)
      setThinking(false)
      push({
        from: 'agent',
        text: "Here are the existing schools in your records. Pick the one you'd like to meet — I won't research these again because their details are already on file.",
        card: { kind: 'existing-schools', schoolIds: EXISTING_SCHOOL_IDS },
      })
      setPromptChips([
        'ABC International School',
        'Greenwood Public School',
        'Sri Vidhya Matriculation School',
      ])
    } finally {
      busy.current = false
    }
  }

  async function startResearch() {
    if (busy.current) return
    busy.current = true
    try {
      setThinking(true)
      updateContext({ ...emptyContext, workflow: 'research', stage: 'researching' })
      await sleep(550)
      setThinking(false)
      push({
        from: 'agent',
        text: "I'll research new schools. Which area, board or category should I search — for example CBSE schools in Chennai?",
      })
      setPromptChips(['CBSE schools in Chennai', 'ICSE schools in Coimbatore', 'Schools not in our database'])
    } finally {
      busy.current = false
    }
  }

  async function retry(action?: AgentCardAction) {
    switch (action) {
      case 'choose-date':
      case 'recheck-availability':
        await requestChangeTime()
        return
      case 'verify-contact':
      case 'contact-replacement':
        await startContactReplacement()
        return
      case 'retry-research':
        await startResearch()
        return
      case 'open-calendar':
        pushToast({
          tone: 'info',
          title: 'Calendar sync is not connected',
          description: 'Availability is demonstration data in this preview.',
        })
        return
      default:
        push({
          from: 'agent',
          text: 'What would you like me to do next?',
          card: { kind: 'workflow-choice' },
        })
    }
  }

  function reset() {
    contextRef.current = emptyContext
    setMessages([greeting()])
    setContext(emptyContext)
    setThinking(false)
    busy.current = false
    setPromptChips(defaultChips)
  }

  async function send(text: string) {
    const value = text.trim()
    if (!value || busy.current) return
    push({ from: 'employee', text: value })

    const lower = value.toLowerCase()
    const current = contextRef.current

    if (/(start over|reset|new conversation)/.test(lower)) {
      reset()
      push({
        from: 'agent',
        text: 'Starting fresh. Nothing from the previous draft was sent.',
        card: { kind: 'workflow-choice' },
      })
      return
    }

    if (
      /(show|list|what|check|see).*(appointment|calendar|schedule)|my appointments|this week/.test(
        lower,
      ) &&
      !/(book|meet with|appointment with|schedule a)/.test(lower)
    ) {
      const mine = appointmentsRef.current
        .filter(
          (appointment) =>
            appointment.employeeId === employeeIdRef.current &&
            appointment.status !== 'Cancelled' &&
            appointment.date >= isoDay(0),
        )
        .sort((left, right) =>
          `${left.date}${left.startTime}`.localeCompare(`${right.date}${right.startTime}`),
        )
        .slice(0, 5)
      if (!mine.length) {
        push({
          from: 'agent',
          text: 'You have no upcoming appointments on the calendar in this preview. I can help you book one — tell me the school and preferred date.',
        })
      } else {
        push({
          from: 'agent',
          text: `You have ${mine.length} upcoming appointment${
            mine.length === 1 ? '' : 's'
          } in IST: ${mine
            .map(
              (appointment) =>
                `${schoolById(appointment.schoolId)?.name ?? 'School'} — ${weekdayDate(
                  appointment.date,
                )} at ${timeLabel(appointment.startTime)} (${appointment.status})`,
            )
            .join('; ')}.`,
        })
      }
      return
    }

    if (
      /(replace|change|different|another|wrong|incorrect).*(contact|email|principal|correspondent|phone)|contact.*(replace|change|wrong|incorrect)/.test(
        lower,
      )
    ) {
      await startContactReplacement()
      return
    }

    if (
      /(change|different|another|reschedule|move|switch).*(time|date|day|slot)|change time|different day/.test(
        lower,
      )
    ) {
      await requestChangeTime()
      return
    }

    if (/\b(online|virtual|video|google meet|zoom|teams)\b/.test(lower)) {
      await setFormatIntent('Online')
      return
    }
    if (/\b(in[- ]person|on[- ]site|visit the school|school visit)\b/.test(lower)) {
      await setFormatIntent('In-person')
      return
    }

    if (
      current.stage === 'awaiting-confirm' &&
      /(confirm|send|yes|ok|okay|go ahead|prepare|proceed|looks good|that works|book it)/.test(lower)
    ) {
      if (current.draft) await confirmSend(current.draft)
      else {
        push({
          from: 'agent',
          text: 'I do not have a current summary to confirm. Tell me the date you would like and I will prepare one.',
        })
      }
      return
    }

    if (current.stage === 'awaiting-contact-details') {
      const parsed = parseContactDetails(value)
      if (parsed.email || parsed.phone || parsed.name || parsed.designation) {
        await submitContactDetails(parsed)
        return
      }
    }

    if (current.stage === 'awaiting-contact-confirm' || current.stage === 'awaiting-verification') {
      if (/(yes|correct|confirm|use|ok|okay|right|verified|looks good)/.test(lower)) {
        await confirmContact()
        return
      }
      if (/(replace|change|different|edit)/.test(lower)) {
        await startContactReplacement()
        return
      }
    }

    const researchIntent =
      (/(find|research|search|look for)/.test(lower) &&
        /(schools?|cbse|icse|matriculation|state board)/.test(lower)) ||
      /\b(cbse|icse|matriculation|state board)\s+schools?\b/.test(lower) ||
      /\b(new school|schools not in our database|unverified contacts)\b/.test(lower)

    if (researchIntent) {
      await runResearch(value)
      return
    }

    if (current.stage === 'awaiting-school') {
      const index = ordinalIndex(lower)
      if (current.workflow === 'research') {
        if (index !== null && researchResults[index]) {
          await chooseResearchResult(researchResults[index].id)
          return
        }
        const result = findResearchInText(value)
        if (result) {
          await chooseResearchResult(result.id)
          return
        }
        const existing = findSchoolInText(value)
        if (existing) {
          await chooseExistingSchool(existing.id)
          return
        }
        push({
          from: 'agent',
          text: 'I could not match that to one of the five research results. Say “the third one” or use the school name shown in the card.',
        })
        return
      }

      if (index !== null && EXISTING_SCHOOL_IDS[index]) {
        await chooseExistingSchool(EXISTING_SCHOOL_IDS[index])
        return
      }
      const existing = findSchoolInText(value)
      if (existing) {
        await chooseExistingSchool(existing.id)
        return
      }
      push({
        from: 'agent',
        text: 'I could not match that school. Pick one from the list or tell me the exact school name.',
      })
      return
    }

    if (
      current.stage === 'awaiting-date' ||
      current.stage === 'awaiting-slot' ||
      current.stage === 'awaiting-confirm'
    ) {
      const date = parseDateInput(value)
      const time = parseTimeInput(value)
      if (date) {
        await chooseDateWithTime(date, time)
        return
      }
      if (time && current.date) {
        await chooseSlotByTime(time)
        return
      }
      if (time && !current.date) {
        push({
          from: 'agent',
          text: `I have ${slotLabel(time)} noted, but I need a date first. Which working day should I check?`,
          card: datePickerCard(),
        })
        return
      }
      if (current.stage === 'awaiting-date') {
        push({
          from: 'agent',
          text: 'I need a calendar date before I can check availability. Use the date picker or tell me something like “next Tuesday” or “20 November”.',
          card: datePickerCard(),
        })
        return
      }
    }

    const namedSchool = findSchoolInText(value)
    const date = parseDateInput(value)
    const time = parseTimeInput(value)

    if (namedSchool && /(book|appointment|meet|arrange|schedule|visit|set up)/.test(lower)) {
      await chooseExistingSchool(namedSchool.id, date ? { date, time } : undefined)
      return
    }

    const namedResult = findResearchInText(value)
    if (namedResult) {
      await chooseResearchResult(namedResult.id, date ? { date, time } : undefined)
      return
    }

    if (/(book|appoint|meet|arrange|schedule|set up)/.test(lower)) {
      await startExisting()
      return
    }

    if (/(who|contact|principal|correspondent|director|email)/.test(lower)) {
      if (current.contactName) {
        push({
          from: 'agent',
          text: `The current contact for this invitation is ${current.contactName} (${
            current.contactDesignation ?? 'contact'
          }) — ${current.contactEmail ?? 'no verified email yet'}.`,
        })
      } else {
        push({
          from: 'agent',
          text: 'I can only share contact details for schools assigned to you. Tell me the school name and I will show the verified contact on that record.',
        })
      }
      return
    }

    push({
      from: 'agent',
      text: 'I can help you book an appointment with a school in your records, research a new school and verify its contacts, check availability for a date you choose, or show your upcoming appointments. Which one would you like?',
      card: { kind: 'workflow-choice' },
    })
  }

  return {
    messages,
    thinking,
    context,
    promptChips,
    send,
    reset,
    startExisting,
    startResearch,
    chooseExistingSchool,
    chooseResearchResult,
    chooseContact,
    chooseDate,
    chooseSlot,
    confirmSend,
    editDraft,
    requestChangeTime,
    startContactReplacement,
    submitContactDetails,
    confirmContact,
    verifyContact,
    retry,
  }
}
