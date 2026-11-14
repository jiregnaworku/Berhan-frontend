import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { DashboardLayout } from '../../shared/components/DashboardLayout.jsx'
import { useDashboardToast } from '../../shared/components/dashboardToast.js'
import { fetchBranches } from './branchStore.js'
import { fetchAllWorkbookRows } from './computerWorkbookStore.js'

const MAX_OPTIONS = 50
const PAGE_SIZE = 30

const norm = (value) => String(value ?? '').toLowerCase().trim()
const tokensOf = (query) => norm(query).split(/\s+/).filter(Boolean)

const fieldClass =
  'min-h-10 w-full rounded-xl border border-[#e3e8ef] bg-white px-3 text-sm text-[#1f2937] outline-none transition placeholder:text-[#a0aec0] focus:border-[#003498] focus:ring-2 focus:ring-[#003498]/15'

/**
 * Fast search over pre-indexed options: every typed word must match (any order),
 * exact / starting-with-code matches come first. Only the best MAX_OPTIONS are returned.
 */
function searchOptions(options, query, limit) {
  const tokens = tokensOf(query)
  if (tokens.length === 0) return { items: options.slice(0, limit), total: options.length }

  const scored = []
  for (const option of options) {
    let score = 0
    let matches = true
    for (const token of tokens) {
      if (!option.key.includes(token)) {
        matches = false
        break
      }
      if (option.code === token) score += 100
      else if (option.code.startsWith(token)) score += 60
      else if (option.name.startsWith(token)) score += 40
      else score += 10
    }
    if (matches) scored.push({ option, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return { items: scored.slice(0, limit).map((entry) => entry.option), total: scored.length }
}

function SearchSelect({ label, placeholder, options, value, onChange, emptyText = 'No matches' }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef(null)
  const listRef = useRef(null)
  const deferredQuery = useDeferredValue(query)

  const selected = useMemo(() => options.find((option) => option.id === value), [options, value])
  const { items, total } = useMemo(
    () => searchOptions(options, deferredQuery, MAX_OPTIONS),
    [options, deferredQuery],
  )

  useEffect(() => {
    if (!isOpen) return undefined
    function handleOutside(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [isOpen])

  useEffect(() => setActiveIndex(0), [deferredQuery, isOpen])

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function choose(option) {
    onChange(option.id)
    setIsOpen(false)
    setQuery('')
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((index) => Math.min(index + 1, Math.max(items.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && isOpen && items[activeIndex]) {
      event.preventDefault()
      choose(items[activeIndex])
    } else if (event.key === 'Escape') {
      setIsOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <span className="mb-1 block text-xs font-semibold text-[#52657d]">{label}</span>
      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          autoComplete="off"
          value={isOpen ? query : selected?.title || ''}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          className={`${fieldClass} pr-10`}
        />
        {value && !isOpen ? (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={`Clear ${label}`}
            className="absolute right-2 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-[#8a98ab] transition hover:bg-[#f1f4f9] hover:text-[#1f2937]"
          >
            ✕
          </button>
        ) : (
          <span className="pointer-events-none absolute right-3 top-2.5 text-[#8a98ab]">▾</span>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-[#e3e8ef] bg-white shadow-xl">
          <ul ref={listRef} role="listbox" className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-[#718096]">{emptyText}</li>
            ) : (
              items.map((option, index) => (
                <li key={option.id} role="option" aria-selected={option.id === value}>
                  <button
                    type="button"
                    data-active={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(option)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                      index === activeIndex ? 'bg-[#eef3fc]' : ''
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm ${
                          option.id === value ? 'font-semibold text-[#003498]' : 'font-medium text-[#102d54]'
                        }`}
                      >
                        {option.title}
                      </span>
                      {option.subtitle && <span className="block truncate text-xs text-[#8a98ab]">{option.subtitle}</span>}
                    </span>
                    {option.badge && (
                      <span className="shrink-0 rounded-full bg-[#f1f4f9] px-2.5 py-0.5 font-mono text-xs text-[#52657d]">
                        {option.badge}
                      </span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
          {total > items.length && (
            <p className="border-t border-[#f0f3f7] bg-[#f8fafc] px-4 py-2 text-xs text-[#718096]">
              Showing {items.length} of {total}. Keep typing to narrow it down.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Tag({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#f1f4f9] px-2.5 py-0.5 text-xs font-medium text-[#52657d]">
      {children}
    </span>
  )
}

function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-[#8a98ab]">{label}</p>
      <p className="truncate font-mono text-xs text-[#1f2937]">{children}</p>
    </div>
  )
}

export function OthersComputerContent({ onBack, username, initialBranchId = '' }) {
  const { notify } = useDashboardToast()
  const [branches, setBranches] = useState([])
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [searchText, setSearchText] = useState('')
  const [filterKaspersky, setFilterKaspersky] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const deferredSearch = useDeferredValue(searchText)

  useEffect(() => {
    Promise.all([fetchBranches().catch(() => []), fetchAllWorkbookRows()])
      .then(([loadedBranches, loadedRows]) => {
        setBranches(loadedBranches)
        setRows(loadedRows)
      })
      .catch((loadError) => {
        setError(loadError.message)
        notify(loadError.message)
      })
      .finally(() => setIsLoading(false))
  }, [notify])

  // One pass over the data builds every lookup used by the page
  const bank = useMemo(() => {
    const branchMap = new Map()
    for (const branch of branches) {
      branchMap.set(String(branch.id), {
        id: String(branch.id),
        name: branch.branchName || '',
        code: branch.branchCode || '',
        location: branch.branchLocation || '',
        ownerKey: branch.createdBy || '',
        ownerName: '',
        rows: [],
      })
    }

    const ownerNames = new Map()
    for (const row of rows) {
      const id = String(row.branchId)
      let branch = branchMap.get(id)
      if (!branch) {
        branch = {
          id,
          name: row.branchName || 'Unknown branch',
          code: row.branchCode || '',
          location: row.branchLocation || '',
          ownerKey: '',
          ownerName: '',
          rows: [],
        }
        branchMap.set(id, branch)
      }
      if (!branch.ownerKey) branch.ownerKey = row.ambassadorUsername || row.ambassadorName || ''
      if (row.ambassadorName && !ownerNames.has(branch.ownerKey)) ownerNames.set(branch.ownerKey, row.ambassadorName)
      branch.rows.push({
        ...row,
        _k: norm(`${row.ipAddress} ${row.computerName} ${row.networkAgent} ${row.endpoint}`),
      })
    }

    const ownerMap = new Map()
    const otherBranches = []
    for (const branch of branchMap.values()) {
      const ownerKey = branch.ownerKey || 'unknown'
      if (ownerKey === username) continue // this page is for other ambassadors' computers
      branch.ownerKey = ownerKey
      branch.ownerName = ownerNames.get(ownerKey) || (ownerKey === 'unknown' ? 'Unknown ambassador' : ownerKey)
      let owner = ownerMap.get(ownerKey)
      if (!owner) {
        owner = { key: ownerKey, name: branch.ownerName, branches: [], computerCount: 0 }
        ownerMap.set(ownerKey, owner)
      }
      owner.branches.push(branch)
      owner.computerCount += branch.rows.length
      otherBranches.push(branch)
    }

    const owners = Array.from(ownerMap.values()).sort((a, b) => a.name.localeCompare(b.name))
    for (const owner of owners) owner.branches.sort((a, b) => a.name.localeCompare(b.name))
    otherBranches.sort((a, b) => a.name.localeCompare(b.name))

    return {
      owners,
      ownerMap,
      branchMap,
      branches: otherBranches,
      totalComputers: otherBranches.reduce((sum, branch) => sum + branch.rows.length, 0),
    }
  }, [branches, rows, username])

  // When opened from a branch popup, pre-select that branch and its ambassador (once)
  const appliedInitialRef = useRef(false)
  useEffect(() => {
    if (appliedInitialRef.current || !initialBranchId || isLoading) return
    const branch = bank.branchMap.get(String(initialBranchId))
    if (branch) {
      setOwnerId(branch.ownerKey)
      setBranchId(branch.id)
    }
    appliedInitialRef.current = true
  }, [initialBranchId, isLoading, bank])

  const ambassadorOptions = useMemo(
    () =>
      bank.owners.map((owner) => ({
        id: owner.key,
        title: owner.name,
        subtitle: `${owner.branches.length} ${owner.branches.length === 1 ? 'branch' : 'branches'} • ${owner.computerCount} computers`,
        badge: '',
        name: norm(owner.name),
        code: '',
        key: norm(`${owner.name} ${owner.key}`),
      })),
    [bank.owners],
  )

  const selectedOwner = ownerId ? bank.ownerMap.get(ownerId) : null

  const branchOptions = useMemo(() => {
    const source = selectedOwner ? selectedOwner.branches : bank.branches
    return source.map((branch) => ({
      id: branch.id,
      title: branch.name,
      subtitle: `${selectedOwner ? '' : `${branch.ownerName} • `}${branch.rows.length} computers`,
      badge: branch.code,
      name: norm(branch.name),
      code: norm(branch.code),
      key: norm(`${branch.name} ${branch.code} ${branch.location} ${selectedOwner ? '' : branch.ownerName}`),
    }))
  }, [bank.branches, selectedOwner])

  function handleOwnerChange(id) {
    setOwnerId(id)
    setBranchId('')
  }

  function handleBranchChange(id) {
    setBranchId(id)
    if (id) {
      const branch = bank.branchMap.get(id)
      if (branch && branch.ownerKey !== ownerId) setOwnerId(branch.ownerKey)
    }
  }

  const visibleBranches = useMemo(() => {
    if (branchId) {
      const branch = bank.branchMap.get(branchId)
      return branch ? [branch] : []
    }
    return selectedOwner ? selectedOwner.branches : []
  }, [bank.branchMap, branchId, selectedOwner])

  const hasSelection = Boolean(ownerId || branchId)

  const flatRows = useMemo(() => {
    const tokens = tokensOf(deferredSearch)
    const out = []
    for (const branch of visibleBranches) {
      for (const row of branch.rows) {
        if (filterKaspersky && row.kasperskyStatus !== filterKaspersky) continue
        if (tokens.length && !tokens.every((token) => row._k.includes(token))) continue
        out.push({ row, branch })
      }
    }
    return out
  }, [visibleBranches, deferredSearch, filterKaspersky])

  useEffect(() => setVisibleCount(PAGE_SIZE), [ownerId, branchId, deferredSearch, filterKaspersky])

  const groups = useMemo(() => {
    const result = []
    for (const { row, branch } of flatRows.slice(0, visibleCount)) {
      const last = result[result.length - 1]
      if (last && last.branch.id === branch.id) last.items.push(row)
      else result.push({ branch, items: [row] })
    }
    return result
  }, [flatRows, visibleCount])

  const updatedCount = flatRows.filter(({ row }) => row.kasperskyStatus === 'Updated').length
  const needsUpdateCount = flatRows.filter(({ row }) => row.kasperskyStatus === 'Not updated').length
  const hasFilters = Boolean(searchText || filterKaspersky)

  return (
    <div className="mx-auto max-w-5xl text-[#1f2937]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#102d54]">Other ambassadors' computers</h1>
          <p className="mt-1 text-sm text-[#718096]">View only. Pick an ambassador and a branch, or search by branch code or name.</p>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-full px-4 py-2 text-sm font-medium text-[#52657d] transition hover:bg-[#eef2f7]"
          >
            Back
          </button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-2xl bg-[#fdeceb] px-4 py-3 text-sm text-[#b3372f]" role="alert">
          {error}
        </p>
      )}

      {/* Pickers */}
      <div className="mb-5 grid gap-4 rounded-2xl bg-[#f6f8fb] p-4 sm:grid-cols-2">
        <SearchSelect
          label="Ambassador"
          placeholder={isLoading ? 'Loading...' : `Search ${bank.owners.length} ambassadors`}
          options={ambassadorOptions}
          value={ownerId}
          onChange={handleOwnerChange}
          emptyText="No ambassador found"
        />
        <SearchSelect
          label={selectedOwner ? `${selectedOwner.name}'s branches` : 'Branch'}
          placeholder={
            isLoading
              ? 'Loading...'
              : selectedOwner
              ? 'Type a branch name or code'
              : 'Search all branches by name or code'
          }
          options={branchOptions}
          value={branchId}
          onChange={handleBranchChange}
          emptyText="No branch found"
        />
      </div>

      {isLoading ? (
        <p className="rounded-2xl bg-[#f6f8fb] px-4 py-10 text-center text-sm text-[#718096]">
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#003498] border-t-transparent align-middle" />
          Loading computers from all branches...
        </p>
      ) : !hasSelection ? (
        <div className="rounded-2xl bg-[#f6f8fb] px-4 py-12 text-center">
          <p className="text-sm font-medium text-[#102d54]">Choose an ambassador, or type a branch code or name.</p>
          <p className="mt-1 text-xs text-[#8a98ab]">
            {bank.totalComputers} computers • {bank.branches.length} branches • {bank.owners.length} ambassadors
          </p>
        </div>
      ) : (
        <>
          {/* Filters for the computers shown */}
          <div className="mb-5 flex flex-wrap items-end gap-3">
            <div className="min-w-[14rem] flex-1">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#52657d]">Search computers</span>
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="IP, computer name or agent"
                  className={fieldClass}
                />
              </label>
            </div>
            <div className="w-44">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#52657d]">Kaspersky</span>
                <select value={filterKaspersky} onChange={(event) => setFilterKaspersky(event.target.value)} className={fieldClass}>
                  <option value="">Any status</option>
                  <option value="Updated">Updated</option>
                  <option value="Not updated">Not updated</option>
                </select>
              </label>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchText('')
                  setFilterKaspersky('')
                }}
                className="min-h-10 rounded-full px-4 text-sm font-medium text-[#003498] transition hover:bg-[#eef2f7]"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Summary */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="text-sm font-semibold text-[#102d54]">
              {branchId ? bank.branchMap.get(branchId)?.name : selectedOwner?.name}
              <span className="ml-2 font-normal text-[#8a98ab]">{flatRows.length} computers</span>
              <span className="ml-2 rounded-full bg-[#f1f4f9] px-2.5 py-0.5 text-xs font-medium text-[#52657d]">View only</span>
            </h2>
            <p className="flex items-center gap-4 text-xs text-[#52657d]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {updatedCount} up to date
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {needsUpdateCount} need an update
              </span>
            </p>
          </div>

          {flatRows.length === 0 ? (
            <p className="rounded-2xl bg-[#f6f8fb] px-4 py-10 text-center text-sm text-[#718096]">
              {hasFilters ? "No computers match what you're looking for." : 'No computers registered here yet.'}
            </p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => {
                const needUpdate = group.branch.rows.filter((r) => r.kasperskyStatus === 'Not updated').length
                return (
                  <details key={group.branch.id} open className="group overflow-hidden rounded-2xl border border-[#e8edf3] bg-white">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 transition hover:bg-[#f8fafc] [&::-webkit-details-marker]:hidden">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8eefb] text-base font-bold text-[#003498]">
                        {group.branch.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-semibold text-[#102d54]">
                          {group.branch.name}
                          {group.branch.code && (
                            <span className="ml-2 font-mono text-xs font-normal text-[#8a98ab]">{group.branch.code}</span>
                          )}
                        </span>
                        <span className="block text-xs text-[#8a98ab]">
                          {group.branch.ownerName} • {group.branch.rows.length}{' '}
                          {group.branch.rows.length === 1 ? 'computer' : 'computers'}
                        </span>
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          needUpdate === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {needUpdate === 0 ? 'All up to date' : `${needUpdate} need an update`}
                      </span>
                      <span className="text-[#8a98ab] transition group-open:rotate-180" aria-hidden="true">
                        ▾
                      </span>
                    </summary>

                    <ul className="divide-y divide-[#f0f3f7] border-t border-[#f0f3f7]">
                      {group.items.map((row) => {
                        const isUpdated = row.kasperskyStatus === 'Updated'
                        return (
                          <li key={row.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
                            <div className="min-w-[12rem] flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                  title={row.status}
                                />
                                <p className="truncate text-sm font-semibold text-[#102d54]">{row.computerName || row.ipAddress}</p>
                              </div>
                              <p className="mt-0.5 pl-[18px] font-mono text-xs text-[#8a98ab]">
                                {row.computerName ? row.ipAddress : 'No name set'}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1.5 pl-[18px]">
                                {row.computerJob && <Tag>{row.computerJob}</Tag>}
                                {row.operatingSystem && <Tag>{row.operatingSystem}</Tag>}
                                <Tag>{row.status}</Tag>
                              </div>
                            </div>

                            <div className="grid min-w-[12rem] flex-1 grid-cols-2 gap-4">
                              <Detail label="Net Agent">{row.networkAgent || '—'}</Detail>
                              <Detail label="Endpoint">{row.endpoint || '—'}</Detail>
                            </div>

                            {row.kasperskyStatus ? (
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                  isUpdated ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${isUpdated ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                {row.kasperskyStatus}
                              </span>
                            ) : (
                              <span className="text-xs italic text-gray-400">No status</span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </details>
                )
              })}

              {flatRows.length > visibleCount && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="w-full rounded-2xl bg-[#f6f8fb] py-3 text-sm font-semibold text-[#003498] transition hover:bg-[#e8eefb]"
                >
                  Show {Math.min(PAGE_SIZE, flatRows.length - visibleCount)} more ({flatRows.length - visibleCount} not shown yet)
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function OthersComputer({ username }) {
  return (
    <DashboardLayout roleId="ambassador" username={username}>
      <OthersComputerContent username={username} />
    </DashboardLayout>
  )
}

export default OthersComputer