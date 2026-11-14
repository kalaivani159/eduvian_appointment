import { useEffect, useState } from 'react'
import { GraduationCap, BookOpen, Sparkles } from 'lucide-react'
import { Logo } from './Logo'

const messages = [
  'Preparing your workspace…',
  'Connecting your Eduvian assistant…',
  'Organising your school appointments…',
  'Getting everything ready…',
]

const particles = [
  { icon: GraduationCap, top: '18%', left: '12%', delay: '0s', size: 'size-5' },
  { icon: BookOpen, top: '30%', right: '10%', delay: '0.8s', size: 'size-4' },
  { icon: Sparkles, top: '65%', left: '8%', delay: '1.4s', size: 'size-4' },
  { icon: GraduationCap, top: '75%', right: '12%', delay: '0.4s', size: 'size-3.5' },
  { icon: BookOpen, top: '50%', left: '5%', delay: '1.8s', size: 'size-3' },
  { icon: Sparkles, top: '20%', right: '5%', delay: '2.2s', size: 'size-3' },
]

export function AppLoader() {
  const [msgIndex, setMsgIndex] = useState(0)
  const [dotCount, setDotCount] = useState(1)

  useEffect(() => {
    const msgTimer = window.setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length)
    }, 1800)
    const dotTimer = window.setInterval(() => {
      setDotCount((d) => (d % 3) + 1)
    }, 500)
    return () => {
      clearInterval(msgTimer)
      clearInterval(dotTimer)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #05091a 0%, #0b1228 45%, #131e3d 75%, #1a1050 100%)' }}
    >
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 size-[600px] rounded-full bg-brand-600/15 blur-[130px] animate-float-slow" />
        <div className="absolute -bottom-32 -right-24 size-[500px] rounded-full bg-teal-500/10 blur-[120px] animate-float-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[300px] rounded-full bg-violet-600/8 blur-[80px] animate-float-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 grid-lines opacity-20" />
      </div>

      {/* Floating educational icons */}
      {particles.map((p, i) => {
        const Icon = p.icon
        return (
          <div
            key={i}
            className="pointer-events-none absolute opacity-15"
            style={{ top: p.top, left: p.left, right: p.right }}
          >
            <Icon className={`${p.size} text-white animate-float`} style={{ animationDelay: p.delay }} />
          </div>
        )
      })}

      {/* Spinning ring */}
      <div className="relative mb-8">
        <div className="size-24 rounded-full border-2 border-white/8 animate-spin-slow" />
        <div className="absolute inset-0 size-24 rounded-full border-t-2 border-brand-400 animate-spin" style={{ animationDuration: '1.4s' }} />
        <div className="absolute inset-3 flex items-center justify-center">
          <Logo variant="light" compact />
        </div>
      </div>

      {/* Brand */}
      <div className="relative text-center">
        <p className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-white">
          EDUVIAN
        </p>
        <p className="mt-0.5 text-[9.5px] font-bold tracking-[0.24em] text-white/35 uppercase">
          Learn • Grow • Excel
        </p>
      </div>

      {/* Loading dots */}
      <div className="mt-8 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-brand-400"
            style={{
              animation: 'loading-dot 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Rotating message */}
      <p
        key={msgIndex}
        className="mt-4 text-[12px] text-white/40 animate-fade-in"
      >
        {messages[msgIndex]}
        <span className="inline-block w-4">{'.'.repeat(dotCount)}</span>
      </p>
    </div>
  )
}
