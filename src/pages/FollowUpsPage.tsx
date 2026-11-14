import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  MessageSquare,
  Phone,
  Plus,
  Search,
  TriangleAlert,
} from 'lucide-react'
import { PageHeader, Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, ClassBadge } from '../components/ui/Badge'
import { Input, Label, SegmentedControl, Select, Textarea } from '../components/ui/Field'
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/Avatar'
import { UserChip } from '../components/layout/Topbar'
import { useApp } from '../store/AppStore'
import { employeeById, emails, schoolById, schools } from '../data/demo'
import { cn, followUpTone, isoDay, relativeTime, shortDate } from '../lib/utils'

export function FollowUpsPage() {
  const { followUps, completeFollowUp, user, isAdmin, pushToast } = useApp()
  const [filter, setFilter] = useState<'open' | 'due' | 'overdue' | 'completed'>('open')
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const mine = followUps.filter((followUp) => isAdmin || followUp.employeeId === user?.id)

  const counts = {
    due: mine.filter((followUp) => followUp.status === 'Due Today').length,
    overdue: mine.filter((followUp) => followUp.status === 'Overdue').length,
    pending: mine.filter((followUp) => followUp.status === 'Pending').length,
    completed: mine.filter((followUp) => followUp.status === 'Completed').length,
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return mine
      .filter((followUp) => {
        if (filter === 'due') return followUp.status === 'Due Today'
        if (filter === 'overdue') return followUp.status === 'Overdue'
        if (filter === 'completed') return followUp.status === 'Completed'
        return followUp.status !== 'Completed' && followUp.status !== 'Cancelled'
      })
      .filter((followUp) => {
        if (!q) return true
        const school = schoolById(followUp.schoolId)
        return school?.name.toLowerCase().includes(q) || followUp.reason.toLowerCase().includes(q)
      })
      .sort((a, b) => a.nextFollowUpOn.localeCompare(b.nextFollowUpOn))
  }, [mine, filter, query])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Follow-ups"
        description="Due and overdue follow-ups across your schools. The agent prepares messages, but nothing is sent without authorisation."
        action={
          <Button size="md" iconLeft={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>
            Create follow-up
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Due today', value: counts.due, icon: Clock3, tone: 'amber' },
          { label: 'Overdue', value: counts.overdue, icon: TriangleAlert, tone: 'rose' },
          { label: 'Scheduled', value: counts.pending, icon: ClipboardList, tone: 'brand' },
          { label: 'Completed', value: counts.completed, icon: CheckCircle2, tone: 'teal' },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
            <span
              className={cn(
                'flex size-9 items-center justify-center rounded-xl ring-1 ring-inset',
                stat.tone === 'amber' && 'bg-amber-50 text-amber-600 ring-amber-100',
                stat.tone === 'rose' && 'bg-rose-50 text-rose-600 ring-rose-100',
                stat.tone === 'brand' && 'bg-brand-50 text-brand-600 ring-brand-100',
                stat.tone === 'teal' && 'bg-teal-50 text-teal-600 ring-teal-100',
              )}
            >
              <stat.icon className="size-4.5" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-navy-900">{stat.value}</p>
              <p className="text-[11.5px] text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'open', label: 'Open', count: counts.due + counts.overdue + counts.pending },
              { value: 'due', label: 'Due today', count: counts.due },
              { value: 'overdue', label: 'Overdue', count: counts.overdue },
              { value: 'completed', label: 'Completed', count: counts.completed },
            ]}
          />
          <div className="ml-auto min-w-[200px]">
            <Input
              iconLeft={<Search className="size-4" />}
              placeholder="Search school or reason…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-5" />}
            title="Nothing in this view"
            description="Follow-ups appear automatically when an invitation is declined, an email fails, or an appointment completes without a next step."
          />
        ) : (
          <Table>
            <THead>
              <TH>School</TH>
              <TH>Reason</TH>
              <TH>Last contact</TH>
              <TH>Next follow-up</TH>
              <TH>Status</TH>
              {isAdmin && <TH>Owner</TH>}
              <TH align="right">Actions</TH>
            </THead>
            <TBody>
              {filtered.map((followUp) => {
                const school = schoolById(followUp.schoolId)
                const contact = school?.contacts.find((item) => item.id === followUp.contactId)
                return (
                  <TR key={followUp.id}>
                    <TD>
                      <Link to={`/schools?school=${followUp.schoolId}`} className="block">
                        <p className="text-[13px] font-semibold text-navy-900 hover:text-brand-700">
                          {school?.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {contact?.name} · {contact?.designation}
                        </p>
                      </Link>
                    </TD>
                    <TD>
                      <p className="max-w-[260px] text-[12px] text-slate-600">{followUp.reason}</p>
                      <p className="mt-0.5 max-w-[260px] truncate text-[10.5px] text-slate-400">
                        {followUp.notes}
                      </p>
                    </TD>
                    <TD>
                      <span className="text-[11.5px] text-slate-500">{shortDate(followUp.lastContactOn)}</span>
                    </TD>
                    <TD>
                      <span className="text-[12px] font-medium text-navy-900">
                        {shortDate(followUp.nextFollowUpOn)}
                      </span>
                      <span className="block text-[10.5px] text-slate-400">
                        {followUp.status === 'Overdue' ? 'Past due' : relativeTime(`${followUp.nextFollowUpOn}T09:00:00`)}
                      </span>
                    </TD>
                    <TD>
                      <ClassBadge className={followUpTone(followUp.status)} size="sm">
                        {followUp.status}
                      </ClassBadge>
                    </TD>
                    {isAdmin && (
                      <TD>
                        <UserChip employeeId={followUp.employeeId} size="xs" />
                      </TD>
                    )}
                    <TD align="right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() =>
                            pushToast({
                              tone: 'warning',
                              title: 'Email provider not connected',
                              description: 'Follow-up messages cannot be sent until the provider is configured.',
                            })
                          }
                        >
                          Draft message
                        </Button>
                        {followUp.status !== 'Completed' && (
                          <Button
                            size="xs"
                            variant="soft"
                            onClick={() => {
                              completeFollowUp(followUp.id)
                              pushToast({ tone: 'success', title: 'Follow-up completed' })
                            }}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Communication history"
            subtitle="Only sent communications appear here — drafts are clearly separated"
            icon={<MessageSquare className="size-4.5" />}
          />
          <CardBody className="space-y-2.5 pt-0">
            {emails.slice(0, 4).map((email) => {
              const school = schoolById(email.schoolId)
              return (
                <div key={email.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                  <span
                    className={cn(
                      'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ring-1',
                      email.status === 'Failed'
                        ? 'bg-rose-50 text-rose-600 ring-rose-100'
                        : 'bg-teal-50 text-teal-600 ring-teal-100',
                    )}
                  >
                    <MessageSquare className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-navy-900">{email.subject}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {school?.name} · {email.to}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge tone={email.status === 'Failed' ? 'rose' : 'teal'} size="sm">
                      {email.status}
                    </Badge>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {email.sentAt ? relativeTime(email.sentAt) : 'Not sent'}
                    </p>
                  </div>
                </div>
              )
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Follow-up rules" icon={<ClipboardList className="size-4.5" />} />
          <CardBody className="space-y-2 pt-0">
            {[
              'No duplicate messages to the same contact in 24 hours',
              'A school may ask to stop receiving communication',
              'Declined invitations create a follow-up automatically',
              'Failed emails require verification before retry',
              'Reminders respect working hours and time zone',
            ].map((rule) => (
              <p key={rule} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-slate-500">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-teal-500" />
                {rule}
              </p>
            ))}
          </CardBody>
        </Card>
      </div>

      <CreateFollowUpModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={() => {
          setCreateOpen(false)
          pushToast({
            tone: 'success',
            title: 'Follow-up scheduled',
            description: 'Scheduling is persisted by the backend in the next phase.',
          })
        }}
      />
    </div>
  )
}

function CreateFollowUpModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: () => void
}) {
  const [schoolId, setSchoolId] = useState(schools[0].id)
  const school = schools.find((item) => item.id === schoolId)
  const [date, setDate] = useState(isoDay(3))
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create follow-up"
      description="Follow-ups belong to a school contact and a single assigned employee."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onCreate} disabled={!reason.trim()}>
            Schedule
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label required>School</Label>
          <Select value={schoolId} onChange={(event) => setSchoolId(event.target.value)}>
            {schools.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Contact</Label>
          <Select>
            {school?.contacts.map((contact) => (
              <option key={contact.id}>{contact.name} · {contact.designation}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Assigned employee</Label>
          <Select defaultValue="emp-1">
            {['emp-1', 'emp-2', 'emp-3'].map((id) => (
              <option key={id} value={id}>
                {employeeById(id)?.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label required>Follow-up date</Label>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div>
          <Label>Channel</Label>
          <Select>
            <option>Email</option>
            <option>Phone call</option>
            <option>In-person visit</option>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label required>Reason</Label>
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Confirm invitation receipt"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-line ring-inset">
          <Phone className="size-4 text-slate-400" />
          <p className="text-[11px] text-slate-500">
            The agent will avoid duplicate communication and respect any request to stop contact.
          </p>
        </div>
      </div>
    </Modal>
  )
}
