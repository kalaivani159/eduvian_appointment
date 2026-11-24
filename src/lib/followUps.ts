import type { ApprovalRequest, EmailRecord, FollowUp, School } from './types'
import { isoDay } from './utils'

/**
 * Record-derived follow-up status shown in the UI.
 *
 * The raw `FollowUp.status` field is only a scheduling hint. The badge a user
 * sees is derived from the actual record every time: the follow-up's own dates
 * and history, the contact on file, the school's e-mail delivery records and
 * any pending management approval. A status is never assigned without checking
 * those records first.
 */
export type FollowUpDisplayStatus =
  | 'Overdue'
  | 'Delivery Failed'
  | 'Awaiting Response'
  | 'Awaiting Review'
  | 'Due Today'
  | 'Not Sent'
  | 'Completed'
  | 'Cancelled'

export interface FollowUpRecordContext {
  schools: School[]
  emails: EmailRecord[]
  approvals: ApprovalRequest[]
}

const historyMentions = (followUp: FollowUp, pattern: RegExp) =>
  followUp.history.some((entry) => pattern.test(entry.text))

/**
 * Derives the badge status from the record:
 *
 * 1. Terminal states on the record itself (Completed / Cancelled).
 * 2. `nextFollowUpOn` in the past → Overdue.
 * 3. A delivery failure — in the follow-up's history or the school's latest
 *    e-mail record → Delivery Failed.
 * 4. The follow-up's history shows a message was sent → Awaiting Response.
 * 5. A blocker on the record — contact e-mail missing, contact not verified,
 *    or a management approval still pending → Awaiting Review.
 * 6. Due today (by the record's own date) → Due Today.
 * 7. Otherwise nothing has gone out yet → Not Sent.
 */
export function deriveFollowUpStatus(
  followUp: FollowUp,
  context: FollowUpRecordContext,
): FollowUpDisplayStatus {
  if (followUp.status === 'Completed') return 'Completed'
  if (followUp.status === 'Cancelled') return 'Cancelled'

  const today = isoDay(0)
  if (followUp.nextFollowUpOn < today) return 'Overdue'

  const school = context.schools.find((item) => item.id === followUp.schoolId)
  const schoolEmails = context.emails.filter((item) => item.schoolId === followUp.schoolId)
  // E-mail records are appended in send order, so the last one is the latest attempt.
  const latestEmail = schoolEmails[schoolEmails.length - 1]
  if (historyMentions(followUp, /email (failed|bounced)/i) || latestEmail?.status === 'Failed') {
    return 'Delivery Failed'
  }

  if (historyMentions(followUp, /\bsent\b/i)) return 'Awaiting Response'

  const contact = school?.contacts.find((item) => item.id === followUp.contactId)
  const approvalPending = context.approvals.some(
    (item) => item.schoolId === followUp.schoolId && item.status === 'Pending',
  )
  if (!contact || !contact.email.trim() || contact.verification !== 'verified' || approvalPending) {
    return 'Awaiting Review'
  }

  if (followUp.nextFollowUpOn === today) return 'Due Today'

  return 'Not Sent'
}

/** Badge classes for a derived status — same palette as the other status badges. */
export function followUpDisplayTone(status: FollowUpDisplayStatus): string {
  switch (status) {
    case 'Overdue':
    case 'Delivery Failed':
      return 'bg-rose-50 text-rose-700 ring-rose-200'
    case 'Awaiting Response':
    case 'Awaiting Review':
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
