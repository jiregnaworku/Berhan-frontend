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

export function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

export function LogoutIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 16l4-4-4-4M18 12H9" />
    </svg>
  )
}

export function DashboardIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2`}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function UsersIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2`}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function BranchIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2`}>
      <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2L2 7h20L12 2z" />
    </svg>
  )
}

export function NetworkIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2`}>
      <rect x="2" y="2" width="6" height="6" rx="1.5" />
      <rect x="16" y="2" width="6" height="6" rx="1.5" />
      <rect x="9" y="16" width="6" height="6" rx="1.5" />
      <path d="M5 8v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M12 13v3" />
    </svg>
  )
}

export function ComputerIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2`}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  )
}

export function ShieldIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2`}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function DocumentIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2`}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

export function PreventiveIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2`}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

export function SettingsIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-2`}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function SectionIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2"><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="7" cy="6" r="1" /><circle cx="7" cy="12" r="1" /><circle cx="7" cy="18" r="1" /></svg>
}

export function SidebarButton({ active = false, onClick, icon, children, isLoading = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-all duration-150 ${
        active
          ? 'bg-[#F9A804] text-[#00246B] shadow-md font-bold'
          : 'text-white/85 hover:bg-white/10 hover:text-white'
      } disabled:cursor-wait disabled:opacity-70`}
    >
      {icon && (
        <span
          className={`shrink-0 transition-colors duration-150 ${
            active ? 'text-[#00246B]' : 'text-white/70 group-hover:text-[#F9A804]'
          }`}
        >
          {icon}
        </span>
      )}
      <span className="truncate flex-1">{children}</span>
      {isLoading && (
        <span
          className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-label="Loading"
        />
      )}
    </button>
  )
}

export function SidebarLink({ href, label, icon, active = false }) {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <a
      href={href}
      onClick={() => setIsLoading(true)}
      className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
        active
          ? 'bg-[#F9A804] text-[#00246B] shadow-md font-bold'
          : 'text-white/85 hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon && (
        <span
          className={`shrink-0 transition-colors duration-150 ${
            active ? 'text-[#00246B]' : 'text-white/70 group-hover:text-[#F9A804]'
          }`}
        >
          {icon}
        </span>
      )}
      <span className="truncate flex-1">{label}</span>
      {isLoading && (
        <span
          className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-label="Loading"
        />
      )}
    </a>
  )
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
        {toast && (
          <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex justify-end sm:left-auto sm:w-auto">
            <ToastMessage key={toast.id} toast={toast} onDismiss={() => setToast(null)} />
          </div>
        )}
        <aside className="hidden w-64 shrink-0 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col bg-[#003498] shadow-2xl">
          <div className="flex h-[5.1rem] items-center border-b border-white/10 px-5">
            <a href={role.route} className="flex items-center bg-[#F9A804] px-3 py-1.5 rounded-xl shadow-sm transition hover:brightness-105">
              <img src="/images/berhan.png" alt="Berhan Bank" className="h-9 w-auto object-contain" />
            </a>
          </div>
          <nav className="flex flex-1 flex-col gap-1.5 px-3 py-4 overflow-y-auto" aria-label="Main navigation">
            <SidebarLink href={role.route} label="Dashboard" icon={<DashboardIcon />} active={isDashboardPage} />
            {navAction}
          </nav>
          <div className="border-t border-white/10 p-3">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isSigningOut}
              className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white/80 transition-all duration-150 hover:text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="text-white/70 group-hover:text-[#F9A804] transition-colors"><LogoutIcon /></span>
              <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="border-b border-[#003498] bg-[#F9A804]">
            <div className="mx-auto flex min-h-[5.1rem] max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
              <a href={role.route} className="flex items-center lg:hidden bg-white/20 p-1.5 rounded-lg">
                <img src="/images/berhan.png" alt="Berhan Bank" className="h-9 w-auto object-contain" />
              </a>
              <div className="hidden items-center gap-3 text-sm font-bold text-[#172b4d] lg:flex">
                <SectionIcon />
                <span>{role.label}</span>
              </div>
              <div className="flex items-center gap-3 sm:gap-5">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-bold text-[#172b4d]">{roleId === 'branch-manager' && branchName ? branchName : username}</p>
                  <p className="text-xs text-[#172b4d]/80">{role.label}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#003498] text-sm font-bold text-[#F9A804] shadow-sm">
                  {username.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </header>
          <div className="border-b border-white/10 bg-[#003498] px-4 py-3 lg:hidden">
            <nav className="flex flex-wrap gap-2" aria-label="Main navigation">
              <SidebarLink href={role.route} label="Dashboard" icon={<DashboardIcon />} active={isDashboardPage} />
              {navAction}
            </nav>
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
  const navAction = (
    <SidebarButton active={activeView === 'settings'} onClick={() => setActiveView('settings')} icon={<SettingsIcon />}>
      Settings
    </SidebarButton>
  )

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