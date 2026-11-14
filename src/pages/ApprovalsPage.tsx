import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Mail,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import { PageHeader, Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, ClassBadge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Label, Textarea } from '../components/ui/Field'
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table'
import { EmptyState } from '../components/ui/Avatar'
import { UserChip } from '../components/layout/Topbar'
import { useApp } from '../store/AppStore'
import { appointmentById, schoolById } from '../data/demo'
import { appointmentStatusTone, relativeTime, timeRange, weekdayDate } from '../lib/utils'

export function ApprovalsPage() {
  const { approvals, decideApproval, pushToast } = useApp()
  const [decision, setDecision] = useState<{ id: string; type: 'Approved' | 'Rejected' } | null>(null)
  const [note, setNote] = useState('')

  const pending = approvals.filter((approval) => approval.status === 'Pending')
  const decided = approvals.filter((approval) => approval.status !== 'Pending')

  return (
    <div className="space-y-5">
      <PageHeader
        title="Approvals"
        description="Management reviews only the actions your policy marks as sensitive. Routine invitations from approved templates do not require per-email approval."
        action={
          <Badge tone="amber" dot>
            {pending.length} pending
          </Badge>
        }
      />

      {pending.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckCircle2 className="size-5" />}
            title="Nothing waiting on you"
            description="When an employee submits an invitation that needs approval, it appears here with the full context."
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {pending.map((approval) => {
            const appointment = appointmentById(approval.appointmentId)
            const school = schoolById(approval.schoolId)
            return (
              <Card key={approval.id}>
                <CardHeader
                  title={school?.name ?? 'Approval request'}
                  subtitle={`Submitted ${relativeTime(approval.submittedAt)} by ${approval.requestedBy}`}
                  icon={<ShieldCheck className="size-4.5" />}
                  action={<Badge tone="amber" size="sm" dot>Pending</Badge>}
                />
                <CardBody className="space-y-3">
                  <div className="rounded-xl bg-amber-50/70 p-3 ring-1 ring-amber-200 ring-inset">
                    <p className="text-[10px] font-bold tracking-[0.08em] text-amber-700 uppercase">
                      Why approval is required
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-amber-900">{approval.reason}</p>
                  </div>

                  {appointment && (
                    <div className="rounded-xl border border-line p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[12.5px] font-semibold text-navy-900">
                            {weekdayDate(appointment.date)} · {timeRange(appointment.startTime, appointment.endTime)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {appointment.contactName} · {appointment.contactDesignation}
                          </p>
                        </div>
                        <ClassBadge className={appointmentStatusTone(appointment.status)} size="sm">
                          {appointment.status}
                        </ClassBadge>
                      </div>
                      <div className="mt-2 grid gap-1 border-t border-line pt-2 text-[11px] text-slate-500">
                        <p className="flex items-center gap-1.5">
                          <Mail className="size-3 text-slate-400" />
                          {appointment.contactEmail || 'No verified email'}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Clock3 className="size-3 text-slate-400" />
                          Temporary hold expires {appointment.holdExpiresAt ? relativeTime(appointment.holdExpiresAt) : 'not set'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setDecision({ id: approval.id, type: 'Approved' })
                        setNote('')
                      }}
                      iconLeft={<CheckCircle2 className="size-3.5" />}
                    >
                      Approve &amp; send
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setDecision({ id: approval.id, type: 'Rejected' })
                        setNote('')
                      }}
                      iconLeft={<XCircle className="size-3.5" />}
                    >
                      Reject
                    </Button>
                    <Link
                      to={`/appointments/${approval.appointmentId}`}
                      className="inline-flex h-8.5 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-100/80 hover:text-navy-900"
                    >
                      Open appointment
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Requested by</span>
                    <UserChip
                      employeeId={
                        ['emp-1', 'emp-2', 'emp-3'].find(
                          (id) => employeeName(id) === approval.requestedBy,
                        ) ?? 'emp-3'
                      }
                      size="xs"
                    />
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <CardHeader title="Approval history" subtitle="Audit trail of management decisions" icon={<ShieldCheck className="size-4.5" />} />
        {decided.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="size-5" />} title="No decisions yet" compact />
        ) : (
          <Table>
            <THead>
              <TH>School</TH>
              <TH>Requested by</TH>
              <TH>Decision</TH>
              <TH>Decided by</TH>
              <TH>When</TH>
              <TH>Note</TH>
            </THead>
            <TBody>
              {decided.map((approval) => (
                <TR key={approval.id}>
                  <TD>
                    <span className="text-[12.5px] font-medium text-navy-900">
                      {schoolById(approval.schoolId)?.name}
                    </span>
                  </TD>
                  <TD>{approval.requestedBy}</TD>
                  <TD>
                    <Badge tone={approval.status === 'Approved' ? 'teal' : 'rose'} size="sm">
                      {approval.status}
                    </Badge>
                  </TD>
                  <TD>{approval.decidedBy ?? '—'}</TD>
                  <TD>{approval.decidedAt ? relativeTime(approval.decidedAt) : '—'}</TD>
                  <TD>
                    <span className="text-[11.5px] text-slate-500">{approval.decisionNote ?? '—'}</span>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-white p-4 shadow-card">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <p className="text-[11.5px] leading-relaxed text-slate-500">
          <strong className="font-semibold text-navy-900">Approval policy is configurable.</strong> In
          this preview, approving marks the appointment as Invitation Sent for interface
          demonstration only — no email is delivered until the provider reports Connected.
        </p>
      </div>

      <Modal
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        title={decision?.type === 'Approved' ? 'Approve invitation' : 'Reject invitation'}
        description={
          decision?.type === 'Approved'
            ? 'The invitation is sent from the official Eduvian account after approval.'
            : 'The request returns to the employee as a draft with your note.'
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDecision(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={decision?.type === 'Approved' ? 'primary' : 'danger'}
              onClick={() => {
                if (!decision) return
                decideApproval(decision.id, decision.type, note)
                pushToast({
                  tone: decision.type === 'Approved' ? 'success' : 'info',
                  title: `Invitation ${decision.type.toLowerCase()}`,
                  description:
                    decision.type === 'Approved'
                      ? 'Queued for sending. Email delivery requires the provider integration.'
                      : 'Returned to the employee as a draft.',
                })
                setDecision(null)
              }}
            >
              {decision?.type === 'Approved' ? 'Approve' : 'Reject'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Decision note</Label>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                decision?.type === 'Approved'
                  ? 'Optional note for the audit trail…'
                  : 'Tell the employee what to change…'
              }
            />
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Every decision is written to the audit log with the approver, timestamp and note.
          </p>
        </div>
      </Modal>
    </div>
  )
}

function employeeName(id: string) {
  const map: Record<string, string> = {
    'emp-1': 'Priya Raman',
    'emp-2': 'Arjun Nair',
    'emp-3': 'Kavya Selvam',
  }
  return map[id] ?? ''
}
