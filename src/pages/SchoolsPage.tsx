import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Filter,
  Globe,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  UserPlus,
  UserRound,
} from 'lucide-react'
import { PageHeader, Card } from '../components/ui/Card'
import { Button, IconButton } from '../components/ui/Button'
import { Badge, ClassBadge, DemoTag } from '../components/ui/Badge'
import {
  Checkbox,
  Input,
  Label,
  SegmentedControl,
  Select,
  Textarea,
  Toggle,
} from '../components/ui/Field'
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table'
import { Drawer, Modal } from '../components/ui/Modal'
import { Avatar, EmptyState } from '../components/ui/Avatar'
import { UserChip } from '../components/layout/Topbar'
import { useApp } from '../store/AppStore'
import {
  emails as demoEmails,
  employees,
  researchResultToSchool,
  researchResults,
} from '../data/demo'
import type {
  ResearchResult,
  School,
  SchoolContact,
  SchoolType,
  SalesStage,
} from '../lib/types'
import {
  DEFAULT_FILTERS,
  contactLabelTone,
  contactStatusLabel,
  describeFilters,
  displayMediums,
  districtsOf,
  domainOf,
  filterResearchSchools,
  passedCheckCount,
  sortResearchSchools,
  statesOf,
} from '../lib/research'
import type { ResearchFilters } from '../lib/research'
import {
  appointmentStatusTone,
  cn,
  emailStatusTone,
  relativeTime,
  shortDate,
  stageTone,
  timeRange,
  verificationTone,
  weekdayDate,
} from '../lib/utils'

const schoolTypes: SchoolType[] = ['CBSE', 'ICSE', 'State Board', 'Matriculation', 'International']

const stageOptions: SalesStage[] = [
  'New Lead',
  'Researching',
  'Contact Verified',
  'Ready for Appointment',
  'Invitation Sent',
  'Waiting for Response',
  'Appointment Confirmed',
  'Appointment Completed',
  'Follow-up Required',
  'Interested',
  'Converted',
  'Not Interested',
  'On Hold',
]

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

export function SchoolsPage() {
  const [params, setParams] = useSearchParams()
  const {
    appointments,
    pushToast,
    user,
    schools,
    addSchool: addSchoolRecord,
    addSchools,
    verifyContact: verifyContactRecord,
    updateSchoolStage,
    assignSchoolOwner,
  } = useApp()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | SchoolType>('all')
  const [verification, setVerification] = useState<'all' | 'verified' | 'needs-review' | 'unverified'>('all')
  const [scope, setScope] = useState<'all' | 'existing' | 'research'>('all')
  const [owner, setOwner] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [researchOpen, setResearchOpen] = useState(false)

  const selectedId = params.get('school')
  const selected = schools.find((school) => school.id === selectedId) ?? null

  const filtered = useMemo(() => {
    const q = normalize(query)
    return schools.filter((school) => {
      if (q && !normalize(school.name).includes(q) && !normalize(school.city).includes(q)) return false
      if (type !== 'all' && school.type !== type) return false
      if (verification !== 'all' && school.verification !== verification) return false
      if (scope === 'existing' && school.isNewResearch) return false
      if (scope === 'research' && !school.isNewResearch) return false
      if (owner !== 'all' && school.assignedEmployeeId !== owner) return false
      return true
    })
  }, [schools, query, type, verification, scope, owner])

  function openSchool(id: string) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.set('school', id)
      return next
    })
  }

  function closeSchool() {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('school')
      return next
    })
  }

  function verifyContact(schoolId: string, contactId: string) {
    verifyContactRecord(schoolId, contactId)
    pushToast({
      tone: 'success',
      title: 'Contact marked verified',
      description: 'Invitations can now be prepared for this contact.',
    })
  }

  function updateStage(schoolId: string, stage: SalesStage) {
    updateSchoolStage(schoolId, stage)
    pushToast({ tone: 'info', title: 'Pipeline stage updated', description: `Moved to ${stage}.` })
  }

  function assignOwner(schoolId: string, employeeId: string) {
    assignSchoolOwner(schoolId, employeeId)
    pushToast({ tone: 'success', title: 'Assignment updated' })
  }

  function addSchool(school: School) {
    const added = addSchoolRecord(school)
    if (!added) {
      pushToast({
        tone: 'error',
        title: 'Duplicate school not added',
        description: 'A record with this name already exists — open it instead of creating a copy.',
      })
      return
    }
    setAddOpen(false)
    pushToast({
      tone: 'success',
      title: 'School added to records',
      description: `${school.name} is now available for appointment booking.`,
    })
    openSchool(school.id)
  }

  /**
   * Sends reviewed research results into the Lead Management pipeline. Each
   * record enters at `New Lead` so an employee still reviews it before any
   * outreach; the store skips anything already on file (same id or name) so a
   * result can never create a duplicate. Returns how many were created.
   */
  function addResearchLeads(results: ResearchResult[]): number {
    const employeeId = user?.id ?? employees[0].id
    return addSchools(
      results.map((result) => researchResultToSchool(result, employeeId, 'New Lead')),
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Schools & Leads"
        description="Verified school records, research results and contacts. Research is only repeated when information is missing or outdated."
        action={
          <>
            <Button
              variant="secondary"
              size="md"
              iconLeft={<Sparkles className="size-4" />}
              onClick={() => setResearchOpen(true)}
            >
              Research schools
            </Button>
            <Button size="md" iconLeft={<Plus className="size-4" />} onClick={() => setAddOpen(true)}>
              Add school
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total schools', value: schools.length, icon: Building2, tone: 'brand' as const },
          { label: 'Verified contacts', value: schools.reduce((sum, s) => sum + s.contacts.filter((c) => c.verification === 'verified').length, 0), icon: BadgeCheck, tone: 'teal' as const },
          { label: 'Needs verification', value: schools.reduce((sum, s) => sum + s.contacts.filter((c) => c.verification !== 'verified').length, 0), icon: ShieldAlert, tone: 'amber' as const },
          { label: 'From research', value: schools.filter((s) => s.isNewResearch).length, icon: Search, tone: 'navy' as const },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
            <span
              className={cn(
                'flex size-9 items-center justify-center rounded-xl ring-1 ring-inset',
                stat.tone === 'brand' && 'bg-brand-50 text-brand-600 ring-brand-100',
                stat.tone === 'teal' && 'bg-teal-50 text-teal-600 ring-teal-100',
                stat.tone === 'amber' && 'bg-amber-50 text-amber-600 ring-amber-100',
                stat.tone === 'navy' && 'bg-navy-50 text-navy-700 ring-navy-100',
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
          <div className="min-w-[200px] flex-1">
            <Input
              iconLeft={<Search className="size-4" />}
              placeholder="Search school name or city…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <SegmentedControl
            value={scope}
            onChange={setScope}
            options={[
              { value: 'all', label: 'All', count: schools.length },
              { value: 'existing', label: 'Existing' },
              { value: 'research', label: 'Researched' },
            ]}
          />
          <Select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="w-auto min-w-[128px]">
            <option value="all">All boards</option>
            {schoolTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select
            value={verification}
            onChange={(event) => setVerification(event.target.value as typeof verification)}
            className="w-auto min-w-[148px]"
          >
            <option value="all">Verification: all</option>
            <option value="verified">Verified</option>
            <option value="needs-review">Needs review</option>
            <option value="unverified">Unverified</option>
          </Select>
          <Select value={owner} onChange={(event) => setOwner(event.target.value)} className="w-auto min-w-[150px]">
            <option value="all">All employees</option>
            {employees
              .filter((employee) => employee.role === 'employee')
              .map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
          </Select>
          <IconButton label="More filters" onClick={() => pushToast({ tone: 'info', title: 'Additional filters', description: 'Date added, follow-up state and tags arrive with the backend query layer.' })}>
            <Filter className="size-4" />
          </IconButton>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="size-5" />}
            title="No schools match these filters"
            description="Try a different search, or research a new school to add it to your records."
            action={
              <Button size="sm" variant="secondary" onClick={() => setResearchOpen(true)}>
                Research schools
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <TH>School</TH>
              <TH>Board</TH>
              <TH>Contacts</TH>
              <TH>Verification</TH>
              <TH>Pipeline stage</TH>
              <TH>Assigned</TH>
              <TH>Next follow-up</TH>
              <TH />
            </THead>
            <TBody>
              {filtered.map((school) => {
                const verified = school.contacts.filter((contact) => contact.verification === 'verified').length
                return (
                  <TR key={school.id} onClick={() => openSchool(school.id)}>
                    <TD>
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 ring-1 ring-brand-100">
                          <GraduationCap className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-navy-900">
                            {school.name}
                            <DemoTag />
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                            <MapPin className="size-3" />
                            {school.city}, {school.state}
                            {school.isNewResearch && (
                              <span className="ml-1 rounded bg-teal-50 px-1 py-px text-[9px] font-bold tracking-wide text-teal-700 uppercase">
                                Researched
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <Badge tone="slate" size="sm">
                        {school.type}
                      </Badge>
                    </TD>
                    <TD>
                      <span className="text-[12.5px] font-medium text-navy-800">
                        {school.contacts.length}
                      </span>
                      <span className="ml-1 text-[11px] text-slate-400">({verified} verified)</span>
                    </TD>
                    <TD>
                      <ClassBadge className={verificationTone(school.verification)} size="sm">
                        {school.verification === 'verified'
                          ? 'Verified'
                          : school.verification === 'needs-review'
                            ? 'Needs review'
                            : 'Unverified'}
                      </ClassBadge>
                    </TD>
                    <TD>
                      <ClassBadge className={stageTone(school.stage)} size="sm">
                        {school.stage}
                      </ClassBadge>
                    </TD>
                    <TD>
                      {school.assignedEmployeeId ? (
                        <UserChip employeeId={school.assignedEmployeeId} size="xs" />
                      ) : (
                        <span className="text-[11.5px] text-slate-400">Unassigned</span>
                      )}
                    </TD>
                    <TD>
                      {school.nextFollowUpOn ? (
                        <span className="flex items-center gap-1 text-[11.5px] text-slate-500">
                          <Clock3 className="size-3" />
                          {shortDate(school.nextFollowUpOn)}
                        </span>
                      ) : (
                        <span className="text-[11.5px] text-slate-300">—</span>
                      )}
                    </TD>
                    <TD align="right">
                      <IconButton label="Open school" onClick={(event) => { event.stopPropagation(); openSchool(school.id) }}>
                        <ArrowRight className="size-4" />
                      </IconButton>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[11.5px] text-slate-400">
          <span>
            Showing {filtered.length} of {schools.length} demo records
          </span>
          <span>Duplicate detection runs before any record is created</span>
        </div>
      </Card>

      <SchoolDrawer
        school={selected}
        onClose={closeSchool}
        onVerify={verifyContact}
        onUpdateStage={updateStage}
        onAssign={assignOwner}
        appointments={appointments.filter((appointment) => appointment.schoolId === selected?.id)}
      />

      <AddSchoolModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        schools={schools}
        onAdd={addSchool}
      />

      <ResearchModal
        open={researchOpen}
        onClose={() => setResearchOpen(false)}
        existingSchools={schools}
        onAddLeads={addResearchLeads}
      />
    </div>
  )
}

function SchoolDrawer({
  school,
  onClose,
  onVerify,
  onUpdateStage,
  onAssign,
  appointments,
}: {
  school: School | null
  onClose: () => void
  onVerify: (schoolId: string, contactId: string) => void
  onUpdateStage: (schoolId: string, stage: SalesStage) => void
  onAssign: (schoolId: string, employeeId: string) => void
  appointments: ReturnType<typeof useApp>['appointments']
}) {
  const [tab, setTab] = useState<'overview' | 'contacts' | 'appointments' | 'communication'>('overview')
  const [addContactOpen, setAddContactOpen] = useState(false)
  const navigate = useNavigate()

  if (!school) return null

  const schoolEmails = demoEmails.filter((email) => email.schoolId === school.id)

  return (
    <Drawer
      open={Boolean(school)}
      onClose={onClose}
      width="xl"
      title={
        <span className="flex items-center gap-2">
          {school.name}
          <DemoTag />
        </span>
      }
      subtitle={`${school.type} · ${school.city}, ${school.state}`}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            iconLeft={<CalendarClock className="size-4" />}
            onClick={() => {
              // Carry the school into the booking agent so the record, contact,
              // e-mail and phone are pre-loaded — no re-selection needed.
              navigate(`/agent?mode=existing&school=${school.id}`)
            }}
          >
            Book appointment
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <ClassBadge className={stageTone(school.stage)}>{school.stage}</ClassBadge>
        <ClassBadge className={verificationTone(school.verification)}>
          {school.verification === 'verified' ? 'Record verified' : 'Verification needed'}
        </ClassBadge>
        {school.isNewResearch && <Badge tone="teal" size="sm">From research</Badge>}
        {school.nextFollowUpOn && (
          <Badge tone="amber" size="sm" dot>
            Follow-up {shortDate(school.nextFollowUpOn)}
          </Badge>
        )}
      </div>

      <div className="flex gap-1 border-b border-line px-3">
        {([
          ['overview', 'Overview'],
          ['contacts', `Contacts (${school.contacts.length})`],
          ['appointments', `Appointments (${appointments.length})`],
          ['communication', 'Communication'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'relative px-3 py-2.5 text-[12.5px] font-semibold transition-colors',
              tab === key ? 'text-brand-700' : 'text-slate-500 hover:text-navy-900',
            )}
          >
            {label}
            {tab === key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: 'School ID', value: school.id.toUpperCase() },
                { label: 'Board', value: school.type },
                { label: 'City', value: `${school.city}, ${school.state}` },
                { label: 'Website', value: school.website.replace('https://', ''), icon: Globe },
                { label: 'Official email', value: school.officialEmail ?? 'Not available', icon: Mail },
                { label: 'Phone', value: school.phone ?? 'Not available', icon: Phone },
                { label: 'Source', value: school.source },
                { label: 'Date added', value: shortDate(school.addedOn) },
                { label: 'Last contacted', value: school.lastContactedOn ? shortDate(school.lastContactedOn) : 'Never' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-line bg-slate-50/60 p-2.5">
                  <p className="text-[9.5px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                    {item.label}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] font-medium text-navy-900">
                    {item.value}
                    {item.icon && <item.icon className="size-3 text-slate-400" />}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-line p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-navy-900">
                <MapPin className="size-3.5 text-brand-500" />
                Address
              </p>
              <p className="mt-1 text-[12px] text-slate-500">{school.address}</p>
            </div>

            <div>
              <Label>Pipeline stage</Label>
              <Select
                value={school.stage}
                onChange={(event) => onUpdateStage(school.id, event.target.value as SalesStage)}
              >
                {stageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </Select>
              <p className="mt-1.5 text-[10.5px] text-slate-400">
                Stage changes are only applied after verified actions. A confirmed appointment is not
                the same as a converted school.
              </p>
            </div>

            <div>
              <Label>Assigned employee</Label>
              <Select
                value={school.assignedEmployeeId ?? ''}
                onChange={(event) => onAssign(school.id, event.target.value)}
              >
                <option value="">Unassigned</option>
                {employees
                  .filter((employee) => employee.role === 'employee')
                  .map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
              </Select>
            </div>

            <div>
              <Label>Internal notes</Label>
              <Textarea defaultValue={school.notes} placeholder="Add internal notes for this school…" />
              <p className="mt-1.5 text-[10.5px] text-slate-400">
                Notes are internal only and never included in school emails.
              </p>
            </div>
          </div>
        )}

        {tab === 'contacts' && (
          <div className="space-y-3">
            {school.contacts.map((contact) => (
              <div key={contact.id} className="rounded-xl border border-line p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Avatar name={contact.name} tone="from-navy-700 to-navy-900" size="md" />
                    <div>
                      <p className="text-[13px] font-semibold text-navy-900">{contact.name}</p>
                      <p className="text-[11.5px] text-slate-500">{contact.designation}</p>
                    </div>
                  </div>
                  <ClassBadge className={verificationTone(contact.verification)} size="sm">
                    {contact.verification === 'verified' ? 'Verified' : contact.verification === 'needs-review' ? 'Needs review' : 'Unverified'}
                  </ClassBadge>
                </div>
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  <p className="flex items-center gap-1.5 text-[11.5px] text-slate-600">
                    <Mail className="size-3.5 text-slate-400" />
                    {contact.email || <span className="text-rose-500">No email — must be verified before use</span>}
                  </p>
                  <p className="flex items-center gap-1.5 text-[11.5px] text-slate-600">
                    <Phone className="size-3.5 text-slate-400" />
                    {contact.phone}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[10.5px] text-slate-400">Source: {contact.source}</p>
                    {contact.verifiedOn && (
                      <p className="text-[10.5px] text-teal-600">Verified {shortDate(contact.verifiedOn)}</p>
                    )}
                  </div>
                  {contact.verification !== 'verified' && (
                    <Button
                      size="xs"
                      variant="secondary"
                      iconLeft={<BadgeCheck className="size-3" />}
                      onClick={() => onVerify(school.id, contact.id)}
                    >
                      Mark verified
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              iconLeft={<UserPlus className="size-4" />}
              onClick={() => setAddContactOpen(true)}
            >
              Add contact
            </Button>
            <p className="text-[10.5px] leading-relaxed text-slate-400">
              Contact details are stored with their source and verification date. The agent will not use
              an unverified email in an invitation.
            </p>
          </div>
        )}

        {tab === 'appointments' && (
          <div className="space-y-2.5">
            {appointments.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="size-5" />}
                title="No appointments yet"
                description="Book the first appointment for this school from the agent."
                compact
              />
            ) : (
              appointments.map((appointment) => (
                <Link
                  key={appointment.id}
                  to={`/appointments/${appointment.id}`}
                  className="block rounded-xl border border-line p-3 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[12.5px] font-semibold text-navy-900">
                        {weekdayDate(appointment.date)} · {timeRange(appointment.startTime, appointment.endTime)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {appointment.contactName} · {appointment.format}
                      </p>
                    </div>
                    <ClassBadge className={appointmentStatusTone(appointment.status)} size="sm">
                      {appointment.status}
                    </ClassBadge>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {tab === 'communication' && (
          <div className="space-y-2.5">
            {schoolEmails.length === 0 ? (
              <EmptyState
                icon={<Mail className="size-5" />}
                title="No email history"
                description="Invitation and confirmation emails will be listed here once the email provider is connected."
                compact
              />
            ) : (
              schoolEmails.map((email) => (
                <div key={email.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-navy-900">{email.subject}</p>
                    <ClassBadge className={emailStatusTone(email.status)} size="sm">
                      {email.status}
                    </ClassBadge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">To: {email.to}</p>
                  {email.error && <p className="mt-1 text-[10.5px] text-rose-600">{email.error}</p>}
                  <p className="mt-1 text-[10.5px] text-slate-400">
                    {email.sentAt ? `Sent ${relativeTime(email.sentAt)}` : 'Not sent'} ·{' '}
                    {email.attempts} attempt{email.attempts === 1 ? '' : 's'}
                  </p>
                </div>
              ))
            )}
            <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200 ring-inset">
              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-amber-800">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                Email history shown here is demonstration data. Delivery status is only marked
                "Delivered" after the provider confirms it.
              </p>
            </div>
          </div>
        )}
      </div>

      <AddContactModal
        open={addContactOpen}
        onClose={() => setAddContactOpen(false)}
        school={school}
      />
    </Drawer>
  )
}

function AddContactModal({
  open,
  onClose,
  school,
}: {
  open: boolean
  onClose: () => void
  school: School
}) {
  const { addSchoolContact, pushToast } = useApp()
  const [name, setName] = useState('')
  const [designation, setDesignation] = useState<SchoolContact['designation']>('Principal')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [source, setSource] = useState('Manual entry by employee')

  const emailTaken = useMemo(() => {
    const value = email.trim().toLowerCase()
    return value !== '' && school.contacts.some((item) => item.email.trim().toLowerCase() === value)
  }, [email, school.contacts])

  function reset() {
    setName('')
    setDesignation('Principal')
    setEmail('')
    setPhone('')
    setSource('Manual entry by employee')
  }

  function submit() {
    if (!name.trim() || emailTaken) return
    const contact: SchoolContact = {
      id: `con-${Math.random().toString(36).slice(2, 7)}`,
      schoolId: school.id,
      name: name.trim(),
      designation,
      email: email.trim(),
      phone: phone.trim(),
      source,
      verification: 'unverified',
      verifiedOn: null,
      notes: 'Added by an employee — verification is required before outreach.',
    }
    const added = addSchoolContact(school.id, contact)
    if (!added) {
      pushToast({
        tone: 'error',
        title: 'Contact not added',
        description: 'This e-mail address is already on file for this school.',
      })
      return
    }
    reset()
    onClose()
    pushToast({
      tone: 'success',
      title: 'Contact added',
      description: `${contact.name} was added as unverified — mark it verified before the agent prepares an invitation.`,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Add contact · ${school.name}`}
      description="Contacts are stored with their source and start as unverified. The agent never uses an unverified e-mail in an invitation."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={!name.trim() || emailTaken}>
            Add contact
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label required htmlFor="contact-name">
            Full name
          </Label>
          <Input
            id="contact-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. R. Sundaram"
          />
        </div>
        <div>
          <Label htmlFor="contact-designation">Designation</Label>
          <Select
            id="contact-designation"
            value={designation}
            onChange={(event) =>
              setDesignation(event.target.value as SchoolContact['designation'])
            }
          >
            {(
              [
                'Principal',
                'Correspondent',
                'Director',
                'Administrator',
                'Management Representative',
                'Other',
              ] as SchoolContact['designation'][]
            ).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="contact-email">Official e-mail</Label>
          <Input
            id="contact-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@school.edu.in"
          />
          {emailTaken && (
            <p className="mt-1.5 text-[11px] font-medium text-rose-600">
              This e-mail is already on file for {school.name}.
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="contact-phone">Phone</Label>
          <Input
            id="contact-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+91"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="contact-source">Source</Label>
          <Select id="contact-source" value={source} onChange={(event) => setSource(event.target.value)}>
            <option>Manual entry by employee</option>
            <option>Public directory listing</option>
            <option>School website</option>
            <option>Phone call</option>
          </Select>
        </div>
        <div className="sm:col-span-2 flex items-center gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-line ring-inset">
          <ShieldAlert className="size-4 text-slate-400" />
          <p className="text-[11px] text-slate-500">
            New contacts appear as <strong className="font-semibold text-navy-800">Unverified</strong>{' '}
            until an employee marks them verified.
          </p>
        </div>
      </div>
    </Modal>
  )
}

function AddSchoolModal({
  open,
  onClose,
  schools,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  schools: School[]
  onAdd: (school: School) => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<SchoolType>('CBSE')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [website, setWebsite] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [owner, setOwner] = useState('emp-1')
  const [notes, setNotes] = useState('')

  const duplicates = useMemo(() => {
    const q = normalize(name)
    if (q.length < 3) return []
    return schools.filter((school) => {
      const candidate = normalize(school.name)
      return candidate.includes(q) || q.includes(candidate) || (school.website && normalize(school.website).includes(q))
    })
  }, [name, schools])

  function submit() {
    if (!name.trim()) return
    const contacts: SchoolContact[] = []
    const school: School = {
      id: `sch-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      type,
      city: city.trim() || 'Chennai',
      state: 'Tamil Nadu',
      address: address.trim() || 'Address pending verification',
      website: website.trim() || '—',
      officialEmail: email.trim() || null,
      phone: phone.trim() || null,
      source: 'Manual entry by employee',
      verification: email.trim() ? 'needs-review' : 'unverified',
      assignedEmployeeId: owner || null,
      addedOn: new Date().toISOString().slice(0, 10),
      lastContactedOn: null,
      nextFollowUpOn: null,
      stage: 'New Lead',
      contacts,
      notes: notes.trim(),
      isDemo: true,
      isNewResearch: false,
    }
    onAdd(school)
    setName('')
    setCity('')
    setAddress('')
    setWebsite('')
    setEmail('')
    setPhone('')
    setNotes('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a school"
      description="Records are checked for duplicates before they are created."
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={!name.trim()}>
            Save school
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label required htmlFor="school-name">
            School name
          </Label>
          <Input
            id="school-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Sunrise Vidya Mandir"
          />
          {duplicates.length > 0 && (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-amber-800">
                <TriangleAlert className="size-3.5" />
                Possible duplicate detected
              </p>
              <ul className="mt-1.5 space-y-1">
                {duplicates.map((duplicate) => (
                  <li key={duplicate.id} className="flex items-center justify-between gap-2 text-[11px] text-amber-800">
                    <span>
                      {duplicate.name} · {duplicate.city}
                    </span>
                    <Link to={`/schools?school=${duplicate.id}`} className="font-semibold underline">
                      Review
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-amber-700">
                The agent will not create a duplicate record automatically. Review the existing record
                first — or continue only if this is genuinely a different school.
              </p>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="school-type">Board / type</Label>
          <Select id="school-type" value={type} onChange={(event) => setType(event.target.value as SchoolType)}>
            {schoolTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="school-city">City</Label>
          <Input id="school-city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Chennai" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="school-address">Address</Label>
          <Input
            id="school-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Street, area, city, PIN"
          />
        </div>
        <div>
          <Label htmlFor="school-website">Website</Label>
          <Input
            id="school-website"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            placeholder="https://"
          />
        </div>
        <div>
          <Label htmlFor="school-phone">Phone</Label>
          <Input id="school-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91" />
        </div>
        <div>
          <Label htmlFor="school-email" hint="Becomes the official contact address">
            Official email
          </Label>
          <Input
            id="school-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="office@school.edu.in"
          />
        </div>
        <div>
          <Label htmlFor="school-owner">Assign to</Label>
          <Select id="school-owner" value={owner} onChange={(event) => setOwner(event.target.value)}>
            {employees
              .filter((employee) => employee.role === 'employee' && employee.status === 'active')
              .map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="school-notes">Notes</Label>
          <Textarea
            id="school-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Context, prior contact, referral…"
          />
        </div>
        <div className="sm:col-span-2 rounded-xl bg-slate-50 p-3 ring-1 ring-line ring-inset">
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
            New records start as <strong className="font-semibold text-navy-800">New Lead</strong> with
            unverified contacts. Verification is required before the agent can prepare an invitation.
          </p>
        </div>
      </div>
    </Modal>
  )
}

function ResearchModal({
  open,
  onClose,
  existingSchools,
  onAddLeads,
}: {
  open: boolean
  onClose: () => void
  existingSchools: School[]
  onAddLeads: (results: ResearchResult[]) => number
}) {
  const { pushToast } = useApp()
  const [filters, setFilters] = useState<ResearchFilters>(DEFAULT_FILTERS)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<ResearchResult[]>([])
  const [step, setStep] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const timers = useRef<number[]>([])

  const stateOptions = useMemo(() => statesOf(researchResults), [])
  const districtOptions = useMemo(
    () => districtsOf(researchResults, filters.state),
    [filters.state],
  )
  const matchCount = useMemo(
    () => filterResearchSchools(researchResults, filters).length,
    [filters],
  )

  const summary = {
    verified: results.filter((item) => item.verification === 'verified').length,
    partial: results.filter((item) => item.verification === 'needs-review').length,
    unverified: results.filter((item) => item.verification === 'unverified').length,
  }

  const steps = [
    'Querying approved search sources',
    'Ranking official school websites',
    'Visiting each school website',
    'Extracting contacts, e-mails and addresses',
    'Validating e-mail, phone and domain match',
    'Checking against existing records',
  ]

  function clearTimers() {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
  }

  function run() {
    clearTimers()
    setRunning(true)
    setResults([])
    setSelectedIds([])
    setStep(0)
    timers.current = [450, 900, 1350, 1800, 2250].map((delay, index) =>
      window.setTimeout(() => setStep(index + 1), delay),
    )
    timers.current.push(
      window.setTimeout(() => {
        const matched = filterResearchSchools(researchResults, filters)
        setResults(sortResearchSchools(matched, filters.priorityReputation))
        setStep(steps.length)
        setRunning(false)
      }, 2700),
    )
  }

  function handleClose() {
    clearTimers()
    setRunning(false)
    onClose()
  }

  function isDuplicate(result: ResearchResult) {
    if (result.duplicateOf) return true
    return existingSchools.some((school) => normalize(school.name) === normalize(result.name))
  }

  function toggleSelected(id: string, next: boolean) {
    setSelectedIds((current) =>
      next ? [...current, id] : current.filter((item) => item !== id),
    )
  }

  const selectableIds = results
    .filter((result) => !isDuplicate(result))
    .map((result) => result.id)
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id))

  function toggleAll(next: boolean) {
    setSelectedIds(next ? selectableIds : [])
  }

  function addSelected() {
    const chosen = results.filter(
      (result) => selectedIds.includes(result.id) && !isDuplicate(result),
    )
    if (chosen.length === 0) return
    const added = onAddLeads(chosen)
    if (added === 0) {
      pushToast({
        tone: 'info',
        title: 'No new records created',
        description: 'Every selected school is already in your records — no duplicates were made.',
      })
    } else {
      pushToast({
        tone: 'success',
        title: `${added} school${added === 1 ? '' : 's'} added to Lead Management`,
        description: 'Each record enters at New Lead for employee review.',
      })
    }
    setSelectedIds([])
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="AI school research"
      description="Filter schools, extract official contacts from each website, then verify them before anything enters your pipeline."
      size="xl"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            {results.length > 0 && (
              <Button
                size="sm"
                variant="soft"
                disabled={selectedIds.length === 0}
                onClick={addSelected}
                iconLeft={<UserPlus className="size-4" />}
              >
                {selectedIds.length > 0
                  ? `Add ${selectedIds.length} to Lead Management`
                  : 'Add to Lead Management'}
              </Button>
            )}
            <Button size="sm" onClick={run} loading={running} iconLeft={<Search className="size-4" />}>
              {results.length > 0 ? 'Re-run research' : 'Research'}
            </Button>
          </div>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-slate-50/60 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] text-slate-400 uppercase">
              <Filter className="size-3" />
              School filters
            </p>
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-[11px] font-semibold text-brand-600 hover:text-brand-500"
            >
              Reset
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="research-state">State</Label>
              <Select
                id="research-state"
                value={filters.state}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    state: event.target.value,
                    district: 'all',
                  }))
                }
              >
                <option value="all">All states</option>
                {stateOptions.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="research-district">District</Label>
              <Select
                id="research-district"
                value={filters.district}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, district: event.target.value }))
                }
              >
                <option value="all">All districts</option>
                {districtOptions.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="research-board">Board</Label>
              <Select
                id="research-board"
                value={filters.type}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    type: event.target.value as ResearchFilters['type'],
                  }))
                }
              >
                <option value="all">Any board</option>
                {schoolTypes.map((schoolType) => (
                  <option key={schoolType} value={schoolType}>
                    {schoolType}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-3">
            <Label htmlFor="research-query">Keywords</Label>
            <Input
              id="research-query"
              value={filters.query}
              onChange={(event) =>
                setFilters((current) => ({ ...current, query: event.target.value }))
              }
              placeholder="e.g. international school, vidyalaya…"
              iconLeft={<Search className="size-4" />}
            />
          </div>

          <div className="mt-3">
            <p className="text-[12.5px] font-semibold text-navy-900">Medium of school</p>
            <div className="mt-0.5 divide-y divide-line">
              <Toggle
                checked={filters.mediums.includes('English')}
                onChange={(next) =>
                  setFilters((current) => ({ ...current, mediums: next ? ['English'] : [] }))
                }
                label="English medium schools only"
                description="Outreach targets English-medium schools, so other language mediums are filtered out."
              />
            </div>
          </div>

          <div className="mt-1 divide-y divide-line">
            <Toggle
              checked={filters.minStudents > 0}
              onChange={(next) =>
                setFilters((current) => ({ ...current, minStudents: next ? 2000 : 0 }))
              }
              label="Only schools with more than 2,000 students"
              description="Skips smaller campuses so outreach targets scale."
            />
            <Toggle
              checked={filters.priorityReputation}
              onChange={(next) =>
                setFilters((current) => ({ ...current, priorityReputation: next }))
              }
              label="Prioritise reputed & well-established schools"
              description="Sorts established and reputed schools to the top of the results."
            />
          </div>
        </div>

        <p className="text-[11.5px] text-slate-500">
          {describeFilters(filters)} —{' '}
          <span className="font-semibold text-navy-800">{matchCount}</span> of{' '}
          {researchResults.length} sources match
        </p>

        {(running || results.length > 0) && (
          <div className="rounded-xl border border-line bg-slate-50/60 p-3">
            <div className="space-y-1.5">
              {steps.map((label, index) => (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex size-4 items-center justify-center rounded-full ring-1',
                      index < step || (!running && results.length > 0)
                        ? 'bg-teal-50 text-teal-600 ring-teal-200'
                        : index === step && running
                          ? 'bg-brand-50 text-brand-600 ring-brand-200'
                          : 'bg-white text-slate-300 ring-slate-200',
                    )}
                  >
                    {index < step || (!running && results.length > 0) ? (
                      <CheckCircle2 className="size-2.5" />
                    ) : (
                      <span className="size-1 rounded-full bg-current" />
                    )}
                  </span>
                  <span
                    className={cn('text-[11.5px]', index <= step ? 'text-navy-800' : 'text-slate-400')}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.length > 0 ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                {results.length} results · {summary.verified} verified · {summary.partial} partial ·{' '}
                {summary.unverified} unverified
              </p>
              <button
                type="button"
                onClick={() => toggleAll(!allSelected)}
                disabled={selectableIds.length === 0}
                className="text-[11px] font-semibold text-brand-600 hover:text-brand-500 disabled:text-slate-400"
              >
                {allSelected ? 'Clear selection' : `Select all (${selectableIds.length})`}
              </button>
            </div>

            {results.map((result) => {
              const duplicate = isDuplicate(result)
              const checked = selectedIds.includes(result.id)
              const checks = passedCheckCount(result)
              return (
                <div
                  key={result.id}
                  className={cn(
                    'rounded-xl border p-3 transition-colors',
                    checked ? 'border-brand-300 bg-brand-50/40' : 'border-line',
                  )}
                >
                  <div className="flex items-start gap-3">
                    {duplicate ? (
                      <span
                        aria-hidden
                        className="mt-1 block size-4.5 rounded-[5px] border border-slate-200 bg-slate-50"
                      />
                    ) : (
                      <span className="pt-0.5">
                        <Checkbox
                          checked={checked}
                          onChange={(next) => toggleSelected(result.id, next)}
                          label={<span className="sr-only">Select {result.name}</span>}
                        />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-navy-900">{result.name}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {result.type} · {result.city}, {result.district}, {result.state}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {duplicate && (
                            <Badge tone="rose" size="sm">
                              Already in records
                            </Badge>
                          )}
                          <ClassBadge className={contactLabelTone(result.verification)} size="sm">
                            {contactStatusLabel(result.verification)}
                          </ClassBadge>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="size-3 text-slate-400" />
                          {result.studentCount.toLocaleString('en-IN')} students
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Globe className="size-3 text-slate-400" />
                          {displayMediums(result)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <BadgeCheck className="size-3 text-slate-400" />
                          {result.reputation}
                          {result.establishedYear ? ` · est. ${result.establishedYear}` : ''}
                        </span>
                      </div>

                      <div className="mt-2 rounded-lg bg-slate-50 p-2.5 ring-1 ring-line ring-inset">
                        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-navy-800">
                          <UserRound className="size-3.5 text-slate-400" />
                          {result.contactName}
                          <span className="font-normal text-slate-500">
                            · {result.contactDesignation}
                          </span>
                        </p>
                        <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
                          <p className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <Mail className="size-3 text-slate-400" />
                            {result.contactEmail || <span className="text-slate-400">No e-mail found</span>}
                          </p>
                          <p className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <Phone className="size-3 text-slate-400" />
                            {result.phone || <span className="text-slate-400">No phone found</span>}
                          </p>
                          <p className="flex items-center gap-1.5 text-[11px] text-slate-600 sm:col-span-2">
                            <MapPin className="size-3 text-slate-400" />
                            {result.address}
                          </p>
                        </div>
                        <p className="mt-1.5 text-[10.5px] text-slate-400">
                          {checks} of 3 checks passed · {result.extractionNotes}
                        </p>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
                        <a
                          href={result.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-[10.5px] font-semibold text-brand-600 hover:text-brand-500"
                        >
                          <ExternalLink className="mr-1 inline size-2.5" />
                          {domainOf(result.sourceUrl)} · {result.extractionMethod}
                        </a>
                        <span className="text-[10px] text-slate-400">{result.source}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200 ring-inset">
              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-amber-800">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                Demonstration corpus — contact details are never generated. Verification is derived
                from format checks and whether the e-mail domain belongs to the school's own
                website, and every result links the exact page it was read from.
              </p>
            </div>
          </div>
        ) : running ? null : (
          <div className="rounded-xl border border-dashed border-line p-5 text-center">
            <Sparkles className="mx-auto size-5 text-slate-300" />
            <p className="mt-2 text-[12.5px] font-semibold text-navy-800">
              {matchCount} schools match your filters
            </p>
            <p className="mt-0.5 text-[11.5px] text-slate-500">
              Run research to visit each official website, extract contacts and verify them.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
