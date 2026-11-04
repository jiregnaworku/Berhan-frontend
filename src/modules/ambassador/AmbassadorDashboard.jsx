import { useState } from 'react'
import { DashboardLayout } from '../../shared/components/DashboardLayout.jsx'
import BranchDirectory from '../../shared/components/BranchDirectory.jsx'
import { BranchEntryContent } from './branchentry.jsx'
import { NetworkContent } from './network.jsx'

function AmbassadorDashboard({ username }) {
  const [activeView, setActiveView] = useState('branches')

  function showView(view) {
    setActiveView(view)
    window.history.pushState({}, '', view === 'branches' ? '/dashboard/ambassador' : `/dashboard/ambassador/${view}`)
  }

  const navAction = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => showView('branches')} className={`rounded-lg px-3 py-2 text-sm font-bold transition sm:px-4 ${activeView === 'branches' ? 'bg-black text-white' : 'bg-[#e9b949] text-[#102d54] hover:bg-[#f3c45d]'}`}>Home</button>
      <button type="button" onClick={() => showView('network')} className={`rounded-lg px-3 py-2 text-sm font-bold transition sm:px-4 ${activeView === 'network' ? 'bg-black text-white' : 'bg-[#e9b949] text-[#102d54] hover:bg-[#f3c45d]'}`}>Network</button>
      <button type="button" onClick={() => showView('add-branch')} className={`rounded-lg px-3 py-2 text-sm font-bold transition sm:px-4 ${activeView === 'add-branch' ? 'bg-black text-white' : 'bg-[#e9b949] text-[#102d54] hover:bg-[#f3c45d]'}`}>Add branch</button>
    </div>
  )

  return (
    <DashboardLayout roleId="ambassador" username={username} navAction={navAction}>
      {activeView === 'network' ? (
        <NetworkContent username={username} />
      ) : activeView === 'add-branch' ? (
        <BranchEntryContent onBack={() => showView('branches')} />
      ) : (
        <>
          <div className="mb-8">
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
