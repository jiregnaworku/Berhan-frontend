import { useEffect, useMemo, useRef, useState } from 'react'
import { useDashboardToast } from '../../shared/components/dashboardToast.js'
import {
  acceptMtoStatus,
  fetchMtoOverview,
  setAllMtoEdit,
  setBranchMtoEdit,
  submitMtoStatus,
} from './mtoStatusStore.js'

const MTO_OPTIONS = ['RIA', 'Western Union', 'MoneyGram', 'Transfast', 'Dahabshiil']
const STATUS_OPTIONS = ['Working', 'Not working', 'Do not have user', 'Unknown']
const PAGE_SIZE = 30
const MAX_PICKER_OPTIONS = 40

const statusChip = {
  Working: 'bg-emerald-50 text-emerald-700',
  'Not working': 'bg-[#fdeceb] text-[#b3372f]',
  'Do not have user': 'bg-amber-50 text-amber-700',
  Unknown: 'bg-[#f1f4f9] text-[#52657d]',
}
const statusDot = {
  Working: 'bg-emerald-500',
  'Not working': 'bg-[#e0584f]',
  'Do not have user': 'bg-amber-500',
  Unknown: 'bg-gray-400',
}

const norm = (value) => String(value ?? '').toLowerCase().trim()

const fieldClass =
  'min-h-10 w-full rounded-xl border border-[#e3e8ef] bg-white px-3 text-sm text-[#1f2937] outline-none transition placeholder:text-[#a0aec0] focus:border-[#003498] focus:ring-2 focus:ring-[#003498]/15 disabled:cursor-not-allowed disabled:bg-[#f6f8fb] disabled:text-[#a0aec0]'

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function Switch({ isOn, isBusy, disabled, onClick }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      disabled={disabled || isBusy}
      onClick={onClick}
      className="flex min-h-10 items-center gap-2.5 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-[#52657d] transition hover:text-[#003498] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${isOn ? 'bg-emerald-500' : 'bg-gray-300'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${isOn ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
      {isBusy ? 'Saving...' : isOn ? 'Editing on' : 'Editing off'}
    </button>
  )
}

// Type a branch name or code to find it quickly, even with hundreds of branches
function BranchPicker({ branches, value, onChange, placeholder = 'Search a branch by name or code' }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const indexed = useMemo(
    () => branches.map((branch) => ({ branch, key: norm(`${branch.branchName} ${branch.branchCode}`) })),
    [branches],
  )
  const selected = branches.find((branch) => String(branch.id) === String(value))

  const matches = useMemo(() => {
    const tokens = norm(query).split(/\s+/).filter(Boolean)
    const list = tokens.length ? indexed.filter((item) => tokens.every((token) => item.key.includes(token))) : indexed
    return { items: list.slice(0, MAX_PICKER_OPTIONS), total: list.length }
  }, [indexed, query])

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
        value={isOpen ? query : selected ? `${selected.branchName}${selected.branchCode ? ` (${selected.branchCode})` : ''}` : ''}
        placeholder={placeholder}
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
              matches.items.map(({ branch }) => (
                <li key={branch.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(String(branch.id))
                      setIsOpen(false)
                      setQuery('')
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-[#eef3fc]"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${branch.mtoCanEdit ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#102d54]">{branch.branchName}</span>
                    {branch.branchCode && (
                      <span className="shrink-0 rounded-full bg-[#f1f4f9] px-2.5 py-0.5 font-mono text-xs text-[#52657d]">
                        {branch.branchCode}
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

export function MtoStatusContent({ roleId = 'ambassador', username, onBack }) {
  const { notify } = useDashboardToast()
  const isBranchManager = roleId === 'branch-manager'
  const isAmbassador = roleId === 'ambassador'
  const isManager = roleId === 'service-desk-manager'
  const canToggle = isAmbassador || isManager

  const [branches, setBranches] = useState([])
  const [statuses, setStatuses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [accessBranchId, setAccessBranchId] = useState('')
  const [isTogglingAccess, setIsTogglingAccess] = useState(false)
  const [isBulkBusy, setIsBulkBusy] = useState(false)

  const [form, setForm] = useState({ mto: '', status: '', remark: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [acceptingId, setAcceptingId] = useState(null)

  const [searchText, setSearchText] = useState('')
  const [filterMto, setFilterMto] = useState('')
  const [filterState, setFilterState] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    fetchMtoOverview()
      .then(({ branches: loadedBranches, mtoStatuses }) => {
        setBranches([...loadedBranches].sort((a, b) => a.branchName.localeCompare(b.branchName)))
        setStatuses(mtoStatuses)
      })
      .catch((loadError) => {
        setError(loadError.message)
        notify(loadError.message)
      })
      .finally(() => setIsLoading(false))
  }, [notify])

  const branchMap = useMemo(() => new Map(branches.map((branch) => [String(branch.id), branch])), [branches])

  // A branch manager only ever receives their own branch
  const myBranch = isBranchManager ? branches[0] : null
  const canReport = Boolean(myBranch?.mtoCanEdit)

  const accessBranch = branchMap.get(String(accessBranchId))
  const editingOnCount = branches.filter((branch) => branch.mtoCanEdit).length
  const pendingCount = statuses.filter((row) => row.reviewState === 'pending').length

  const filteredStatuses = useMemo(() => {
    const tokens = norm(searchText).split(/\s+/).filter(Boolean)
    return statuses.filter((row) => {
      if (filterMto && row.mto !== filterMto) return false
      if (filterState && row.reviewState !== filterState) return false
      if (tokens.length) {
        const branch = branchMap.get(String(row.branchId))
        const key = norm(`${branch?.branchName || ''} ${branch?.branchCode || ''}`)
        if (!tokens.every((token) => key.includes(token))) return false
      }
      return true
    })
  }, [statuses, branchMap, searchText, filterMto, filterState])

  useEffect(() => setVisibleCount(PAGE_SIZE), [searchText, filterMto, filterState])

  function handleFormChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const saved = await submitMtoStatus(form)
      setStatuses((current) => [saved, ...current])
      setForm({ mto: '', status: '', remark: '' })
      notify('MTO status submitted. Your ambassador will respond.', 'success')
    } catch (submitError) {
      const message = Object.values(submitError.errors || {}).flat()[0] || submitError.message
      setError(message)
      notify(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAccept(id) {
    setAcceptingId(id)
    try {
      const saved = await acceptMtoStatus(id)
      setStatuses((current) => current.map((row) => (row.id === id ? saved : row)))
      notify('MTO status accepted.', 'success')
    } catch (acceptError) {
      setError(acceptError.message)
      notify(acceptError.message)
    } finally {
      setAcceptingId(null)
    }
  }

  async function handleToggleAccess() {
    if (!accessBranch) return
    setIsTogglingAccess(true)
    try {
      const saved = await setBranchMtoEdit(accessBranch.id, !accessBranch.mtoCanEdit)
      setBranches((current) =>
        current.map((branch) => (String(branch.id) === String(saved.branchId) ? { ...branch, mtoCanEdit: saved.mtoCanEdit } : branch)),
      )
      notify(
        saved.mtoCanEdit
          ? `The branch manager of ${accessBranch.branchName} can now report MTO status.`
          : `MTO editing turned off for ${accessBranch.branchName}.`,
        'success',
      )
    } catch (toggleError) {
      notify(Object.values(toggleError.errors || {}).flat()[0] || toggleError.message)
    } finally {
      setIsTogglingAccess(false)
    }
  }

  async function handleBulk(enabled) {
    const scope = isManager ? 'all branches' : 'all of your branches'
    if (!window.confirm(`Turn MTO editing ${enabled ? 'on' : 'off'} for ${scope} (${branches.length})?`)) return
    setIsBulkBusy(true)
    try {
      const saved = await setAllMtoEdit(enabled)
      setBranches((current) => current.map((branch) => ({ ...branch, mtoCanEdit: saved.mtoCanEdit })))
      notify(`MTO editing turned ${saved.mtoCanEdit ? 'on' : 'off'} for ${saved.count} branches.`, 'success')
    } catch (bulkError) {
      notify(Object.values(bulkError.errors || {}).flat()[0] || bulkError.message)
    } finally {
      setIsBulkBusy(false)
    }
  }

  const hasFilters = Boolean(searchText || filterMto || filterState)
  const shownStatuses = filteredStatuses.slice(0, visibleCount)

  return (
    <div className="mx-auto max-w-5xl text-[#1f2937]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#102d54]">MTO status</h1>
          <p className="mt-1 text-sm text-[#718096]">
            {isBranchManager
              ? 'Tell your ambassador how each money transfer operator is doing at your branch.'
              : isAmbassador
              ? 'Let your branch managers report MTO status, then respond to what they send.'
              : 'Choose which branches can report MTO status, and see every report.'}
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

      {/* Editing access: ambassador (own branches) and service desk manager (all branches) */}
      {canToggle && (
        <section className="mb-6 rounded-2xl bg-[#f6f8fb] p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[#102d54]">Let branch managers report MTO status</h2>
              <p className="mt-0.5 text-xs text-[#718096]">
                {isLoading ? 'Loading branches...' : `Editing is on for ${editingOnCount} of ${branches.length} ${isManager ? 'branches' : 'of your branches'}.`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isBulkBusy || branches.length === 0}
                onClick={() => handleBulk(true)}
                className="rounded-full bg-[#003498] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#00246B] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isManager ? 'Turn on for all branches' : 'Turn on for all my branches'}
              </button>
              <button
                type="button"
                disabled={isBulkBusy || branches.length === 0}
                onClick={() => handleBulk(false)}
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#52657d] transition hover:text-[#b3372f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Turn off for all
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="min-w-[16rem] flex-1">
              <BranchPicker branches={branches} value={accessBranchId} onChange={setAccessBranchId} />
            </div>
            <Switch
              isOn={Boolean(accessBranch?.mtoCanEdit)}
              isBusy={isTogglingAccess}
              disabled={!accessBranch}
              onClick={handleToggleAccess}
            />
          </div>
        </section>
      )}

      {/* Branch manager: report form */}
      {isBranchManager && !isLoading && (
        <section className="mb-6 rounded-2xl border border-[#e8edf3] bg-white p-5">
          {!myBranch ? (
            <p className="text-sm text-[#718096]">No branch is linked to your account yet.</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[#102d54]">
                  Report an MTO status
                  <span className="ml-2 font-normal text-[#8a98ab]">{myBranch.branchName}</span>
                </h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    canReport ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f1f4f9] text-[#52657d]'
                  }`}
                >
                  {canReport ? 'Editing is on' : 'Editing is off'}
                </span>
              </div>

              {!canReport && (
                <p className="mb-4 rounded-xl bg-[#fff6e0] px-4 py-3 text-sm text-[#8a5a00]">
                  Your ambassador hasn't turned editing on for your branch yet. Ask them to turn it on, then come back here.
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#52657d]">MTO</span>
                  <select name="mto" value={form.mto} onChange={handleFormChange} required disabled={!canReport} className={fieldClass}>
                    <option value="">Select MTO</option>
                    {MTO_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#52657d]">Status</span>
                  <select name="status" value={form.status} onChange={handleFormChange} required disabled={!canReport} className={fieldClass}>
                    <option value="">Select status</option>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="mt-4 block">
                <span className="mb-1 block text-xs font-semibold text-[#52657d]">Remark (optional)</span>
                <textarea
                  name="remark"
                  value={form.remark}
                  onChange={handleFormChange}
                  rows="3"
                  maxLength={500}
                  disabled={!canReport}
                  placeholder="Tell your ambassador more about it"
                  className={`${fieldClass} resize-none py-2`}
                />
              </label>
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={!canReport || isSubmitting}
                  className="rounded-full bg-[#003498] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#00246B] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Reports */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-1">
          <h2 className="text-sm font-semibold text-[#102d54]">
            {isBranchManager ? 'My reports' : 'Reports'}
            <span className="ml-2 font-normal text-[#8a98ab]">
              {filteredStatuses.length} of {statuses.length}
            </span>
          </h2>
          {isAmbassador && pendingCount > 0 && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {pendingCount} waiting for your response
            </span>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          {!isBranchManager && (
            <div className="min-w-[14rem] flex-1">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#52657d]">Search branch</span>
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Branch name or code"
                  className={fieldClass}
                />
              </label>
            </div>
          )}
          <div className="w-44">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#52657d]">MTO</span>
              <select value={filterMto} onChange={(event) => setFilterMto(event.target.value)} className={fieldClass}>
                <option value="">All MTOs</option>
                {MTO_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="w-44">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#52657d]">Response</span>
              <select value={filterState} onChange={(event) => setFilterState(event.target.value)} className={fieldClass}>
                <option value="">Any</option>
                <option value="pending">Waiting</option>
                <option value="accepted">Accepted</option>
              </select>
            </label>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchText('')
                setFilterMto('')
                setFilterState('')
              }}
              className="min-h-10 rounded-full px-4 text-sm font-medium text-[#003498] transition hover:bg-[#eef2f7]"
            >
              Clear filters
            </button>
          )}
        </div>

        {isLoading ? (
          <p className="rounded-2xl bg-[#f6f8fb] px-4 py-10 text-center text-sm text-[#718096]">
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#003498] border-t-transparent align-middle" />
            Loading MTO reports...
          </p>
        ) : filteredStatuses.length === 0 ? (
          <p className="rounded-2xl bg-[#f6f8fb] px-4 py-10 text-center text-sm text-[#718096]">
            {hasFilters ? "No reports match what you're looking for." : 'No MTO reports yet.'}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-[#f0f3f7] overflow-hidden rounded-2xl border border-[#e8edf3] bg-white">
              {shownStatuses.map((row) => {
                const branch = branchMap.get(String(row.branchId))
                const isPending = row.reviewState === 'pending'
                return (
                  <li key={row.id} className="flex flex-wrap items-start gap-x-6 gap-y-3 px-4 py-4 transition hover:bg-[#fafbfd]">
                    <div className="min-w-[14rem] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[#102d54]">{row.mto}</p>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold ${
                            statusChip[row.status] || statusChip.Unknown
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusDot[row.status] || statusDot.Unknown}`} />
                          {row.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#8a98ab]">
                        {branch?.branchName || 'Unknown branch'}
                        {branch?.branchCode && <span className="ml-1.5 font-mono">{branch.branchCode}</span>}
                        {' • '}
                        {row.submittedBy} • {formatDate(row.createdAt)}
                      </p>
                      {row.remark && (
                        <p className="mt-2 rounded-xl bg-[#f6f8fb] px-3 py-2 text-xs text-[#52657d]">{row.remark}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {isPending ? (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Waiting</span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Accepted{row.acceptedAt ? ` • ${formatDate(row.acceptedAt)}` : ''}
                        </span>
                      )}
                      {isAmbassador && isPending && (
                        <button
                          type="button"
                          disabled={acceptingId === row.id}
                          onClick={() => handleAccept(row.id)}
                          className="rounded-full bg-[#003498] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#00246B] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {acceptingId === row.id ? 'Accepting...' : 'Accept'}
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            {filteredStatuses.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="mt-4 w-full rounded-2xl bg-[#f6f8fb] py-3 text-sm font-semibold text-[#003498] transition hover:bg-[#e8eefb]"
              >
                Show {Math.min(PAGE_SIZE, filteredStatuses.length - visibleCount)} more ({filteredStatuses.length - visibleCount} not shown yet)
              </button>
            )}
          </>
        )}
      </section>

      <p className="mt-6 text-xs text-[#8a98ab]">Signed in as {username}</p>
    </div>
  )
}