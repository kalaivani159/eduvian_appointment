import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'
import { Logo } from '../components/brand/Logo'
import { Button } from '../components/ui/Button'
import { Input, Label } from '../components/ui/Field'
import { Avatar } from '../components/ui/Avatar'
import { employees } from '../data/demo'
import { useApp } from '../store/AppStore'
import { cn } from '../lib/utils'

const floatingIcons = [
  { icon: GraduationCap, delay: '0s', top: '12%', left: '8%', size: 'size-5', opacity: 'opacity-20' },
  { icon: BookOpen, delay: '1.2s', top: '25%', right: '6%', size: 'size-4', opacity: 'opacity-15' },
  { icon: Star, delay: '0.6s', top: '55%', left: '5%', size: 'size-3.5', opacity: 'opacity-20' },
  { icon: Sparkles, delay: '1.8s', top: '70%', right: '8%', size: 'size-4', opacity: 'opacity-15' },
  { icon: GraduationCap, delay: '2.4s', top: '85%', left: '15%', size: 'size-3', opacity: 'opacity-10' },
  { icon: Star, delay: '0.9s', top: '40%', right: '4%', size: 'size-3', opacity: 'opacity-20' },
]

export function Login() {
  const { login } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('priya.raman@eduvian.in')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password to continue.')
      return
    }
    const match = employees.find(
      (employee) => employee.email.toLowerCase() === email.trim().toLowerCase(),
    )
    if (!match) {
      setError('No employee account matches that email in the demo directory.')
      return
    }
    setError('')
    setLoading(true)
    window.setTimeout(() => {
      login(match.id)
      navigate('/')
    }, 550)
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* ── Brand panel ── */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12"
        style={{ background: 'linear-gradient(145deg, #05091a 0%, #0b1228 40%, #131e3d 70%, #1a1050 100%)' }}
      >
        {/* Animated blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-24 size-[500px] rounded-full bg-brand-600/20 blur-[120px] animate-float-slow" />
          <div className="absolute right-[-15%] bottom-[-15%] size-[420px] rounded-full bg-teal-500/15 blur-[100px] animate-float-slow" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[40%] left-[30%] size-[300px] rounded-full bg-violet-600/10 blur-[80px] animate-float-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute inset-0 grid-lines opacity-30" />
        </div>

        {/* Floating educational icons */}
        {floatingIcons.map((item, index) => {
          const Icon = item.icon
          return (
            <div
              key={index}
              className={cn('pointer-events-none absolute', item.opacity)}
              style={{ top: item.top, left: item.left, right: item.right, animationDelay: item.delay }}
            >
              <Icon className={cn(item.size, 'text-white animate-float')} style={{ animationDelay: item.delay }} />
            </div>
          )
        })}

        {/* Logo */}
        <div className="relative">
          <Logo variant="light" />
          <p className="mt-1.5 pl-0.5 text-[10px] font-bold tracking-[0.22em] text-white/35 uppercase">
            Learn • Grow • Excel
          </p>
        </div>

        {/* Hero text */}
        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[11px] font-semibold tracking-wide text-brand-200 uppercase backdrop-blur-sm">
            <Sparkles className="size-3 text-brand-300" />
            AI-powered education partnership platform
          </span>
          <h1 className="mt-5 text-[40px] leading-[1.07] font-extrabold text-white">
            Your school appointments,
            <br />
            booked by an agent
            <br />
            <span
              className="bg-clip-text text-transparent animate-gradient-shift"
              style={{ backgroundImage: 'linear-gradient(135deg, #bfa4ff, #7c4dff, #2dd4bf, #bfa4ff)', backgroundSize: '200% 200%' }}
            >
              that never forgets.
            </span>
          </h1>
          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-white/50">
            One workspace for school records, research, availability, invitations and
            responses — driven by natural language, text or voice.
          </p>

          {/* Feature pills */}
          <div className="mt-8 space-y-2.5">
            {[
              { icon: GraduationCap, label: 'Existing school booking', sub: 'Known contact → validated slot → invitation' },
              { icon: BookOpen, label: 'Research & book', sub: 'Discover schools → verify contacts → schedule' },
              { icon: Users, label: 'School response tracking', sub: 'Confirm · decline · request another time' },
            ].map((item, index) => (
              <div
                key={item.label}
                className="flex items-center gap-3.5 rounded-xl border border-white/8 bg-white/5 p-3.5 backdrop-blur-sm transition-all duration-300 hover:border-white/15 hover:bg-white/8 animate-card-enter"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500/30 to-teal-500/20 text-brand-200 ring-1 ring-white/10">
                  <item.icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-[12.5px] font-semibold text-white">{item.label}</p>
                  <p className="text-[11px] text-white/40">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer tagline */}
        <div className="relative flex flex-wrap items-center gap-5 text-[11px] text-white/30">
          <span className="flex items-center gap-1.5"><GraduationCap className="size-3.5" /> Role-based access</span>
          <span className="flex items-center gap-1.5"><Lock className="size-3.5" /> Secure response links</span>
          <span className="flex items-center gap-1.5"><Users className="size-3.5" /> Multi-employee calendars</span>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="relative flex flex-col justify-center bg-canvas px-5 py-10 sm:px-10 lg:px-14">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-50/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-brand-50/30 to-transparent" />

        <div className="relative mx-auto w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <Logo />
            <p className="mt-1 text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase">
              Learn • Grow • Excel
            </p>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-[26px] font-bold text-navy-900">Welcome back</h2>
            <p className="mt-1.5 text-[13.5px] text-slate-500">
              Sign in to your Eduvian workspace
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                iconLeft={<Mail className="size-4" />}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@eduvian.in"
                invalid={Boolean(error)}
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="password" className="text-[12.5px] font-semibold text-navy-800">
                  Password
                </label>
                <button type="button" className="text-[11.5px] font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  iconLeft={<Lock className="size-4" />}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter any password in the preview"
                  invalid={Boolean(error)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-navy-900"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-[12px] font-medium text-rose-700 ring-1 ring-rose-200 ring-inset animate-scale-in">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={loading}
              iconRight={<ArrowRight className="size-4" />}
              className="mt-1 shadow-[0_8px_24px_-8px_rgba(106,52,240,0.6)] hover:shadow-[0_12px_32px_-8px_rgba(106,52,240,0.75)] transition-shadow"
            >
              Sign in to Eduvian
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[10.5px] font-bold tracking-[0.12em] text-slate-400 uppercase">
              Preview accounts
            </span>
            <div className="h-px flex-1 bg-line" />
          </div>

          {/* Quick-access accounts */}
          <div className="space-y-2">
            {employees
              .filter((employee) => employee.status === 'active')
              .slice(0, 4)
              .map((employee, index) => (
                <button
                  key={employee.id}
                  onClick={() => { login(employee.id); navigate('/') }}
                  className="group flex w-full items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 text-left transition-all duration-200 hover:border-brand-200 hover:shadow-card hover:-translate-y-px animate-card-enter"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Avatar name={employee.name} tone={employee.avatarTone} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-navy-900">
                      {employee.name}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {employee.role === 'admin' ? 'Management / Admin' : employee.designation}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide uppercase ring-1 ring-inset',
                      employee.role === 'admin'
                        ? 'bg-navy-50 text-navy-800 ring-navy-200'
                        : 'bg-brand-50 text-brand-700 ring-brand-200',
                    )}
                  >
                    {employee.role === 'admin' ? 'Admin' : 'Employee'}
                  </span>
                  <ArrowUpRight className="size-3.5 shrink-0 text-slate-300 transition-all duration-200 group-hover:text-brand-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              ))}
          </div>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-400">
            Interface preview · authentication, email and calendar require the backend.
          </p>
        </div>
      </div>
    </div>
  )
}
