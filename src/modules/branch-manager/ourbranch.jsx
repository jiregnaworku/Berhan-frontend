import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../shared/components/DashboardLayout.jsx'
import { fetchBranches } from '../ambassador/branchStore.js'
import { fetchWorkbookRows } from '../ambassador/computerWorkbookStore.js'
import { fetchKasperskyStatuses } from '../ambassador/kasperskyStore.js'
import { fetchProfile } from '../../shared/components/settingsStore.js'

function valueOrFallback(value) {
  return value || 'Not provided'
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-lg border border-[#dce4ee] bg-[#f7fafc] p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#61758c]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#243b53]">{valueOrFallback(value)}</p>
    </div>
  )
}

export function OurBranchContent() {
  const [branch, setBranch] = useState(null)
  const [computers, setComputers] = useState([])
  const [statuses, setStatuses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchProfile(), fetchBranches(), fetchWorkbookRows(), fetchKasperskyStatuses()])
      .then(([profile, branches, rows, loadedStatuses]) => {
        const ownBranch = branches.find((item) => String(item.id) === String(profile.branch_id))
        setBranch(ownBranch || null)
        setComputers(rows.filter((row) => String(row.branchId) === String(profile.branch_id)))
        setStatuses(loadedStatuses.filter((status) => String(status.branchId) === String(profile.branch_id)))
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setIsLoading(false))
  }, [])

  const computerIp = (computerId) => computers.find((computer) => String(computer.id) === String(computerId))?.ipAddress || 'Unknown computer'

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#e09f1f]">Branch manager workspace</p>
        <h1 className="text-2xl font-bold text-[#102d54]">Our Branch</h1>
        <p className="mt-1 text-sm text-[#718096]">Read-only information entered by your ambassador and service desk team.</p>
      </div>
      {error && <p className="mb-5 rounded-lg border border-[#f2c5c2] bg-[#fff7f6] p-4 text-sm text-[#c2413b]" role="alert">{error}</p>}
      {isLoading ? <p className="flex items-center gap-2 rounded-lg border border-[#dce4ee] bg-white p-4 text-sm text-[#718096]" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1d5b9e] border-t-transparent" />Loading branch information...</p> : !branch ? (
        <p className="rounded-lg border border-[#dce4ee] bg-white p-4 text-sm text-[#718096]">No branch is linked to this account.</p>
      ) : (
        <>
          <section className="rounded-xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.05)]">
            <h2 className="mb-4 text-lg font-bold text-[#102d54]">{branch.branchName}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoCard label="Branch code" value={branch.branchCode} />
              <InfoCard label="Branch type" value={branch.branchType} />
              <InfoCard label="Location" value={branch.branchLocation} />
              <InfoCard label="Working computers" value={branch.workingComputers} />
              <InfoCard label="Ambassador" value={branch.ambassadorName} />
              <InfoCard label="Ambassador phone" value={branch.ambassadorPhone} />
              <InfoCard label="Manager" value={branch.managerName} />
              <InfoCard label="Manager phone" value={branch.managerPhone} />
              <InfoCard label="Backup ambassador" value={branch.backupName} />
              <InfoCard label="Backup phone" value={branch.backupPhone} />
              <InfoCard label="Assistant" value={branch.assistantName} />
              <InfoCard label="Assistant phone" value={branch.assistantMobile} />
              <InfoCard label="Display TV IP" value={branch.displayTvIp} />
              <InfoCard label="Kaspersky server IP" value={branch.kasperskyServerIp} />
            </div>
          </section>
          <section className="mt-6 overflow-hidden rounded-xl border border-[#e5ebf2] bg-white shadow-[0_8px_24px_rgba(16,45,84,0.05)]">
            <div className="border-b border-[#e4eaf0] bg-[#f4f8fa] px-4 py-3"><h2 className="text-sm font-bold text-[#075b78]">Branch computers</h2></div>
            {computers.length === 0 ? <p className="p-4 text-sm text-[#718096]">No computers have been registered yet.</p> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[55rem] text-left text-sm"><thead className="border-b border-[#dfe8ee] text-[10px] uppercase tracking-wide text-[#52657d]"><tr><th className="px-4 py-3">IP address</th><th className="px-4 py-3">Computer name</th><th className="px-4 py-3">Job</th><th className="px-4 py-3">Operating system</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-[#edf1f5]">{computers.map((computer) => <tr key={computer.id} className="text-[#52657d]"><td className="px-4 py-3 font-semibold text-[#102d54]">{computer.ipAddress}</td><td className="px-4 py-3">{valueOrFallback(computer.computerName)}</td><td className="px-4 py-3">{valueOrFallback(computer.computerJob)}</td><td className="px-4 py-3">{computer.operatingSystem}</td><td className="px-4 py-3">{computer.status}</td></tr>)}</tbody></table></div>
            )}
          </section>
          <section className="mt-6 overflow-hidden rounded-xl border border-[#e5ebf2] bg-white shadow-[0_8px_24px_rgba(16,45,84,0.05)]">
            <div className="border-b border-[#e4eaf0] bg-[#f4f8fa] px-4 py-3"><h2 className="text-sm font-bold text-[#075b78]">Kaspersky status</h2></div>
            {statuses.length === 0 ? <p className="p-4 text-sm text-[#718096]">No Kaspersky statuses have been added yet.</p> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[55rem] text-left text-sm"><thead className="border-b border-[#dfe8ee] text-[10px] uppercase tracking-wide text-[#52657d]"><tr><th className="px-4 py-3">Computer IP</th><th className="px-4 py-3">Network agent</th><th className="px-4 py-3">Endpoint</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-[#edf1f5]">{statuses.map((status) => <tr key={status.id} className="text-[#52657d]"><td className="px-4 py-3 font-semibold text-[#102d54]">{computerIp(status.computerId)}</td><td className="px-4 py-3">{status.networkAgent}</td><td className="px-4 py-3">{status.endpoint}</td><td className="px-4 py-3">{status.status}</td></tr>)}</tbody></table></div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function OurBranch({ username }) {
  return (
    <DashboardLayout roleId="branch-manager" username={username}>
      <OurBranchContent />
    </DashboardLayout>
  )
}

export default OurBranch
