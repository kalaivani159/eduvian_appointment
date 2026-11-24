import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  appointments as seedAppointments,
  approvals as seedApprovals,
  DEMO_EMPLOYEE_ID,
  employees,
  followUps as seedFollowUps,
  notifications as seedNotifications,
  researchResultToSchool,
  researchSchoolId,
  schools as seedSchools,
} from '../data/demo'
import type {
  Appointment,
  AppointmentFormat,
  AppointmentStatus,
  AppNotification,
  ApprovalRequest,
  EmailStatus,
  Employee,
  FollowUp,
  ResearchResult,
  SalesStage,
  School,
  SchoolContact,
} from '../lib/types'
import { isoDay } from '../lib/utils'
import {
  createDefaultPolicy,
  mergePolicy,
  type SchedulingPolicy,
} from '../lib/scheduling'

export interface NewAppointmentInput {
  schoolId: string
  contactId: string
  contactName: string
  contactDesignation: string
  contactEmail: string
  date: string
  startTime: string
  endTime: string
  format: AppointmentFormat
  location: string
  purpose: string
  workflow: 'existing' | 'research'
  /** Optional overrides used by the agent when it prepares an invitation. */
  status?: AppointmentStatus
  approvalRequired?: boolean
  emailStatus?: EmailStatus
}

export interface NewFollowUpInput {
  schoolId: string
  contactId: string
  employeeId: string
  /** ISO yyyy-MM-dd date the next follow-up is due. */
  nextFollowUpOn: string
  reason: string
  notes?: string
  /** Free-text channel label recorded with the follow-up history. */
  channel?: string
}

export interface Toast {
  id: string
  tone: 'success' | 'error' | 'info' | 'warning'
  title: string
  description?: string
}

interface AppState {
  user: Employee | null
  isAdmin: boolean
  login: (employeeId: string) => void
  logout: () => void
  switchDemoUser: (employeeId: string) => void

  schedulingPolicy: SchedulingPolicy
  updateSchedulingPolicy: (next: SchedulingPolicy) => void

  employees: Employee[]
  /**
   * Single source of truth for school records. Every screen (schools list,
   * appointment booking, agent workflows, reports) reads this shared state so
   * a record added anywhere is visible everywhere immediately.
   */
  schools: School[]
  schoolById: (id: string) => School | undefined
  /** Adds one school; returns false when a record with the same id/name exists. */
  addSchool: (school: School) => boolean
  /** Adds several schools with duplicate detection; returns how many were added. */
  addSchools: (schools: School[]) => number
  /** Registers a research result once — returns the existing record on a duplicate. */
  registerResearchSchool: (result: ResearchResult, employeeId: string) => School
  /** Appends a contact to a school; returns false when the e-mail is already on file. */
  addSchoolContact: (schoolId: string, contact: SchoolContact) => boolean
  verifyContact: (schoolId: string, contactId: string) => void
  updateSchoolStage: (schoolId: string, stage: SalesStage) => void
  assignSchoolOwner: (schoolId: string, employeeId: string) => void

  appointments: Appointment[]
  notifications: AppNotification[]
  approvals: ApprovalRequest[]
  followUps: FollowUp[]

  createAppointment: (input: NewAppointmentInput) => Appointment
  createFollowUp: (input: NewFollowUpInput) => FollowUp
  updateAppointmentStatus: (id: string, status: AppointmentStatus, note?: string) => void
  cancelAppointment: (id: string) => void
  rescheduleAppointment: (id: string, date: string, start: string, end: string) => void
  /** Edits the invitation-specific meeting details without touching the standard email template. */
  updateAppointmentDetails: (
    id: string,
    patch: Pick<Appointment, 'date' | 'startTime' | 'endTime' | 'format' | 'location'>,
  ) => void
  requestApproval: (appointmentId: string, schoolId: string, reason: string) => ApprovalRequest
  decideApproval: (id: string, decision: 'Approved' | 'Rejected', note?: string) => void
  completeFollowUp: (id: string) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void

  toasts: Toast[]
  pushToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
}

const AppContext = createContext<AppState | null>(null)

const POLICY_KEY = 'eduvian.demo.policy'

/** Name matching used for school duplicate detection (ignores spacing/punctuation). */
const normalizeSchoolName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

function loadPolicy(): SchedulingPolicy {
  try {
    const stored = localStorage.getItem(POLICY_KEY)
    return mergePolicy(stored ? (JSON.parse(stored) as Partial<SchedulingPolicy>) : null)
  } catch {
    return createDefaultPolicy()
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(() => {
    const stored = localStorage.getItem('eduvian.demo.session')
    if (stored) {
      const found = employees.find((employee) => employee.id === stored)
      if (found) return found
    }
    return null
  })
  const [appointments, setAppointments] = useState<Appointment[]>(seedAppointments)
  const [notifications, setNotifications] = useState<AppNotification[]>(seedNotifications)
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(seedApprovals)
  const [followUps, setFollowUps] = useState<FollowUp[]>(seedFollowUps)
  const [schools, setSchoolsState] = useState<School[]>(seedSchools)
  const [schedulingPolicy, setSchedulingPolicy] = useState<SchedulingPolicy>(loadPolicy)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  /**
   * Mirror of the schools state so mutations can be computed synchronously
   * (React state updates are async). Every writer goes through `commitSchools`,
   * which keeps the ref, the state and every screen in sync.
   */
  const schoolsRef = useRef<School[]>(seedSchools)

  const commitSchools = useCallback((next: School[]) => {
    schoolsRef.current = next
    setSchoolsState(next)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = `toast-${++toastId.current}`
      setToasts((current) => [...current, { ...toast, id }])
      window.setTimeout(() => dismissToast(id), 4800)
    },
    [dismissToast],
  )

  const login = useCallback((employeeId: string) => {
    const found = employees.find((employee) => employee.id === employeeId) ?? employees[0]
    setUser(found)
    localStorage.setItem('eduvian.demo.session', found.id)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    try {
      localStorage.removeItem('eduvian.demo.session')
      // Clear any transient agent/session data; the policy is workspace configuration.
      sessionStorage.removeItem('eduvian.demo.agent')
    } catch {
      // Storage can be unavailable in private browsing — the in-memory session is still cleared.
    }
  }, [])

  const switchDemoUser = useCallback((employeeId: string) => {
    const found = employees.find((employee) => employee.id === employeeId)
    if (found) {
      setUser(found)
      localStorage.setItem('eduvian.demo.session', found.id)
    }
  }, [])

  const updateSchedulingPolicy = useCallback((next: SchedulingPolicy) => {
    setSchedulingPolicy(next)
    try {
      localStorage.setItem(POLICY_KEY, JSON.stringify(next))
    } catch {
      // Keep the in-memory policy when storage is unavailable.
    }
  }, [])

  /* ------------------------------ school records ------------------------------ */

  const schoolById = useCallback(
    (id: string) => schoolsRef.current.find((school) => school.id === id),
    [],
  )

  const addSchool = useCallback(
    (school: School) => {
      const current = schoolsRef.current
      const duplicate = current.some(
        (item) =>
          item.id === school.id ||
          normalizeSchoolName(item.name) === normalizeSchoolName(school.name),
      )
      if (duplicate) return false
      commitSchools([school, ...current])
      return true
    },
    [commitSchools],
  )

  const addSchools = useCallback(
    (list: School[]) => {
      const current = schoolsRef.current
      const seen = new Set(
        current.map((school) => `${school.id}|${normalizeSchoolName(school.name)}`),
      )
      const additions: School[] = []
      for (const school of list) {
        const key = `${school.id}|${normalizeSchoolName(school.name)}`
        if (seen.has(key)) continue
        seen.add(key)
        additions.push(school)
      }
      if (additions.length === 0) return 0
      commitSchools([...additions, ...current])
      return additions.length
    },
    [commitSchools],
  )

  const registerResearchSchool = useCallback(
    (result: ResearchResult, employeeId: string) => {
      const current = schoolsRef.current
      const normalized = result.name.trim().toLowerCase()
      const existing =
        (result.duplicateOf
          ? current.find((school) => school.id === result.duplicateOf)
          : undefined) ??
        current.find((school) => school.name.trim().toLowerCase() === normalized) ??
        current.find((school) => school.id === researchSchoolId(result))
      if (existing) return existing
      const school = researchResultToSchool(result, employeeId)
      commitSchools([school, ...current])
      return school
    },
    [commitSchools],
  )

  const addSchoolContact = useCallback(
    (schoolId: string, contact: SchoolContact) => {
      const current = schoolsRef.current
      const school = current.find((item) => item.id === schoolId)
      if (!school) return false
      const email = contact.email.trim().toLowerCase()
      const duplicate =
        email !== '' &&
        school.contacts.some((item) => item.email.trim().toLowerCase() === email)
      if (duplicate) return false
      commitSchools(
        current.map((item) =>
          item.id === schoolId ? { ...item, contacts: [...item.contacts, contact] } : item,
        ),
      )
      return true
    },
    [commitSchools],
  )

  const verifyContact = useCallback(
    (schoolId: string, contactId: string) => {
      commitSchools(
        schoolsRef.current.map((school) =>
          school.id !== schoolId
            ? school
            : {
                ...school,
                contacts: school.contacts.map((contact) =>
                  contact.id === contactId
                    ? {
                        ...contact,
                        verification: 'verified' as const,
                        verifiedOn: isoDay(0),
                        notes: 'Verified by employee in this session.',
                      }
                    : contact,
                ),
              },
        ),
      )
    },
    [commitSchools],
  )

  const updateSchoolStage = useCallback(
    (schoolId: string, stage: SalesStage) => {
      commitSchools(
        schoolsRef.current.map((school) => (school.id === schoolId ? { ...school, stage } : school)),
      )
    },
    [commitSchools],
  )

  const assignSchoolOwner = useCallback(
    (schoolId: string, employeeId: string) => {
      commitSchools(
        schoolsRef.current.map((school) =>
          school.id === schoolId ? { ...school, assignedEmployeeId: employeeId } : school,
        ),
      )
    },
    [commitSchools],
  )

  const createAppointment = useCallback(
    (input: NewAppointmentInput) => {
      const actor = user?.name ?? 'Employee'
      const appointment: Appointment = {
        id: `apt-${Math.random().toString(36).slice(2, 7)}`,
        ...input,
        timezone: 'Asia/Kolkata (IST)',
        status: input.status ?? 'Draft',
        createdBy: actor,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        employeeId: user?.id ?? 'emp-1',
        approvalRequired: input.approvalRequired ?? false,
        emailStatus: input.emailStatus ?? 'Pending',
        holdExpiresAt: null,
        history: [
          {
            status: input.status ?? 'Draft',
            at: new Date().toISOString(),
            by: actor,
            note: 'Prepared from the agent conversation',
          },
        ],
        isDemo: true,
      }
      setAppointments((current) => [appointment, ...current])
      return appointment
    },
    [user],
  )

  const updateAppointmentStatus = useCallback(
    (id: string, status: AppointmentStatus, note?: string) => {
      const actor = user?.name ?? 'System'
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === id
            ? {
                ...appointment,
                status,
                updatedAt: new Date().toISOString(),
                history: [
                  ...appointment.history,
                  { status, at: new Date().toISOString(), by: actor, note },
                ],
              }
            : appointment,
        ),
      )
    },
    [user],
  )

  const cancelAppointment = useCallback(
    (id: string) => {
      updateAppointmentStatus(id, 'Cancelled', 'Cancelled by employee')
    },
    [updateAppointmentStatus],
  )

  const rescheduleAppointment = useCallback(
    (id: string, date: string, start: string, end: string) => {
      const actor = user?.name ?? 'System'
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === id
            ? {
                ...appointment,
                date,
                startTime: start,
                endTime: end,
                status: 'Rescheduled',
                updatedAt: new Date().toISOString(),
                history: [
                  ...appointment.history,
                  {
                    status: 'Rescheduled',
                    at: new Date().toISOString(),
                    by: actor,
                    note: `Moved to ${date} · ${start}`,
                  },
                ],
              }
            : appointment,
        ),
      )
    },
    [user],
  )

  const updateAppointmentDetails = useCallback(
    (
      id: string,
      patch: Pick<Appointment, 'date' | 'startTime' | 'endTime' | 'format' | 'location'>,
    ) => {
      const actor = user?.name ?? 'Employee'
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === id
            ? {
                ...appointment,
                ...patch,
                updatedAt: new Date().toISOString(),
                history: [
                  ...appointment.history,
                  {
                    status: appointment.status,
                    at: new Date().toISOString(),
                    by: actor,
                    note: 'Invitation details edited · standard introduction unchanged',
                  },
                ],
              }
            : appointment,
        ),
      )
    },
    [user],
  )

  const requestApproval = useCallback(
    (appointmentId: string, schoolId: string, reason: string) => {
      const actor = user?.name ?? 'Employee'
      const approval: ApprovalRequest = {
        id: `apr-${Math.random().toString(36).slice(2, 7)}`,
        appointmentId,
        schoolId,
        requestedBy: actor,
        reason,
        submittedAt: new Date().toISOString(),
        status: 'Pending',
      }
      setApprovals((current) => [approval, ...current])
      setNotifications((current) => [
        {
          id: `nt-${Math.random().toString(36).slice(2, 7)}`,
          kind: 'approval-requested',
          title: 'Approval needed',
          body: `${actor} submitted an invitation for management review.`,
          at: new Date().toISOString(),
          read: false,
          href: '/approvals',
          employeeId: 'emp-4',
          severity: 'info',
        },
        ...current,
      ])
      return approval
    },
    [user],
  )

  const decideApproval = useCallback(
    (id: string, decision: 'Approved' | 'Rejected', note?: string) => {
      const actor = user?.name ?? 'Management'
      const approval = approvals.find((item) => item.id === id)
      setApprovals((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: decision,
                decidedBy: actor,
                decidedAt: new Date().toISOString(),
                decisionNote: note,
              }
            : item,
        ),
      )
      if (approval) {
        setAppointments((current) =>
          current.map((appointment) =>
            appointment.id === approval.appointmentId
              ? decision === 'Approved'
                ? {
                    ...appointment,
                    // The email provider is not connected in this preview, so an
                    // approved invitation is ready to send — never marked "Sent".
                    status: 'Draft',
                    emailStatus: 'Pending',
                    updatedAt: new Date().toISOString(),
                    history: [
                      ...appointment.history,
                      {
                        status: 'Draft',
                        at: new Date().toISOString(),
                        by: actor,
                        note: 'Approved — ready to send. Sending is blocked until the email provider is connected.',
                      },
                    ],
                  }
                : {
                    ...appointment,
                    status: 'Draft',
                    updatedAt: new Date().toISOString(),
                    history: [
                      ...appointment.history,
                      {
                        status: 'Draft',
                        at: new Date().toISOString(),
                        by: actor,
                        note: note ?? 'Approval rejected — returned to draft',
                      },
                    ],
                  }
              : appointment,
          ),
        )
      }
    },
    [approvals, user],
  )

  const completeFollowUp = useCallback((id: string) => {
    setFollowUps((current) =>
      current.map((followUp) =>
        followUp.id === id
          ? {
              ...followUp,
              status: 'Completed',
              history: [...followUp.history, { at: new Date().toISOString(), text: 'Marked complete' }],
            }
          : followUp,
      ),
    )
  }, [])

  /**
   * Creates a follow-up record for real (the record drives the status badge —
   * past dates start as Overdue, today as Due Today, future dates as Pending).
   */
  const createFollowUp = useCallback((input: NewFollowUpInput): FollowUp => {
    const today = isoDay(0)
    const status: FollowUp['status'] =
      input.nextFollowUpOn < today ? 'Overdue' : input.nextFollowUpOn === today ? 'Due Today' : 'Pending'
    const followUp: FollowUp = {
      id: `fu-${Math.random().toString(36).slice(2, 7)}`,
      schoolId: input.schoolId,
      contactId: input.contactId,
      employeeId: input.employeeId,
      lastContactOn: today,
      nextFollowUpOn: input.nextFollowUpOn,
      reason: input.reason,
      status,
      notes: input.notes?.trim() ?? '',
      history: [
        {
          at: new Date().toISOString(),
          text: input.channel ? `Follow-up created · Channel: ${input.channel}` : 'Follow-up created',
        },
      ],
    }
    setFollowUps((current) => [followUp, ...current])
    return followUp
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    )
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))
  }, [])

  const value = useMemo<AppState>(
    () => ({
      user,
      isAdmin: user?.role === 'admin',
      login,
      logout,
      switchDemoUser,
      schedulingPolicy,
      updateSchedulingPolicy,
      employees,
      schools,
      schoolById,
      addSchool,
      addSchools,
      registerResearchSchool,
      addSchoolContact,
      verifyContact,
      updateSchoolStage,
      assignSchoolOwner,
      appointments,
      notifications,
      approvals,
      followUps,
      createAppointment,
      createFollowUp,
      updateAppointmentStatus,
      cancelAppointment,
      rescheduleAppointment,
      updateAppointmentDetails,
      requestApproval,
      decideApproval,
      completeFollowUp,
      markNotificationRead,
      markAllNotificationsRead,
      toasts,
      pushToast,
      dismissToast,
    }),
    [
      user,
      login,
      logout,
      switchDemoUser,
      schedulingPolicy,
      updateSchedulingPolicy,
      schools,
      schoolById,
      addSchool,
      addSchools,
      registerResearchSchool,
      addSchoolContact,
      verifyContact,
      updateSchoolStage,
      assignSchoolOwner,
      appointments,
      notifications,
      approvals,
      followUps,
      createAppointment,
      createFollowUp,
      updateAppointmentStatus,
      cancelAppointment,
      rescheduleAppointment,
      updateAppointmentDetails,
      requestApproval,
      decideApproval,
      completeFollowUp,
      markNotificationRead,
      markAllNotificationsRead,
      toasts,
      pushToast,
      dismissToast,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}

export { DEMO_EMPLOYEE_ID }
