import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BadgeCheck,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Download,
  KeyRound,
  Lock,
  Mail,
  MessageCircle,
  Mic,
  Plug,
  RefreshCw,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Trash2,
  Upload,
  UserRound,
  Users,
} from 'lucide-react'
import { PageHeader, Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, DemoTag } from '../components/ui/Badge'
import { Input, Label, Select, Toggle } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table'
import { Avatar } from '../components/ui/Avatar'
import { useApp } from '../store/AppStore'
import { auditLog, integrations, knowledgeDocs } from '../data/demo'
import type { AuditEntry, Employee, Integration } from '../lib/types'
import { DAY_LABELS, describeWorkingDays, toMinutes } from '../lib/scheduling'
import type { SchedulingPolicy } from '../lib/scheduling'
import { cn, downloadCsv, isoDay, relativeTime, shortDate } from '../lib/utils'

type TabId = 'profile' | 'employees' | 'appointments' | 'knowledge' | 'ai' | 'integrations' | 'audit'

const tabs: { id: TabId; label: string; icon: typeof UserRound; adminOnly?: boolean }[] = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'employees', label: 'Employees', icon: Users, adminOnly: true },
  { id: 'appointments', label: 'Appointments', icon: CalendarClock },
  { id: 'knowledge', label: 'Company knowledge', icon: BookOpen },
  { id: 'ai', label: 'AI settings', icon: Sparkles },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'audit', label: 'Audit log', icon: ScrollText, adminOnly: true },
]

interface AiSettings {
  tone: string
  language: string
  draftInvitations: boolean
  requireEmployeeConfirm: boolean
  voiceReplies: boolean
  useKnowledge: boolean
}

export function SettingsPage() {
  const { isAdmin, user } = useApp()
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab') as TabId | null
  const tab = tabs.find((item) => item.id === requested)?.id ?? 'profile'
  const active = tabs.find((item) => item.id === tab)!

  const [aiSettings, setAiSettings] = useState<AiSettings>({
    tone: 'Consultative',
    language: 'English (India)',
    draftInvitations: true,
    requireEmployeeConfirm: true,
    voiceReplies: false,
    useKnowledge: true,
  })

  const locked = Boolean(active.adminOnly && !isAdmin)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Workspace configuration for your profile, employees, appointment policy, company knowledge, the AI agent and provider integrations."
        action={
          <>
            <DemoTag />
            <Badge tone="amber" size="sm" dot>
              Demo configuration
            </Badge>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="h-fit p-2">
          <nav className="scrollbar-thin flex gap-1 overflow-x-auto lg:flex-col">
            {tabs.map((item) => {
              const Icon = item.icon
              const disabled = Boolean(item.adminOnly && !isAdmin)
              return (
                <button
                  key={item.id}
                  onClick={() => setParams({ tab: item.id })}
                  className={cn(
                    'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[12.5px] font-medium transition-colors lg:w-full',
                    tab === item.id
                      ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-100 ring-inset'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-navy-900',
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', tab === item.id ? 'text-brand-500' : 'text-slate-400')} />
                  <span className="truncate">{item.label}</span>
                  {disabled && <Lock className="ml-auto size-3 shrink-0 text-slate-300" />}
                  {item.id === 'integrations' && (
                    <span className="ml-auto size-1.5 shrink-0 rounded-full bg-amber-400" />
                  )}
                </button>
              )
            })}
          </nav>
        </Card>

        <div className="min-w-0">
          {locked ? (
            <Card>
              <CardBody className="flex flex-col items-center justify-center py-16 text-center">
                <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-navy-50 text-navy-700 ring-1 ring-navy-100">
                  <Lock className="size-5" />
                </span>
                <p className="text-[14.5px] font-semibold text-navy-900">Management access required</p>
                <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-slate-500">
                  {active.label} is limited to management accounts. Switch to the management demo user
                  to review this screen.
                </p>
                <Button
                  className="mt-4"
                  variant="secondary"
                  size="sm"
                  onClick={() => setParams({ tab: 'profile' })}
                >
                  Back to profile
                </Button>
              </CardBody>
            </Card>
          ) : tab === 'profile' ? (
            <ProfileTab key={user?.id} />
          ) : tab === 'employees' ? (
            <EmployeesTab />
          ) : tab === 'appointments' ? (
            <AppointmentsSettingsTab />
          ) : tab === 'knowledge' ? (
            <KnowledgeTab />
          ) : tab === 'ai' ? (
            <AiSettingsTab settings={aiSettings} onChange={setAiSettings} />
          ) : tab === 'integrations' ? (
            <IntegrationsTab />
          ) : (
            <AuditTab />
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------- Profile ------------------------------- */

function ProfileTab() {
  const { user, pushToast } = useApp()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [designation, setDesignation] = useState(user?.designation ?? '')
  const [timezone, setTimezone] = useState(user?.timezone ?? 'Asia/Kolkata (IST)')
  const [workingHours, setWorkingHours] = useState(user?.workingHours ?? '09:00 – 17:00')

  if (!user) return null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Your profile"
          subtitle="Shown to schools in invitation emails and to colleagues across the workspace"
          icon={<UserRound className="size-4.5" />}
          action={
            <Badge tone={user.role === 'admin' ? 'navy' : 'brand'} size="sm">
              {user.role === 'admin' ? 'Management / Admin' : 'Employee'}
            </Badge>
          }
        />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50/70 p-4 ring-1 ring-line ring-inset">
            <Avatar name={name || user.name} tone={user.avatarTone} size="xl" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-navy-900">{name || user.name}</p>
              <p className="text-[12px] text-slate-500">
                {designation || user.designation} · {user.lastActive}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {user.assignedSchoolIds.length} assigned school
                {user.assignedSchoolIds.length === 1 ? '' : 's'} · joined the workspace before this
                preview
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Upload className="size-3.5" />}
              onClick={() =>
                pushToast({
                  tone: 'info',
                  title: 'Photo upload not available',
                  description: 'Avatar uploads require file storage in the backend phase.',
                })
              }
            >
              Change photo
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Full name</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <Label>Work email</Label>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
            <div>
              <Label>Designation</Label>
              <Input value={designation} onChange={(event) => setDesignation(event.target.value)} />
            </div>
            <div>
              <Label>Time zone</Label>
              <Select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                <option>Asia/Kolkata (IST)</option>
                <option>Asia/Dubai (GST)</option>
                <option>Asia/Singapore (SGT)</option>
                <option>Europe/London (GMT)</option>
              </Select>
            </div>
            <div>
              <Label>Working hours</Label>
              <Input value={workingHours} onChange={(event) => setWorkingHours(event.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-[11px] leading-relaxed text-slate-400">
              Changes are held in this preview only. Profile persistence arrives with the backend.
            </p>
            <Button
              size="sm"
              onClick={() =>
                pushToast({
                  tone: 'success',
                  title: 'Profile updated for this preview',
                  description: 'Held in memory — nothing is written to a database yet.',
                })
              }
            >
              Save changes
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Security" subtitle="Authentication is part of the backend phase" icon={<ShieldCheck className="size-4.5" />} />
        <CardBody className="space-y-2.5">
          {[
            { label: 'Password', value: 'Managed by the identity provider', action: 'Change password' },
            { label: 'Two-factor authentication', value: 'Not configured', action: 'Enable 2FA' },
            { label: 'Active sessions', value: '1 browser session (demo)', action: 'Review sessions' },
          ].map((row) => (
            <div
              key={row.label}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5"
            >
              <div>
                <p className="text-[12.5px] font-semibold text-navy-900">{row.label}</p>
                <p className="text-[11px] text-slate-400">{row.value}</p>
              </div>
              <Button
                variant="secondary"
                size="xs"
                onClick={() =>
                  pushToast({
                    tone: 'warning',
                    title: 'Requires the backend',
                    description: `${row.label} is not connected in the UI preview.`,
                  })
                }
              >
                {row.action}
              </Button>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}

/* ------------------------------- Employees ------------------------------- */

function EmployeesTab() {
  const { employees, pushToast } = useApp()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Employee['role']>('employee')

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Employees"
          subtitle="Everyone with access to the partnership workspace"
          icon={<Users className="size-4.5" />}
          action={
            <Button size="sm" iconLeft={<Users className="size-3.5" />} onClick={() => setInviteOpen(true)}>
              Invite employee
            </Button>
          }
        />
        <CardBody className="px-0 pb-0">
          <Table>
            <THead>
              <TH>Employee</TH>
              <TH>Role</TH>
              <TH>Schools</TH>
              <TH>Working hours</TH>
              <TH>Status</TH>
              <TH>Last active</TH>
            </THead>
            <TBody>
              {employees.map((employee) => (
                <TR key={employee.id}>
                  <TD>
                    <span className="flex items-center gap-2.5">
                      <Avatar name={employee.name} tone={employee.avatarTone} size="sm" />
                      <span>
                        <span className="block text-[12.5px] font-semibold text-navy-900">
                          {employee.name}
                        </span>
                        <span className="block text-[10.5px] text-slate-400">{employee.email}</span>
                      </span>
                    </span>
                  </TD>
                  <TD>
                    <span className="block text-[12px] text-navy-800">
                      {employee.role === 'admin' ? 'Management' : 'Employee'}
                    </span>
                    <span className="block text-[10.5px] text-slate-400">{employee.designation}</span>
                  </TD>
                  <TD>{employee.assignedSchoolIds.length}</TD>
                  <TD>
                    <span className="text-[11.5px] text-slate-500">{employee.workingHours}</span>
                  </TD>
                  <TD>
                    <Badge tone={employee.status === 'active' ? 'teal' : 'slate'} size="sm" dot>
                      {employee.status}
                    </Badge>
                  </TD>
                  <TD>
                    <span className="text-[11.5px] text-slate-500">{employee.lastActive}</span>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>

      <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-white p-4 shadow-card">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <p className="text-[11.5px] leading-relaxed text-slate-500">
          <strong className="font-semibold text-navy-900">Employee administration is UI-only.</strong>{' '}
          Invitations, role changes and account deactivation need the identity and email providers.
          Nothing is sent from this screen.
        </p>
      </div>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite an employee"
        description="Preview of the invitation form — sending requires the email provider."
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setInviteOpen(false)
                pushToast({
                  tone: 'warning',
                  title: 'Invitation not sent',
                  description:
                    'The email provider is not connected. No message was delivered and no account was created.',
                })
              }}
            >
              Review invitation
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input
              value={inviteName}
              onChange={(event) => setInviteName(event.target.value)}
              placeholder="e.g. Meena Rajan"
            />
          </div>
          <div>
            <Label>Work email</Label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="name@eduvian.in"
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as Employee['role'])}
            >
              <option value="employee">Employee</option>
              <option value="admin">Management / Admin</option>
            </Select>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200 ring-inset">
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-amber-800">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              No invitation email will be sent. This form demonstrates the intended flow only.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* --------------------------- Appointment policy --------------------------- */

function AppointmentsSettingsTab() {
  const { employees, schedulingPolicy, updateSchedulingPolicy, pushToast } = useApp()
  const [draft, setDraft] = useState<SchedulingPolicy>(schedulingPolicy)
  const [holidayDate, setHolidayDate] = useState('')
  const [holidayLabel, setHolidayLabel] = useState('')
  const [blockDate, setBlockDate] = useState('')
  const [blockLabel, setBlockLabel] = useState('')
  const [blockEmployee, setBlockEmployee] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(draft) !== JSON.stringify(schedulingPolicy)

  function set<K extends keyof SchedulingPolicy>(key: K, value: SchedulingPolicy[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function toggleDay(day: number) {
    if (day === 0) return
    setDraft((current) => ({
      ...current,
      workingDays: current.workingDays.includes(day)
        ? current.workingDays.filter((item) => item !== day)
        : [...current.workingDays, day].sort((left, right) => left - right),
    }))
  }

  function addHoliday() {
    if (!holidayDate) {
      setError('Choose a date before adding a holiday.')
      return
    }
    if (draft.holidays.some((holiday) => holiday.date === holidayDate)) {
      setError('That date is already listed as a holiday.')
      return
    }
    setError('')
    setDraft((current) => ({
      ...current,
      holidays: [
        ...current.holidays,
        { date: holidayDate, label: holidayLabel.trim() || 'Holiday', employeeId: null },
      ].sort((left, right) => left.date.localeCompare(right.date)),
    }))
    setHolidayDate('')
    setHolidayLabel('')
  }

  function addBlockedDate() {
    if (!blockDate) {
      setError('Choose a date before blocking it.')
      return
    }
    if (
      draft.blockedDates.some(
        (block) => block.date === blockDate && block.employeeId === (blockEmployee || null),
      )
    ) {
      setError('That date is already blocked for the selected scope.')
      return
    }
    setError('')
    setDraft((current) => ({
      ...current,
      blockedDates: [
        ...current.blockedDates,
        {
          date: blockDate,
          label: blockLabel.trim() || 'Blocked',
          employeeId: blockEmployee || null,
        },
      ].sort((left, right) => left.date.localeCompare(right.date)),
    }))
    setBlockDate('')
    setBlockLabel('')
    setBlockEmployee('')
  }

  function removeHoliday(date: string) {
    setDraft((current) => ({
      ...current,
      holidays: current.holidays.filter((holiday) => holiday.date !== date),
    }))
  }

  function removeBlocked(date: string, employeeId: string | null) {
    setDraft((current) => ({
      ...current,
      blockedDates: current.blockedDates.filter(
        (block) => !(block.date === date && block.employeeId === employeeId),
      ),
    }))
  }

  function save() {
    if (draft.workingDays.length === 0) {
      setError('Select at least one working day. Sunday is never offered.')
      return
    }
    if (toMinutes(draft.workEnd) <= toMinutes(draft.workStart)) {
      setError('Working hours must end after they start.')
      return
    }
    if (toMinutes(draft.breakEnd) <= toMinutes(draft.breakStart)) {
      setError('The break must end after it starts.')
      return
    }
    setError('')
    setSaving(true)
    updateSchedulingPolicy(draft)
    setSaving(false)
    pushToast({
      tone: 'success',
      title: 'Appointment policy saved',
      description:
        'Applied to every availability check in this preview. The backend must enforce the same rules before sending.',
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Appointment defaults"
          subtitle="Applied to every new booking and re-checked before an invitation is sent"
          icon={<CalendarClock className="size-4.5" />}
          action={
            dirty ? (
              <Badge tone="amber" size="sm" dot>
                Unsaved changes
              </Badge>
            ) : (
              <Badge tone="teal" size="sm" dot>
                Saved
              </Badge>
            )
          }
        />
        <CardBody className="space-y-4">
          <div>
            <Label>Eligible appointment days</Label>
            <p className="mb-2 text-[11px] leading-relaxed text-slate-400">
              Sunday is never offered, even if selected. Saturdays follow your workspace configuration.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, day) => {
                const enabled = day !== 0 && draft.workingDays.includes(day)
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(day)}
                    disabled={day === 0}
                    aria-pressed={enabled}
                    className={cn(
                      'min-w-[52px] rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors',
                      enabled
                        ? 'border-brand-300 bg-brand-50 text-brand-700'
                        : 'border-line bg-white text-slate-500 hover:border-brand-200',
                      day === 0 && 'cursor-not-allowed border-dashed text-slate-300 hover:border-line',
                    )}
                    title={day === 0 ? 'Sunday is never offered' : undefined}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[10.5px] text-slate-400">{describeWorkingDays(draft)}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Default duration</Label>
              <Select
                value={String(draft.durationMinutes)}
                onChange={(event) => set('durationMinutes', Number(event.target.value))}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </Select>
            </div>
            <div>
              <Label>Buffer between meetings</Label>
              <Select
                value={String(draft.bufferMinutes)}
                onChange={(event) => set('bufferMinutes', Number(event.target.value))}
              >
                <option value="0">No buffer</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
              </Select>
            </div>
            <div>
              <Label>Temporary hold expiry</Label>
              <Select
                value={String(draft.holdHours)}
                onChange={(event) => set('holdHours', Number(event.target.value))}
              >
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
                <option value="72">72 hours</option>
              </Select>
            </div>
            <div>
              <Label hint="Days">Book up to</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={String(draft.maxAdvanceDays)}
                onChange={(event) => set('maxAdvanceDays', Number(event.target.value) || 1)}
              />
            </div>
            <div>
              <Label>Working hours start</Label>
              <Input
                type="time"
                value={draft.workStart}
                onChange={(event) => set('workStart', event.target.value)}
              />
            </div>
            <div>
              <Label>Working hours end</Label>
              <Input
                type="time"
                value={draft.workEnd}
                onChange={(event) => set('workEnd', event.target.value)}
              />
            </div>
            <div>
              <Label>Break start</Label>
              <Input
                type="time"
                value={draft.breakStart}
                onChange={(event) => set('breakStart', event.target.value)}
              />
            </div>
            <div>
              <Label>Break end</Label>
              <Input
                type="time"
                value={draft.breakEnd}
                onChange={(event) => set('breakEnd', event.target.value)}
              />
            </div>
            <div>
              <Label>Minimum notice</Label>
              <Select
                value={String(draft.minNoticeHours)}
                onChange={(event) => set('minNoticeHours', Number(event.target.value))}
              >
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="4">4 hours</option>
                <option value="24">24 hours</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Time zone</Label>
              <Select value={draft.timezone} onChange={(event) => set('timezone', event.target.value)}>
                <option>Asia/Kolkata (IST)</option>
                <option>Asia/Dubai (GST)</option>
                <option>Asia/Singapore (SGT)</option>
                <option>Europe/London (GMT)</option>
              </Select>
            </div>
          </div>

          <div className="divide-y divide-line border-t border-line">
            <Toggle
              checked={draft.avoidOverlap}
              onChange={(next) => set('avoidOverlap', next)}
              label="Prevent overlapping appointments"
              description="The agent re-checks availability immediately before confirming. An employee can never be booked twice."
            />
            <Toggle
              checked={draft.requireResearchApproval}
              onChange={(next) => set('requireResearchApproval', next)}
              label="Require approval for researched schools"
              description="Invitations to schools created through Workflow 2 need a management decision before sending."
            />
            <Toggle
              checked={draft.requireTemplateApproval}
              onChange={(next) => set('requireTemplateApproval', next)}
              label="Require approval for edited templates"
              description="Standard templates may be sent directly. Any custom wording outside the approved set needs approval."
            />
          </div>

          {error && (
            <p className="flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] text-rose-700 ring-1 ring-rose-200 ring-inset">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-[11px] leading-relaxed text-slate-400">
              Saved in this preview. The production backend must persist and enforce these rules again
              before any invitation is sent.
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDraft(schedulingPolicy)
                  setError('')
                }}
                disabled={!dirty || saving}
              >
                Discard changes
              </Button>
              <Button size="sm" onClick={save} loading={saving} disabled={!dirty}>
                Save policy
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Holidays and blocked dates"
          subtitle="Rejected by date validation before availability is shown"
          icon={<CalendarClock className="size-4.5" />}
        />
        <CardBody className="space-y-4">
          <div>
            <p className="text-[12px] font-semibold text-navy-900">Holidays</p>
            <p className="text-[11px] text-slate-400">
              Workspace-wide non-working days, for example regional holidays.
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[160px_1fr_auto]">
              <Input
                type="date"
                value={holidayDate}
                onChange={(event) => setHolidayDate(event.target.value)}
                aria-label="Holiday date"
              />
              <Input
                value={holidayLabel}
                onChange={(event) => setHolidayLabel(event.target.value)}
                placeholder="Label, e.g. Diwali"
                aria-label="Holiday label"
              />
              <Button size="sm" variant="secondary" onClick={addHoliday} disabled={!holidayDate}>
                Add holiday
              </Button>
            </div>
            <ul className="mt-2 space-y-1">
              {draft.holidays.length === 0 && (
                <li className="text-[11px] text-slate-400">No holidays configured.</li>
              )}
              {draft.holidays.map((holiday) => (
                <li
                  key={holiday.date}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-line ring-inset"
                >
                  <span className="text-[11.5px] text-navy-800">
                    <strong className="font-semibold">{shortDate(holiday.date)}</strong> · {holiday.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeHoliday(holiday.date)}
                    className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Remove holiday ${holiday.label}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-line pt-3">
            <p className="text-[12px] font-semibold text-navy-900">Blocked dates</p>
            <p className="text-[11px] text-slate-400">
              Block one employee's calendar or the whole workspace for a date.
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-[160px_1fr_170px_auto]">
              <Input
                type="date"
                value={blockDate}
                onChange={(event) => setBlockDate(event.target.value)}
                aria-label="Blocked date"
              />
              <Input
                value={blockLabel}
                onChange={(event) => setBlockLabel(event.target.value)}
                placeholder="Label, e.g. Training day"
                aria-label="Blocked date label"
              />
              <Select
                value={blockEmployee}
                onChange={(event) => setBlockEmployee(event.target.value)}
                aria-label="Blocked date scope"
              >
                <option value="">All employees</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </Select>
              <Button size="sm" variant="secondary" onClick={addBlockedDate} disabled={!blockDate}>
                Add date
              </Button>
            </div>
            <ul className="mt-2 space-y-1">
              {draft.blockedDates.length === 0 && (
                <li className="text-[11px] text-slate-400">No blocked dates configured.</li>
              )}
              {draft.blockedDates.map((block) => {
                const employee = block.employeeId
                  ? employees.find((item) => item.id === block.employeeId)
                  : null
                return (
                  <li
                    key={`${block.date}-${block.employeeId ?? 'all'}`}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-line ring-inset"
                  >
                    <span className="text-[11.5px] text-navy-800">
                      <strong className="font-semibold">{shortDate(block.date)}</strong> · {block.label} ·{' '}
                      {employee ? employee.name : 'All employees'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBlocked(block.date, block.employeeId)}
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Remove blocked date ${block.label}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Calendar connection"
          subtitle="Availability reads and confirmed bookings"
          icon={<CalendarClock className="size-4.5" />}
          action={<Badge tone="rose" size="sm" dot>Not Connected</Badge>}
        />
        <CardBody className="space-y-3">
          <p className="text-[12.5px] leading-relaxed text-slate-500">
            Google Calendar is not connected. Availability shown in the agent and calendar screens is
            demonstration data and must not be treated as real employee availability.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                pushToast({
                  tone: 'warning',
                  title: 'Calendar connection unavailable',
                  description: 'OAuth client credentials are required before Google Calendar can be linked.',
                })
              }
            >
              Connect Google Calendar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                pushToast({
                  tone: 'info',
                  title: 'No connection to test',
                  description: 'Configure credentials first. No network request was made.',
                })
              }
            >
              Test connection
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

/* --------------------------- Company knowledge --------------------------- */

function KnowledgeTab() {
  const { pushToast } = useApp()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Company knowledge base"
          subtitle="The source material the agent may reference when preparing invitations and briefings"
          icon={<BookOpen className="size-4.5" />}
          action={
            <Button
              size="sm"
              variant="secondary"
              iconLeft={<Upload className="size-3.5" />}
              onClick={() =>
                pushToast({
                  tone: 'warning',
                  title: 'Document upload not connected',
                  description: 'File storage and the knowledge index arrive with the backend phase.',
                })
              }
            >
              Upload document
            </Button>
          }
        />
        <CardBody className="px-0 pb-0">
          <Table>
            <THead>
              <TH>Document</TH>
              <TH>Category</TH>
              <TH>Status</TH>
              <TH>Version</TH>
              <TH>Pages</TH>
              <TH>Updated</TH>
            </THead>
            <TBody>
              {knowledgeDocs.map((document) => (
                <TR key={document.id}>
                  <TD>
                    <span className="block text-[12.5px] font-medium text-navy-900">{document.title}</span>
                    <span className="block text-[10.5px] text-slate-400">
                      Updated by {document.updatedBy}
                    </span>
                  </TD>
                  <TD>
                    <Badge tone="slate" size="sm">
                      {document.category}
                    </Badge>
                  </TD>
                  <TD>
                    <Badge
                      tone={
                        document.status === 'Approved'
                          ? 'teal'
                          : document.status === 'Draft'
                            ? 'amber'
                            : 'rose'
                      }
                      size="sm"
                    >
                      {document.status}
                    </Badge>
                  </TD>
                  <TD>{document.version}</TD>
                  <TD>{document.pages}</TD>
                  <TD>
                    <span className="text-[11.5px] text-slate-500">{shortDate(document.updatedAt)}</span>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title="Knowledge index" subtitle="Used for retrieval by the agent" icon={<Search className="size-4.5" />} action={<Badge tone="rose" size="sm">Not Connected</Badge>} />
          <CardBody>
            <p className="text-[12px] leading-relaxed text-slate-500">
              The documents listed above are demonstration entries. No vector index or retrieval
              service is connected, so the agent cannot yet answer from them.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Approval workflow" subtitle="Who can publish to the knowledge base" icon={<ShieldCheck className="size-4.5" />} />
          <CardBody>
            <p className="text-[12px] leading-relaxed text-slate-500">
              Management approves curriculum, pricing and communication guidelines. Employees may
              propose drafts, but only approved versions should be used in school-facing material.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------ AI settings ------------------------------ */

function AiSettingsTab({
  settings,
  onChange,
}: {
  settings: AiSettings
  onChange: (next: AiSettings) => void
}) {
  const { pushToast } = useApp()

  function set<K extends keyof AiSettings>(key: K, value: AiSettings[K]) {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Agent behaviour"
          subtitle="How the assistant drafts, speaks and asks for confirmation"
          icon={<Sparkles className="size-4.5" />}
          action={<Badge tone="amber" size="sm" dot>Configuration Required</Badge>}
        />
        <CardBody className="space-y-4">
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-3">
            <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-amber-900">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <strong className="font-semibold">The agent is scripted in this preview.</strong> No
                language model is connected, no prompt is sent anywhere and no tool executes against
                live systems. The conversation is a faithful UI reproduction of the planned workflow.
              </span>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Language model</Label>
              <Select disabled defaultValue="none">
                <option value="none">No model configured</option>
              </Select>
            </div>
            <div>
              <Label>API key</Label>
              <Input type="password" disabled placeholder="Required before the agent can run" iconLeft={<KeyRound className="size-4" />} />
            </div>
            <div>
              <Label>Writing tone</Label>
              <Select value={settings.tone} onChange={(event) => set('tone', event.target.value)}>
                <option>Consultative</option>
                <option>Formal</option>
                <option>Concise</option>
              </Select>
            </div>
            <div>
              <Label>Language</Label>
              <Select value={settings.language} onChange={(event) => set('language', event.target.value)}>
                <option>English (India)</option>
                <option>English (UK)</option>
                <option>Hindi</option>
                <option>Tamil</option>
              </Select>
            </div>
          </div>

          <div className="divide-y divide-line border-t border-line">
            <Toggle
              checked={settings.draftInvitations}
              onChange={(next) => set('draftInvitations', next)}
              label="Let the agent draft invitations"
              description="Drafts use approved templates and the verified contact details only. You review before anything is sent."
            />
            <Toggle
              checked={settings.requireEmployeeConfirm}
              onChange={(next) => set('requireEmployeeConfirm', next)}
              label="Require employee confirmation before sending"
              description="The employee always makes the decision. The agent may prepare and schedule, never send on its own."
            />
            <Toggle
              checked={settings.useKnowledge}
              onChange={(next) => set('useKnowledge', next)}
              label="Reference the company knowledge base"
              description="When enabled, approved curriculum and company documents may be used as context. Currently no index is connected."
            />
            <Toggle
              checked={settings.voiceReplies}
              onChange={(next) => set('voiceReplies', next)}
              label="Speak agent replies aloud"
              description="Browser speech synthesis can be used for interface review. A production voice provider is not connected."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-[11px] leading-relaxed text-slate-400">
              These controls save to the preview session only. They do not configure a real model.
            </p>
            <Button
              size="sm"
              onClick={() =>
                pushToast({
                  tone: 'success',
                  title: 'Agent preferences updated for this preview',
                  description: 'No model is connected, so agent behaviour remains scripted.',
                })
              }
            >
              Save AI settings
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Guardrails" subtitle="Rules the agent must never cross" icon={<ShieldCheck className="size-4.5" />} />
        <CardBody className="space-y-2">
          {[
            'Never invent a contact, email address or availability slot.',
            'Never send an invitation without employee confirmation and the required approval.',
            'Never claim a school has confirmed unless a response arrived through a secure link.',
            'Never include guarantees of academic results in school-facing copy.',
            'Always show the employee exactly what will be sent before sending.',
          ].map((rule) => (
            <p key={rule} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-slate-600">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-teal-500" />
              {rule}
            </p>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}

/* ------------------------------ Integrations ------------------------------ */

const categoryIcon: Record<Integration['category'], typeof Mail> = {
  Email: Mail,
  Calendar: CalendarClock,
  AI: Sparkles,
  Speech: Mic,
  Messaging: MessageCircle,
  Research: Search,
}

const integrationTone: Record<Integration['status'], 'teal' | 'slate' | 'rose' | 'amber'> = {
  Connected: 'teal',
  'Not Connected': 'slate',
  'Connection Failed': 'rose',
  'Configuration Required': 'amber',
}

function IntegrationsTab() {
  const { pushToast } = useApp()
  const connected = integrations.filter((integration) => integration.status === 'Connected').length
  const attention = integrations.length - connected

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Integrations', value: String(integrations.length), tone: 'text-navy-900' },
          { label: 'Connected', value: String(connected), tone: 'text-teal-700' },
          { label: 'Needs attention', value: String(attention), tone: 'text-amber-700' },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <p className={cn('font-display text-[24px] leading-none font-bold', item.tone)}>{item.value}</p>
            <p className="mt-1.5 text-[11.5px] font-medium text-slate-500">{item.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Provider connections"
          subtitle="Email, calendar, AI, speech and messaging services used by the agent"
          icon={<Plug className="size-4.5" />}
          action={
            <Button
              size="sm"
              variant="secondary"
              iconLeft={<RefreshCw className="size-3.5" />}
              onClick={() =>
                pushToast({
                  tone: 'info',
                  title: 'Refresh is a UI action only',
                  description: 'No provider was contacted. Last-checked values are demonstration data.',
                })
              }
            >
              Refresh status
            </Button>
          }
        />
        <CardBody className="grid gap-3 md:grid-cols-2">
          {integrations.map((integration) => {
            const Icon = categoryIcon[integration.category]
            return (
              <div
                key={integration.id}
                className="flex flex-col rounded-xl border border-line p-4 transition-colors hover:border-brand-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-line ring-inset">
                      <Icon className="size-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] leading-tight font-semibold text-navy-900">
                        {integration.name}
                      </p>
                      <p className="mt-0.5 text-[10.5px] font-semibold tracking-wide text-slate-400 uppercase">
                        {integration.category}
                      </p>
                    </div>
                  </div>
                  <Badge tone={integrationTone[integration.status]} size="sm" dot>
                    {integration.status}
                  </Badge>
                </div>

                <p className="mt-2.5 text-[11.5px] leading-relaxed text-slate-500">
                  {integration.description}
                </p>

                <div className="mt-2.5 rounded-lg bg-slate-50 p-2.5 ring-1 ring-line ring-inset">
                  <p className="text-[10.5px] leading-relaxed text-slate-500">{integration.detail}</p>
                </div>

                <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                  <div>
                    <p className="text-[10px] text-slate-400">Required for</p>
                    <p className="text-[10.5px] font-medium text-navy-800">{integration.requiredFor}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Checked {relativeTime(integration.lastChecked)}
                    </p>
                  </div>
                  <Button
                    variant={integration.status === 'Connected' ? 'secondary' : 'soft'}
                    size="xs"
                    onClick={() =>
                      pushToast(
                        integration.status === 'Connected'
                          ? {
                              tone: 'info',
                              title: `${integration.name} — demo status`,
                              description:
                                'The source list is loaded. No live network check was performed.',
                            }
                          : {
                              tone: 'warning',
                              title: 'No credentials configured',
                              description: `${integration.name} cannot be tested until it is configured. No request was sent.`,
                            },
                      )
                    }
                  >
                    Test connection
                  </Button>
                </div>
              </div>
            )
          })}
        </CardBody>
      </Card>

      <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-white p-4 shadow-card">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <p className="text-[11.5px] leading-relaxed text-slate-500">
          <strong className="font-semibold text-navy-900">Nothing is connected yet.</strong> Status
          values are part of the demonstration dataset. Real credentials are configured server-side in
          the backend phase and never stored in the browser.
        </p>
      </div>
    </div>
  )
}

/* -------------------------------- Audit log -------------------------------- */

const resultTone: Record<AuditEntry['result'], 'teal' | 'rose' | 'amber'> = {
  success: 'teal',
  failed: 'rose',
  blocked: 'amber',
}

const roleTone: Record<AuditEntry['actorRole'], 'brand' | 'navy' | 'violet' | 'slate'> = {
  employee: 'brand',
  admin: 'navy',
  agent: 'violet',
  system: 'slate',
}

function AuditTab() {
  const [result, setResult] = useState<'all' | AuditEntry['result']>('all')
  const rows = result === 'all' ? auditLog : auditLog.filter((entry) => entry.result === result)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Audit log"
          subtitle="Every important action, actor and outcome — append-only by design"
          icon={<ScrollText className="size-4.5" />}
          action={
            <Button
              size="sm"
              variant="secondary"
              iconLeft={<Download className="size-3.5" />}
              onClick={() =>
                downloadCsv(
                  `eduvian-audit-${isoDay(0)}.csv`,
                  rows.map((entry) => ({
                    Time: entry.at,
                    Actor: entry.actor,
                    Role: entry.actorRole,
                    Action: entry.action,
                    Target: entry.target,
                    Result: entry.result,
                  })),
                )
              }
              disabled={rows.length === 0}
            >
              Export log
            </Button>
          }
        />
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'success', 'failed', 'blocked'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setResult(option)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-[11.5px] font-semibold capitalize transition-colors',
                  result === option
                    ? 'bg-navy-900 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                )}
              >
                {option === 'all' ? 'All events' : option}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-slate-400">{rows.length} entries</span>
          </div>
        </CardBody>
        <CardBody className="px-0 pb-0">
          <Table>
            <THead>
              <TH>When</TH>
              <TH>Actor</TH>
              <TH>Action</TH>
              <TH>Target</TH>
              <TH>Result</TH>
            </THead>
            <TBody>
              {rows.map((entry) => (
                <TR key={entry.id}>
                  <TD>
                    <span className="block text-[11.5px] text-navy-800">{relativeTime(entry.at)}</span>
                    <span className="block text-[10px] text-slate-400">
                      {new Date(entry.at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </TD>
                  <TD>
                    <span className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-navy-900">{entry.actor}</span>
                      <Badge tone={roleTone[entry.actorRole]} size="sm">
                        {entry.actorRole}
                      </Badge>
                    </span>
                  </TD>
                  <TD>
                    <span className="text-[12px] text-slate-600">{entry.action}</span>
                  </TD>
                  <TD>
                    <span className="text-[11.5px] text-slate-500">{entry.target}</span>
                  </TD>
                  <TD>
                    <Badge tone={resultTone[entry.result]} size="sm">
                      {entry.result}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title="Retention" subtitle="How long events are kept" icon={<Lock className="size-4.5" />} />
          <CardBody className="space-y-2">
            <Row label="Appointment events" value="24 months" />
            <Row label="Email delivery events" value="12 months" />
            <Row label="Agent tool executions" value="12 months" />
            <Row label="Management decisions" value="36 months" />
            <p className="pt-1 text-[10.5px] leading-relaxed text-slate-400">
              Retention values are proposed defaults, not an active policy.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Responsible use" subtitle="What the log is for" icon={<BadgeCheck className="size-4.5" />} />
          <CardBody>
            <p className="text-[12px] leading-relaxed text-slate-500">
              The audit log exists so management can reconstruct who decided what, when, and on which
              evidence. It is not a performance-surveillance tool, and employees can always see the
              actions recorded against their own account.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11.5px] text-slate-500">{label}</span>
      <span className="text-[11.5px] font-semibold text-navy-900">{value}</span>
    </div>
  )
}
