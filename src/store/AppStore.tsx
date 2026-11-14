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
} from '../lib/types'
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
  appointments: Appointment[]
  notifications: AppNotification[]
  approvals: ApprovalRequest[]
  followUps: FollowUp[]

  createAppointment: (input: NewAppointmentInput) => Appointment
  updateAppointmentStatus: (id: string, status: AppointmentStatus, note?: string) => void
  cancelAppointment: (id: string) => void
  rescheduleAppointment: (id: string, date: string, start: string, end: string) => void
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
  const [schedulingPolicy, setSchedulingPolicy] = useState<SchedulingPolicy>(loadPolicy)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

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
      appointments,
      notifications,
      approvals,
      followUps,
      createAppointment,
      updateAppointmentStatus,
      cancelAppointment,
      rescheduleAppointment,
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
      appointments,
      notifications,
      approvals,
      followUps,
      createAppointment,
      updateAppointmentStatus,
      cancelAppointment,
      rescheduleAppointment,
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
