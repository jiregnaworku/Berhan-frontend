import { roles } from '../../config/roles.js'
import { clearSession } from '../../features/auth/auth.js'
import BranchDirectory from './BranchDirectory.jsx'

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

export function DashboardLayout({ roleId, username, navAction, children }) {
  const role = roles[roleId]

  async function handleLogout() {
    await clearSession()
    window.location.assign('/login')
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#172b4d]">
      <header className="border-b border-[#e5ebf2] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <a href={role.route} className="flex items-center">
            <img src="/images/berhan.png" alt="Berhan Bank" className="h-11 w-auto object-contain" />
          </a>
          <div className="flex items-center gap-3 sm:gap-5">
            {navAction}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-[#102d54]">{username}</p>
              <p className="text-xs text-[#7b8ba1]">{role.label}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f0fa] text-sm font-bold text-[#1d5b9e]">
              {username.charAt(0).toUpperCase()}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-[#dce4ee] px-3 py-2 text-sm font-semibold text-[#52657d] transition hover:border-[#1d5b9e] hover:text-[#1d5b9e]"
            >
              <LogoutIcon />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        {children}
      </div>
    </main>
  )
}

export function DashboardContent({ roleId, username }) {
  const role = roles[roleId]

  return (
    <DashboardLayout roleId={roleId} username={username}>
      <div className="mb-9">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#e09f1f]">Dashboard</p>
        <h1 className="text-3xl font-bold text-[#102d54] sm:text-4xl">Good morning, {username}</h1>
        <p className="mt-2 text-[#718096]">{role.greeting}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {role.stats.map((stat) => (
          <section key={stat.label} className="rounded-2xl border border-[#e5ebf2] bg-white p-6 shadow-[0_8px_24px_rgba(16,45,84,0.05)]">
            <p className="text-sm font-medium text-[#718096]">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-[#102d54]">{stat.value}</p>
            <p className="mt-2 text-xs font-semibold text-[#2e8b69]">{stat.change}</p>
          </section>
        ))}
      </div>

      <div className="mt-7 grid gap-7 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-[#e5ebf2] bg-white p-6 shadow-[0_8px_24px_rgba(16,45,84,0.05)]">
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
        <section className="rounded-2xl bg-[#102d54] p-7 text-white shadow-[0_8px_24px_rgba(16,45,84,0.12)]">
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
      </div>
      <div className="mt-7">
        <BranchDirectory title="All branches" />
      </div>
    </DashboardLayout>
  )
}
