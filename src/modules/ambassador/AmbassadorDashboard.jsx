import { useEffect, useState } from 'react'
import {
  DashboardLayout,
  SidebarButton,
  BranchIcon,
  NetworkIcon,
  ComputerIcon,
  DocumentIcon,
  SettingsIcon,
} from '../../shared/components/DashboardLayout.jsx'
import BranchDirectory from '../../shared/components/BranchDirectory.jsx'
import { BranchEntryContent } from './branchentry.jsx'
import { NetworkContent } from './network.jsx'
import { ComputerWorkbookContent } from './computerWorkbook.jsx'
import SettingsContent from '../../shared/components/SettingsContent.jsx'
import ItRelatedInfoContent from '../../shared/components/ItRelatedInfoContent.jsx'

function getInitialView() {
  const p = window.location.pathname
  if (p.endsWith('/settings')) return 'settings'
  if (p.endsWith('/network')) return 'network'
  if (p.endsWith('/computer-workbook')) return 'computer-workbook'
  if (p.endsWith('/branches') || p.endsWith('/add-branch')) return 'add-branch'
  return 'branches'
}

function AmbassadorDashboard({ username }) {
  const [activeView, setActiveView] = useState(getInitialView)
  const [isSwitching, setIsSwitching] = useState(false)
  const [error] = useState('')

  function showView(view) {
    setIsSwitching(true)
    setActiveView(view)
    window.history.pushState({}, '', view === 'branches' ? '/dashboard/ambassador' : `/dashboard/ambassador/${view}`)
  }

  useEffect(() => {
    if (!isSwitching) return undefined
    const timer = window.setTimeout(() => setIsSwitching(false), 350)
    return () => window.clearTimeout(timer)
  }, [activeView, isSwitching])

  const navAction = (
    <div className="flex flex-col items-stretch gap-1.5">
      <SidebarButton
        active={activeView === 'add-branch'}
        isLoading={isSwitching && activeView === 'add-branch'}
        onClick={() => showView('add-branch')}
        icon={<BranchIcon />}
      >
        Branch Management
      </SidebarButton>
      <SidebarButton
        active={activeView === 'network'}
        isLoading={isSwitching && activeView === 'network'}
        onClick={() => showView('network')}
        icon={<NetworkIcon />}
      >
        Network Management
      </SidebarButton>
      <SidebarButton
        active={activeView === 'computer-workbook'}
        isLoading={isSwitching && activeView === 'computer-workbook'}
        onClick={() => showView('computer-workbook')}
        icon={<ComputerIcon />}
      >
        Computer Management
      </SidebarButton>
      <SidebarButton
        active={activeView === 'it-related-info'}
        isLoading={isSwitching && activeView === 'it-related-info'}
        onClick={() => showView('it-related-info')}
        icon={<DocumentIcon />}
      >
        IT Related Info
      </SidebarButton>
      <SidebarButton
        active={activeView === 'settings'}
        isLoading={isSwitching && activeView === 'settings'}
        onClick={() => showView('settings')}
        icon={<SettingsIcon />}
      >
        Settings
      </SidebarButton>
    </div>
  )

  return (
    <DashboardLayout roleId="ambassador" username={username} navAction={navAction}>
      {activeView === 'network' ? (
        <NetworkContent username={username} />
      ) : activeView === 'add-branch' ? (
        <BranchEntryContent onBack={() => showView('branches')} username={username} />
      ) : activeView === 'computer-workbook' ? (
        <ComputerWorkbookContent onBack={() => showView('branches')} username={username} />
      ) : activeView === 'settings' ? (
        <SettingsContent username={username} />
      ) : activeView === 'it-related-info' ? (
        <ItRelatedInfoContent />
      ) : (
        <>
          {error && <p className="mb-5 rounded-lg border border-[#f2c5c2] bg-[#fff7f6] p-3 text-sm text-[#c2413b]" role="alert">{error}</p>}
          <div className="mb-4">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#e09f1f]">Ambassador workspace</p>
            <h1 className="text-3xl font-bold text-[#102d54] sm:text-4xl">My branches</h1>
            <p className="mt-2 text-[#718096]">Branches assigned to you are listed below.</p>
          </div>
          <BranchDirectory title="All branches" />
        </>
      )}
    </DashboardLayout>
  )
}

export default AmbassadorDashboard