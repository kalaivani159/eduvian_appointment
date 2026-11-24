import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  BookOpen,
  Bot,
  CalendarClock,
  CalendarDays,
  Check,
  Circle,
  Clock3,
  History,
  Info,
  Loader2,
  MessageSquarePlus,
  Mic,
  MicOff,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Square,
  UserRound,
  Video,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { PageHeader } from '../components/ui/Card'
import { Button, IconButton } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { Tooltip } from '../components/ui/Tooltip'
import { AgentCardView } from '../features/agent/AgentCards'
import { useAgentDemo, type AgentStage } from '../features/agent/useAgentDemo'
import { useSpeech, useVoice } from '../features/agent/useVoice'
import { useApp } from '../store/AppStore'
import { cn, clockTime, longDate, timeRange } from '../lib/utils'

const stageCopy: Record<AgentStage, string> = {
  idle: 'Ready for a request',
  researching: 'Researching approved sources',
  'awaiting-school': 'Waiting for school selection',
  'awaiting-contact': 'Waiting for contact selection',
  'awaiting-verification': 'Contact needs verification',
  'awaiting-contact-details': 'Waiting for replacement contact',
  'awaiting-contact-confirm': 'Confirming contact details',
  'awaiting-date': 'Waiting for a date',
  'awaiting-slot': 'Waiting for time selection',
  'awaiting-confirm': 'Waiting for your confirmation',
  'awaiting-approval': 'Saved for management approval',
  sent: 'Invitation prepared',
}

const thinkingSteps = [
  'Understanding your request…',
  'Checking your permissions…',
  'Reading school records…',
  'Checking calendar availability…',
  'Preparing the next step…',
]

const stageIndex: Record<AgentStage, number> = {
  idle: 0,
  researching: 1,
  'awaiting-school': 1,
  'awaiting-contact': 2,
  'awaiting-verification': 2,
  'awaiting-contact-details': 2,
  'awaiting-contact-confirm': 2,
  'awaiting-date': 3,
  'awaiting-slot': 3,
  'awaiting-confirm': 4,
  'awaiting-approval': 5,
  sent: 6,
}

const journeySteps = [
  'Understand request',
  'Identify school',
  'Confirm contact',
  'Choose date & time',
  'Employee confirms',
  'Invitation prepared',
]

export function AgentPage() {
  const [params] = useSearchParams()
  const agent = useAgentDemo()
  const speech = useSpeech()
  const { pushToast, user } = useApp()
  const [input, setInput] = useState('')
  const [step, setStep] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastStartKey = useRef<string | null>(null)
  const isNearBottomRef = useRef(true)
  // Set to true when user sends a message or clicks a card option so that every
  // subsequent message in that agent response sequence forces a scroll down,
  // regardless of whether the user scrolled up mid-sequence.
  const forceNextScrollRef = useRef(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  function scrollToBottom(smooth = true) {
    const node = scrollRef.current
    if (!node) return
    node.scrollTo({ top: node.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
  }

  function handleScroll() {
    const node = scrollRef.current
    if (!node) return
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight
    isNearBottomRef.current = distanceFromBottom < 120
    setShowScrollBtn(distanceFromBottom > 200)
    // If user manually scrolls back down to the bottom, re-enable auto-follow.
    if (distanceFromBottom < 120) forceNextScrollRef.current = false
  }

  // Helper used by every card interaction and submit — marks that the next
  // batch of agent messages should unconditionally scroll into view.
  function initiateUserAction() {
    isNearBottomRef.current = true
    forceNextScrollRef.current = true
    // Immediate scroll to show the user's own interaction.
    window.setTimeout(() => scrollToBottom(), 30)
  }

  const voice = useVoice({
    onTranscript: (text) => {
      setInput(text)
      textareaRef.current?.focus()
    },
    onError: (message) =>
      pushToast({ tone: 'warning', title: 'Voice input unavailable', description: message }),
  })

  useEffect(() => {
    // Start the right workflow for the URL: a school carried from the Schools
    // page pre-loads that record (contact, e-mail and phone) immediately.
    const mode = params.get('mode')
    const schoolId = params.get('school')
    const key = schoolId ? `school:${schoolId}` : mode ? `mode:${mode}` : null
    if (!key || key === lastStartKey.current) return
    lastStartKey.current = key
    if (schoolId) {
      void agent.chooseExistingSchool(schoolId)
    } else if (mode === 'existing') {
      void agent.startExisting()
    } else if (mode === 'research') {
      void agent.startResearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  useEffect(() => {
    if (isNearBottomRef.current || forceNextScrollRef.current) {
      scrollToBottom()
    }
    // Once the agent finishes its thinking sequence (thinking goes false and a
    // new agent message has arrived), clear the force flag so a manual scroll
    // up during the next idle period is respected again.
    if (!agent.thinking && forceNextScrollRef.current) {
      // Keep a short grace window in case more messages arrive in the same
      // async batch before we clear the flag.
      window.setTimeout(() => {
        forceNextScrollRef.current = false
      }, 600)
    }
  }, [agent.messages, agent.thinking])

  useEffect(() => {
    if (!agent.thinking) {
      setStep(0)
      return
    }
    const interval = window.setInterval(() => {
      setStep((current) => (current + 1) % thinkingSteps.length)
    }, 900)
    return () => window.clearInterval(interval)
  }, [agent.thinking])

  const lastMessage = agent.messages[agent.messages.length - 1]
  useEffect(() => {
    if (lastMessage?.from === 'agent' && speech.enabled) {
      speech.speak(lastMessage.text)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.messages.length])

  function submit(text?: string) {
    const value = (text ?? input).trim()
    if (!value) return
    initiateUserAction()
    void agent.send(value)
    setInput('')
  }

  const progress = stageIndex[agent.context.stage]
  const micActive = voice.listening

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Appointment Agent"
        description="Ask in plain language. The agent identifies the workflow, checks records and availability, and prepares the invitation — you make every appointment decision."
        action={
          <>
            <Button
              variant="secondary"
              size="md"
              iconLeft={<History className="size-4" />}
              onClick={() => setHistoryOpen((open) => !open)}
            >
              History
            </Button>
            <Button
              variant="secondary"
              size="md"
              iconLeft={<MessageSquarePlus className="size-4" />}
              onClick={() => {
                agent.reset()
                setInput('')
                initiateUserAction()
                pushToast({ tone: 'info', title: 'New conversation started' })
              }}
            >
              New conversation
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        {/* Left rail */}
        <div className="hidden space-y-3 xl:block">
          <div className="rounded-2xl border border-line bg-white p-3 shadow-card">
            <p className="px-1 text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
              This conversation
            </p>
            <div className="mt-2 space-y-1">
              <div className="rounded-xl bg-brand-50 p-2.5 ring-1 ring-brand-100 ring-inset">
                <p className="text-[12px] font-semibold text-navy-900">
                  {agent.context.workflow === 'research'
                    ? 'New school research'
                    : agent.context.workflow === 'existing'
                      ? 'Existing school booking'
                      : 'New conversation'}
                </p>
                <p className="mt-0.5 text-[10.5px] text-slate-500">{stageCopy[agent.context.stage]}</p>
              </div>
            </div>

            <p className="mt-4 px-1 text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
              Recent
            </p>
            <div className="mt-2 space-y-1">
              {[
                { title: 'ABC International · Tue 11:00', meta: '2h ago', active: false },
                { title: 'Nova Global · alternative time', meta: '15h ago', active: false },
                { title: 'Chennai CBSE research', meta: 'yesterday', active: false },
              ].map((item) => (
                <button
                  key={item.title}
                  onClick={() =>
                    pushToast({
                      tone: 'info',
                      title: 'Archived conversation',
                      description: 'Conversation history becomes interactive once the backend conversation store is connected.',
                    })
                  }
                  className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50"
                >
                  <Clock3 className="mt-0.5 size-3 shrink-0 text-slate-300" />
                  <span className="min-w-0">
                    <span className="block truncate text-[11.5px] font-medium text-slate-600">
                      {item.title}
                    </span>
                    <span className="block text-[10px] text-slate-400">{item.meta}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-3 shadow-card">
            <p className="px-1 text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
              What I can do
            </p>
            <ul className="mt-2 space-y-1.5">
              {[
                { icon: Search, text: 'Find schools & verified contacts' },
                { icon: CalendarClock, text: 'Check your availability' },
                { icon: BookOpen, text: 'Prepare the invitation' },
                { icon: ShieldCheck, text: 'Track school responses' },
                { icon: Phone, text: 'Take requests by voice' },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-2 px-1">
                  <item.icon className="mt-0.5 size-3.5 shrink-0 text-brand-500" />
                  <span className="text-[11.5px] leading-snug text-slate-500">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800">
              <Info className="size-3.5" />
              Preview mode
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-amber-800/80">
              Responses follow the real workflow but are simulated. No model, email provider or
              calendar is connected in this phase.
            </p>
          </div>
        </div>

        {/* Chat */}
        <div className="flex min-h-[640px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_6px_16px_-8px_rgba(106,52,240,0.9)] animate-glow-pulse">
              <Bot className="size-4.5" />
              <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-white bg-teal-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[13px] font-bold text-navy-900">
                Eduvian Agent
                <Sparkles className="size-3 text-brand-500" />
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {agent.thinking ? thinkingSteps[step] : stageCopy[agent.context.stage]}
              </p>
            </div>
            <Badge tone="amber" size="sm" dot>
              Demo
            </Badge>
            <Tooltip label={speech.enabled ? 'Read replies aloud: on' : 'Read replies aloud: off'}>
              <IconButton
                label="Toggle text to speech"
                onClick={() => {
                  speech.setEnabled(!speech.enabled)
                  if (speech.enabled) speech.stopSpeaking()
                }}
                className={cn(speech.enabled && 'bg-brand-50 text-brand-600')}
              >
                {speech.enabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </IconButton>
            </Tooltip>
          </div>

          <div ref={scrollRef} className="scrollbar-thin relative flex-1 space-y-4 overflow-y-auto bg-canvas/40 px-4 py-5" onScroll={handleScroll}>
            {showScrollBtn && (
              <button
                onClick={() => { isNearBottomRef.current = true; forceNextScrollRef.current = false; scrollToBottom() }}
                className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-brand-600 shadow-pop transition-all hover:bg-brand-50 animate-fade-up"
              >
                <ArrowDown className="size-3.5" />
                Latest message
              </button>
            )}
            {agent.messages.map((message) => {
              if (message.from === 'system') {
                return (
                  <div key={message.id} className="flex justify-center">
                    <span className="flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[10.5px] text-slate-500 shadow-sm">
                      <Activity className="size-3 text-teal-500" />
                      {message.text}
                      {message.meta && (
                        <code className="rounded bg-slate-100 px-1 font-mono text-[9.5px] text-slate-500">
                          {message.meta}
                        </code>
                      )}
                    </span>
                  </div>
                )
              }

              const isAgent = message.from === 'agent'
              return (
                <div
                  key={message.id}
                  className={cn('flex gap-2.5 animate-card-enter', isAgent ? 'justify-start' : 'justify-end')}
                >
                  {isAgent && (
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                      <Bot className="size-3.5" />
                    </span>
                  )}
                  <div className={cn('max-w-[94%] sm:max-w-[86%]', isAgent ? '' : 'flex flex-col items-end')}>
                    <div
                      className={cn(
                        'rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm',
                        isAgent
                          ? 'rounded-tl-md border border-line bg-white text-navy-800'
                          : 'rounded-tr-md bg-gradient-to-br from-brand-600 to-brand-700 text-white',
                      )}
                    >
                      {message.text}
                      {message.card && (
                        <div className="mt-2.5">
                          <AgentCardView
                            card={message.card}
                            handlers={{
                              onStartExisting: () => { initiateUserAction(); void agent.startExisting() },
                              onStartResearch: () => { initiateUserAction(); void agent.startResearch() },
                              onSelectExistingSchool: (id) => { initiateUserAction(); void agent.chooseExistingSchool(id) },
                              onSelectResearchResult: (id) => { initiateUserAction(); void agent.chooseResearchResult(id) },
                              onVerifyContact: (id) => { initiateUserAction(); void agent.verifyContact(id) },
                              onChooseContact: (schoolId, contactId) => { initiateUserAction(); void agent.chooseContact(schoolId, contactId) },
                              onChooseDate: (date) => { initiateUserAction(); void agent.chooseDate(date) },
                              onChooseSlot: (start, end, date) => { initiateUserAction(); void agent.chooseSlot(start, end, date) },
                              onConfirmSend: (draft) => { initiateUserAction(); void agent.confirmSend(draft) },
                              onEditDraft: (patch) => agent.editDraft(patch),
                              onChangeTime: () => { initiateUserAction(); void agent.requestChangeTime() },
                              onConfirmContact: () => { initiateUserAction(); void agent.confirmContact() },
                              onStartContactReplacement: () => { initiateUserAction(); void agent.startContactReplacement() },
                              onSubmitContact: (details) => { initiateUserAction(); void agent.submitContactDetails(details) },
                              onRetry: (action) => { initiateUserAction(); void agent.retry(action) },
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <span
                      className={cn(
                        'mt-1 px-1 text-[10px] text-slate-400',
                        isAgent ? '' : 'text-right',
                      )}
                    >
                      {clockTime(new Date(message.at))}
                      {!isAgent && ' · you'}
                    </span>
                  </div>
                  {!isAgent && (
                    <Avatar name={user?.name ?? 'You'} tone={user?.avatarTone} size="sm" className="mt-0.5" />
                  )}
                </div>
              )
            })}

            {agent.thinking && (
              <div className="flex gap-2.5">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                  <Bot className="size-3.5" />
                </span>
                <div className="rounded-2xl rounded-tl-md border border-line bg-white px-3.5 py-2.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      {[0, 1, 2].map((dot) => (
                        <span
                          key={dot}
                          className="size-1.5 animate-bounce rounded-full bg-brand-400"
                          style={{ animationDelay: `${dot * 120}ms` }}
                        />
                      ))}
                    </span>
                    <span className="text-[11.5px] text-slate-500">{thinkingSteps[step]}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-line bg-white px-3 pt-2.5 pb-3">
            {micActive ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
                <div className="flex items-center gap-3">
                  <span className="relative flex size-9 shrink-0 animate-pulse-ring items-center justify-center rounded-full bg-rose-500 text-white">
                    <Mic className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-rose-900">Listening…</p>
                    <p className="truncate text-[11px] text-rose-700/70">
                      {voice.interim || 'Speak your request — for example, “Book ABC International School tomorrow at 11”'}
                    </p>
                  </div>
                  <div className="flex items-end gap-0.5">
                    {[0, 1, 2, 3, 4, 5].map((bar) => (
                      <span
                        key={bar}
                        className="w-1 animate-bar rounded-full bg-rose-400"
                        style={{ height: 18, animationDelay: `${bar * 90}ms` }}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[11px] text-rose-700">
                    {String(Math.floor(voice.elapsed / 60)).padStart(2, '0')}:
                    {String(voice.elapsed % 60).padStart(2, '0')}
                  </span>
                  <IconButton
                    label="Cancel recording"
                    onClick={voice.cancel}
                    className="hover:bg-rose-100 hover:text-rose-700"
                  >
                    <X className="size-4" />
                  </IconButton>
                  <Button size="sm" variant="danger" onClick={voice.stop} iconLeft={<Square className="size-3" />}>
                    Stop &amp; use
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  {agent.promptChips.slice(0, 3).map((chip) => (
                    <button
                      key={chip}
                      onClick={() => submit(chip)}
                      className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2 rounded-xl border border-line bg-white p-1.5 transition-colors focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/10">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        submit()
                      }
                    }}
                    placeholder="Ask the agent — “Book an appointment with ABC International School for Tuesday at 11”"
                    className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-[13px] text-navy-900 placeholder:text-slate-400 focus:outline-none"
                  />
                  <Tooltip label={voice.supported ? 'Speak your request' : 'Speech recognition unavailable'}>
                    <IconButton
                      label="Start voice input"
                      onClick={voice.start}
                      disabled={!voice.supported}
                      className={cn(!voice.supported && 'opacity-40')}
                    >
                      {voice.supported ? <Mic className="size-4.5" /> : <MicOff className="size-4.5" />}
                    </IconButton>
                  </Tooltip>
                  <Button
                    size="sm"
                    onClick={() => submit()}
                    disabled={!input.trim() || agent.thinking}
                    className="mb-0.5 shrink-0"
                    aria-label="Send message"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                </div>
                <p className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-slate-400">
                  <span>Enter to send · Shift+Enter for a new line</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="size-3" />
                    You approve every appointment action
                  </span>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                Live context
              </p>
              <Badge tone={agent.context.workflow ? 'brand' : 'slate'} size="sm">
                {agent.context.workflow === 'research'
                  ? 'Workflow 2'
                  : agent.context.workflow === 'existing'
                    ? 'Workflow 1'
                    : 'No workflow'}
              </Badge>
            </div>

            <div className="mt-3 space-y-2.5">
              <ContextRow label="School" value={agent.context.schoolName} icon={BookOpen} />
              <ContextRow label="Location" value={agent.context.schoolCity} icon={Search} />
              <ContextRow
                label="Contact"
                value={
                  agent.context.contactName
                    ? `${agent.context.contactName} · ${agent.context.contactDesignation}`
                    : null
                }
                icon={Phone}
              />
              <ContextRow
                label="Verification"
                value={
                  agent.context.contactVerified === null
                    ? null
                    : agent.context.contactVerified
                      ? 'Verified'
                      : 'Pending review'
                }
                icon={BadgeCheck}
                tone={
                  agent.context.contactVerified === null
                    ? undefined
                    : agent.context.contactVerified
                      ? 'text-teal-600'
                      : 'text-amber-600'
                }
              />
              <ContextRow
                label="Date"
                value={agent.context.date ? longDate(agent.context.date) : null}
                icon={CalendarDays}
              />
              <ContextRow
                label="Time"
                value={
                  agent.context.startTime && agent.context.endTime
                    ? `${timeRange(agent.context.startTime, agent.context.endTime)} IST`
                    : null
                }
                icon={Clock3}
              />
              <ContextRow
                label="Format"
                value={agent.context.schoolId ? agent.context.format : null}
                icon={Video}
              />
              <ContextRow label="Assigned to" value={user?.name ?? null} icon={UserRound} />
            </div>

            <div className="mt-4 border-t border-line pt-3">
              <p className="mb-2 text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                Progress
              </p>
              <ol className="space-y-1.5">
                {journeySteps.map((label, index) => {
                  const done = index < progress
                  const current = index === progress
                  return (
                    <li key={label} className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded-full ring-1',
                          done
                            ? 'bg-teal-50 text-teal-600 ring-teal-200'
                            : current
                              ? 'bg-brand-50 text-brand-600 ring-brand-300'
                              : 'bg-white text-slate-300 ring-slate-200',
                        )}
                      >
                        {done ? (
                          <Check className="size-2.5" strokeWidth={3} />
                        ) : current ? (
                          <Loader2 className="size-2.5 animate-spin" />
                        ) : (
                          <Circle className="size-1.5 fill-current" />
                        )}
                      </span>
                      <span
                        className={cn(
                          'text-[11px]',
                          done
                            ? 'text-slate-400 line-through'
                            : current
                              ? 'font-semibold text-navy-900'
                              : 'text-slate-400',
                        )}
                      >
                        {label}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
              Guardrails
            </p>
            <ul className="mt-2 space-y-2">
              {[
                'Never invents email addresses or phone numbers',
                'Never claims an email was sent without provider confirmation',
                'Requires verified contacts before preparing an invitation',
                'Respects approvals and employee decisions',
              ].map((rule) => (
                <li key={rule} className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-teal-500" />
                  <span className="text-[11px] leading-snug text-slate-500">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {historyOpen && (
        <div className="rounded-2xl border border-line bg-white p-4 shadow-card animate-fade-up xl:hidden">
          <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
            Conversation history
          </p>
          <p className="mt-2 text-[12px] text-slate-500">
            Conversation history is stored by the backend in the next phase. This panel lists the
            three most recent demo threads.
          </p>
        </div>
      )}
    </div>
  )
}

function ContextRow({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | null
  icon: typeof BookOpen
  tone?: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className={cn('mt-0.5 size-3.5 shrink-0', value ? 'text-brand-500' : 'text-slate-300')} />
      <div className="min-w-0 flex-1">
        <p className="text-[9.5px] font-bold tracking-[0.08em] text-slate-400 uppercase">{label}</p>
        <p
          className={cn(
            'truncate text-[11.5px]',
            value ? (tone ?? 'font-medium text-navy-900') : 'text-slate-300 italic',
          )}
        >
          {value ?? 'Not set yet'}
        </p>
      </div>
    </div>
  )
}
