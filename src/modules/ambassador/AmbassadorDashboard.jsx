import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../shared/components/DashboardLayout.jsx'
import BranchDirectory from '../../shared/components/BranchDirectory.jsx'
import { BranchEntryContent } from './branchentry.jsx'
import { NetworkContent } from './network.jsx'
import { ComputerWorkbookContent } from './computerWorkbook.jsx'
import { KasperskyContent } from './kaspersky.jsx'
import SettingsContent from '../../shared/components/SettingsContent.jsx'
import ItRelatedInfoContent from '../../shared/components/ItRelatedInfoContent.jsx'

function AmbassadorNavButton({ view, activeView, isSwitching, onClick, children }) {
  return (
    <button type="button" onClick={() => onClick(view)} disabled={isSwitching} className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-bold transition ${activeView === view ? 'bg-[#0645b8] text-white' : 'text-[#233047] hover:bg-white hover:text-[#0645b8]'} disabled:cursor-wait disabled:opacity-70`}>
      {children}
      {isSwitching && activeView === view && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-label="Loading" />}
    </button>
  )
}

function AmbassadorDashboard({ username }) {
  const [activeView, setActiveView] = useState(window.location.pathname.endsWith('/settings') ? 'settings' : 'branches')
  const [isSwitching, setIsSwitching] = useState(false)

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
    <div className="flex flex-col items-stretch gap-1">
      <AmbassadorNavButton view="network" activeView={activeView} isSwitching={isSwitching} onClick={showView}>Network</AmbassadorNavButton>
      <AmbassadorNavButton view="add-branch" activeView={activeView} isSwitching={isSwitching} onClick={showView}>Add branch</AmbassadorNavButton>
      <AmbassadorNavButton view="computer-workbook" activeView={activeView} isSwitching={isSwitching} onClick={showView}>Computers</AmbassadorNavButton>
      <AmbassadorNavButton view="kaspersky" activeView={activeView} isSwitching={isSwitching} onClick={showView}>Kaspersky Status</AmbassadorNavButton>
      <AmbassadorNavButton view="it-related-info" activeView={activeView} isSwitching={isSwitching} onClick={showView}>IT Related Info</AmbassadorNavButton>
      <AmbassadorNavButton view="settings" activeView={activeView} isSwitching={isSwitching} onClick={showView}>Settings</AmbassadorNavButton>
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
      ) : activeView === 'kaspersky' ? (
        <KasperskyContent username={username} />
      ) : activeView === 'settings' ? (
        <SettingsContent username={username} />
      ) : activeView === 'it-related-info' ? (
        <ItRelatedInfoContent />
      ) : (
        <>
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
