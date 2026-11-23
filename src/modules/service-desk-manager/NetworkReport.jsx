import { useEffect, useMemo, useRef, useState } from 'react'
import { useDashboardToast } from '../../shared/components/dashboardToast.js'
import { fetchBranches } from '../ambassador/branchStore.js'
import { fetchNetworkRegistrations } from '../ambassador/networkStore.js'
import { fetchUsers } from './userStore.js'
import {
  buildBranchRows,
  countIncidents,
  displayName,
  downloadNetworkWorkbook,
  firstOfMonth,
  formatRangeLabel,
  isFullMonth,
  lastOfMonth,
  remarkText,
  slug,
} from './networkReportExcel.js'

const MAX_PICKER_OPTIONS = 40
const norm = (value) => String(value ?? '').toLowerCase().trim()

const fieldClass =
  'min-h-10 w-full rounded-xl border border-[#e3e8ef] bg-white px-3 text-sm text-[#1f2937] outline-none transition placeholder:text-[#a0aec0] focus:border-[#003498] focus:ring-2 focus:ring-[#003498]/15'

const scopeOptions = [
  { value: 'all', label: 'All ambassadors', hint: 'Every branch, one sheet per ambassador.' },
  { value: 'ambassador', label: 'One ambassador', hint: 'All the branches of one ambassador.' },
  { value: 'branch', label: 'One branch', hint: 'Pick a single branch.' },
]

// Type a branch name or code to find it quickly, even with hundreds of branches
function BranchSearch({ options, value, onChange }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const selected = options.find((option) => option.id === value)
  const matches = useMemo(() => {
    const tokens = norm(query).split(/\s+/).filter(Boolean)
    const list = tokens.length ? options.filter((option) => tokens.every((token) => option.key.includes(token))) : options
    return { items: list.slice(0, MAX_PICKER_OPTIONS), total: list.length }
  }, [options, query])

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

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        autoComplete="off"
        value={isOpen ? query : selected ? selected.title : ''}
        placeholder="Search a branch by name or code"
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        className={`${fieldClass} pr-9`}
      />
      {value && !isOpen ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear branch"
          className="absolute right-2 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-[#8a98ab] transition hover:bg-[#f1f4f9]"
        >
          ✕
        </button>
      ) : (
        <span className="pointer-events-none absolute right-3 top-2.5 text-[#8a98ab]">▾</span>
      )}

      {isOpen && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-[#e3e8ef] bg-white shadow-xl">
          <ul className="max-h-64 overflow-y-auto">
            {matches.items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-[#718096]">No branch found</li>
            ) : (
              matches.items.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.id)
                      setIsOpen(false)
                      setQuery('')
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-[#eef3fc]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[#102d54]">{option.title}</span>
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
          {matches.total > matches.items.length && (
            <p className="border-t border-[#f0f3f7] bg-[#f8fafc] px-4 py-2 text-xs text-[#718096]">
              Showing {matches.items.length} of {matches.total}. Keep typing to narrow it down.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// Reports only: nothing on this page creates, edits or deletes data
export function NetworkReportContent({ username, onBack }) {
  const { notify } = useDashboardToast()
  const [registrations, setRegistrations] = useState([])
  const [branches, setBranches] = useState([])
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [from, setFrom] = useState(() => firstOfMonth(0))
  const [to, setTo] = useState(() => lastOfMonth(0))
  const [scope, setScope] = useState('all')
  const [ownerKey, setOwnerKey] = useState('')
  const [branchId, setBranchId] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    Promise.all([fetchNetworkRegistrations(), fetchBranches(), fetchUsers().catch(() => [])])
      .then(([loadedRegistrations, loadedBranches, loadedUsers]) => {
        setRegistrations(loadedRegistrations)
        setBranches(loadedBranches)
        setUsers(loadedUsers)
      })
      .catch((loadError) => {
        setError(loadError.message)
        notify(loadError.message)
      })
      .finally(() => setIsLoading(false))
  }, [notify])

  // username -> full name (falls back to a tidied-up username)
  const userNames = useMemo(() => {
    const map = new Map()
    for (const user of users) {
      const key = norm(user.username ?? user.userName)
      const name = user.name ?? user.fullName ?? user.full_name
      if (key && name) map.set(key, name)
    }
    return map
  }, [users])

  // Usernames of the users whose role is ambassador (empty if the user list could not be loaded)
  const ambassadorKeys = useMemo(
    () => new Set(users.filter((user) => user.role === 'ambassador').map((user) => norm(user.username ?? user.userName)).filter(Boolean)),
    [users],
  )

  const owners = useMemo(() => {
    const map = new Map()
    const add = (value) => {
      const key = String(value || '').trim()
      if (key && !map.has(key)) map.set(key, { key, name: userNames.get(key.toLowerCase()) || displayName(key) })
    }
    // A branch owner only counts as an ambassador when their role is ambassador;
    // everyone who registered an incident is always kept, so no incident is left out.
    branches.forEach((branch) => {
      if (ambassadorKeys.size === 0 || ambassadorKeys.has(norm(branch.createdBy))) add(branch.createdBy)
    })
    registrations.forEach((entry) => add(entry.createdBy))
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [branches, registrations, userNames, ambassadorKeys])

  const ownerNameByKey = useMemo(() => new Map(owners.map((owner) => [owner.key, owner.name])), [owners])

  const branchOptions = useMemo(
    () =>
      branches
        .filter((branch) => !ownerKey || branch.createdBy === ownerKey)
        .map((branch) => ({
          id: String(branch.id),
          title: branch.branchName,
          subtitle: ownerNameByKey.get(branch.createdBy) || '',
          badge: branch.branchCode || '',
          key: norm(`${branch.branchName} ${branch.branchCode} ${ownerNameByKey.get(branch.createdBy) || ''}`),
        }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [branches, ownerKey, ownerNameByKey],
  )

  const selectedBranch = branches.find((branch) => String(branch.id) === String(branchId))

  // Incidents inside the chosen dates and scope
  const entries = useMemo(
    () =>
      registrations.filter((entry) => {
        const date = String(entry.incidentDate || '').slice(0, 10)
        if (!from || !to || date < from || date > to) return false
        if (scope === 'ambassador') return Boolean(ownerKey) && entry.createdBy === ownerKey
        if (scope === 'branch') {
          return (
            Boolean(selectedBranch) &&
            entry.branchName === selectedBranch.branchName &&
            (!selectedBranch.createdBy || entry.createdBy === selectedBranch.createdBy)
          )
        }
        return true
      }),
    [registrations, from, to, scope, ownerKey, selectedBranch],
  )

  // One group per ambassador, each with its branch rows
  const groups = useMemo(() => {
    const byOwner = new Map()
    for (const entry of entries) {
      const key = entry.createdBy || 'unknown'
      if (!byOwner.has(key)) byOwner.set(key, [])
      byOwner.get(key).push(entry)
    }
    return Array.from(byOwner.entries())
      .map(([key, list]) => ({
        key,
        name: ownerNameByKey.get(key) || displayName(key) || 'Unknown ambassador',
        count: list.length,
        branchRows: buildBranchRows(list),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [entries, ownerNameByKey])

  const branchesAffected = groups.reduce((sum, group) => sum + group.branchRows.length, 0)
  const canGenerate =
    Boolean(from && to) &&
    entries.length > 0 &&
    (scope === 'all' || (scope === 'ambassador' && ownerKey) || (scope === 'branch' && selectedBranch))

  const presets = [
    { label: 'This month', from: firstOfMonth(0), to: lastOfMonth(0) },
    { label: 'Last month', from: firstOfMonth(-1), to: lastOfMonth(-1) },
    { label: 'Last 3 months', from: firstOfMonth(-2), to: lastOfMonth(0) },
    { label: 'This year', from: `${new Date().getFullYear()}-01-01`, to: `${new Date().getFullYear()}-12-31` },
  ]

  // Keep the dates in order: From can never be after To
  function handleFromChange(event) {
    const value = event.target.value
    setFrom(value)
    if (value && to && value > to) setTo(value)
  }

  function handleToChange(event) {
    const value = event.target.value
    setTo(value)
    if (value && from && value < from) setFrom(value)
  }

  async function generateReport() {
    if (!canGenerate || isGenerating) return
    setError('')
    setIsGenerating(true)
    try {
      const dateLabel = formatRangeLabel(from, to)
      const title = isFullMonth(from, to)
        ? 'BRANCH NETWORK ASSESSMENT MONTHLY REPORT'
        : 'BRANCH NETWORK ASSESSMENT REPORT'

      const sheets = groups.map((group) => ({
        name: scope === 'branch' && selectedBranch ? selectedBranch.branchName : group.name,
        ambassador: group.name,
        branchRows: group.branchRows,
      }))

      // The summary lists every ambassador, also the ones without outages
      let summary
      if (scope === 'all') {
        const byKey = new Map(groups.map((group) => [group.key, group]))
        const people = new Map(owners.map((owner) => [owner.key, owner.name]))
        groups.forEach((group) => {
          if (!people.has(group.key)) people.set(group.key, group.name)
        })
        summary = Array.from(people, ([key, name]) => {
          const group = byKey.get(key)
          const counts = group ? countIncidents(group.branchRows) : { telecom: 0, elpa: 0, total: 0 }
          return { ambassador: name, branches: group ? group.branchRows.length : 0, ...counts }
        }).sort((a, b) => a.ambassador.localeCompare(b.ambassador))
      }

      const scopePart =
        scope === 'all'
          ? 'all-ambassadors'
          : scope === 'ambassador'
          ? slug(ownerNameByKey.get(ownerKey))
          : slug(selectedBranch?.branchName)

      await downloadNetworkWorkbook({
        filename: `network-report-${scopePart}-${from}-to-${to}.xlsx`,
        title,
        dateLabel,
        summary,
        sheets,
      })
      notify('Report downloaded.', 'success')
    } catch (reportError) {
      const message = `The report could not be created. ${reportError?.message || ''}`.trim()
      setError(message)
      notify(message)
    } finally {
      setIsGenerating(false)
    }
  }

  const radioCard = (selected) =>
    `flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
      selected ? 'border-[#003498] bg-[#eef4ff]' : 'border-[#e3e8ef] bg-white hover:border-[#9bb6e6]'
    }`

  return (
    <div className="mx-auto max-w-5xl text-[#1f2937]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#102d54]">Network report</h1>
          <p className="mt-1 text-sm text-[#718096]">
            Choose the dates and who to include, then download the Excel report. This page is for reports only.
          </p>
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

      {/* Filters */}
      <section className="mb-6 space-y-5 rounded-2xl bg-[#f6f8fb] p-5">
        <div>
          <p className="mb-2 text-sm font-semibold text-[#102d54]">Dates</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setFrom(preset.from)
                  setTo(preset.to)
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  from === preset.from && to === preset.to
                    ? 'bg-[#003498] text-white'
                    : 'bg-white text-[#52657d] hover:bg-[#e8eefb] hover:text-[#003498]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="grid max-w-md grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#52657d]">From</span>
              <input type="date" value={from} onChange={handleFromChange} className={fieldClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#52657d]">To</span>
              <input type="date" value={to} onChange={handleToChange} className={fieldClass} />
            </label>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-[#102d54]">Who to include</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {scopeOptions.map((option) => (
              <label key={option.value} className={radioCard(scope === option.value)}>
                <input
                  type="radio"
                  name="network-report-scope"
                  checked={scope === option.value}
                  onChange={() => setScope(option.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#102d54]">{option.label}</span>
                  <span className="block text-xs text-[#718096]">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>

          {(scope === 'ambassador' || scope === 'branch') && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#52657d]">
                  {scope === 'branch' ? 'Ambassador (optional, narrows the branches)' : 'Ambassador'}
                </span>
                <select
                  value={ownerKey}
                  onChange={(event) => {
                    setOwnerKey(event.target.value)
                    setBranchId('')
                  }}
                  className={fieldClass}
                >
                  <option value="">{scope === 'branch' ? 'All ambassadors' : 'Select ambassador'}</option>
                  {owners.map((owner) => (
                    <option key={owner.key} value={owner.key}>
                      {owner.name}
                    </option>
                  ))}
                </select>
              </label>
              {scope === 'branch' && (
                <div>
                  <span className="mb-1 block text-xs font-semibold text-[#52657d]">Branch</span>
                  <BranchSearch options={branchOptions} value={branchId} onChange={setBranchId} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8edf3] pt-4">
          <p className="text-sm text-[#52657d]" role="status">
            {isLoading
              ? 'Loading incidents...'
              : scope === 'ambassador' && !ownerKey
              ? 'Select an ambassador.'
              : scope === 'branch' && !selectedBranch
              ? 'Select a branch.'
              : entries.length === 0
              ? 'No outages were recorded for this selection.'
              : `${entries.length} ${entries.length === 1 ? 'incident' : 'incidents'} in ${branchesAffected} ${
                  branchesAffected === 1 ? 'branch' : 'branches'
                } • ${groups.length} ${groups.length === 1 ? 'ambassador' : 'ambassadors'}`}
          </p>
          <button
            type="button"
            onClick={generateReport}
            disabled={!canGenerate || isGenerating}
            className="rounded-full bg-[#003498] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#00246B] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? 'Preparing...' : 'Download Excel'}
          </button>
        </div>
      </section>

      {/* Preview of what the report will contain */}
      {isLoading ? (
        <p className="rounded-2xl bg-[#f6f8fb] px-4 py-10 text-center text-sm text-[#718096]">
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#003498] border-t-transparent align-middle" />
          Loading incidents...
        </p>
      ) : groups.length === 0 ? null : (
        <div className="space-y-4">
          <h2 className="px-1 text-sm font-semibold text-[#102d54]">
            What the report will contain
            <span className="ml-2 font-normal text-[#8a98ab]">{formatRangeLabel(from, to)}</span>
          </h2>
          {groups.map((group) => (
            <section key={group.key} className="overflow-hidden rounded-2xl border border-[#e8edf3] bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f8fafc] px-4 py-3">
                <h3 className="text-sm font-semibold text-[#102d54]">{group.name}</h3>
                <p className="text-xs text-[#8a98ab]">
                  {group.count} {group.count === 1 ? 'incident' : 'incidents'} • {group.branchRows.length}{' '}
                  {group.branchRows.length === 1 ? 'branch' : 'branches'}
                </p>
              </div>
              <ul className="divide-y divide-[#f0f3f7]">
                {group.branchRows.map((branch) => (
                  <li key={branch.name} className="flex flex-wrap items-start gap-x-4 gap-y-1.5 px-4 py-3">
                    <p className="min-w-[10rem] flex-1 text-sm font-semibold text-[#102d54]">{branch.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {branch.elpa.length > 0 && (
                        <span className="rounded-full bg-[#fff3d6] px-2.5 py-0.5 text-xs font-semibold text-[#8a5a00]">
                          ELPA {branch.elpa.length}
                        </span>
                      )}
                      {branch.telecom.length > 0 && (
                        <span className="rounded-full bg-[#e8eefb] px-2.5 py-0.5 text-xs font-semibold text-[#003498]">
                          Ethio Telecom {branch.telecom.length}
                        </span>
                      )}
                    </div>
                    <p className="basis-full text-xs text-[#8a98ab]">{remarkText(branch).replace(/\n/g, ' • ')}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-[#8a98ab]">Signed in as {username}</p>
    </div>
  )
}