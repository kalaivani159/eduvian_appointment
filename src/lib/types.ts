/**
 * Shared domain types.
 *
 * These mirror the Pydantic schemas planned for the FastAPI backend so that the
 * API service layer (src/lib/api.ts) can be swapped from demo data to live data
 * without touching any component.
 */

export type Role = 'admin' | 'employee'

export interface Employee {
  id: string
  name: string
  email: string
  phone: string
  role: Role
  designation: string
  avatarTone: string
  status: 'active' | 'inactive'
  assignedSchoolIds: string[]
  workingHours: string
  timezone: string
  lastActive: string
}

export type SchoolType =
  | 'CBSE'
  | 'ICSE'
  | 'State Board'
  | 'Matriculation'
  | 'International'

export type VerificationStatus = 'verified' | 'unverified' | 'needs-review'

export type SalesStage =
  | 'New Lead'
  | 'Researching'
  | 'Contact Verified'
  | 'Ready for Appointment'
  | 'Invitation Sent'
  | 'Waiting for Response'
  | 'Appointment Confirmed'
  | 'Appointment Completed'
  | 'Follow-up Required'
  | 'Interested'
  | 'Converted'
  | 'Not Interested'
  | 'On Hold'

export interface SchoolContact {
  id: string
  schoolId: string
  name: string
  designation:
    | 'Principal'
    | 'Correspondent'
    | 'Director'
    | 'Administrator'
    | 'Management Representative'
    | 'Other'
  email: string
  phone: string
  source: string
  verification: VerificationStatus
  verifiedOn: string | null
  notes?: string
}

export interface School {
  id: string
  name: string
  type: SchoolType
  city: string
  state: string
  address: string
  website: string
  officialEmail: string | null
  phone: string | null
  source: string
  verification: VerificationStatus
  assignedEmployeeId: string | null
  addedOn: string
  lastContactedOn: string | null
  nextFollowUpOn: string | null
  stage: SalesStage
  contacts: SchoolContact[]
  notes: string
  /** true for records seeded as demonstration data */
  isDemo: boolean
  /** true when the school came from Workflow 2 research */
  isNewResearch: boolean
}

export type AppointmentStatus =
  | 'Draft'
  | 'Pending Employee Confirmation'
  | 'Pending Approval'
  | 'Invitation Sending'
  | 'Invitation Sent'
  | 'Awaiting School Response'
  | 'Alternative Time Requested'
  | 'Confirmed'
  | 'Declined'
  | 'Rescheduled'
  | 'Cancelled'
  | 'Expired'
  | 'Failed'

export type AppointmentFormat = 'In-person' | 'Online'

export interface StatusHistoryEntry {
  status: AppointmentStatus
  at: string
  by: string
  note?: string
}

export interface Appointment {
  id: string
  schoolId: string
  contactId: string
  contactName: string
  contactDesignation: string
  contactEmail: string
  employeeId: string
  date: string // ISO yyyy-MM-dd
  startTime: string // HH:mm
  endTime: string // HH:mm
  timezone: string
  format: AppointmentFormat
  location: string
  purpose: string
  status: AppointmentStatus
  createdBy: string
  createdAt: string
  updatedAt: string
  workflow: 'existing' | 'research'
  approvalRequired: boolean
  emailStatus: EmailStatus
  holdExpiresAt: string | null
  history: StatusHistoryEntry[]
  isDemo: boolean
}

export type EmailStatus = 'Pending' | 'Sending' | 'Sent' | 'Delivered' | 'Failed'

export type FollowUpStatus =
  | 'Pending'
  | 'Due Today'
  | 'Overdue'
  | 'Completed'
  | 'Cancelled'

export interface FollowUp {
  id: string
  schoolId: string
  contactId: string
  employeeId: string
  lastContactOn: string
  nextFollowUpOn: string
  reason: string
  status: FollowUpStatus
  notes: string
  history: { at: string; text: string }[]
}

export type NotificationKind =
  | 'invitation-sent'
  | 'school-confirmed'
  | 'school-declined'
  | 'alternative-time'
  | 'email-failed'
  | 'approval-requested'
  | 'reminder'
  | 'follow-up-due'
  | 'agent-error'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  at: string
  read: boolean
  href?: string
  employeeId: string
  severity: 'info' | 'success' | 'warning' | 'danger'
}

export interface ApprovalRequest {
  id: string
  appointmentId: string
  schoolId: string
  requestedBy: string
  reason: string
  submittedAt: string
  status: 'Pending' | 'Approved' | 'Rejected'
  decidedBy?: string
  decidedAt?: string
  decisionNote?: string
}

export interface ResearchResult {
  id: string
  name: string
  type: SchoolType
  city: string
  address: string
  website: string
  email: string
  phone: string
  contactName: string
  contactDesignation: SchoolContact['designation']
  contactEmail: string
  source: string
  verification: VerificationStatus
  duplicateOf?: string
  selected: boolean
}

export interface Integration {
  id: string
  name: string
  category: 'Email' | 'Calendar' | 'AI' | 'Speech' | 'Messaging' | 'Research'
  description: string
  status: 'Connected' | 'Not Connected' | 'Connection Failed' | 'Configuration Required'
  detail: string
  lastChecked: string
  requiredFor: string
}

export interface KnowledgeDocument {
  id: string
  title: string
  category: string
  updatedAt: string
  updatedBy: string
  status: 'Approved' | 'Draft' | 'Outdated'
  version: string
  pages: number
}

export interface AuditEntry {
  id: string
  at: string
  actor: string
  actorRole: Role | 'agent' | 'system'
  action: string
  target: string
  result: 'success' | 'failed' | 'blocked'
}

export interface EmailRecord {
  id: string
  appointmentId: string
  schoolId: string
  to: string
  subject: string
  status: EmailStatus
  sentAt: string | null
  error?: string
  attempts: number
}

/* ---------------- AI agent conversation model ---------------- */

export type AgentContactSource = 'record' | 'research' | 'employee'

export interface AgentContactDetails {
  id: string | null
  name: string
  designation: string
  email: string
  phone: string
  source: AgentContactSource
  verified: boolean
}

export type AgentCardAction =
  | 'choose-date'
  | 'verify-contact'
  | 'contact-replacement'
  | 'recheck-availability'
  | 'retry-research'
  | 'open-calendar'

export type SummaryStatus =
  | 'Awaiting Your Confirmation'
  | 'Pending Approval'
  | 'Ready to Send'
  | 'Sending'
  | 'Sent'
  | 'Failed'

export type AgentCard =
  | { kind: 'workflow-choice' }
  | { kind: 'school-results'; results: ResearchResult[] }
  | { kind: 'existing-schools'; schoolIds: string[] }
  | { kind: 'contact'; contactId: string; schoolId: string }
  | { kind: 'contact-confirm'; schoolName: string; contact: AgentContactDetails; mode: 'confirm' | 'verify' | 'replacement'; previousName?: string }
  | { kind: 'contact-form'; schoolName: string; reason?: string }
  | {
      kind: 'date-picker'
      suggestions: string[]
      workingDaysLabel: string
      minDate: string
      maxDate: string
      schoolName?: string
      reason?: string
    }
  | {
      kind: 'slots'
      slots: TimeSlot[]
      date: string
      employeeId: string
      workingHours: string
      durationMinutes: number
      bufferMinutes: number
      timezone: string
    }
  | { kind: 'summary'; draft: AppointmentDraft; status?: SummaryStatus }
  | { kind: 'approval'; state: 'pending' | 'approved' | 'rejected'; draft: AppointmentDraft; appointmentId?: string }
  | { kind: 'invitation'; draft: AppointmentDraft; status: SummaryStatus; detail: string; appointmentId?: string }
  | { kind: 'sent'; draft: AppointmentDraft }
  | { kind: 'confirmed'; draft: AppointmentDraft; respondedBy: string }
  | {
      kind: 'error'
      title: string
      detail: string
      retryLabel?: string
      action?: AgentCardAction
    }

export interface TimeSlot {
  start: string
  end: string
  available: boolean
  reason?: string
}

export interface AppointmentDraft {
  schoolId: string
  schoolName: string
  contactId: string
  contactName: string
  contactDesignation: string
  contactEmail: string
  /** Optional because some existing records only store a switchboard number. */
  contactPhone?: string
  contactVerified?: boolean
  contactSource?: AgentContactSource
  date: string
  startTime: string
  endTime: string
  format: AppointmentFormat
  /** Empty for online appointments until a link is actually generated. */
  location: string
  meetingLink?: string
  employeeId: string
  workflow: 'existing' | 'research'
  purpose?: string
  /** true when the employee edited the draft after it was first prepared. */
  edited?: boolean
}

export interface AgentMessage {
  id: string
  from: 'agent' | 'employee' | 'system'
  text: string
  at: string
  card?: AgentCard
  status?: 'typing' | 'done'
  meta?: string
}

export interface AgentConversation {
  id: string
  title: string
  startedAt: string
  updatedAt: string
  employeeId: string
  messages: AgentMessage[]
  workflow: 'existing' | 'research' | null
  activeSchoolId: string | null
  activeContactId: string | null
  activeDraft: AppointmentDraft | null
}

/* ---------------- reporting ---------------- */

export interface TrendPoint {
  label: string
  invited: number
  confirmed: number
  declined: number
}

export interface Metric {
  label: string
  value: string
  delta?: string
  trend?: 'up' | 'down' | 'flat'
  hint?: string
  tone?: 'brand' | 'teal' | 'amber' | 'rose' | 'navy'
}
