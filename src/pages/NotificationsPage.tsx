import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  BellRing,
  CalendarCheck2,
  CalendarClock,
  CheckCheck,
  ListChecks,
  MailWarning,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { PageHeader, Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, ClassBadge } from '../components/ui/Badge'
import { SegmentedControl } from '../components/ui/Field'
import { EmptyState } from '../components/ui/Avatar'
import { UserChip } from '../components/layout/Topbar'
import { useApp } from '../store/AppStore'
import type { AppNotification } from '../lib/types'
import { cn, relativeTime } from '../lib/utils'

const kindStyles: Record<
  AppNotification['kind'],
  { icon: typeof Bell; tone: string; label: string }
> = {
  'school-confirmed': {
    icon: CalendarCheck2,
    tone: 'bg-teal-50 text-teal-600 ring-teal-100',
    label: 'School response',
  },
  'school-declined': {
    icon: XCircle,
    tone: 'bg-rose-50 text-rose-600 ring-rose-100',
    label: 'School response',
  },
  'alternative-time': {
    icon: CalendarClock,
    tone: 'bg-orange-50 text-orange-600 ring-orange-100',
    label: 'School response',
  },
  'email-failed': {
    icon: MailWarning,
    tone: 'bg-rose-50 text-rose-600 ring-rose-100',
    label: 'Delivery',
  },
  'approval-requested': {
    icon: ShieldCheck,
    tone: 'bg-brand-50 text-brand-600 ring-brand-100',
    label: 'Approval',
  },
  reminder: {
    icon: BellRing,
    tone: 'bg-amber-50 text-amber-600 ring-amber-100',
    label: 'Reminder',
  },
  'follow-up-due': {
    icon: ListChecks,
    tone: 'bg-amber-50 text-amber-600 ring-amber-100',
    label: 'Follow-up',
  },
  'agent-error': {
    icon: AlertTriangle,
    tone: 'bg-rose-50 text-rose-600 ring-rose-100',
    label: 'Agent',
  },
  'invitation-sent': {
    icon: Send,
    tone: 'bg-sky-50 text-sky-600 ring-sky-100',
    label: 'Invitation',
  },
}

const severityTone: Record<AppNotification['severity'], string> = {
  info: 'bg-brand-50 text-brand-700 ring-brand-200',
  success: 'bg-teal-50 text-teal-700 ring-teal-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
}

export function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead, isAdmin } = useApp()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const unread = notifications.filter((notification) => !notification.read)
  const visible = filter === 'unread' ? unread : notifications

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        description="Workflow events raised by the agent and the school response links. Delivery outside this workspace — email, SMS or WhatsApp — is not configured yet."
        action={
          <Button
            variant="secondary"
            size="md"
            iconLeft={<CheckCheck className="size-4" />}
            onClick={markAllNotificationsRead}
            disabled={unread.length === 0}
          >
            Mark all read
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: notifications.length },
            { value: 'unread', label: 'Unread', count: unread.length },
          ]}
        />
        {isAdmin && (
          <Badge tone="navy" size="sm">
            Management view · team-wide feed
          </Badge>
        )}
        <span className="ml-auto text-[11.5px] text-slate-400">
          {unread.length === 0 ? 'You are all caught up' : `${unread.length} awaiting review`}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={filter === 'unread' ? 'Unread notifications' : 'All notifications'}
            subtitle="Newest first — clicking a notification opens the related record"
            icon={<Bell className="size-4.5" />}
          />
          <CardBody className="px-0 pb-0">
            {visible.length === 0 ? (
              <EmptyState
                icon={<CheckCheck className="size-5" />}
                title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                description={
                  filter === 'unread'
                    ? 'Everything in the workspace has been reviewed.'
                    : 'Workflow events will appear here as the agent processes invitations and responses.'
                }
                compact
              />
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {visible.map((notification) => {
                  const style = kindStyles[notification.kind]
                  const Icon = style.icon
                  const content = (
                    <>
                      <span
                        className={cn(
                          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ring-1',
                          style.tone,
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-semibold text-navy-900">
                            {notification.title}
                          </span>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide text-slate-500 uppercase">
                            {style.label}
                          </span>
                          {!notification.read && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-brand-600">
                              <span className="size-1.5 rounded-full bg-brand-500" />
                              New
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-[12px] leading-relaxed text-slate-500">
                          {notification.body}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="text-[10.5px] text-slate-400">
                            {relativeTime(notification.at)}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="flex items-center gap-1.5">
                            <UserChip employeeId={notification.employeeId} size="xs" />
                          </span>
                        </span>
                      </span>
                      <ClassBadge className={severityTone[notification.severity]} size="sm">
                        {notification.severity}
                      </ClassBadge>
                    </>
                  )

                  const baseClass = cn(
                    'flex w-full items-start gap-3 px-5 py-4 text-left transition-colors',
                    notification.read ? 'bg-white hover:bg-slate-50' : 'bg-brand-50/30 hover:bg-brand-50/50',
                  )

                  return (
                    <li key={notification.id}>
                      {notification.href ? (
                        <Link
                          to={notification.href}
                          onClick={() => markNotificationRead(notification.id)}
                          className={baseClass}
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          onClick={() => markNotificationRead(notification.id)}
                          className={baseClass}
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Delivery channels" subtitle="What the workspace can send today" icon={<Send className="size-4.5" />} />
            <CardBody className="space-y-2.5 pt-0">
              {[
                { name: 'In-app notifications', status: 'Available', tone: 'teal' as const },
                { name: 'Email notifications', status: 'Configuration Required', tone: 'amber' as const },
                { name: 'WhatsApp / SMS reminders', status: 'Not Connected', tone: 'slate' as const },
              ].map((channel) => (
                <div
                  key={channel.name}
                  className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2"
                >
                  <span className="text-[12px] font-medium text-navy-900">{channel.name}</span>
                  <Badge tone={channel.tone} size="sm">
                    {channel.status}
                  </Badge>
                </div>
              ))}
              <p className="text-[11px] leading-relaxed text-slate-400">
                Only in-app alerts are produced in this preview. External delivery starts once the
                email and messaging providers report Connected.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Preferences" subtitle="Demo controls — not persisted" icon={<BellRing className="size-4.5" />} />
            <CardBody className="space-y-2 pt-0">
              {[
                'School confirms or declines an invitation',
                'A school requests another time',
                'An invitation fails to deliver',
                'A follow-up becomes due',
              ].map((item) => (
                <label key={item} className="flex items-start gap-2.5 text-[11.5px] leading-relaxed text-slate-600">
                  <input type="checkbox" defaultChecked className="mt-0.5 size-3.5 accent-brand-600" />
                  {item}
                </label>
              ))}
              <p className="pt-1 text-[10.5px] text-slate-400">
                Preference changes are local to this preview and reset on reload.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
