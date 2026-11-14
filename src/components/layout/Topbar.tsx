import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BellRing,
  CalendarCheck2,
  CheckCheck,
  ChevronDown,
  CircleDollarSign,
  Command,
  GraduationCap,
  LogOut,
  MailWarning,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { cn, relativeTime } from '../../lib/utils'
import { employeeById, schoolById } from '../../data/demo'
import { useApp } from '../../store/AppStore'
import { Avatar, Kbd } from '../ui/Avatar'
import { IconButton } from '../ui/Button'
import type { AppNotification } from '../../lib/types'

const notificationIcon = (kind: AppNotification['kind']) => {  switch (kind) {
    case 'school-confirmed':
      return { icon: CalendarCheck2, tone: 'text-teal-600 bg-teal-50 ring-teal-100' }
    case 'school-declined':
      return { icon: XCircle, tone: 'text-rose-600 bg-rose-50 ring-rose-100' }
    case 'alternative-time':
      return { icon: CalendarCheck2, tone: 'text-orange-600 bg-orange-50 ring-orange-100' }
    case 'email-failed':
      return { icon: MailWarning, tone: 'text-rose-600 bg-rose-50 ring-rose-100' }
    case 'approval-requested':
      return { icon: ShieldCheck, tone: 'text-brand-600 bg-brand-50 ring-brand-100' }
    case 'follow-up-due':
      return { icon: BellRing, tone: 'text-amber-600 bg-amber-50 ring-amber-100' }
    case 'invitation-sent':
      return { icon: CircleDollarSign, tone: 'text-sky-600 bg-sky-50 ring-sky-100' }
    default:
      return { icon: AlertTriangle, tone: 'text-slate-600 bg-slate-50 ring-slate-100' }
  }
}

export function Topbar({
  onMenu,
  onOpenSearch,
  mobileNavOpen = false,
}: {
  onMenu: () => void
  onOpenSearch: () => void
  mobileNavOpen?: boolean
}) {
  const { user, isAdmin, logout, switchDemoUser, notifications, markAllNotificationsRead } = useApp()
  const [panelOpen, setPanelOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const unread = notifications.filter((notification) => !notification.read).length

  function handleLogout() {
    setLogoutError('')
    setMenuOpen(false)
    setPanelOpen(false)
    try {
      logout()
    } catch {
      setLogoutError('Could not log out. Please try again.')
    }
  }

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setPanelOpen(false)
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) return null

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-xl sm:px-6">
      <button
        onClick={onMenu}
        aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={mobileNavOpen}
        aria-controls="app-sidebar"
        className={cn(
          'relative z-50 rounded-xl p-2 transition-colors lg:hidden',
          mobileNavOpen
            ? 'bg-navy-100 text-navy-900'
            : 'text-slate-500 hover:bg-slate-100 hover:text-navy-900',
        )}
      >
        <Menu className="size-5" />
      </button>

      <button
        onClick={onOpenSearch}
        className="group flex h-9.5 flex-1 items-center gap-2.5 rounded-xl border border-line bg-slate-50/70 px-3 text-left text-[13px] text-slate-400 transition-colors hover:border-brand-200 hover:bg-white sm:max-w-md"
      >
        <Search className="size-4 text-slate-400" />
        <span className="flex-1 truncate">Search schools, appointments, people…</span>
        <span className="hidden items-center gap-1 sm:flex">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1.5" ref={wrapRef}>
        <span className="mr-1 hidden items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10.5px] font-bold tracking-wide text-amber-700 uppercase md:flex">
          <span className="size-1.5 rounded-full bg-amber-500" />
          UI preview · demo data
        </span>

        <div className="relative">
          <IconButton
            label="Notifications"
            onClick={() => {
              setPanelOpen((open) => !open)
              setMenuOpen(false)
            }}
            className={cn(panelOpen && 'bg-slate-100 text-navy-900')}
          >
            <span className="relative">
              <Bell className="size-4.5" />
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                  {unread}
                </span>
              )}
            </span>
          </IconButton>

          {panelOpen && (
            <div className="absolute right-0 z-40 mt-2 w-[min(94vw,392px)] overflow-hidden rounded-2xl border border-line bg-white shadow-pop animate-fade-up">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div>
                  <p className="text-[13.5px] font-bold text-navy-900">Notifications</p>
                  <p className="text-[11.5px] text-slate-400">{unread} unread</p>
                </div>
                <button
                  onClick={markAllNotificationsRead}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-semibold text-brand-600 hover:bg-brand-50"
                >
                  <CheckCheck className="size-3.5" />
                  Mark all read
                </button>
              </div>
              <div className="scrollbar-thin max-h-[420px] overflow-y-auto">
                {notifications.map((notification) => {
                  const { icon: Icon, tone } = notificationIcon(notification.kind)
                  return (
                    <button
                      key={notification.id}
                      onClick={() => {
                        setPanelOpen(false)
                        if (notification.href) navigate(notification.href)
                      }}
                      className={cn(
                        'flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50',
                        !notification.read && 'bg-brand-50/40',
                      )}
                    >
                      <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ring-1', tone)}>
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-[12.5px] font-semibold text-navy-900">{notification.title}</span>
                          <span className="shrink-0 text-[10.5px] whitespace-nowrap text-slate-400">
                            {relativeTime(notification.at)}
                          </span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-relaxed text-slate-500">
                          {notification.body}
                        </span>
                      </span>
                      {!notification.read && <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => {
                  setPanelOpen(false)
                  navigate('/notifications')
                }}
                className="flex w-full items-center justify-center gap-1.5 border-t border-line py-2.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-navy-900"
              >
                View all activity
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setMenuOpen((open) => !open)
              setPanelOpen(false)
            }}
            className="flex items-center gap-2 rounded-xl py-1 pr-1 pl-1 transition-colors hover:bg-slate-100 sm:pr-2"
          >
            <Avatar name={user.name} tone={user.avatarTone} size="md" />
            <span className="hidden text-left sm:block">
              <span className="block text-[12.5px] leading-tight font-semibold text-navy-900">{user.name}</span>
              <span className="block text-[10.5px] leading-tight text-slate-400">
                {isAdmin ? 'Management' : user.designation}
              </span>
            </span>
            <ChevronDown className="size-3.5 text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-white shadow-pop animate-fade-up">
              <div className="border-b border-line px-4 py-3">
                <p className="text-[13px] font-semibold text-navy-900">{user.name}</p>
                <p className="text-[11.5px] text-slate-500">{user.email}</p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-brand-700 uppercase ring-1 ring-brand-100">
                  <ShieldCheck className="size-3" />
                  {isAdmin ? 'Management access' : 'Employee access'}
                </span>
              </div>
              <div className="border-b border-line py-1.5">
                <p className="px-4 py-1 text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                  Demo user switch
                </p>
                {['emp-1', 'emp-2', 'emp-3', 'emp-4'].map((id) => {
                  const employee = employeeById(id)
                  if (!employee) return null
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        switchDemoUser(id)
                        setMenuOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-4 py-1.5 text-left hover:bg-slate-50',
                        employee.id === user.id && 'bg-brand-50/60',
                      )}
                    >
                      <Avatar name={employee.name} tone={employee.avatarTone} size="xs" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium text-navy-900">{employee.name}</span>
                        <span className="block text-[10.5px] text-slate-400">
                          {employee.role === 'admin' ? 'Management / Admin' : employee.designation}
                        </span>
                      </span>
                      {employee.id === user.id && <span className="size-1.5 rounded-full bg-brand-500" />}
                    </button>
                  )
                })}
              </div>
              <div className="py-1.5">
                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50 hover:text-navy-900"
                >
                  <Settings2 className="size-4" />
                  Account settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-[12.5px] font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="size-4" />
                  Logout
                </button>
                {logoutError && (
                  <p className="px-4 pb-2 text-[10.5px] leading-relaxed text-rose-600">
                    {logoutError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { appointments, notifications } = useApp()
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  type PaletteResult = { type: string; label: string; to: string; hint?: string }

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      window.setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pages: PaletteResult[] = [
      { type: 'Page', label: 'Overview', to: '/' },
      { type: 'Page', label: 'AI Appointment Agent', to: '/agent' },
      { type: 'Page', label: 'Schools & Leads', to: '/schools' },
      { type: 'Page', label: 'Appointments', to: '/appointments' },
      { type: 'Page', label: 'Calendar', to: '/calendar' },
      { type: 'Page', label: 'Follow-ups', to: '/follow-ups' },
      { type: 'Page', label: 'Reports', to: '/reports' },
      { type: 'Page', label: 'Settings', to: '/settings' },
    ].filter((page) => !q || page.label.toLowerCase().includes(q))

    const schoolResults = (['sch-1', 'sch-2', 'sch-3', 'sch-4', 'sch-5', 'sch-6', 'sch-7', 'sch-8', 'sch-9', 'sch-10'] as const)
      .map((id) => schoolById(id))
      .filter((school) => school && (!q || school!.name.toLowerCase().includes(q) || school!.city.toLowerCase().includes(q)))
      .slice(0, 5)
      .map((school) => ({
        type: 'School',
        label: school!.name,
        hint: `${school!.type} · ${school!.city}`,
        to: `/schools?school=${school!.id}`,
      }))

    const appointmentResults = appointments
      .filter((appointment) => {
        const school = schoolById(appointment.schoolId)
        return !q || school?.name.toLowerCase().includes(q) || appointment.contactName.toLowerCase().includes(q)
      })
      .slice(0, 4)
      .map((appointment) => ({
        type: 'Appointment',
        label: schoolById(appointment.schoolId)?.name ?? 'Appointment',
        hint: `${appointment.status} · ${appointment.startTime}`,
        to: `/appointments/${appointment.id}`,
      }))

    return [...pages, ...schoolResults, ...appointmentResults] as PaletteResult[]
  }, [query, appointments])

  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setCursor((current) => Math.min(current + 1, results.length - 1))
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setCursor((current) => Math.max(current - 1, 0))
      }
      if (event.key === 'Enter' && results[cursor]) {
        navigate(results[cursor].to)
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, results, cursor, navigate, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
      <div className="absolute inset-0 bg-navy-950/45 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative z-10 w-[min(94vw,560px)] overflow-hidden rounded-2xl bg-white shadow-pop animate-fade-up">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search className="size-4.5 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setCursor(0)
            }}
            placeholder="Search schools, appointments, pages…"
            className="flex-1 bg-transparent text-[14px] text-navy-900 placeholder:text-slate-400 focus:outline-none"
          />
          <Kbd>esc</Kbd>
        </div>
        <div className="scrollbar-thin max-h-[46vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <p className="px-3 py-8 text-center text-[13px] text-slate-400">
              No matches. Try a school name or a page.
            </p>
          )}
          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.label}-${index}`}
              onMouseEnter={() => setCursor(index)}
              onClick={() => {
                navigate(result.to)
                onClose()
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left',
                index === cursor ? 'bg-brand-50' : 'hover:bg-slate-50',
              )}
            >
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-lg',
                  index === cursor ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500',
                )}
              >
                {result.type === 'School' ? (
                  <GraduationCap className="size-3.5" />
                ) : result.type === 'Appointment' ? (
                  <CalendarCheck2 className="size-3.5" />
                ) : result.type === 'Page' ? (
                  <Command className="size-3.5" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-navy-900">{result.label}</span>
                {result.hint && (
                  <span className="block truncate text-[11px] text-slate-400">{result.hint}</span>
                )}              </span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide text-slate-500 uppercase">
                {result.type}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-line bg-slate-50/60 px-4 py-2 text-[10.5px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            to open
          </span>
          <span>{notifications.filter((n) => !n.read).length} unread</span>
        </div>
      </div>
    </div>
  )
}

export function DemoModeBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('eduvian.demo.banner') === 'hidden')
  if (dismissed) return null
  return (
    <div className="flex items-start gap-2.5 border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/50 px-4 py-2.5 sm:px-6">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <p className="flex-1 text-[12px] leading-relaxed text-amber-900">
        <strong className="font-semibold">Interface preview only.</strong> The FastAPI backend, email
        provider, calendar and AI model are not connected yet. Every record shown is clearly-flagged
        demonstration data — no emails are sent and no calendars are updated.
      </p>
      <button
        onClick={() => {
          localStorage.setItem('eduvian.demo.banner', 'hidden')
          setDismissed(true)
        }}
        aria-label="Dismiss demo notice"
        className="rounded-md p-1 text-amber-600/70 hover:bg-amber-100 hover:text-amber-800"
      >
        <XCircle className="size-3.5" />
      </button>
    </div>
  )
}

export function UserChip({ employeeId, size = 'sm' }: { employeeId: string; size?: 'xs' | 'sm' }) {
  const employee = employeeById(employeeId)
  if (!employee) return <span className="text-slate-400">Unassigned</span>
  return (
    <span className="flex items-center gap-2">
      <Avatar name={employee.name} tone={employee.avatarTone} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-medium text-navy-900">{employee.name}</span>
      </span>
    </span>
  )
}
