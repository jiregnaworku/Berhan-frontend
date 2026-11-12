import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '../../shared/components/DashboardLayout.jsx'
import { useDashboardToast } from '../../shared/components/dashboardToast.js'
import { fetchBranches } from './branchStore.js'
import {
  createNetworkRegistration,
  deleteNetworkRegistration,
  downloadNetworkReport,
  fetchNetworkRegistrations,
  updateNetworkRegistration,
} from './networkStore.js'

const emptyRegistration = {
  reason: 'ELPA',
  remark: '',
  incidentDate: new Date().toISOString().slice(0, 10),
}

const BRANCH_PAGE_SIZE = 40

const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200'

function Field({ label, name, value, onChange, required = false, type = 'text', placeholder = '' }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {type === 'textarea' ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          rows="2"
          placeholder={placeholder}
          className={`${fieldClass} resize-none py-2`}
        />
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          className={`${fieldClass} min-h-10 rounded-lg py-1.5`}
        />
      )}
    </label>
  )
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}`
}

function getMonthLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function NetworkContent({ username }) {
  const { notify } = useDashboardToast()
  const [branches, setBranches] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [form, setForm] = useState(emptyRegistration)
  const [selectedBranches, setSelectedBranches] = useState([])
  const [branchSearch, setBranchSearch] = useState('')
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(BRANCH_PAGE_SIZE)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isBranchesLoading, setIsBranchesLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editingBranchName, setEditingBranchName] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    fetchBranches()
      // An ambassador only sees and reports on the branches they own
      .then((loadedBranches) => setBranches(loadedBranches.filter((branch) => branch.createdBy === username)))
      .catch(() => {
        const message = 'Unable to load branch information.'
        setBranches([])
        setError(message)
        notify(message)
      })
      .finally(() => setIsBranchesLoading(false))
  }, [notify, username])

  useEffect(() => {
    let isMounted = true
    fetchNetworkRegistrations(selectedMonth)
      .then((loadedRegistrations) => {
        if (isMounted) setRegistrations(loadedRegistrations)
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(loadError.message)
          notify(loadError.message)
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [notify, selectedMonth])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleMonthChange(event) {
    setIsLoading(true)
    setSelectedMonth(event.target.value)
  }

  function toggleBranch(branchName) {
    setSelectedBranches((current) =>
      current.includes(branchName)
        ? current.filter((item) => item !== branchName)
        : [...current, branchName],
    )
  }

  function selectAllFiltered(list) {
    const names = list.map((b) => b.branchName).filter(Boolean)
    setSelectedBranches((current) => Array.from(new Set([...current, ...names])))
  }

  function clearBranchSelection() {
    setSelectedBranches([])
  }

  const filteredBranches = useMemo(() => {
    const query = branchSearch.trim().toLowerCase()
    if (!query) return branches
    return branches.filter((branch) => {
      const name = (branch.branchName || '').toLowerCase()
      const code = (branch.branchCode || '').toLowerCase()
      const location = (branch.branchLocation || '').toLowerCase()
      return name.includes(query) || code.includes(query) || location.includes(query)
    })
  }, [branches, branchSearch])

  function resetForm() {
    setForm({ ...emptyRegistration, reason: 'ELPA', incidentDate: new Date().toISOString().slice(0, 10) })
    setSelectedBranches([])
    setBranchSearch('')
    setIsBranchMenuOpen(false)
    setVisibleCount(BRANCH_PAGE_SIZE)
    setEditingId(null)
    setEditingBranchName('')
  }

  function closeForm() {
    resetForm()
    setIsFormOpen(false)
  }

  function startNewReport() {
    setError('')
    resetForm()
    setIsFormOpen(true)
  }

  function startEdit(entry) {
    setError('')
    resetForm()
    setForm({
      reason: entry.reason || 'ELPA',
      remark: entry.remark || '',
      incidentDate: (entry.incidentDate || '').slice(0, 10) || emptyRegistration.incidentDate,
    })
    setEditingId(entry.id)
    setEditingBranchName(entry.branchName || '')
    setIsFormOpen(true)
  }

  async function handleDelete(entry) {
    if (!window.confirm(`Delete the outage report for ${entry.branchName}? This can't be undone.`)) return
    setError('')
    setDeletingId(entry.id)
    try {
      await deleteNetworkRegistration(entry.id)
      setRegistrations((current) => current.filter((item) => item.id !== entry.id))
      notify('Outage report deleted.', 'success')
    } catch (deleteError) {
      setError(deleteError.message)
      notify(deleteError.message)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!editingId && selectedBranches.length === 0) {
      const message = 'Please select at least one branch to register.'
      setError(message)
      notify(message, 'error')
      return
    }

    if (!form.reason) {
      const message = 'Please select an outage reason (ELPA or Network Side).'
      setError(message)
      notify(message, 'error')
      return
    }

    setError('')
    setIsSaving(true)
    try {
      if (editingId) {
        const result = await updateNetworkRegistration(editingId, {
          reason: form.reason,
          remark: form.remark,
          incidentDate: form.incidentDate,
        })
        const saved = result?.registration || result || {}
        setRegistrations((current) =>
          current
            .map((item) => (item.id === editingId ? { ...item, ...form, ...saved } : item))
            .filter((item) => !selectedMonth || (item.incidentDate && item.incidentDate.startsWith(selectedMonth))),
        )
        closeForm()
        notify('Outage report updated.', 'success')
      } else {
        const result = await createNetworkRegistration({
          ...form,
          branchNames: selectedBranches,
          createdBy: username,
        })

        const newEntries = result.registrations || [result.registration]
        setRegistrations((current) => {
          const filteredNew = selectedMonth
            ? newEntries.filter((r) => r.incidentDate && r.incidentDate.startsWith(selectedMonth))
            : newEntries
          return [...filteredNew, ...current]
        })

        closeForm()
        notify(
          `Registered outage for ${newEntries.length} branch${newEntries.length > 1 ? 'es' : ''} successfully.`,
          'success',
        )
      }
    } catch (saveError) {
      const message = Object.values(saveError.errors || {}).flat()[0] || saveError.message
      setError(message)
      notify(message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleExport() {
    const month = selectedMonth || new Date().toISOString().slice(0, 7)
    setError('')
    setIsExporting(true)
    try {
      await downloadNetworkReport(month, username)
    } catch (exportError) {
      setError(exportError.message)
      notify(exportError.message)
    } finally {
      setIsExporting(false)
    }
  }

  const grouped = registrations.reduce((groups, registration) => {
    const date = new Date(`${registration.incidentDate}T00:00:00`)
    const key = getMonthKey(date)
    if (!groups[key]) groups[key] = { date, entries: [] }
    groups[key].entries.push(registration)
    return groups
  }, {})
  const monthGroups = Object.values(grouped).sort((a, b) => b.date - a.date)

  const branchTriggerLabel =
    selectedBranches.length === 0
      ? 'Choose your branches'
      : selectedBranches.length === 1
      ? selectedBranches[0]
      : `${selectedBranches.length} branches selected`

  return (
    <div className="mx-auto max-w-4xl text-[#1f2937]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#102d54]">Network & power outages</h1>
          <p className="mt-1 text-sm text-slate-500">
            Note down when a branch loses power or its network link, and look back at past incidents.
          </p>
        </div>
        <button
          type="button"
          onClick={startNewReport}
          className="rounded-full bg-[#003498] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#00246B]"
        >
          Report an outage
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-2xl bg-[#fdeceb] px-4 py-3 text-sm text-[#b3372f]" role="alert">
          {error}
        </p>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-4">
          <form
            onSubmit={handleSubmit}
            className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:max-h-[88vh]"
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingId ? 'Edit outage report' : 'Report an outage'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingId
                    ? 'Change the cause, date or notes for this branch.'
                    : 'Choose your branches, say what caused it, and save.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
              {/* Branches */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">
                  {editingId ? 'Branch' : 'Which of your branches?'}
                  {!editingId && (
                    <span
                      className="ml-2 text-xs font-medium text-slate-500"
                    >
                      {selectedBranches.length} selected
                    </span>
                  )}
                </p>

                {editingId ? (
                  <p className="rounded-2xl bg-[#f6f8fb] px-4 py-3 text-sm font-medium text-[#102d54]">
                    {editingBranchName}
                  </p>
                ) : (
                  <>
                    {/* Dropdown trigger */}
                    <button
                      type="button"
                      onClick={() => setIsBranchMenuOpen((open) => !open)}
                      aria-expanded={isBranchMenuOpen}
                      className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 text-left text-sm transition ${
                        isBranchMenuOpen ? 'border-slate-500 ring-2 ring-slate-200' : ''
                      }`}
                    >
                      <span
                        className={`truncate ${selectedBranches.length ? 'font-medium text-slate-800' : 'text-slate-400'}`} 
                      >
                        {branchTriggerLabel}
                      </span>
                      <span className={`shrink-0 text-[#8a98ab] transition ${isBranchMenuOpen ? 'rotate-180' : ''}`}>▾</span>
                    </button>

                    {/* Dropdown panel */}
                    {isBranchMenuOpen && (
                      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <div className="relative border-b border-slate-100 p-2">
                          <input
                            type="text"
                            value={branchSearch}
                            onChange={(e) => {
                              setBranchSearch(e.target.value)
                              setVisibleCount(BRANCH_PAGE_SIZE)
                            }}
                            placeholder="Search your branches"
                            className={`${fieldClass} min-h-10 border-slate-200 bg-slate-50 py-1.5 pr-9`} 
                          />
                          {branchSearch && (
                            <button
                              type="button"
                              onClick={() => {
                                setBranchSearch('')
                                setVisibleCount(BRANCH_PAGE_SIZE)
                              }}
                              className="absolute right-5 top-4 text-xs font-bold text-[#8a98ab] hover:text-[#1f2937]"
                              aria-label="Clear search"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                          <span className="text-slate-500">
                            {isBranchesLoading ? 'Loading branches...' : `${filteredBranches.length} of ${branches.length} branches`}
                          </span>
                          <div className="flex items-center gap-1">
                            {filteredBranches.length > 0 && (
                              <button
                                type="button"
                                onClick={() => selectAllFiltered(filteredBranches)}
                                className="rounded-md px-2.5 py-1 font-medium text-slate-700 transition hover:bg-slate-200"
                              >
                                {branchSearch.trim() ? `Select all ${filteredBranches.length} matches` : 'Select all'}
                              </button>
                            )}
                            {selectedBranches.length > 0 && (
                              <button
                                type="button"
                                onClick={clearBranchSelection}
                                className="rounded-md px-2.5 py-1 font-medium text-slate-600 transition hover:bg-slate-200"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="max-h-64 overflow-y-auto">
                          {isBranchesLoading ? (
                            <div className="flex items-center justify-center p-6 text-sm text-slate-500">
                              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                              Loading branches...
                            </div>
                          ) : filteredBranches.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-[#718096]">
                              {branchSearch
                                ? `No branches match "${branchSearch}".`
                                : "You don't have any branches to report on yet."}
                            </p>
                          ) : (
                            <ul className="divide-y divide-slate-100">
                              {filteredBranches.slice(0, visibleCount).map((branch) => {
                                const isSelected = selectedBranches.includes(branch.branchName)
                                const detail = [branch.branchCode, branch.branchLocation].filter(Boolean).join(' • ')
                                return (
                                  <li key={branch.id || branch.branchName}>
                                    <button
                                      type="button"
                                      role="checkbox"
                                      aria-checked={isSelected}
                                      onClick={() => toggleBranch(branch.branchName)}
                                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                                        isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                                      }`}
                                    >
                                      <span
                                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-semibold transition ${
                                          isSelected
                                            ? 'border-slate-700 bg-slate-700 text-white'
                                            : 'border-slate-300 bg-white text-transparent'
                                        }`}
                                      >
                                        ✓
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span
                                          className={`block truncate text-sm ${
                                            isSelected ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
                                          }`}
                                        >
                                          {branch.branchName}
                                        </span>
                                        {detail && <span className="block truncate text-xs text-slate-500">{detail}</span>}
                                      </span>
                                    </button>
                                  </li>
                                )
                              })}
                              {filteredBranches.length > visibleCount && (
                                <li className="p-2">
                                  <button
                                    type="button"
                                    onClick={() => setVisibleCount((count) => count + BRANCH_PAGE_SIZE)}
                                    className="w-full rounded-md bg-slate-100 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                                  >
                                    Show {Math.min(BRANCH_PAGE_SIZE, filteredBranches.length - visibleCount)} more (
                                    {filteredBranches.length - visibleCount} not shown yet)
                                  </button>
                                </li>
                              )}
                            </ul>
                          )}
                        </div>

                        <div className="flex justify-end border-t border-slate-100 bg-white px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setIsBranchMenuOpen(false)}
                            className="rounded-md bg-slate-800 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}


                  </>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">What caused it?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((curr) => ({ ...curr, reason: 'ELPA' }))}
                    aria-pressed={form.reason === 'ELPA'}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${
                      form.reason === 'ELPA'
                        ? 'border-slate-500 bg-slate-50 ring-1 ring-slate-300'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-200 text-sm text-slate-700">
                      P
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800">Power cut</span>
                      <span className="block truncate text-xs text-slate-500">ELPA electricity outage</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm((curr) => ({ ...curr, reason: 'Ethio Telecom' }))}
                    aria-pressed={form.reason === 'Ethio Telecom'}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${
                      form.reason === 'Ethio Telecom'
                        ? 'border-slate-500 bg-slate-50 ring-1 ring-slate-300'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-200 text-sm text-slate-700">
                      N
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800">Network down</span>
                      <span className="block truncate text-xs text-slate-500">Ethio Telecom link</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* Date and notes */}
              <div className="grid grid-cols-1 gap-3 pb-1 sm:grid-cols-3">
                <Field
                  label="Date"
                  name="incidentDate"
                  value={form.incidentDate}
                  onChange={handleChange}
                  required
                  type="date"
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Notes (optional)"
                    name="remark"
                    value={form.remark}
                    onChange={handleChange}
                    type="text"
                    placeholder="e.g. Substation maintenance, fiber cut, ticket number"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6">
              <span className="text-sm text-slate-500">
                {editingId ? (
                  <span>
                    Editing <strong className="text-[#102d54]">{editingBranchName}</strong>
                  </span>
                ) : selectedBranches.length === 0 ? (
                  <span className="font-medium text-slate-600">Pick at least one branch</span>
                ) : (
                  <span>
                    Saving for <strong className="text-[#102d54]">{selectedBranches.length}</strong> branch
                    {selectedBranches.length > 1 ? 'es' : ''} ({form.reason === 'ELPA' ? 'Power cut' : 'Network down'})
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || (!editingId && selectedBranches.length === 0)}
                  className="rounded-lg bg-slate-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving
                    ? 'Saving...'
                    : editingId
                    ? 'Save changes'
                    : selectedBranches.length === 0
                    ? 'Select branches'
                    : selectedBranches.length === 1
                    ? 'Register 1 branch'
                    : `Register ${selectedBranches.length} branches`}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Past incidents */}
      <section className="mt-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-bold text-[#102d54]">Past incidents</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-[#52657d]">
              Month
              <input
                type="month"
                value={selectedMonth}
                onChange={handleMonthChange}
                className="min-h-10 rounded-xl border border-[#e3e8ef] bg-white px-3 text-sm text-[#1f2937] outline-none transition focus:border-[#003498] focus:ring-2 focus:ring-[#003498]/15"
              />
            </label>
            {selectedMonth && (
              <button
                type="button"
                onClick={() => setSelectedMonth('')}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-[#003498] transition hover:bg-[#e8eefb]"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="rounded-full border border-[#003498] px-4 py-2 text-sm font-semibold text-[#003498] transition hover:bg-[#003498] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? 'Preparing PDF...' : 'Download PDF summary'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl bg-[#f6f8fb] p-10 text-center text-sm text-[#718096]">
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent align-middle" />
            Loading outage reports...
          </div>
        ) : monthGroups.length === 0 ? (
          <div className="rounded-2xl bg-[#f6f8fb] p-10 text-center text-sm text-[#718096]">
            Nothing reported for this period. Good news, or just a quiet month.
          </div>
        ) : (
          <div className="space-y-8">
            {monthGroups.map((group) => {
              const elpaCount = group.entries.filter((e) => e.reason === 'ELPA').length
              const telecomCount = group.entries.filter((e) => e.reason === 'Ethio Telecom').length
              return (
                <div key={getMonthKey(group.date)}>
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 px-1">
                    <h3 className="text-base font-semibold text-[#102d54]">
                      {getMonthLabel(group.date)}
                      <span className="ml-2 text-sm font-normal text-[#8a98ab]">
                        {group.entries.length} {group.entries.length === 1 ? 'incident' : 'incidents'}
                      </span>
                    </h3>
                    <p className="flex items-center gap-4 text-xs text-[#52657d]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#F9A804]" />
                        {elpaCount} power
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#003498]" />
                        {telecomCount} network
                      </span>
                    </p>
                  </div>

                  <ul className="divide-y divide-[#f0f3f7] overflow-hidden rounded-2xl border border-[#e8edf3] bg-white">
                    {group.entries.map((entry) => {
                      const isElpa = entry.reason === 'ELPA'
                      const date = new Date(`${entry.incidentDate}T00:00:00`)
                      return (
                        <li key={entry.id} className="flex items-start gap-4 px-4 py-4 transition hover:bg-[#fafbfd]">
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg ${
                              isElpa ? 'bg-[#fff3d6]' : 'bg-[#e8eefb]'
                            }`}
                          >
                            {isElpa ? '⚡' : '🌐'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                              <p className="truncate text-sm font-semibold text-[#102d54]">{entry.branchName}</p>
                              <p className="text-xs text-[#8a98ab]">
                                {date.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                            <p className={`mt-0.5 text-xs font-medium ${isElpa ? 'text-[#8a5a00]' : 'text-[#003498]'}`}>
                              {isElpa ? 'Power cut (ELPA)' : 'Network down (Ethio Telecom)'}
                            </p>
                            {entry.remark && (
                              <p className="mt-2 rounded-xl bg-[#f6f8fb] px-3 py-2 text-xs text-[#52657d]">
                                {entry.remark}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-1 -ml-3">
                              <button
                                type="button"
                                onClick={() => startEdit(entry)}
                                disabled={deletingId === entry.id}
                                className="rounded-full px-3 py-1 text-xs font-semibold text-[#003498] transition hover:bg-[#e8eefb] disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(entry)}
                                disabled={deletingId === entry.id}
                                className="rounded-full px-3 py-1 text-xs font-semibold text-[#b3372f] transition hover:bg-[#fdeceb] disabled:opacity-50"
                              >
                                {deletingId === entry.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function Network({ username }) {
  return (
    <DashboardLayout roleId="ambassador" username={username}>
      <NetworkContent username={username} />
    </DashboardLayout>
  )
}

export default Network