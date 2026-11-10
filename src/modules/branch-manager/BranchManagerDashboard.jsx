import { useEffect, useState } from 'react'
import {
  DashboardLayout,
  SidebarButton,
  BranchIcon,
  DocumentIcon,
  SettingsIcon,
} from '../../shared/components/DashboardLayout.jsx'
import BranchManagerDirectory from '../../shared/components/BranchManagerDirectory.jsx'
import { roles } from '../../config/roles.js'
import ItRelatedInfoContent from '../../shared/components/ItRelatedInfoContent.jsx'
import { OurBranchContent } from './ourbranch.jsx'
import SettingsContent from '../../shared/components/SettingsContent.jsx'
import { fetchBranches } from '../ambassador/branchStore.js'
import { fetchWorkbookRows } from '../ambassador/computerWorkbookStore.js'
import { fetchProfile } from '../../shared/components/settingsStore.js'

function BranchManagerDashboard({ username }) {
  const [activeView, setActiveView] = useState('overview')
  const [branchName, setBranchName] = useState('')
  const navAction = (
    <div className="flex flex-col items-stretch gap-1.5">
      <SidebarButton
        active={activeView === 'our-branch'}
        onClick={() => setActiveView('our-branch')}
        icon={<BranchIcon />}
      >
        My Branch Info
      </SidebarButton>
      <SidebarButton
        active={activeView === 'it-related-info'}
        onClick={() => setActiveView('it-related-info')}
        icon={<DocumentIcon />}
      >
        IT Related Info
      </SidebarButton>
      <SidebarButton
        active={activeView === 'settings'}
        onClick={() => setActiveView('settings')}
        icon={<SettingsIcon />}
      >
        Settings
      </SidebarButton>
    </div>
  )

  useEffect(() => {
    Promise.all([fetchProfile(), fetchBranches()])
      .then(([profile, branches]) => {
        const ownBranch = branches.find((item) => String(item.id) === String(profile.branch_id))
        setBranchName(ownBranch?.branchName || '')
      })
      .catch(() => setBranchName(''))
  }, [])

  return (
    <DashboardLayout roleId="branch-manager" username={username} branchName={branchName} navAction={navAction} dashboardActive={activeView === 'overview'}>
      {activeView === 'our-branch' ? <OurBranchContent /> : activeView === 'settings' ? <SettingsContent username={username} /> : activeView === 'it-related-info' ? <ItRelatedInfoContent /> : <BranchManagerOverview username={username} />}
    </DashboardLayout>
  )
}

function BranchManagerOverview({ username }) {
  const role = roles['branch-manager']
  const [counts, setCounts] = useState({ branches: 0, computers: 0, activeComputers: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchProfile(), fetchBranches(), fetchWorkbookRows()])
      .then(([profile, branches, computers]) => {
        const branchComputers = computers.filter((computer) => String(computer.branchId) === String(profile.branch_id))
        setCounts({
          branches: branches.length,
          computers: branchComputers.length,
          activeComputers: branchComputers.filter((computer) => computer.status === 'Active').length,
        })
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <>
      <div className="mb-9">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#e09f1f]">Branch manager workspace</p>
        <p className="mt-2 text-[#718096]">{role.greeting}</p>
      </div>
      {error && <p className="mb-5 rounded-lg border border-[#f2c5c2] bg-[#fff7f6] p-3 text-sm text-[#c2413b]" role="alert">{error}</p>}
      <div className="grid gap-5 md:grid-cols-3">
        {[
          ['Total branches', counts.branches, 'All Berhan Bank branches'],
          ['Total computers', counts.computers, 'Registered across branches'],
          ['Active computers', counts.activeComputers, 'Currently marked active'],
        ].map(([label, value, change]) => (
          <section key={label} className="rounded-lg border border-[#e0e7ec] bg-white p-5 shadow-[0_3px_10px_rgba(16,45,84,0.08)]">
            <p className="text-sm font-medium text-[#718096]">{label}</p>
            <p className="mt-3 text-3xl font-bold text-[#102d54]">{isLoading ? '—' : value}</p>
            <p className="mt-2 text-xs font-semibold text-[#2e8b69]">{change}</p>
          </section>
        ))}
      </div>
      <BranchManagerDirectory />
      <p className="mt-3 text-xs text-[#718096]">Signed in as {username}.</p>
    </>
  )
}

export default BranchManagerDashboard
