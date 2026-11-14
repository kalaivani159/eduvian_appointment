import { useMemo, useState } from 'react'
import {
  CalendarCheck2,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  FileDown,
  Filter,
  Printer,
  Radar,
  Send,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react'
import { PageHeader, Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Label, SegmentedControl, Select } from '../components/ui/Field'
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table'
import { StatCard, MetricRow } from '../components/dashboard/StatCard'
import { Donut, ProgressBar, TrendChart } from '../components/ui/Charts'
import { Avatar } from '../components/ui/Avatar'
import { useApp } from '../store/AppStore'
import { pipelineCounts, schoolById, trend as demoTrend } from '../data/demo'
import {
  appointmentStatusTone,
  cn,
  downloadCsv,
  isoDay,
  longDate,
  pct,
  shortDate,
  timeRange,
} from '../lib/utils'

type RangeKey = '30' | '90' | 'year' | 'all'
type WorkflowKey = 'all' | 'existing' | 'research'

const rangeLabels: Record<RangeKey, string> = {
  '30': 'Last 30 days',
  '90': 'Last 90 days',
  year: 'This year',
  all: 'All time',
}

const invitedStatuses = [
  'Invitation Sending',
  'Invitation Sent',
  'Awaiting School Response',
  'Alternative Time Requested',
  'Confirmed',
  'Declined',
  'Rescheduled',
  'Failed',
]

const respondedStatuses = ['Alternative Time Requested', 'Confirmed', 'Declined', 'Rescheduled']

export function ReportsPage() {
  const { appointments, followUps, employees, isAdmin, user } = useApp()
  const [range, setRange] = useState<RangeKey>('90')
  const [workflow, setWorkflow] = useState<WorkflowKey>('all')
  const [employeeFilter, setEmployeeFilter] = useState('all')

  const activeEmployeeFilter = isAdmin ? employeeFilter : (user?.id ?? 'all')

  const cutoff = useMemo(() => {
    if (range === '30') return isoDay(-30)
    if (range === '90') return isoDay(-90)
    if (range === 'year') return `${new Date().getFullYear()}-01-01`
    return null
  }, [range])

  const filtered = useMemo(
    () =>
      appointments.filter((appointment) => {
        if (activeEmployeeFilter !== 'all' && appointment.employeeId !== activeEmployeeFilter) {
          return false
        }
        if (workflow !== 'all' && appointment.workflow !== workflow) return false
        if (cutoff && appointment.date < cutoff) return false
        return true
      }),
    [appointments, activeEmployeeFilter, workflow, cutoff],
  )

  const invited = filtered.filter((appointment) => invitedStatuses.includes(appointment.status))
  const confirmed = filtered.filter((appointment) => appointment.status === 'Confirmed')
  const declined = filtered.filter((appointment) => appointment.status === 'Declined')
  const awaiting = filtered.filter((appointment) =>
    ['Invitation Sent', 'Awaiting School Response'].includes(appointment.status),
  )
  const alternative = filtered.filter((appointment) => appointment.status === 'Alternative Time Requested')
  const failed = filtered.filter((appointment) => appointment.emailStatus === 'Failed')
  const responded = filtered.filter((appointment) => respondedStatuses.includes(appointment.status))
  const responseRate = pct(responded.length, invited.length)
  const confirmRate = pct(confirmed.length, invited.length)

  const today = isoDay(0)
  const completed = filtered.filter(
    (appointment) => appointment.date < today && appointment.status === 'Confirmed',
  )

  const scopedFollowUps = followUps.filter((followUp) =>
    isAdmin ? true : followUp.employeeId === user?.id,
  )
  const dueFollowUps = scopedFollowUps.filter((followUp) =>
    ['Due Today', 'Overdue'].includes(followUp.status),
  )

  const responseMix = useMemo(() => {
    const total = Math.max(invited.length, 1)
    return [
      { label: 'Confirmed', value: pct(confirmed.length, total), tone: 'teal' },
      { label: 'Awaiting', value: pct(awaiting.length, total), tone: 'amber' },
      { label: 'Alternative time', value: pct(alternative.length, total), tone: 'brand' },
      { label: 'Declined', value: pct(declined.length + failed.length, total), tone: 'rose' },
    ]
  }, [invited.length, confirmed.length, awaiting.length, alternative.length, declined.length, failed.length])

  const employeeRows = employees
    .filter((employee) => employee.role === 'employee')
    .filter((employee) => !isAdmin || activeEmployeeFilter === 'all' || employee.id === activeEmployeeFilter)
    .map((employee) => {
      const rows = filtered.filter((appointment) => appointment.employeeId === employee.id)
      const employeeInvited = rows.filter((appointment) => invitedStatuses.includes(appointment.status))
      const employeeConfirmed = rows.filter((appointment) => appointment.status === 'Confirmed')
      const employeeDeclined = rows.filter((appointment) => appointment.status === 'Declined')
      const employeeResponded = rows.filter((appointment) =>
        respondedStatuses.includes(appointment.status),
      )
      return {
        employee,
        total: rows.length,
        invited: employeeInvited.length,
        confirmed: employeeConfirmed.length,
        declined: employeeDeclined.length,
        rate: pct(employeeResponded.length, employeeInvited.length),
      }
    })
    .sort((a, b) => b.confirmed - a.confirmed)

  function exportCsv() {
    downloadCsv(
      `eduvian-appointments-${isoDay(0)}.csv`,
      filtered.map((appointment) => ({
        'Appointment ID': appointment.id,
        School: schoolById(appointment.schoolId)?.name ?? 'Unknown school',
        Contact: appointment.contactName,
        Designation: appointment.contactDesignation,
        Email: appointment.contactEmail || 'Not verified',
        Date: appointment.date,
        Start: appointment.startTime,
        End: appointment.endTime,
        Format: appointment.format,
        Status: appointment.status,
        'Email status': appointment.emailStatus,
        Owner: employees.find((employee) => employee.id === appointment.employeeId)?.name ?? 'Unassigned',
        Workflow: appointment.workflow === 'research' ? 'Research & book' : 'Existing school',
      })),
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Operational reporting for invitations, school responses and employee activity. Every figure below is generated from the demonstration dataset — the backend phase will replace these with live queries."
        action={
          <>
            <Button
              variant="secondary"
              size="md"
              iconLeft={<Download className="size-4" />}
              onClick={exportCsv}
              disabled={filtered.length === 0}
            >
              Export CSV
            </Button>
            <Button variant="secondary" size="md" iconLeft={<Printer className="size-4" />} onClick={() => window.print()}>
              Print / PDF
            </Button>
          </>
        }
      />

      <Card>
        <CardBody className="pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2 pb-2.5 text-[11px] font-bold tracking-[0.1em] text-slate-400 uppercase">
              <Filter className="size-3.5" />
              Filters
            </div>
            <div className="min-w-[150px]">
              <Label>Date range</Label>
              <Select value={range} onChange={(event) => setRange(event.target.value as RangeKey)}>
                {(Object.keys(rangeLabels) as RangeKey[]).map((key) => (
                  <option key={key} value={key}>
                    {rangeLabels[key]}
                  </option>
                ))}
              </Select>
            </div>
            {isAdmin && (
              <div className="min-w-[180px]">
                <Label>Employee</Label>
                <Select
                  value={employeeFilter}
                  onChange={(event) => setEmployeeFilter(event.target.value)}
                >
                  <option value="all">All employees</option>
                  {employees
                    .filter((employee) => employee.role === 'employee')
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                </Select>
              </div>
            )}
            <div>
              <Label>Workflow</Label>
              <SegmentedControl
                value={workflow}
                onChange={setWorkflow}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'existing', label: 'Existing school' },
                  { value: 'research', label: 'Researched' },
                ]}
              />
            </div>
            <div className="ml-auto pb-1 text-right">
              <p className="text-[11px] text-slate-400">Reporting window</p>
              <p className="text-[12px] font-semibold text-navy-900">
                {cutoff ? `${shortDate(cutoff)} → ${shortDate(today)}` : 'All records'}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Invitations in window"
          value={String(invited.length)}
          icon={<Send className="size-4.5" />}
          tone="brand"
          hint={`${filtered.length} appointment records`}
        />
        <StatCard
          label="Confirmed"
          value={String(confirmed.length)}
          icon={<CalendarCheck2 className="size-4.5" />}
          tone="teal"
          hint={`${confirmRate}% of invitations`}
        />
        <StatCard
          label="Awaiting response"
          value={String(awaiting.length)}
          icon={<Clock3 className="size-4.5" />}
          tone="amber"
          hint={`${alternative.length} alternative times requested`}
        />
        <StatCard
          label="Response rate"
          value={`${responseRate}%`}
          icon={<Radar className="size-4.5" />}
          tone="navy"
          hint={`${responded.length} of ${invited.length} answered`}
        />
        <StatCard
          label="Declined"
          value={String(declined.length)}
          icon={<XCircle className="size-4.5" />}
          tone="rose"
          hint={failed.length > 0 ? `${failed.length} delivery failure` : 'No delivery failures'}
        />
        <StatCard
          label="Meetings completed"
          value={String(completed.length)}
          icon={<CheckCircle2 className="size-4.5" />}
          tone="teal"
          hint="Past confirmed appointments"
        />
        <StatCard
          label="Follow-ups due"
          value={String(dueFollowUps.length)}
          icon={<ClipboardList className="size-4.5" />}
          tone="amber"
          hint="Due today or overdue"
        />
        <StatCard
          label="Active employees"
          value={String(employeeRows.filter((row) => row.total > 0).length)}
          icon={<Users className="size-4.5" />}
          tone="brand"
          hint={`${employeeRows.length} in scope`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Invitations, confirmations and declines"
            subtitle="Six-month demonstration series — not filtered by the controls above"
            icon={<TrendingUp className="size-4.5" />}
            action={<Badge tone="amber" size="sm">Demo series</Badge>}
          />
          <CardBody>
            <TrendChart data={demoTrend} />
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
              The backend will calculate this series from appointment and response events. Until then it
              is a fixed demonstration dataset so the layout can be reviewed.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Response mix"
            subtitle="Calculated from the filtered appointment records"
            icon={<Radar className="size-4.5" />}
          />
          <CardBody>
            <Donut
              data={responseMix}
              centerValue={invited.length ? `${responseRate}%` : '—'}
              centerLabel="Responded"
              size={150}
              thickness={14}
            />
            <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-line ring-inset">
              <p className="text-[11px] leading-relaxed text-slate-500">
                Response rate counts confirmations, declines, reschedules and alternative-time requests
                against invitations that actually reached a school.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Employee activity"
            subtitle="Appointments handled inside the selected reporting window"
            icon={<Users className="size-4.5" />}
            action={<Badge tone="slate" size="sm">Derived from records</Badge>}
          />
          <CardBody className="px-0 pb-0">
            {employeeRows.length === 0 ? (
              <p className="px-5 py-10 text-center text-[12.5px] text-slate-400">
                No employee activity matches these filters.
              </p>
            ) : (
              <Table>
                <THead>
                  <TH>Employee</TH>
                  <TH align="center">Records</TH>
                  <TH align="center">Invited</TH>
                  <TH align="center">Confirmed</TH>
                  <TH align="center">Declined</TH>
                  <TH>Response rate</TH>
                </THead>
                <TBody>
                  {employeeRows.map((row) => (
                    <TR key={row.employee.id}>
                      <TD>
                        <span className="flex items-center gap-2.5">
                          <Avatar name={row.employee.name} tone={row.employee.avatarTone} size="sm" />
                          <span>
                            <span className="block text-[12.5px] font-semibold text-navy-900">
                              {row.employee.name}
                            </span>
                            <span className="block text-[10.5px] text-slate-400">
                              {row.employee.designation}
                            </span>
                          </span>
                        </span>
                      </TD>
                      <TD align="center">{row.total}</TD>
                      <TD align="center">{row.invited}</TD>
                      <TD align="center">
                        <span className="font-semibold text-teal-700">{row.confirmed}</span>
                      </TD>
                      <TD align="center">
                        <span className={cn(row.declined > 0 && 'font-semibold text-rose-600')}>
                          {row.declined}
                        </span>
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <ProgressBar value={row.rate} height={5} tone="teal" className="w-24" />
                          <span className="text-[11.5px] font-semibold text-navy-900">{row.rate}%</span>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Pipeline snapshot"
            subtitle="Workspace-wide demonstration counts"
            icon={<CalendarRange className="size-4.5" />}
          />
          <CardBody className="space-y-3">
            {pipelineCounts.slice(0, 8).map((stage) => (
              <MetricRow
                key={stage.stage}
                label={stage.stage}
                value={stage.count}
                total={Math.max(...pipelineCounts.map((item) => item.count))}
                tone={
                  stage.stage.includes('Confirmed') || stage.stage.includes('Completed')
                    ? 'teal'
                    : stage.stage.includes('Waiting') || stage.stage.includes('Follow')
                      ? 'amber'
                      : 'brand'
                }
              />
            ))}
            <p className="pt-1 text-[10.5px] text-slate-400">
              Pipeline counts are fixed demonstration values. They are not affected by the filters
              above.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Appointment detail table"
          subtitle={`${filtered.length} record${filtered.length === 1 ? '' : 's'} in the current view — exportable as CSV`}
          icon={<FileDown className="size-4.5" />}
          action={
            <Button
              variant="secondary"
              size="xs"
              iconLeft={<Download className="size-3" />}
              onClick={exportCsv}
              disabled={filtered.length === 0}
            >
              Export view
            </Button>
          }
        />
        <CardBody className="px-0 pb-0">
          {filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-[12.5px] text-slate-400">
              No appointments match these filters. Widen the date range or clear the workflow filter.
            </p>
          ) : (
            <Table>
              <THead>
                <TH>School</TH>
                <TH>Contact</TH>
                <TH>Date</TH>
                <TH>Time</TH>
                <TH>Workflow</TH>
                <TH>Status</TH>
                <TH>Owner</TH>
              </THead>
              <TBody>
                {filtered.map((appointment) => (
                  <TR key={appointment.id}>
                    <TD>
                      <span className="block text-[12.5px] font-medium text-navy-900">
                        {schoolById(appointment.schoolId)?.name ?? 'Unknown school'}
                      </span>
                    </TD>
                    <TD>
                      <span className="block text-[12px] text-navy-800">{appointment.contactName}</span>
                      <span className="block text-[10.5px] text-slate-400">
                        {appointment.contactDesignation}
                      </span>
                    </TD>
                    <TD>
                      <span className="text-[12px]">{shortDate(appointment.date)}</span>
                    </TD>
                    <TD>
                      <span className="text-[11.5px] text-slate-500">
                        {timeRange(appointment.startTime, appointment.endTime)}
                      </span>
                    </TD>
                    <TD>
                      <Badge tone={appointment.workflow === 'research' ? 'violet' : 'sky'} size="sm">
                        {appointment.workflow === 'research' ? 'Research' : 'Existing'}
                      </Badge>
                    </TD>
                    <TD>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset',
                          appointmentStatusTone(appointment.status),
                        )}
                      >
                        {appointment.status}
                      </span>
                    </TD>
                    <TD>
                      <span className="text-[11.5px] text-slate-500">
                        {employees.find((employee) => employee.id === appointment.employeeId)?.name ??
                          'Unassigned'}
                      </span>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-card">
        <p className="text-[11px] leading-relaxed text-slate-400">
          <strong className="font-semibold text-navy-800">Reporting note.</strong> Metrics are limited to
          the records available in this preview. No production values, targets or availability data are
          hardcoded. Report generated {longDate(today)}.
        </p>
        <Badge tone="amber" size="sm" dot>
          Demonstration data
        </Badge>
      </div>

      <div className="hidden print:block">
        <p className="text-[10px] text-slate-500">
          Eduvian Solutions · internal report · demonstration data only.
        </p>
      </div>
    </div>
  )
}
