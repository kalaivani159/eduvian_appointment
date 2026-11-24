import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Send,
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
import { useApp, type NewFollowUpInput } from '../store/AppStore'
import { employeeById, emails, integrations } from '../data/demo'
import { deriveFollowUpStatus, followUpDisplayTone } from '../lib/followUps'
import type { FollowUp } from '../lib/types'
import { cn, isoDay, relativeTime, shortDate } from '../lib/utils'

export function FollowUpsPage() {
  const {
    followUps,
    completeFollowUp,
    createFollowUp,
    user,
    isAdmin,
    pushToast,
    schools,
    schoolById,
    approvals,
  } = useApp()
  const [filter, setFilter] = useState<'open' | 'due' | 'overdue' | 'completed'>('open')
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [draftFor, setDraftFor] = useState<FollowUp | null>(null)

  const mine = followUps.filter((followUp) => isAdmin || followUp.employeeId === user?.id)

  const counts = {
    due: mine.filter((followUp) => followUp.status === 'Due Today').length,
    overdue: mine.filter((followUp) => followUp.status === 'Overdue').length,
    pending: mine.filter((followUp) => followUp.status === 'Pending').length,
    completed: mine.filter((followUp) => followUp.status === 'Completed').length,
  }

  /** Records the badge derivation reads — schools, e-mails and approvals. */
  const statusContext = useMemo(() => ({ schools, emails, approvals }), [schools, approvals])

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
  }, [mine, filter, query, schoolById])

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
                // The badge is derived from the record — never a generic label.
                const derived = deriveFollowUpStatus(followUp, statusContext)
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
                        {followUp.nextFollowUpOn < isoDay(0)
                          ? 'Past due'
                          : relativeTime(`${followUp.nextFollowUpOn}T09:00:00`)}
                      </span>
                    </TD>
                    <TD>
                      <ClassBadge className={followUpDisplayTone(derived)} size="sm">
                        {derived}
                      </ClassBadge>
                    </TD>
                    {isAdmin && (
                      <TD>
                        <UserChip employeeId={followUp.employeeId} size="xs" />
                      </TD>
                    )}
                    <TD align="right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="xs" variant="secondary" onClick={() => setDraftFor(followUp)}>
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

      {draftFor && <EmailDraftModal followUp={draftFor} onClose={() => setDraftFor(null)} />}

      <CreateFollowUpModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(input) => {
          const created = createFollowUp(input)
          setCreateOpen(false)
          pushToast({
            tone: 'success',
            title: 'Follow-up scheduled',
            description: `${shortDate(created.nextFollowUpOn)} · ${created.status} · added to your list.`,
          })
        }}
      />
    </div>
  )
}

/**
 * Real e-mail draft for a follow-up: recipient, subject and message are
 * prefilled from the record. Sending is checked against the e-mail provider
 * integration record — when it is not connected the draft stays on screen and
 * the requirement to configure the provider is stated plainly. Nothing is ever
 * reported as sent without a provider.
 */
function EmailDraftModal({ followUp, onClose }: { followUp: FollowUp; onClose: () => void }) {
  const { schools, pushToast, user } = useApp()
  const school = schools.find((item) => item.id === followUp.schoolId)
  const contact = school?.contacts.find((item) => item.id === followUp.contactId)
  const provider = integrations.find((item) => item.category === 'Email')
  const providerConnected = provider?.status === 'Connected'

  const [to, setTo] = useState(contact?.email || school?.officialEmail || '')
  const [subject, setSubject] = useState(
    `${followUp.reason}${school ? ` — ${school.name}` : ''}`,
  )
  const [message, setMessage] = useState(
    [
      `Hello ${contact?.name ?? 'there'},`,
      '',
      `I'm following up on: ${followUp.reason}.`,
      followUp.notes ? `\n${followUp.notes}` : '',
      '',
      'Please let us know a convenient time to continue this conversation.',
      '',
      'Kind regards,',
      user?.name ?? 'Eduvian Solutions',
    ]
      .filter((line, index, all) => !(line === '' && all[index - 1] === ''))
      .join('\n'),
  )

  function send() {
    if (!to.trim()) {
      pushToast({
        tone: 'error',
        title: 'Recipient missing',
        description: 'Add the contact e-mail address before sending.',
      })
      return
    }
    if (!providerConnected) {
      pushToast({
        tone: 'warning',
        title: 'Sending requires the email provider',
        description: `Your draft is kept on screen. ${
          provider?.detail ?? 'Connect the email provider in Settings → Integrations to send it.'
        }`,
      })
      return
    }
    // The provider record says Connected but this preview has no transport:
    // report the real state instead of claiming a delivery that never happened.
    pushToast({
      tone: 'info',
      title: 'No delivery transport in this preview',
      description: 'The backend dispatches the message once the provider is wired to it.',
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Draft message · ${school?.name ?? 'School'}`}
      description="Review the recipient, subject and message before sending."
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" iconLeft={<Send className="size-4" />} onClick={send}>
            Send
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!providerConnected && (
          <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200 ring-inset">
            <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-amber-800">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
              <span>
                <strong className="font-semibold">Email provider not connected.</strong> Sending
                requires configuration in Settings → Integrations. Your draft stays visible here
                until the provider is connected — nothing has been sent.
              </span>
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="draft-to">To</Label>
            <Input
              id="draft-to"
              type="email"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="contact@school.edu.in"
            />
            <p className="mt-1.5 text-[10.5px] text-slate-400">
              {contact ? `${contact.name} · ${contact.designation}` : 'Contact on record'}
            </p>
          </div>
          <div>
            <Label htmlFor="draft-subject">Subject</Label>
            <Input
              id="draft-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
            <p className="mt-1.5 text-[10.5px] text-slate-400">
              Follow-up due {shortDate(followUp.nextFollowUpOn)}
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="draft-message">Message</Label>
            <Textarea
              id="draft-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={10}
            />
          </div>
        </div>

        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
          <Mail className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
          Duplicate messages to the same contact within 24 hours are blocked, and any request from
          the school to stop contact is honoured.
        </p>
      </div>
    </Modal>
  )
}

function CreateFollowUpModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (input: NewFollowUpInput) => void
}) {
  const { schools, user } = useApp()
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '')
  const school = schools.find((item) => item.id === schoolId)
  const [contactId, setContactId] = useState(school?.contacts[0]?.id ?? '')
  const [employeeId, setEmployeeId] = useState('emp-1')
  const [date, setDate] = useState(isoDay(3))
  const [channel, setChannel] = useState('Email')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  const hasContacts = (school?.contacts.length ?? 0) > 0

  function selectSchool(nextId: string) {
    setSchoolId(nextId)
    const next = schools.find((item) => item.id === nextId)
    setContactId(next?.contacts[0]?.id ?? '')
  }

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
          <Button
            size="sm"
            onClick={() =>
              onCreate({
                schoolId,
                contactId,
                employeeId,
                nextFollowUpOn: date,
                reason: reason.trim(),
                notes: notes.trim(),
                channel,
              })
            }
            disabled={!reason.trim() || !date || !contactId}
          >
            Schedule
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label required>School</Label>
          <Select value={schoolId} onChange={(event) => selectSchool(event.target.value)}>
            {schools.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label required>Contact</Label>
          <Select
            value={contactId}
            onChange={(event) => setContactId(event.target.value)}
            disabled={!hasContacts}
          >
            {hasContacts ? (
              school?.contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name} · {contact.designation}
                </option>
              ))
            ) : (
              <option value="">No contacts on record yet</option>
            )}
          </Select>
          {!hasContacts && (
            <p className="mt-1.5 text-[10.5px] text-rose-600">
              Add a contact to this school first — a follow-up needs someone to follow up with.
            </p>
          )}
        </div>
        <div>
          <Label>Assigned employee</Label>
          <Select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
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
          <Select value={channel} onChange={(event) => setChannel(event.target.value)}>
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
            The agent will avoid duplicate communication and respect any request to stop contact
            {user ? ` — ${user.name} stays the author of record` : ''}.
          </p>
        </div>
      </div>
    </Modal>
  )
}
