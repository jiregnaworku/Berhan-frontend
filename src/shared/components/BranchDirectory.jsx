import { useEffect, useMemo, useState } from 'react'
import { fetchBranches } from '../../modules/ambassador/branchStore.js'

function IpCard({ label, value }) {
  return (
    <div className="rounded-md border border-[#d8e2eb] bg-[#f7fafc] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#61758c]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#243b53]">{value || 'Not provided'}</p>
    </div>
  )
}

function BranchDirectory({ title = 'All branches', showStats = true }) {
  const [branches, setBranches] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('All Types')
  const [selectedAmbassador, setSelectedAmbassador] = useState('All Ambassadors')

  useEffect(() => {
    let isMounted = true

    fetchBranches()
      .then((loadedBranches) => {
        if (isMounted) setBranches(loadedBranches)
      })
      .catch(() => {
        if (isMounted) setError('Unable to load branches. Please refresh and try again.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedBranch) return undefined

    function handleEscape(event) {
      if (event.key === 'Escape') setSelectedBranch(null)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedBranch])

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

  const ambassadors = useMemo(
    () => [...new Set(branches.map((branch) => branch.ambassadorName).filter(Boolean))].sort(),
    [branches],
  )

  const filteredBranches = useMemo(() => {
    const query = search.trim().toLowerCase()

    return branches.filter((branch) => {
      const matchesSearch = !query || [
        branch.branchName,
        branch.branchLocation,
        branch.ambassadorName,
        branch.managerName,
      ].some((value) => value?.toLowerCase().includes(query))
      const matchesType = selectedType === 'All Types' || branch.branchType === selectedType
      const matchesAmbassador = selectedAmbassador === 'All Ambassadors'
        || branch.ambassadorName === selectedAmbassador

      return matchesSearch && matchesType && matchesAmbassador
    })
  }, [branches, search, selectedType, selectedAmbassador])

  const stats = [
    ['Total Branches', branches.length],
    ['Ambassadors', ambassadors.length],
    ['Districts', new Set(branches.map((branch) => branch.branchLocation).filter(Boolean)).size],
    ['Showing', filteredBranches.length],
  ]

  if (error) {
    return <p className="rounded-xl border border-[#f2c5c2] bg-[#fff7f6] p-4 text-sm text-[#c2413b]" role="alert">{error}</p>
  }

  return (
    <section>
      {isLoading && (
        <div className="mb-4 h-1 overflow-hidden rounded-full bg-[#dfe8f1]" role="status" aria-label="Loading branches">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-[#1d5b9e]" />
        </div>
      )}
      {showStats && <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[#e0e7ec] bg-white px-4 py-4 shadow-[0_3px_10px_rgba(16,45,84,0.08)]">
            <p className="text-2xl font-bold text-[#075b78]">{value}</p>
            <p className="mt-1 text-[11px] font-medium text-[#52657d]">{label}</p>
          </div>
        ))}
      </div>}
      <div className="mb-4 rounded-lg border border-[#e0e7ec] bg-white p-4 shadow-[0_3px_10px_rgba(16,45,84,0.08)]">
        <div className="grid gap-3 md:grid-cols-[minmax(14rem,1.5fr)_minmax(10rem,0.75fr)_minmax(12rem,0.85fr)]">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-[#52657d]">Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search branches, locations..."
              aria-label="Search branches"
              className="h-9 w-full rounded-md border border-[#d6e0ea] px-3 text-xs text-[#172b4d] outline-none focus:border-[#1d5b9e] focus:ring-2 focus:ring-[#1d5b9e]/[0.15]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-[#52657d]">Type</span>
            <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)} className="h-9 w-full rounded-md border border-[#d6e0ea] bg-white px-3 text-xs text-[#172b4d] outline-none focus:border-[#1d5b9e]">
              <option>All Types</option>
              <option>Branch</option>
              <option>District</option>
              <option>Head office</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-[#52657d]">Ambassador</span>
            <select value={selectedAmbassador} onChange={(event) => setSelectedAmbassador(event.target.value)} className="h-9 w-full rounded-md border border-[#d6e0ea] bg-white px-3 text-xs text-[#172b4d] outline-none focus:border-[#1d5b9e]">
              <option>All Ambassadors</option>
              {ambassadors.map((ambassador) => <option key={ambassador}>{ambassador}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-[#e0e7ec] bg-white shadow-[0_3px_10px_rgba(16,45,84,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e4eaf0] px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#075b78]">{title}</h2>
            <span className="text-[11px] text-[#718096]">· click a branch row to see contact details</span>
          </div>
          <span className="text-[11px] text-[#52657d]">Showing {filteredBranches.length} of {branches.length} entries</span>
        </div>
        {isLoading ? (
          <p className="px-4 py-8 text-sm text-[#718096]">Loading branches...</p>
        ) : filteredBranches.length === 0 ? (
          <p className="px-4 py-8 text-sm text-[#718096]">{branches.length ? 'No branches match your search.' : 'No branches have been added yet.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[50rem]">
              <div className="grid grid-cols-[3rem_1.3fr_0.6fr_1.5fr_1fr_1fr_0.7fr] gap-3 border-b border-[#dfe8ee] bg-[#f4f8fa] px-4 py-2.5 text-[10px] font-medium uppercase tracking-wide text-[#52657d]">
                <span>#</span><span>Branch name</span><span>Code</span><span>City / location</span><span>Ambassador</span><span>Backup</span><span>Type</span>
              </div>
              {filteredBranches.map((branch, index) => (
                <div key={branch.id} className="border-b border-[#edf1f5] last:border-0">
                  <div
                    role="button"
                    tabIndex="0"
                    aria-haspopup="dialog"
                    onClick={() => toggleBranch(branch.id)}
                    onKeyDown={(event) => handleRowKeyDown(event, branch.id)}
                    className="grid cursor-pointer grid-cols-[3rem_1.3fr_0.6fr_1.5fr_1fr_1fr_0.7fr] gap-3 px-4 py-3 text-xs text-[#52657d] transition hover:bg-[#f7faff] focus:bg-[#f7faff] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#1d5b9e]"
                  >
                    <span>{index + 1}</span>
                    <strong className="text-[#102d54]">{branch.branchName}</strong>
                    <span className="w-fit rounded bg-[#e5faf3] px-2 py-1 text-[10px] font-bold text-[#168568]">{valueOrFallback(branch.branchCode)}</span>
                    <span>{valueOrFallback(branch.branchLocation)}</span>
                    <span className="w-fit rounded bg-[#e0efff] px-2 py-1 text-[10px] font-bold text-[#2872b9]">{valueOrFallback(branch.ambassadorName)}</span>
                    <span className="w-fit rounded bg-[#fff4d8] px-2 py-1 text-[10px] font-bold text-[#a66a00]">{valueOrFallback(branch.backupName)}</span>
                    <span className="w-fit rounded bg-[#edf2f7] px-2 py-1 text-[10px] text-[#52657d]">{valueOrFallback(branch.branchType)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl"
            tabIndex="-1"
          >
            <div className="flex items-start justify-between gap-4 bg-[#075878] px-4 py-3 text-white">
              <div>
                <h2 id="branch-details-title" className="text-sm font-bold uppercase">{selectedBranch.branchName}</h2>
                <p className="mt-1 text-[10px] text-white/90">
                  Code {valueOrFallback(selectedBranch.branchCode)} · {valueOrFallback(selectedBranch.branchType)} · {valueOrFallback(selectedBranch.branchLocation)}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedBranch(null)} aria-label="Close branch details" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-lg leading-none text-white hover:bg-white/30">×</button>
            </div>
            <div className="space-y-4 bg-white px-4 py-3">
              <section>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#61758c]">IT ambassador</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    ['Ambassador', selectedBranch.ambassadorName, selectedBranch.ambassadorPhone],
                    ['Backup', selectedBranch.backupName, selectedBranch.backupPhone],
                  ].map(([label, name, phone]) => (
                    <div key={label} className="rounded-md border border-[#d8e2eb] bg-[#f7fafc] p-3">
                      <p className="text-[10px] text-[#61758c]">{label}</p>
                      <p className="mt-1 text-xs font-bold text-[#243b53]">{valueOrFallback(name)}</p>
                      <span className="mt-2 inline-flex rounded border border-[#d8e2eb] bg-white px-2 py-1 text-[10px] font-semibold text-[#285776]">
                        MOBILE&nbsp; {valueOrFallback(phone)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#61758c]">Branch manager</p>
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                  <div className="rounded-md border border-[#d8e2eb] bg-[#f7fafc] p-3">
                    <p className="text-xs font-bold text-[#243b53]">{valueOrFallback(selectedBranch.managerName)}</p>
                    <p className="mt-1 text-[10px] text-[#61758c]">Branch Manager</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded border border-[#d8e2eb] bg-white px-2 py-1 text-[10px] font-semibold text-[#285776]">DIRECT&nbsp; {valueOrFallback(selectedBranch.managerPhone)}</span>
                    </div>
                  </div>
                  <IpCard label="Display TV IP" value={selectedBranch.displayTvIp} />
                </div>
              </section>
              <section>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#61758c]">Assistant</p>
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                  <div className="rounded-md border border-[#d8e2eb] bg-[#f7fafc] p-3">
                    <p className="text-xs font-bold text-[#243b53]">{valueOrFallback(selectedBranch.assistantName)}</p>
                    <p className="mt-1 text-[10px] text-[#61758c]">Assistant Branch Manager</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded border border-[#d8e2eb] bg-white px-2 py-1 text-[10px] font-semibold text-[#285776]">MOBILE&nbsp; {valueOrFallback(selectedBranch.assistantMobile)}</span>
                    </div>
                  </div>
                  <IpCard label="Kaspersky Server IP" value={selectedBranch.kasperskyServerIp} />
                </div>
              </section>
              <p className="text-[10px] text-[#61758c]">Working computers: <strong>{selectedBranch.workingComputers}</strong></p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default BranchDirectory
