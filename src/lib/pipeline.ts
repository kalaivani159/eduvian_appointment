import type { SalesStage, School } from './types'

/** Canonical pipeline order used by the pipeline snapshot cards. */
const STAGE_ORDER: SalesStage[] = [
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

/**
 * Derives the pipeline snapshot from the live school records: how many schools
 * currently sit in each stage, most populated first. Stages without any record
 * are omitted so every number shown maps to at least one real school.
 */
export function pipelineCountsFor(schools: School[]): { stage: string; count: number }[] {
  const counts = new Map<SalesStage, number>()
  for (const school of schools) {
    counts.set(school.stage, (counts.get(school.stage) ?? 0) + 1)
  }
  return STAGE_ORDER.map((stage) => ({ stage, count: counts.get(stage) ?? 0 }))
    .filter((row) => row.count > 0)
    .sort((left, right) => right.count - left.count)
}
