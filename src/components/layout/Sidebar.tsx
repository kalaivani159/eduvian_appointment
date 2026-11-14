import { NavLink, useLocation } from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  MessageSquareMore,
  PieChart,
  Settings,
  X,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useApp } from '../../store/AppStore'
import { Logo } from '../brand/Logo'

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/agent', label: 'AI Appointment Agent', icon: MessageSquareMore, accent: true },
  { to: '/schools', label: 'Schools & Leads', icon: GraduationCap },
  { to: '/appointments', label: 'Appointments', icon: ClipboardCheck },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/follow-ups', label: 'Follow-ups', icon: ListChecks },
]

const adminItems = [
  { to: '/approvals', label: 'Approvals', icon: Bell },
  { to: '/reports', label: 'Reports', icon: PieChart },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const employeeItems = [{ to: '/settings', label: 'Settings', icon: Settings }]

export function Sidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const { isAdmin, approvals, notifications } = useApp()
  const location = useLocation()
  const pendingApprovals = approvals.filter((approval) => approval.status === 'Pending').length
  const unread = notifications.filter((notification) => !notification.read).length

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-[2px] transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        id="app-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-navy-900 transition-[width,transform] duration-300 ease-out lg:static lg:translate-x-0',
          collapsed ? 'lg:w-[76px]' : 'lg:w-[248px]',
          'w-[268px]',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-16 size-56 rounded-full bg-brand-600/20 blur-3xl" />
          <div className="absolute right-0 bottom-0 size-48 rounded-full bg-teal-500/10 blur-3xl" />
        </div>

        <div
          className={cn(
            'relative flex h-20 items-center justify-between gap-2 border-b border-white/8 px-4',
            collapsed && 'lg:justify-center lg:px-0',
          )}
        >
          {/* Logo area — no background box, blends into sidebar */}
          <div className={cn('flex flex-col', collapsed && 'lg:hidden')}>
            <Logo variant="light" />
            <span className="mt-1 pl-0.5 text-[9px] font-bold tracking-[0.2em] text-white/45 uppercase">
              Learn • Grow • Excel
            </span>
          </div>
          {collapsed && (
            <div className="hidden lg:block">
              <Logo variant="light" compact />
            </div>
          )}
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="scrollbar-thin relative flex-1 overflow-y-auto px-3 py-4">
          <p
            className={cn(
              'mb-2 px-2.5 text-[10px] font-bold tracking-[0.16em] text-white/30 uppercase',
              collapsed && 'lg:hidden',
            )}
          >
            Workspace
          </p>
          <div className="space-y-1">
            {navItems.map((item) => (
              <SidebarLink
                key={item.to}
                {...item}
                collapsed={collapsed}
                active={
                  item.end
                    ? location.pathname === item.to
                    : location.pathname.startsWith(item.to)
                }
                onClick={onClose}
              />
            ))}
          </div>

          <p
            className={cn(
              'mt-6 mb-2 px-2.5 text-[10px] font-bold tracking-[0.16em] text-white/30 uppercase',
              collapsed && 'lg:hidden',
            )}
          >
            {isAdmin ? 'Management' : 'Account'}
          </p>
          <div className="space-y-1">
            {(isAdmin ? adminItems : employeeItems).map((item) => (
              <SidebarLink
                key={item.to}
                {...item}
                collapsed={collapsed}
                badge={
                  item.to === '/approvals' && pendingApprovals > 0 ? String(pendingApprovals) : undefined
                }
                active={
                  item.to === '/settings'
                    ? location.pathname.startsWith('/settings')
                    : location.pathname.startsWith(item.to)
                }
                onClick={onClose}
              />
            ))}
          </div>
        </nav>

        <div className="relative border-t border-white/8 p-3">
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-xl bg-white/5 p-2.5 ring-1 ring-white/8 ring-inset',
              collapsed && 'lg:justify-center lg:bg-transparent lg:p-0 lg:ring-0',
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-brand-200 ring-1 ring-brand-400/30">
              <Bell className="size-4" />
            </span>
            <div className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
              <p className="truncate text-[11.5px] font-semibold text-white">
                {unread > 0 ? `${unread} unread updates` : 'All caught up'}
              </p>
              <p className="truncate text-[10.5px] text-white/40">
                {isAdmin ? 'Management workspace' : 'Sales workspace'}
              </p>
            </div>
            {/* Decorative graduation cap */}
            <GraduationCap className={cn('size-3.5 shrink-0 text-white/20', collapsed && 'lg:hidden')} />
          </div>

          <button
            onClick={onToggleCollapse}
            className="mt-2 hidden w-full items-center justify-center gap-2 rounded-lg py-1.5 text-[11px] font-medium text-white/40 transition-colors hover:bg-white/5 hover:text-white/80 lg:flex"
          >
            <ChevronLeft className={cn('size-3.5 transition-transform', collapsed && 'rotate-180')} />
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>
    </>
  )
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  active,
  badge,
  accent,
  collapsed,
  onClick,
}: {
  to: string
  label: string
  icon: typeof LayoutDashboard
  active: boolean
  badge?: string
  accent?: boolean
  collapsed: boolean
  onClick: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13px] font-medium transition-all duration-200',
        active
          ? 'bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'text-white/62 hover:bg-white/8 hover:text-white',
        accent && active && 'animate-glow-pulse',
        collapsed && 'lg:justify-center lg:px-0',
      )}
    >
      {active && (
        <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400" />
      )}
      <Icon
        className={cn(
          'size-4.5 shrink-0 transition-all duration-200',
          active
            ? accent ? 'text-brand-300 drop-shadow-[0_0_8px_rgba(124,77,255,0.9)]' : 'text-brand-200'
            : 'text-white/45 group-hover:text-white/80',
        )}
      />
      <span className={cn('truncate', collapsed && 'lg:hidden')}>{label}</span>
      {accent && !collapsed && (
        <span className={cn(
          'ml-auto rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase transition-all duration-200',
          active
            ? 'bg-brand-500/40 text-brand-100 ring-1 ring-brand-400/50 shadow-[0_0_8px_rgba(124,77,255,0.4)]'
            : 'bg-brand-500/25 text-brand-100'
        )}>
          AI
        </span>
      )}
      {badge && (
        <span
          className={cn(
            'ml-auto flex size-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white',
            collapsed && 'lg:hidden',
          )}
        >
          {badge}
        </span>
      )}
    </NavLink>
  )
}
