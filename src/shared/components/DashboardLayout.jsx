import { roles } from '../../config/roles.js'
import { clearSession } from '../../features/auth/auth.js'
import BranchDirectory from './BranchDirectory.jsx'
import BranchManagerDirectory from './BranchManagerDirectory.jsx'
import { DashboardToastContext } from './dashboardToast.js'
import SettingsContent from './SettingsContent.jsx'
import { useCallback, useEffect, useState } from 'react'

function ToastMessage({ toast, onDismiss }) {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, 5000)
    return () => window.clearTimeout(timeout)
  }, [onDismiss])

  return (
    <div className={`pointer-events-auto w-full max-w-md rounded-xl border p-4 shadow-[0_8px_24px_rgba(16,45,84,0.2)] ${toast.type === 'success' ? 'border-[#a9dec6] bg-[#f0fff7] text-[#176b49]' : 'border-[#f2c5c2] bg-[#fff7f6] text-[#c2413b]'}`} role="alert">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-semibold">{toast.message}</p>
        <button type="button" onClick={onDismiss} className="text-xs font-bold opacity-70 hover:opacity-100" aria-label="Dismiss notification">Close</button>
      </div>
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 16l4-4-4-4M18 12H9" />
    </svg>
  )
}

function DashboardIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>
}

function SectionIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2"><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="7" cy="6" r="1" /><circle cx="7" cy="12" r="1" /><circle cx="7" cy="18" r="1" /></svg>
}

function SidebarLink({ href, label, icon, active = false }) {
  const [isLoading, setIsLoading] = useState(false)

  return <a href={href} onClick={() => setIsLoading(true)} className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${active ? 'bg-[#0645b8] text-white' : 'text-[#233047] hover:bg-white hover:text-[#0645b8]'}`}><span className={active ? 'text-white' : 'text-[#52657d]'}>{icon}</span>{label}{isLoading && <span className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-label="Loading" />}</a>
}

export function DashboardLayout({ roleId, username, navAction, dashboardActive, children, branchName }) {
  const role = roles[roleId]
  const isDashboardPage = dashboardActive ?? window.location.pathname === role.route
  const [toast, setToast] = useState(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const notify = useCallback((message, type = 'error') => {
    setToast({ message, type, id: Date.now() })
  }, [])

  async function handleLogout() {
    setIsSigningOut(true)
    await clearSession()
    window.location.assign('/login')
  }

  return (
    <DashboardToastContext.Provider value={{ notify }}>
      <main className="min-h-screen bg-[#eef4f8] text-[#172b4d] lg:flex lg:h-screen lg:overflow-hidden">
      {toast && <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex justify-end sm:left-auto sm:w-auto"><ToastMessage key={toast.id} toast={toast} onDismiss={() => setToast(null)} /></div>}
      <aside className="hidden w-60 shrink-0 border-r border-[#d7e1e8] bg-[#f5f8fa] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex h-[5.1rem] items-center border-b border-[#d7e1e8] px-5">
          <a href={role.route} className="flex items-center"><img src="/images/berhan.png" alt="Berhan Bank" className="h-11 w-auto object-contain" /></a>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 py-5" aria-label="Main navigation">
          <SidebarLink href={role.route} label="Dashboard" icon={<DashboardIcon />} active={isDashboardPage} />
          {navAction}
        </nav>
        <div className="border-t border-[#d7e1e8] p-3">
          <button type="button" onClick={handleLogout} disabled={isSigningOut} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-[#ef1f28] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"><LogoutIcon />{isSigningOut ? 'Signing out...' : 'Sign out'}</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="border-b border-[#075b78] bg-[#075b78]">
          <div className="mx-auto flex min-h-[5.1rem] max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
            <a href={role.route} className="flex items-center lg:hidden"><img src="/images/berhan.png" alt="Berhan Bank" className="h-10 w-auto object-contain" /></a>
            <div className="hidden items-center gap-3 text-sm font-bold text-white lg:flex"><SectionIcon /><span>{role.label}</span></div>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-white">{roleId === 'branch-manager' && branchName ? branchName : username}</p>
              <p className="text-xs text-[#c8e3ee]">{role.label}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b789d] text-sm font-bold text-white">
              {username.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
        </header>
        <div className="border-b border-[#d7e1e8] bg-[#f5f8fa] px-4 py-3 lg:hidden">
          <nav className="flex flex-wrap gap-2" aria-label="Main navigation"><SidebarLink href={role.route} label="Dashboard" icon={<DashboardIcon />} active={isDashboardPage} />{navAction}</nav>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:h-[calc(100vh-5.1rem)] lg:overflow-y-auto lg:px-10">
          {children}
        </div>
      </div>
        </main>
      </DashboardToastContext.Provider>
  )
}

export function DashboardContent({ roleId, username }) {
  const role = roles[roleId]
  const [activeView, setActiveView] = useState(window.location.pathname.endsWith('/settings') ? 'settings' : 'overview')
  const navAction = <button type="button" onClick={() => setActiveView('settings')} className={`w-full rounded-lg px-4 py-3 text-left text-sm font-bold transition ${activeView === 'settings' ? 'bg-[#0645b8] text-white' : 'text-[#233047] hover:bg-white hover:text-[#0645b8]'}`}>Settings</button>

  return (
    <DashboardLayout roleId={roleId} username={username} navAction={navAction} dashboardActive={activeView === 'overview'}>
      {activeView === 'settings' ? <SettingsContent username={username} /> : (
      <>
      <div className="mb-9">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#e09f1f]">{roleId === 'branch-manager' ? 'Branch manager workspace' : 'Dashboard'}</p>
        <h1 className="text-3xl font-bold text-[#102d54] sm:text-4xl">{roleId === 'branch-manager' ? 'Branch overview' : `Good morning, ${username}`}</h1>
        <p className="mt-2 text-[#718096]">{role.greeting}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {role.stats.map((stat) => (
          <section key={stat.label} className="rounded-lg border border-[#e0e7ec] bg-white p-5 shadow-[0_3px_10px_rgba(16,45,84,0.08)]">
            <p className="text-sm font-medium text-[#718096]">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-[#102d54]">{stat.value}</p>
            <p className="mt-2 text-xs font-semibold text-[#2e8b69]">{stat.change}</p>
          </section>
        ))}
      </div>

      {roleId !== 'branch-manager' && <div className="mt-7 grid gap-7 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg border border-[#e0e7ec] bg-white p-5 shadow-[0_3px_10px_rgba(16,45,84,0.08)]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#102d54]">Recent activity</h2>
            <button type="button" className="text-sm font-semibold text-[#1d5b9e] hover:underline">View all</button>
          </div>
          <ul className="divide-y divide-[#edf1f5]">
            {role.activities.map((activity) => (
              <li key={activity} className="flex items-center justify-between gap-4 py-4 text-sm text-[#52657d]">
                <span>{activity}</span>
                <ArrowIcon />
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg bg-[#075b78] p-7 text-white shadow-[0_5px_16px_rgba(16,45,84,0.12)]">
          <p className="text-sm font-semibold text-[#f3c45d]">Quick actions</p>
          <h2 className="mt-2 text-xl font-bold">What would you like to do?</h2>
          <div className="mt-6 grid gap-3">
            {['Create a service request', 'View team updates', 'Open reports'].map((action) => (
              <button key={action} type="button" className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-left text-sm font-semibold transition hover:bg-white/20">
                {action}
                <ArrowIcon />
              </button>
            ))}
          </div>
        </section>
      </div>}
      {roleId === 'branch-manager' ? <BranchManagerDirectory /> : (
        <div className="mt-7">
          <BranchDirectory title="All branches" />
        </div>
      )}
      </>
      )}
    </DashboardLayout>
  )
}
