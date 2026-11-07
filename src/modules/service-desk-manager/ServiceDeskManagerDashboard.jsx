import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../shared/components/DashboardLayout.jsx'
import BranchDirectory from '../../shared/components/BranchDirectory.jsx'
import { BranchEntryContent } from '../ambassador/branchentry.jsx'
import { ComputerWorkbookContent } from '../ambassador/computerWorkbook.jsx'
import { KasperskyContent } from '../ambassador/kaspersky.jsx'
import { fetchBranches } from '../ambassador/branchStore.js'
import { CreateUser } from './createuser.jsx'
import { fetchUsers } from './userStore.js'
import SettingsContent from '../../shared/components/SettingsContent.jsx'
import ItRelatedInfoContent from '../../shared/components/ItRelatedInfoContent.jsx'
import PreventiveOperation from './priventive.jsx'

function ServiceDeskManagerDashboard({ username }) {
  const [activeView, setActiveView] = useState(window.location.pathname.endsWith('/settings') ? 'settings' : 'overview')
  const [branches, setBranches] = useState([])
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchBranches(), fetchUsers()])
      .then(([loadedBranches, loadedUsers]) => {
        setBranches(loadedBranches)
        setUsers(loadedUsers)
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setIsLoading(false))
  }, [])

  const navAction = (
    <div className="flex flex-col items-stretch gap-1">
      <button type="button" onClick={() => setActiveView('create-user')} className={`w-full rounded-lg px-4 py-3 text-left text-sm font-bold transition ${activeView === 'create-user' ? 'bg-[#0645b8] text-white' : 'text-[#233047] hover:bg-white hover:text-[#0645b8]'}`}>User Management</button>
      <button type="button" onClick={() => setActiveView('manage-branches')} className={`w-full rounded-lg px-4 py-3 text-left text-sm font-bold transition ${activeView === 'manage-branches' ? 'bg-[#0645b8] text-white' : 'text-[#233047] hover:bg-white hover:text-[#0645b8]'}`}>Branch Management</button>
      <button type="button" onClick={() => setActiveView('computers')} className={`w-full rounded-lg px-4 py-3 text-left text-sm font-bold transition ${activeView === 'computers' ? 'bg-[#0645b8] text-white' : 'text-[#233047] hover:bg-white hover:text-[#0645b8]'}`}>Computer Management</button>
      <button type="button" onClick={() => setActiveView('kaspersky')} className={`w-full rounded-lg px-4 py-3 text-left text-sm font-bold transition ${activeView === 'kaspersky' ? 'bg-[#0645b8] text-white' : 'text-[#233047] hover:bg-white hover:text-[#0645b8]'}`}>Kaspersky Status</button>
      <button type="button" onClick={() => setActiveView('it-related-info')} className={`w-full rounded-lg px-4 py-3 text-left text-sm font-bold transition ${activeView === 'it-related-info' ? 'bg-[#0645b8] text-white' : 'text-[#233047] hover:bg-white hover:text-[#0645b8]'}`}>IT Related Info</button>
      <button type="button" onClick={() => setActiveView('preventive-operations')} className={`w-full rounded-lg px-4 py-3 text-left text-sm font-bold transition ${activeView === 'preventive-operations' ? 'bg-[#0645b8] text-white' : 'text-[#233047] hover:bg-white hover:text-[#0645b8]'}`}>Preventive Operations</button>
      <button type="button" onClick={() => setActiveView('settings')} className={`w-full rounded-lg px-4 py-3 text-left text-sm font-bold transition ${activeView === 'settings' ? 'bg-[#0645b8] text-white' : 'text-[#233047] hover:bg-white hover:text-[#0645b8]'}`}>Settings</button>
    </div>
  )

  function handleCreated(user) {
    setUsers((current) => current.some((item) => item.id === user.id)
      ? current.map((item) => item.id === user.id ? user : item)
      : [user, ...current])
  }

  return (
    <DashboardLayout roleId="service-desk-manager" username={username} navAction={navAction} dashboardActive={activeView === 'overview'}>
      {activeView === 'create-user' ? <CreateUser onCreated={handleCreated} username={username} /> : activeView === 'computers' ? (
        <ComputerWorkbookContent username={username} roleId="service-desk-manager" onBack={() => setActiveView('overview')} />
      ) : activeView === 'kaspersky' ? (
        <KasperskyContent username={username} roleId="service-desk-manager" />
      ) : activeView === 'manage-branches' ? (
        <BranchEntryContent username={username} roleId="service-desk-manager" onBack={() => setActiveView('overview')} />
      ) : activeView === 'settings' ? (
        <SettingsContent username={username} />
      ) : activeView === 'it-related-info' ? (
        <ItRelatedInfoContent canManage />
      ) : activeView === 'preventive-operations' ? (
        <PreventiveOperation />
      ) : (
        <main>
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#e09f1f]">Service desk operations</p>
            <h1 className="text-3xl font-bold text-[#102d54] sm:text-4xl">Team access</h1>
            <p className="mt-2 text-[#718096]">Create and monitor the operational accounts responsible for branch support.</p>
          </div>
          {error && <p className="mb-5 rounded-lg border border-[#f2c5c2] bg-[#fff7f6] p-3 text-sm text-[#c2413b]" role="alert">{error}</p>}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Total branches', branches.length],
              ['Total users', users.length],
              ['Ambassadors', users.filter((user) => user.role === 'ambassador').length],
              ['Managers', users.filter((user) => user.role !== 'ambassador').length],
            ].map(([label, value]) => (
              <section key={label} className="rounded-lg border border-[#e0e7ec] bg-white p-5 shadow-[0_3px_10px_rgba(16,45,84,0.08)]">
                <p className="text-sm font-medium text-[#718096]">{label}</p>
                <p className="mt-3 text-3xl font-bold text-[#102d54]">{isLoading ? '—' : value}</p>
              </section>
            ))}
          </div>
          <div className="mt-7">
            <BranchDirectory title="All branches" showStats={false} />
          </div>
        </main>
      )}
    </DashboardLayout>
  )
}

export default ServiceDeskManagerDashboard
