import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'
import {
  INVITATION_CLOSING_PARAGRAPHS,
  INVITATION_CONFIRM_LINE,
  INVITATION_DETAIL_FIELDS,
  INVITATION_DETAILS_HEADING,
  INVITATION_INTRO_PARAGRAPHS,
  INVITATION_OPTIONS_LEAD,
  INVITATION_PURPOSE_BULLETS,
  INVITATION_PURPOSE_LEAD,
  INVITATION_RESPONSE_OPTIONS,
  INVITATION_SENDER,
  INVITATION_SUBJECT,
  invitationResponsePath,
  type InvitationDetails,
} from '../../lib/invitationTemplate'

interface InvitationEmailPreviewProps {
  /** Recipient address from the contact record; empty shows an honest "not verified". */
  to: string
  /** Auto-populated appointment details — the fixed introduction is never passed in. */
  details: InvitationDetails
  /** Secure response links are only rendered once the appointment record exists. */
  appointmentId?: string
  /** Tighter type scale for the agent conversation. */
  compact?: boolean
  /** Constrains the body height so long previews scroll inside chat cards. */
  scrollable?: boolean
}

/**
 * The standard appointment invitation email — the single rendering of the fixed
 * Eduvian introduction, meeting purpose and response options. Used by both the
 * appointment-detail preview and the AI agent's invitation cards.
 */
export function InvitationEmailPreview({
  to,
  details,
  appointmentId,
  compact = false,
  scrollable = false,
}: InvitationEmailPreviewProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="space-y-1 border-b border-line bg-slate-50/70 px-4 py-2.5">
        <p className="text-[11px] text-slate-500">
          <span className="font-semibold text-navy-800">From:</span> {INVITATION_SENDER}
        </p>
        <p className="text-[11px] text-slate-500">
          <span className="font-semibold text-navy-800">To:</span>{' '}
          {to || <span className="text-rose-500">not verified</span>}
        </p>
        <p className="text-[11px] text-slate-500">
          <span className="font-semibold text-navy-800">Subject:</span> {INVITATION_SUBJECT}
        </p>
      </div>
      <div
        className={cn(
          'space-y-3 px-4 py-4 text-slate-700',
          compact ? 'text-[11.5px]' : 'text-[12.5px]',
          'leading-relaxed',
          scrollable && 'max-h-80 overflow-y-auto',
        )}
      >
        {INVITATION_INTRO_PARAGRAPHS.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <p>{INVITATION_PURPOSE_LEAD}</p>
        <ul className="list-disc space-y-1 pl-5">
          {INVITATION_PURPOSE_BULLETS.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>

        <p>{INVITATION_CONFIRM_LINE}</p>

        <div className="rounded-lg bg-slate-50 p-3 text-[12px] ring-1 ring-line ring-inset">
          <p className="font-semibold text-navy-900">{INVITATION_DETAILS_HEADING}</p>
          <dl className="mt-1.5 space-y-1">
            {INVITATION_DETAIL_FIELDS.map((field) => (
              <div key={field.key} className="flex flex-wrap gap-x-1.5">
                <dt className="font-semibold text-navy-900">{field.label}:</dt>
                <dd className="min-w-0 break-words text-slate-700">{details[field.key]}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p>{INVITATION_OPTIONS_LEAD}</p>
        <div className="flex flex-wrap gap-2 rounded-lg border border-dashed border-line p-2.5">
          {appointmentId
            ? INVITATION_RESPONSE_OPTIONS.map((option, index) => (
                <Link
                  key={option.label}
                  to={invitationResponsePath(appointmentId, option.choice)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition-opacity hover:opacity-90',
                    index === 0
                      ? 'bg-teal-600 text-white'
                      : 'bg-white text-navy-800 ring-1 ring-line',
                  )}
                >
                  {option.label}
                </Link>
              ))
            : INVITATION_RESPONSE_OPTIONS.map((option) => (
                <span
                  key={option.label}
                  className="rounded-lg bg-white px-3 py-1.5 text-[11.5px] font-semibold text-navy-800 ring-1 ring-line"
                >
                  {option.label}
                </span>
              ))}
        </div>

        <div className="space-y-3">
          <p>{INVITATION_CLOSING_PARAGRAPHS[0]}</p>
          <p>
            {INVITATION_CLOSING_PARAGRAPHS.slice(1).map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  )
}
