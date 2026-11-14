import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { CommandPalette, DemoModeBanner, Topbar } from './Topbar'
import { Toaster } from '../ui/Toaster'
import { PageErrorBoundary } from '../ui/ErrorBoundary'

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('eduvian.sidebar') === 'collapsed',
  )
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function toggleCollapse() {
    setCollapsed((current) => {
      localStorage.setItem('eduvian.sidebar', current ? 'expanded' : 'collapsed')
      return !current
    })
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} onOpenSearch={() => setSearchOpen(true)} mobileNavOpen={mobileOpen} />
        <DemoModeBanner />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px] animate-fade-in">
            <PageErrorBoundary>
              <Outlet />
            </PageErrorBoundary>
          </div>
        </main>
        <footer className="border-t border-line px-4 py-4 text-[11px] text-slate-400 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2">
            <span>Eduvian AI Sales &amp; Appointment Booking Agent · Internal use only</span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber-400" />
              UI phase — backend not connected
            </span>
          </div>
        </footer>
      </div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toaster />
    </div>
  )
}
