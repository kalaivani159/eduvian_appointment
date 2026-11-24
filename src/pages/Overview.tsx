import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Bot,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  GraduationCap,
  MailWarning,
  MessageSquareMore,
  Plus,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { PageHeader, Card, CardBody, CardHeader, SectionHeading } from '../components/ui/Card'
import { Badge, ClassBadge, DemoTag } from '../components/ui/Badge'
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table'
import { StatCard, MetricRow } from '../components/dashboard/StatCard'
import { Donut, TrendChart, ProgressBar } from '../components/ui/Charts'
import { Avatar, EmptyState } from '../components/ui/Avatar'
import { UserChip } from '../components/layout/Topbar'
import { useApp } from '../store/AppStore'
import { responseSplit, trend } from '../data/demo'
import { pipelineCountsFor } from '../lib/pipeline'
import {
  appointmentStatusTone,
  cn,
  followUpTone,
  longDate,
  relativeTime,
  timeRange,
  weekdayDate,
} from '../lib/utils'

export function Overview() {
  const { user, isAdmin, appointments, followUps, approvals, notifications, employees, schools, schoolById } =
    useApp()

  if (!user) return null
  // Pipeline snapshot derived from the live school records (never fixed values).
  const pipeline = pipelineCountsFor(schools)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user.name.split(' ')[0]
  const today = longDate(new Date().toISOString().slice(0, 10))

  const mine = appointments.filter((appointment) => isAdmin || appointment.employeeId === user.id)
  const upcoming = mine
    .filter((appointment) => ['Confirmed', 'Awaiting School Response', 'Invitation Sent', 'Alternative Time Requested', 'Pending Approval'].includes(appointment.status))
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
  const awaiting = mine.filter((appointment) => appointment.status === 'Awaiting School Response').length
  const confirmed = mine.filter((appointment) => appointment.status === 'Confirmed').length
  const myFollowUps = followUps.filter((followUp) => isAdmin || followUp.employeeId === user.id)
  const dueFollowUps = myFollowUps.filter((followUp) => ['Due Today', 'Overdue'].includes(followUp.status))
  const pendingApprovals = approvals.filter((approval) => approval.status === 'Pending')
  const failedEmails = mine.filter((appointment) => appointment.emailStatus === 'Failed')

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description={`${today} · ${isAdmin ? 'Management workspace — full network visibility' : 'Your workspace — assigned schools and appointments'}`}
        action={
          <>
            <Link
              to="/schools"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-navy-900 ring-1 ring-line transition-colors hover:bg-brand-50/60 hover:ring-brand-200"
            >
              <Search className="size-4" />
              Browse schools
            </Link>
            <Link
              to="/agent"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(106,52,240,0.7)] transition-all hover:from-brand-400 hover:to-brand-500"
            >
              <Plus className="size-4" />
              Book appointment
            </Link>
          </>
        }
      />

      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl"
        style={{ background: 'linear-gradient(135deg, #0b1228 0%, #1c2b52 35%, #27396a 60%, #0d9488 100%)' }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -left-16 size-64 rounded-full bg-brand-500/20 blur-[80px]" />
          <div className="absolute -bottom-8 right-0 size-48 rounded-full bg-teal-400/15 blur-[60px]" />
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right, rgba(124,77,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(124,77,255,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        </div>
        {/* Floating edu icons */}
        <div className="pointer-events-none absolute top-3 right-24 opacity-10 animate-float" style={{ animationDelay: '0s' }}>
          <GraduationCap className="size-8 text-white" />
        </div>
        <div className="pointer-events-none absolute top-6 right-10 opacity-10 animate-float" style={{ animationDelay: '1.2s' }}>
          <Sparkles className="size-5 text-white" />
        </div>
        <div className="pointer-events-none absolute bottom-3 right-32 opacity-8 animate-float-slow" style={{ animationDelay: '0.8s' }}>
          <BookOpen className="size-6 text-white" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.15em] text-white/70 uppercase backdrop-blur-sm ring-1 ring-white/15">
                <Sparkles className="size-3 text-brand-300" />
                AI-Powered Education Platform
              </span>
            </div>
            <h2 className="font-display text-[22px] font-extrabold text-white leading-tight">
              {greeting}, {firstName}!
            </h2>
            <p className="mt-0.5 text-[12.5px] text-white/55 max-w-sm">
              {today} · {isAdmin ? 'Full network visibility — management workspace' : 'Your assigned schools and appointments'}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            {[
              { label: 'Upcoming', value: String(upcoming.length), icon: CalendarCheck2 },
              { label: 'Confirmed', value: String(confirmed + (isAdmin ? 7 : 0)), icon: CheckCircle2 },
              { label: 'Awaiting', value: String(awaiting + (isAdmin ? 7 : 0)), icon: Clock3 },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <stat.icon className="size-3.5 text-white/60" />
                  <span className="text-[20px] font-bold text-white font-display">{stat.value}</span>
                </div>
                <span className="text-[10px] font-semibold text-white/45 uppercase tracking-wide">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isAdmin ? (
          <>
            <StatCard
              label="Total schools"
              value="10"
              delta="+3"
              trend="up"
              icon={<GraduationCap className="size-4.5" />}
              tone="brand"
              spark={[4, 5, 6, 6, 8, 9, 10]}
              hint="8 existing · 2 from research"
            />
            <StatCard
              label="Verified contacts"
              value="11"
              delta="84%"
              trend="up"
              icon={<ShieldCheck className="size-4.5" />}
              tone="teal"
              spark={[5, 6, 7, 8, 9, 10, 11]}
              hint="2 awaiting review"
            />
            <StatCard
              label="Invitations sent"
              value="24"
              delta="+6"
              trend="up"
              icon={<MessageSquareMore className="size-4.5" />}
              tone="navy"
              spark={[9, 12, 13, 17, 19, 21, 24]}
              hint="This month"
            />
            <StatCard
              label="Awaiting response"
              value={String(awaiting + 7)}
              delta="8 open"
              trend="flat"
              icon={<Clock3 className="size-4.5" />}
              tone="amber"
              spark={[6, 7, 6, 8, 7, 8, 8]}
              hint="Oldest 3 days"
            />
            <StatCard
              label="Confirmed appointments"
              value={String(confirmed + 7)}
              delta="+4"
              trend="up"
              icon={<CalendarCheck2 className="size-4.5" />}
              tone="teal"
              spark={[4, 6, 7, 9, 11, 13, 15]}
              hint="Next 14 days"
            />
            <StatCard
              label="Follow-ups due"
              value={String(dueFollowUps.length + 3)}
              delta="1 overdue"
              trend="down"
              icon={<ClipboardList className="size-4.5" />}
              tone="amber"
              spark={[2, 3, 2, 4, 3, 5, 4]}
              hint="Across the team"
            />
            <StatCard
              label="Pending approvals"
              value={String(pendingApprovals.length)}
              delta="Needs review"
              trend="flat"
              icon={<ShieldCheck className="size-4.5" />}
              tone="brand"
              spark={[1, 2, 1, 1, 2, 2, 2]}
              hint="Oldest 3h 20m"
            />
            <StatCard
              label="Email failures"
              value={String(failedEmails.length)}
              delta="Action"
              trend="down"
              icon={<MailWarning className="size-4.5" />}
              tone="rose"
              spark={[0, 0, 1, 0, 0, 1, 1]}
              hint="Retry available"
            />
          </>
        ) : (
          <>
            <StatCard
              label="My schools"
              value={String(user.assignedSchoolIds.length)}
              icon={<GraduationCap className="size-4.5" />}
              tone="brand"
              spark={[2, 3, 3, 4, 4, 5, 5]}
              hint="Assigned to you"
            />
            <StatCard
              label="Upcoming appointments"
              value={String(upcoming.length)}
              delta="+1"
              trend="up"
              icon={<CalendarClock className="size-4.5" />}
              tone="teal"
              spark={[0, 1, 1, 2, 2, 3, 3]}
              hint="Next 14 days"
            />
            <StatCard
              label="Awaiting response"
              value={String(awaiting)}
              icon={<Clock3 className="size-4.5" />}
              tone="amber"
              spark={[1, 1, 2, 1, 1, 1, 1]}
              hint="Invitations open"
            />
            <StatCard
              label="Confirmed"
              value={String(confirmed)}
              delta="+1"
              trend="up"
              icon={<CheckCircle2 className="size-4.5" />}
              tone="teal"
              spark={[0, 1, 1, 1, 2, 2, 2]}
              hint="Locked into calendar"
            />
            <StatCard
              label="Follow-ups due today"
              value={String(myFollowUps.filter((f) => f.status === 'Due Today').length)}
              icon={<ClipboardList className="size-4.5" />}
              tone="navy"
              hint="Action required"
            />
            <StatCard
              label="Overdue follow-ups"
              value={String(myFollowUps.filter((f) => f.status === 'Overdue').length)}
              delta="1"
              trend="down"
              icon={<TriangleAlert className="size-4.5" />}
              tone="rose"
              hint="Escalated to you"
            />
            <StatCard
              label="Response rate"
              value="78%"
              delta="+6%"
              trend="up"
              icon={<Radar className="size-4.5" />}
              tone="brand"
              spark={[58, 62, 66, 70, 72, 75, 78]}
              hint="Last 30 days"
            />
            <StatCard
              label="Agent actions"
              value="34"
              icon={<Bot className="size-4.5" />}
              tone="navy"
              hint="This week"
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Appointment overview"
            subtitle="Invitations, confirmations and declines over the last six months"
            icon={<CalendarCheck2 className="size-4.5" />}
            action={<Badge tone="slate" size="sm">Demo series</Badge>}
          />
          <CardBody>
            <TrendChart data={trend} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="School response mix"
            subtitle="How schools answered invitations"
            icon={<Radar className="size-4.5" />}
          />
          <CardBody>
            <Donut data={responseSplit} centerValue="62%" centerLabel="Confirmed" />
            <div className="mt-5 rounded-xl bg-brand-50/60 p-3 ring-1 ring-brand-100 ring-inset">
              <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-brand-900">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand-500" />
                Confirmation rate is highest when the invitation is sent within 24 hours of contact
                verification.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Middle row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={isAdmin ? 'Upcoming appointments — all employees' : 'My upcoming appointments'}
            subtitle="Confirmed and open invitations, sorted by date"
            icon={<CalendarClock className="size-4.5" />}
            action={
              <Link to="/appointments" className="text-[12px] font-semibold text-brand-600 hover:underline">
                View all
              </Link>
            }
          />
          <CardBody className="px-0 pb-0">
            {upcoming.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="size-5" />}
                title="No upcoming appointments"
                description="Book an appointment with an existing school or research a new one to get started."
                action={
                  <Link
                    to="/agent"
                    className="inline-flex h-8.5 items-center justify-center rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-3 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(106,52,240,0.7)] transition-all hover:from-brand-400 hover:to-brand-500"
                  >
                    Open the agent
                  </Link>
                }
                compact
              />
            ) : (
              <Table>
                <THead>
                  <TH>School</TH>
                  <TH>Contact</TH>
                  <TH>Date &amp; time</TH>
                  <TH>Status</TH>
                  {isAdmin && <TH>Owner</TH>}
                </THead>
                <TBody>
                  {upcoming.slice(0, 5).map((appointment) => (
                    <TR key={appointment.id}>
                      <TD>
                        <Link to={`/appointments/${appointment.id}`} className="group block">
                          <span className="block text-[13px] font-semibold text-navy-900 group-hover:text-brand-700">
                            {schoolById(appointment.schoolId)?.name}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                            {schoolById(appointment.schoolId)?.city} · {appointment.format}
                            <DemoTag />
                          </span>
                        </Link>
                      </TD>
                      <TD>
                        <span className="block text-[12.5px] text-navy-800">{appointment.contactName}</span>
                        <span className="text-[11px] text-slate-400">{appointment.contactDesignation}</span>
                      </TD>
                      <TD>
                        <span className="block text-[12.5px] font-medium text-navy-800">
                          {weekdayDate(appointment.date)}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {timeRange(appointment.startTime, appointment.endTime)}
                        </span>
                      </TD>
                      <TD>
                        <ClassBadge className={appointmentStatusTone(appointment.status)} size="sm">
                          {appointment.status}
                        </ClassBadge>
                      </TD>
                      {isAdmin && (
                        <TD>
                          <UserChip employeeId={appointment.employeeId} size="xs" />
                        </TD>
                      )}
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          {isAdmin ? (
            <Card>
              <CardHeader
                title="Pending approvals"
                subtitle="Actions waiting on management"
                icon={<ShieldCheck className="size-4.5" />}
                action={
                  <Link to="/approvals" className="text-[12px] font-semibold text-brand-600 hover:underline">
                    Review
                  </Link>
                }
              />
              <CardBody className="space-y-2.5 pt-0">
                {pendingApprovals.length === 0 ? (
                  <p className="py-4 text-center text-[12.5px] text-slate-400">Nothing waiting on you.</p>
                ) : (
                  pendingApprovals.map((approval) => (
                    <div
                      key={approval.id}
                      className="rounded-xl border border-line bg-slate-50/60 p-3 transition-colors hover:border-brand-200 hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12.5px] font-semibold text-navy-900">
                          {schoolById(approval.schoolId)?.name}
                        </p>
                        <span className="shrink-0 text-[10.5px] text-slate-400">
                          {relativeTime(approval.submittedAt)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-slate-500">
                        {approval.reason}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10.5px] text-slate-400">by {approval.requestedBy}</span>
                        <Link
                          to="/approvals"
                          className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline"
                        >
                          Review <ArrowRight className="size-3" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader
                title="Next appointment"
                subtitle="Your closest confirmed booking"
                icon={<CalendarCheck2 className="size-4.5" />}
              />
              <CardBody className="pt-0">
                {upcoming[0] ? (
                  <div>
                    <div className="rounded-xl bg-gradient-to-br from-navy-900 to-navy-800 p-4 text-white">
                      <p className="text-[10px] font-bold tracking-[0.14em] text-white/40 uppercase">
                        {weekdayDate(upcoming[0].date)}
                      </p>
                      <p className="mt-1 font-display text-lg font-bold">
                        {timeRange(upcoming[0].startTime, upcoming[0].endTime)}
                      </p>
                      <p className="mt-3 text-[12.5px] font-semibold">
                        {schoolById(upcoming[0].schoolId)?.name}
                      </p>
                      <p className="text-[11px] text-white/50">
                        {upcoming[0].contactName} · {upcoming[0].contactDesignation}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold">
                          {upcoming[0].format}
                        </span>
                        <span className="rounded-md bg-teal-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-teal-200">
                          {upcoming[0].status}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/appointments/${upcoming[0].id}`}
                      className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-[12px] font-semibold text-navy-800 hover:border-brand-200 hover:bg-brand-50/40"
                    >
                      Open appointment <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                ) : (
                  <p className="py-6 text-center text-[12.5px] text-slate-400">No confirmed appointment yet.</p>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Follow-ups"
              subtitle={`${dueFollowUps.length} need attention`}
              icon={<ClipboardList className="size-4.5" />}
              action={
                <Link to="/follow-ups" className="text-[12px] font-semibold text-brand-600 hover:underline">
                  All
                </Link>
              }
            />
            <CardBody className="space-y-2 pt-0">
              {myFollowUps
                .filter((followUp) => followUp.status !== 'Completed' && followUp.status !== 'Cancelled')
                .slice(0, 3)
                .map((followUp) => (
                  <div key={followUp.id} className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        'mt-1.5 size-1.5 shrink-0 rounded-full',
                        followUp.status === 'Overdue'
                          ? 'bg-rose-500'
                          : followUp.status === 'Due Today'
                            ? 'bg-amber-500'
                            : 'bg-slate-300',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-navy-900">
                        {schoolById(followUp.schoolId)?.name}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">{followUp.reason}</p>
                    </div>
                    <ClassBadge className={followUpTone(followUp.status)} size="sm">
                      {followUp.status}
                    </ClassBadge>
                  </div>
                ))}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="School pipeline"
            subtitle="Where every school currently sits"
            icon={<GraduationCap className="size-4.5" />}
          />
          <CardBody className="space-y-3">
            {pipeline.slice(0, 7).map((stage) => (
              <MetricRow
                key={stage.stage}
                label={stage.stage}
                value={stage.count}
                total={Math.max(1, ...pipeline.map((item) => item.count))}
                tone={
                  stage.stage.includes('Confirmed') || stage.stage.includes('Completed')
                    ? 'teal'
                    : stage.stage.includes('Waiting') || stage.stage.includes('Follow')
                      ? 'amber'
                      : 'brand'
                }
              />
            ))}
            <Link
              to="/reports"
              className="mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-[12px] font-semibold text-navy-700 hover:border-brand-200 hover:bg-brand-50/40"
            >
              Full pipeline report <ArrowRight className="size-3.5" />
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="AI agent activity"
            subtitle="Recent tool executions"
            icon={<Bot className="size-4.5" />}
            action={<Badge tone="brand" size="sm" dot>Live log</Badge>}
          />
          <CardBody className="space-y-2.5">
            {[
              { text: 'Checked availability for Priya Raman', meta: '2m ago', ok: true },
              { text: 'Prepared invitation for Crescent Matriculation', meta: '3m ago', ok: true },
              { text: 'Blocked send — contact unverified', meta: '12m ago', ok: false },
              { text: 'Processed school confirmation · ABC International', meta: '3h ago', ok: true },
              { text: 'Recorded alternative time · Nova Global', meta: '15h ago', ok: true },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-2.5">
                <span
                  className={cn(
                    'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg ring-1',
                    item.ok
                      ? 'bg-teal-50 text-teal-600 ring-teal-100'
                      : 'bg-amber-50 text-amber-600 ring-amber-100',
                  )}
                >
                  {item.ok ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] leading-snug text-navy-800">{item.text}</p>
                  <p className="text-[10.5px] text-slate-400">{item.meta}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={isAdmin ? 'Employee activity' : 'My recent activity'}
            subtitle={isAdmin ? 'Appointments handled this month' : 'Your latest actions'}
            icon={<Users className="size-4.5" />}
          />
          <CardBody className="space-y-3">
            {employees
              .filter((employee) => employee.role === 'employee')
              .slice(0, isAdmin ? 4 : 1)
              .map((employee) => {
                const count = appointments.filter((appointment) => appointment.employeeId === employee.id).length
                return (
                  <div key={employee.id} className="flex items-center gap-3">
                    <Avatar name={employee.name} tone={employee.avatarTone} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-navy-900">{employee.name}</p>
                      <div className="mt-1">
                        <ProgressBar value={(count / 6) * 100} height={4} tone="brand" />
                      </div>
                    </div>
                    <span className="text-[11.5px] font-semibold text-slate-500">{count}</span>
                  </div>
                )
              })}
            {!isAdmin && (
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-line ring-inset">
                <p className="text-[11.5px] leading-relaxed text-slate-500">
                  Last action: confirmed appointment with ABC International School,{' '}
                  {relativeTime(new Date(Date.now() - 180 * 60000).toISOString())}.
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Notifications strip */}
      <Card>
        <CardHeader
          title="Recent updates"
          subtitle="Generated by real workflow events — notification delivery is part of the backend phase"
          icon={<Sparkles className="size-4.5" />}
          action={
            <Link to="/notifications" className="text-[12px] font-semibold text-brand-600 hover:underline">
              View all
            </Link>
          }
        />
        <CardBody className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {notifications.slice(0, 3).map((notification) => (
            <Link
              key={notification.id}
              to="/notifications"
              className="flex items-start gap-2.5 rounded-xl border border-line p-3 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
            >
              <span
                className={cn(
                  'mt-0.5 size-1.5 shrink-0 rounded-full',
                  notification.severity === 'success'
                    ? 'bg-teal-500'
                    : notification.severity === 'danger'
                      ? 'bg-rose-500'
                      : notification.severity === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-brand-500',
                )}
              />
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold text-navy-900">{notification.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-slate-500">
                  {notification.body}
                </p>
                <p className="mt-1 text-[10.5px] text-slate-400">{relativeTime(notification.at)}</p>
              </div>
            </Link>
          ))}
        </CardBody>
      </Card>

      <SectionHeading
        className="pt-2"
        eyebrow="Getting started"
        title="Two workflows, one agent"
        description="The agent identifies which workflow your request belongs to — you can also start either one directly."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/agent?mode=existing"
          className="group relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-white to-brand-50/50 p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
        >
          <div className="flex items-start justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_8px_20px_-8px_rgba(106,52,240,0.8)]">
              <CalendarCheck2 className="size-5" />
            </span>
            <span className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">Workflow 1</span>
          </div>
          <h3 className="mt-3.5 text-[15px] font-bold text-navy-900">Book an appointment</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
            For schools already in your records. Pick the school, pick the contact, choose a valid
            slot and send the invitation.
          </p>
          <span className="mt-3.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-700">
            Start booking <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link
          to="/agent?mode=research"
          className="group relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-white to-teal-50/50 p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lift"
        >
          <div className="flex items-start justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-[0_8px_20px_-8px_rgba(13,148,136,0.8)]">
              <Search className="size-5" />
            </span>
            <span className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">Workflow 2</span>
          </div>
          <h3 className="mt-3.5 text-[15px] font-bold text-navy-900">Research &amp; book</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
            For schools outside your records. Research approved sources, verify contacts, then
            continue to scheduling.
          </p>
          <span className="mt-3.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-teal-700">
            Start research <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>

      <p className="pb-2 text-center text-[11px] text-slate-400">
        Metrics shown are demonstration values. The backend phase will replace every number with live
        database queries — nothing here is hardcoded production data.
      </p>
    </div>
  )
}
