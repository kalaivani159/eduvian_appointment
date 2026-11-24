import type {
  MediumOfInstruction,
  ResearchResult,
  ReputationTier,
  SchoolType,
  VerificationStatus,
} from './types'
import { isValidEmail, isValidPhone } from './utils'

/**
 * School research filtering and contact verification.
 *
 * The verification rules here are real: they check the extracted e-mail and
 * phone against format rules and then check whether the e-mail domain actually
 * belongs to the school's own website. Nothing is marked verified on trust.
 *
 * The data these functions run over is demonstration data — see
 * `src/data/researchCorpus.ts`. The production agent runs the same rules over
 * live pages it has fetched.
 */

export interface ResearchFilters {
  /** `all` or an exact state name. */
  state: string
  /** `all` or an exact district within `state`. */
  district: string
  /** Defaults to `['English']` — we only reach English-medium schools. Empty array means "any medium". */
  mediums: MediumOfInstruction[]
  /** 0 disables the threshold; 2000 matches the "more than 2,000 students" rule. */
  minStudents: number
  /** Put established/reputed schools first. */
  priorityReputation: boolean
  /** Free-text board / keyword match. */
  type: SchoolType | 'all'
  query: string
}

export const DEFAULT_FILTERS: ResearchFilters = {
  state: 'all',
  district: 'all',
  mediums: ['English'],
  minStudents: 0,
  priorityReputation: false,
  type: 'all',
  query: '',
}

/**
 * The only medium we outreach in. Results are filtered to schools that teach
 * in English; other language mediums are never offered as options.
 */
export const MEDIUM_OPTIONS: MediumOfInstruction[] = ['English']

/** Reputation order used when prioritisation is switched on. */
const REPUTATION_RANK: Record<ReputationTier, number> = {
  Established: 0,
  Reputed: 1,
  Emerging: 2,
}

export function statesOf(list: ResearchResult[]): string[] {
  return [...new Set(list.map((item) => item.state))].sort()
}

export function districtsOf(list: ResearchResult[], state: string): string[] {
  const scoped = state === 'all' ? list : list.filter((item) => item.state === state)
  return [...new Set(scoped.map((item) => item.district))].sort()
}

/**
 * True when the e-mail domain belongs to the school's own website, e.g.
 * `principal@vidyaniketan.edu.in` on `https://www.vidyaniketan.edu.in`.
 *
 * Subdomains and the bare registrable domain both count as a match; an address
 * on an unrelated domain (Gmail, a different school) does not.
 */
export function emailBelongsToDomain(email: string, website: string): boolean {
  const emailDomain = email.split('@')[1]?.toLowerCase().trim()
  const siteDomain = domainOf(website)
  if (!emailDomain || !siteDomain) return false
  if (emailDomain === siteDomain) return true
  // `mail.vidyaniketan.edu.in` matches `vidyaniketan.edu.in`
  if (emailDomain.endsWith(`.${siteDomain}`)) return true
  // `vidyaniketan.edu.in` matches a site reached at `www.vidyaniketan.edu.in`
  if (siteDomain.endsWith(`.${emailDomain}`)) return true
  return false
}

/** Hostname without protocol, path or `www.` prefix. */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return url.toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '')
  }
}

export interface ContactVerification {
  status: VerificationStatus
  /** E-mail passes format validation. */
  emailValid: boolean
  /** Phone passes format validation. */
  phoneValid: boolean
  /** E-mail domain belongs to the school's own website. */
  domainMatch: boolean
  /** Human-readable record of what was checked. */
  notes: string
}

/**
 * Grades an extracted contact block.
 *
 *  - Verified            : both values valid AND the e-mail is on the school's own domain
 *  - Partially Verified  : at least one value valid, but something could not be confirmed
 *  - Unverified          : neither value could be validated — never shown as usable
 */
export function verifyContactExtraction(input: {
  website: string
  email: string
  phone: string
}): ContactVerification {
  const email = input.email.trim()
  const phone = input.phone.trim()

  const emailValid = Boolean(email) && isValidEmail(email)
  const phoneValid = Boolean(phone) && isValidPhone(phone)
  const domainMatch = emailValid && emailBelongsToDomain(email, input.website)

  const problems: string[] = []
  if (!email) problems.push('no e-mail found on the page')
  else if (!emailValid) problems.push('e-mail failed format validation')
  else if (!domainMatch) problems.push('e-mail domain does not belong to the school website')
  if (!phone) problems.push('no phone number found on the page')
  else if (!phoneValid) problems.push('phone failed format validation')

  const status: VerificationStatus =
    emailValid && phoneValid && domainMatch
      ? 'verified'
      : emailValid || phoneValid
        ? 'needs-review'
        : 'unverified'

  const notes =
    status === 'verified'
      ? 'Both values valid; e-mail domain matches the school website.'
      : `Could not fully confirm: ${problems.join('; ')}.`

  return { status, emailValid, phoneValid, domainMatch, notes }
}

/** Three-state label used across the research UI. */
export function contactStatusLabel(status: VerificationStatus): string {
  switch (status) {
    case 'verified':
      return 'Verified'
    case 'needs-review':
      return 'Partially Verified'
    default:
      return 'Unverified'
  }
}

export function contactLabelTone(status: VerificationStatus): string {
  switch (status) {
    case 'verified':
      return 'bg-teal-50 text-teal-700 ring-teal-200'
    case 'needs-review':
      return 'bg-amber-50 text-amber-700 ring-amber-200'
    default:
      return 'bg-rose-50 text-rose-700 ring-rose-200'
  }
}

function matchesQuery(item: ResearchResult, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    item.name,
    item.city,
    item.district,
    item.state,
    item.type,
    item.contactName,
    item.contactDesignation,
    ...item.medium,
  ]
    .join(' ')
    .toLowerCase()
  return q.split(/\s+/).every((token) => haystack.includes(token))
}

/** Applies every active filter. Pure — safe to call from `useMemo`. */
export function filterResearchSchools(
  list: ResearchResult[],
  filters: ResearchFilters,
): ResearchResult[] {
  return list.filter((item) => {
    if (filters.state !== 'all' && item.state !== filters.state) return false
    if (filters.district !== 'all' && item.district !== filters.district) return false
    if (filters.type !== 'all' && item.type !== filters.type) return false
    if (filters.minStudents > 0 && item.studentCount < filters.minStudents) return false
    if (filters.mediums.length > 0 && !filters.mediums.some((m) => item.medium.includes(m))) {
      return false
    }
    return matchesQuery(item, filters.query)
  })
}

/**
 * Sorts by reputation when prioritisation is on (established first, then by
 * size), otherwise keeps source order so results stay stable and predictable.
 */
export function sortResearchSchools(
  list: ResearchResult[],
  priorityReputation: boolean,
): ResearchResult[] {
  if (!priorityReputation) return list
  return [...list].sort((left, right) => {
    const rank = REPUTATION_RANK[left.reputation] - REPUTATION_RANK[right.reputation]
    if (rank !== 0) return rank
    return right.studentCount - left.studentCount
  })
}

/** A human summary of the active filters, shown above the result set. */
export function describeFilters(filters: ResearchFilters): string {
  const parts: string[] = []
  if (filters.state !== 'all') parts.push(filters.district !== 'all' ? `${filters.district}, ${filters.state}` : filters.state)
  if (filters.type !== 'all') parts.push(filters.type)
  if (filters.mediums.length > 0) parts.push(`${filters.mediums.join('/')} medium`)
  if (filters.minStudents > 0) parts.push(`over ${filters.minStudents.toLocaleString('en-IN')} students`)
  if (filters.priorityReputation) parts.push('reputed & established first')
  if (filters.query.trim()) parts.push(`“${filters.query.trim()}”`)
  return parts.length > 0 ? parts.join(' · ') : 'No filters — all sources'
}

/**
 * Medium shown on a result card. Since outreach is English-only, a school's
 * other language mediums stay hidden and only the in-scope ones show; if a
 * school does not teach in English at all (English filter switched off) the
 * full list is shown so the card never lies about it.
 */
export function displayMediums(result: ResearchResult): string {
  const inScope = result.medium.filter((medium) => MEDIUM_OPTIONS.includes(medium))
  return (inScope.length > 0 ? inScope : result.medium).join(', ')
}

/**
 * Total number of checks that were applied to a contact, for the "2 of 3 checks
 * passed" line under each result.
 */
export function passedCheckCount(result: ResearchResult): number {
  const verification = verifyContactExtraction({
    website: result.website,
    email: result.contactEmail || result.email,
    phone: result.phone,
  })
  return [verification.emailValid, verification.phoneValid, verification.domainMatch].filter(
    Boolean).length
}

const BOARD_OPTIONS: SchoolType[] = [
  'CBSE',
  'ICSE',
  'State Board',
  'Matriculation',
  'International',
]

/** Words that describe the request itself rather than the school. */
const QUERY_STOPWORDS = new Set([
  'a', 'an', 'the', 'in', 'near', 'of', 'for', 'and', 'or', 'with', 'only', 'show',
  'find', 'search', 'research', 'look', 'list', 'get', 'schools', 'school', 'please',
  'me', 'all', 'over', 'above', 'more', 'than', 'students', 'student', 'classes',
  'contacts', 'contact', 'details', 'detail', 'unverified', 'verified', 'verification',
  'partially', 'needs', 'need', 'review', 'status', 'valid', 'validate', 'check',
  'reputed', 'reputable', 'established', 'top', 'leading', 'best',
  'medium', 'mediums', 'instruction', 'language', 'languages', 'board', 'boards',
  // Language names: medium is fixed to English, so these describe the request,
  // not a school — they must never leak into the keyword query.
  'english', 'tamil', 'hindi', 'telugu', 'kannada', 'malayalam', 'marathi',
  'bengali', 'gujarati', 'odia', 'punjabi',
  'campus', 'campuses', 'area', 'areas', 'location', 'locations', 'category',
  'categories', 'kind', 'kinds', 'one', 'ones',
])

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Reads structured filters out of a free-text request such as “CBSE schools in
 * Chennai with English medium over 2000 students”.
 *
 * State, district, board, the 2,000-student threshold and the
 * reputation priority are recognised; whatever is left over becomes the
 * keyword query. The medium stays at the English-only default. Used by the
 * agent chat so a typed request applies exactly the
 * same filter engine as the Schools page.
 */
export function parseFiltersFromQuery(
  query: string,
  corpus: ResearchResult[],
): ResearchFilters {
  const lower = query.toLowerCase()
  const filters: ResearchFilters = { ...DEFAULT_FILTERS }
  const consumed: string[] = []

  const state = statesOf(corpus).find((name) => lower.includes(name.toLowerCase()))
  if (state) {
    filters.state = state
    consumed.push(state)
    const district = districtsOf(corpus, state).find((name) =>
      lower.includes(name.toLowerCase()),
    )
    if (district) {
      filters.district = district
      consumed.push(district)
    }
  } else {
    const district = districtsOf(corpus, 'all').find((name) =>
      lower.includes(name.toLowerCase()),
    )
    if (district) {
      filters.district = district
      consumed.push(district)
      const owner = corpus.find((item) => item.district === district)
      if (owner) {
        filters.state = owner.state
        consumed.push(owner.state)
      }
    }
  }

  // Medium is not read from the query: outreach is English-only, so the
  // default `['English']` always applies and other language names in the
  // request are treated as stopwords below.

  const board = BOARD_OPTIONS.find((option) => lower.includes(option.toLowerCase()))
  if (board) {
    filters.type = board
    consumed.push(board)
  }

  if (/\b(?:over|above|more than|greater than)\s*2[,.]?000\b|\b2[,.]?000\+?(?:\s*students?)?\b/.test(lower)) {
    filters.minStudents = 2000
  }

  if (/\b(?:reputed|reputable|well[- ]established|prestigious|leading)\b/.test(lower)) {
    filters.priorityReputation = true
  }

  let leftover = lower
  if (consumed.length > 0) {
    leftover = leftover.replace(
      new RegExp(`\\b(?:${consumed.map(escapeRegExp).join('|')})\\b`, 'gi'),
      ' ',
    )
  }
  const keywords = [
    ...new Set(
      leftover
        .split(/[^a-z0-9]+/)
        .filter((token) => token && !QUERY_STOPWORDS.has(token) && !/^\d+$/.test(token)),
    ),
  ]

  // A keyword only survives if some school in the corpus actually mentions it,
  // so stray words from the sentence ("kind", "area") are treated as noise
  // instead of silently emptying the result set.
  const corpusText = corpus.map((item) =>
    [
      item.name,
      item.city,
      item.district,
      item.state,
      item.type,
      item.contactName,
      item.contactDesignation,
      ...item.medium,
    ]
      .join(' ')
      .toLowerCase(),
  )
  filters.query = keywords
    .filter((token) => token.length >= 3 && corpusText.some((text) => text.includes(token)))
    .join(' ')

  return filters
}
