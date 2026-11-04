import { useEffect, useState } from 'react'
import { fetchBranches } from '../../modules/ambassador/branchStore.js'

function BranchDirectory({ title = 'All branches' }) {
  const [branches, setBranches] = useState([])
  const [error, setError] = useState('')
  const [selectedBranch, setSelectedBranch] = useState(null)

  useEffect(() => {
    fetchBranches().then(setBranches).catch(() => {
      setError('Unable to load branches. Please refresh and try again.')
    })
  }, [])

  useEffect(() => {
    if (!selectedBranch) return undefined

    function handleEscape(event) {
      if (event.key === 'Escape') setSelectedBranch(null)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedBranch])

  if (error) {
    return <p className="rounded-xl border border-[#f2c5c2] bg-[#fff7f6] p-4 text-sm text-[#c2413b]" role="alert">{error}</p>
  }

  function toggleBranch(branchId) {
    setSelectedBranch(branches.find((branch) => branch.id === branchId) || null)
  }

  function handleRowKeyDown(event, branchId) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleBranch(branchId)
    }
  }

  function valueOrFallback(value) {
    return value || 'Not provided'
  }

  return (
    <section className="rounded-2xl border border-[#e5ebf2] bg-white shadow-[0_8px_24px_rgba(16,45,84,0.05)]">
      <div className="border-b border-[#edf1f5] px-5 py-4">
        <h2 className="text-lg font-bold text-[#102d54]">{title}</h2>
      </div>
      {branches.length === 0 ? (
        <p className="px-5 py-8 text-sm text-[#718096]">No branches have been added yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[48rem]">
            <div className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_0.8fr_0.5fr] gap-4 border-b border-[#edf1f5] bg-[#fbfcfe] px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#718096]">
              <span>Branch</span><span>Location</span><span>Manager</span><span>Ambassador</span><span>Computers</span>
              <span>Details</span>
            </div>
            {branches.map((branch) => (
              <div key={branch.id} className="border-b border-[#edf1f5] last:border-0">
                <div
                  role="button"
                  tabIndex="0"
                  aria-haspopup="dialog"
                  onClick={() => toggleBranch(branch.id)}
                  onKeyDown={(event) => handleRowKeyDown(event, branch.id)}
                  className="grid cursor-pointer grid-cols-[1.2fr_1.2fr_1fr_1fr_0.8fr_0.5fr] gap-4 px-5 py-4 text-sm text-[#52657d] transition hover:bg-[#f7faff] focus:bg-[#f7faff] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#1d5b9e]"
                >
                  <strong className="text-[#102d54]">{branch.branchName}</strong>
                  <span>{valueOrFallback(branch.branchLocation)}</span>
                  <span>{valueOrFallback(branch.managerName)}</span>
                  <span>{valueOrFallback(branch.ambassadorName)}</span>
                  <span>{branch.workingComputers}</span>
                  <span className="font-bold text-[#1d5b9e]">View</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {selectedBranch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#102d54]/60 p-4"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedBranch(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="branch-details-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            tabIndex="-1"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e09f1f]">Branch details</p>
                <h2 id="branch-details-title" className="mt-1 text-2xl font-bold text-[#102d54]">{selectedBranch.branchName}</h2>
              </div>
              <button type="button" onClick={() => setSelectedBranch(null)} aria-label="Close branch details" className="rounded-lg border border-[#dce4ee] px-3 py-1 text-xl leading-none text-[#52657d] hover:border-[#1d5b9e] hover:text-[#1d5b9e]">×</button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Branch location / address', selectedBranch.branchLocation],
                ['Ambassador name', selectedBranch.ambassadorName],
                ['Ambassador mobile', selectedBranch.ambassadorPhone],
                ['Backup name', selectedBranch.backupName],
                ['Backup mobile', selectedBranch.backupPhone],
                ['Branch manager name', selectedBranch.managerName],
                ['Branch manager direct phone', selectedBranch.managerPhone],
                ['Assistant name', selectedBranch.assistantName],
                ['Assistant mobile', selectedBranch.assistantMobile],
                ['Display TV IP address', selectedBranch.displayTvIp],
                ['Kaspersky server IP address', selectedBranch.kasperskyServerIp],
                ['Working computers', selectedBranch.workingComputers],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-[#fbfcfe] p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#718096]">{label}</p>
                  <p className="mt-1 text-sm text-[#52657d]">{valueOrFallback(value)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default BranchDirectory
