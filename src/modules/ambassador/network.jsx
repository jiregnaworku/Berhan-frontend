import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '../../shared/components/DashboardLayout.jsx'
import { useDashboardToast } from '../../shared/components/dashboardToast.js'
import { fetchBranches } from './branchStore.js'
import { createNetworkRegistration, downloadNetworkReport, fetchNetworkRegistrations } from './networkStore.js'

const emptyRegistration = {
  reason: 'ELPA',
  remark: '',
  incidentDate: new Date().toISOString().slice(0, 10),
}

function Field({ label, name, value, onChange, required = false, type = 'text', placeholder = '' }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-[#52657d]">{label}</span>
      {type === 'textarea' ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          rows="2"
          placeholder={placeholder}
          className="w-full resize-none rounded-xl border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-xs text-[#1f2937] outline-none transition focus:border-[#003498] focus:ring-2 focus:ring-[#003498]/20"
        />
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          className="min-h-9 w-full rounded-xl border border-[#dce4ee] bg-[#fbfcfe] px-3 py-1.5 text-xs text-[#1f2937] outline-none transition focus:border-[#003498] focus:ring-2 focus:ring-[#003498]/20"
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
  const [isBranchesExpanded, setIsBranchesExpanded] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isBranchesLoading, setIsBranchesLoading] = useState(true)

  useEffect(() => {
    fetchBranches()
      .then(setBranches)
      .catch(() => {
        const message = 'Unable to load branch information.'
        setBranches([])
        setError(message)
        notify(message)
      })
      .finally(() => setIsBranchesLoading(false))
  }, [notify])

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
    setIsBranchesExpanded(false)
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

  async function handleSubmit(event) {
    event.preventDefault()

    if (selectedBranches.length === 0) {
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

      setForm({ ...emptyRegistration, reason: 'ELPA', incidentDate: new Date().toISOString().slice(0, 10) })
      setSelectedBranches([])
      setBranchSearch('')
      setIsBranchesExpanded(false)
      setIsFormOpen(false)
      notify(
        `Registered outage for ${newEntries.length} branch${newEntries.length > 1 ? 'es' : ''} successfully.`,
        'success',
      )
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

  function startNewReport() {
    setError('')
    setForm({ ...emptyRegistration, reason: 'ELPA', incidentDate: new Date().toISOString().slice(0, 10) })
    setSelectedBranches([])
    setBranchSearch('')
    setIsBranchesExpanded(false)
    setIsFormOpen(true)
  }

  const grouped = registrations.reduce((groups, registration) => {
    const date = new Date(`${registration.incidentDate}T00:00:00`)
    const key = getMonthKey(date)
    if (!groups[key]) groups[key] = { date, entries: [] }
    groups[key].entries.push(registration)
    return groups
  }, {})
  const monthGroups = Object.values(grouped).sort((a, b) => b.date - a.date)

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#e09f1f]">Ambassador workspace</p>
          <h1 className="text-3xl font-bold text-[#102d54]">Network & Power Outage Reports</h1>
          <p className="mt-1 text-sm text-[#718096]">
            Record and monitor branch outages across all network and power lines.
          </p>
        </div>
        <button
          type="button"
          onClick={startNewReport}
          className="flex items-center gap-2 rounded-xl bg-[#003498] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#00246B] hover:shadow-lg"
        >
          <span className="text-base font-black text-[#F9A804]">+</span>
          <span>Register Outage</span>
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-[#f2c5c2] bg-[#fff7f6] p-3 text-sm font-medium text-[#c2413b]" role="alert">
          {error}
        </p>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102d54]/60 backdrop-blur-sm p-3 sm:p-4">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col h-full max-h-[92vh] sm:max-h-[88vh] w-full max-w-2xl rounded-2xl border border-[#e5ebf2] bg-white shadow-2xl overflow-hidden"
          >
            {/* Pinned Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-6 py-3.5 bg-white">
              <div>
                <h2 className="text-lg font-bold text-[#102d54]">Register Outage Incident</h2>
                <p className="text-xs text-[#718096]">
                  Select branches (up to 30+), choose the cause, and record together.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition font-bold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Branch Selection Section */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#003498]">
                      1. Select Branches
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        selectedBranches.length > 0
                          ? 'bg-[#F9A804] text-[#00246B]'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {selectedBranches.length} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => selectAllFiltered(filteredBranches)}
                      className="rounded-lg bg-[#003498]/10 px-2.5 py-1 text-xs font-bold text-[#003498] hover:bg-[#003498]/20 transition"
                    >
                      Select All Filtered ({filteredBranches.length})
                    </button>
                    {selectedBranches.length > 0 && (
                      <button
                        type="button"
                        onClick={clearBranchSelection}
                        className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600 hover:bg-gray-200 transition"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* Compact Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={branchSearch}
                    onChange={(e) => setBranchSearch(e.target.value)}
                    placeholder="Search from all branches by name or code..."
                    className="w-full rounded-xl border border-[#dce4ee] bg-[#fbfcfe] px-3.5 py-1.5 text-xs text-[#1f2937] outline-none transition focus:border-[#003498] focus:ring-2 focus:ring-[#003498]/20"
                  />
                  {branchSearch && (
                    <button
                      type="button"
                      onClick={() => setBranchSearch('')}
                      className="absolute right-3 top-2 text-xs font-bold text-gray-400 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Compact Branch Checkbox Grid (Clean & Space-Efficient) */}
                {isBranchesLoading ? (
                  <div className="flex items-center justify-center p-6 text-xs text-[#718096]">
                    <span className="h-3.5 w-3.5 mr-2 animate-spin rounded-full border-2 border-[#003498] border-t-transparent" />
                    Loading all branches...
                  </div>
                ) : filteredBranches.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#dce4ee] p-3 text-center text-xs text-[#718096]">
                    No branches match "{branchSearch}".
                  </p>
                ) : (
                  <div className="grid max-h-40 grid-cols-2 sm:grid-cols-3 gap-1.5 overflow-y-auto p-2 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                    {filteredBranches.map((branch) => {
                      const isSelected = selectedBranches.includes(branch.branchName)
                      return (
                        <button
                          type="button"
                          key={branch.id || branch.branchName}
                          onClick={() => toggleBranch(branch.branchName)}
                          className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-all ${
                            isSelected
                              ? 'bg-[#003498] text-white font-semibold shadow-xs'
                              : 'bg-white text-[#102d54] border border-[#e2e8f0] hover:border-[#003498]/40 hover:bg-blue-50/20'
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] transition-colors ${
                              isSelected
                                ? 'bg-[#F9A804] text-[#00246B] font-bold'
                                : 'border border-gray-300 bg-white text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                          <span className="truncate flex-1" title={branch.branchName}>
                            {branch.branchName}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Minimized Selected Branches Preview (Prevents Overflow when up to 30 branches are chosen) */}
                {selectedBranches.length > 0 && (
                  <div className="rounded-xl border border-[#003498]/20 bg-[#003498]/5 p-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-[#003498]">
                          ✓ {selectedBranches.length} selected:
                        </span>
                        {/* Show first 3 selected branches */}
                        {selectedBranches.slice(0, 3).map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1 rounded-md bg-white border border-[#003498]/20 px-2 py-0.5 text-[11px] font-semibold text-[#003498]"
                          >
                            <span className="truncate max-w-[110px]">{name}</span>
                            <button
                              type="button"
                              onClick={() => toggleBranch(name)}
                              className="text-gray-400 hover:text-red-600 font-bold ml-0.5"
                              aria-label={`Remove ${name}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {/* Show +N more toggle button if more than 3 branches selected */}
                        {selectedBranches.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setIsBranchesExpanded(!isBranchesExpanded)}
                            className="inline-flex items-center gap-1 rounded-md bg-[#F9A804] px-2 py-0.5 text-[11px] font-bold text-[#00246B] hover:brightness-105 transition"
                          >
                            +{selectedBranches.length - 3} more {isBranchesExpanded ? '▴' : '▾'}
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={clearBranchSelection}
                        className="text-[11px] font-bold text-[#003498] hover:text-red-600 hover:underline shrink-0"
                      >
                        Clear All
                      </button>
                    </div>

                    {/* Expandable Scrollable Tray (Capped at 80px so it NEVER overflows the form) */}
                    {isBranchesExpanded && selectedBranches.length > 3 && (
                      <div className="mt-2 pt-2 border-t border-[#003498]/15 flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                        {selectedBranches.map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1 rounded-md bg-white border border-[#003498]/30 px-2 py-0.5 text-[11px] font-medium text-[#102d54]"
                          >
                            <span className="truncate max-w-[130px]">{name}</span>
                            <button
                              type="button"
                              onClick={() => toggleBranch(name)}
                              className="text-gray-400 hover:text-red-600 font-bold ml-0.5"
                              aria-label={`Remove ${name}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Compact Outage Reason Cards */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#003498]">
                  2. Outage Reason <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* ELPA */}
                  <button
                    type="button"
                    onClick={() => setForm((curr) => ({ ...curr, reason: 'ELPA' }))}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                      form.reason === 'ELPA'
                        ? 'border-[#F9A804] bg-[#F9A804]/10 ring-2 ring-[#F9A804]'
                        : 'border-[#dce4ee] bg-white hover:border-[#F9A804]/60'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F9A804] text-[#00246B] text-base font-bold shadow-xs">
                      ⚡
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-[#102d54] truncate">ELPA (Power)</p>
                        {form.reason === 'ELPA' && (
                          <span className="text-[10px] font-bold text-[#00246B]">● Selected</span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#718096] truncate">Electrical power outage</p>
                    </div>
                  </button>

                  {/* Ethio Telecom */}
                  <button
                    type="button"
                    onClick={() => setForm((curr) => ({ ...curr, reason: 'Ethio Telecom' }))}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                      form.reason === 'Ethio Telecom'
                        ? 'border-[#003498] bg-[#003498]/10 ring-2 ring-[#003498]'
                        : 'border-[#dce4ee] bg-white hover:border-[#003498]/60'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#003498] text-[#F9A804] text-base font-bold shadow-xs">
                      🌐
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-[#102d54] truncate">Ethio Telecom</p>
                        {form.reason === 'Ethio Telecom' && (
                          <span className="text-[10px] font-bold text-[#003498]">● Selected</span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#718096] truncate">Network link down</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Date & Optional Notes (Compact Side-by-Side) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <Field
                    label="Report Date"
                    name="incidentDate"
                    value={form.incidentDate}
                    onChange={handleChange}
                    required
                    type="date"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field
                    label="Notes / Cause (Optional)"
                    name="remark"
                    value={form.remark}
                    onChange={handleChange}
                    type="text"
                    placeholder="e.g. Substation maintenance, fiber cut, or ticket #..."
                  />
                </div>
              </div>
            </div>

            {/* Pinned Modal Footer (Never pushed off screen) */}
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-[#fbfcfe] px-6 py-3">
              <span className="text-xs font-medium text-[#718096]">
                {selectedBranches.length === 0 ? (
                  <span className="text-amber-700 font-semibold">⚠️ Select branches above</span>
                ) : (
                  <span>
                    Registering <strong>{selectedBranches.length}</strong> branch{selectedBranches.length > 1 ? 'es' : ''} ({form.reason})
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-xl border border-[#dce4ee] px-4 py-2 text-xs font-semibold text-[#52657d] hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || selectedBranches.length === 0}
                  className="rounded-xl bg-[#003498] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#00246B] transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving
                    ? 'Registering...'
                    : selectedBranches.length === 0
                    ? 'Select Branches'
                    : selectedBranches.length === 1
                    ? 'Register 1 Branch'
                    : `Register All (${selectedBranches.length} Branches)`}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Monthly Registrations List */}
      <section className="mt-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-[#102d54]">Recorded Outage Incidents</h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-[#52657d]">
              Filter month:
              <input
                type="month"
                value={selectedMonth}
                onChange={handleMonthChange}
                className="rounded-xl border border-[#dce4ee] bg-white px-3 py-1.5 text-xs font-normal text-[#1f2937] outline-none focus:border-[#003498]"
              />
              {selectedMonth && (
                <button type="button" onClick={() => setSelectedMonth('')} className="font-bold text-[#003498] hover:underline">
                  Clear
                </button>
              )}
            </label>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-xl border border-[#003498] bg-white px-3.5 py-1.5 text-xs font-bold text-[#003498] hover:bg-[#003498] hover:text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>{isExporting ? 'Generating...' : 'Download PDF Summary'}</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-[#cbd7e5] bg-white p-8 text-center text-sm text-[#718096]">
            <span className="inline-block h-5 w-5 mr-2 animate-spin rounded-full border-2 border-[#003498] border-t-transparent align-middle" />
            Loading network outage registrations...
          </div>
        ) : monthGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#cbd7e5] bg-white p-8 text-center text-sm text-[#718096]">
            No network registrations found for this period.
          </div>
        ) : (
          monthGroups.map((group) => (
            <div
              key={getMonthKey(group.date)}
              className="rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_4px_16px_rgba(16,45,84,0.04)]"
            >
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#102d54] text-base">{getMonthLabel(group.date)}</h3>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
                    {group.entries.length} incidents
                  </span>
                </div>
                <span className="text-xs text-[#718096]">
                  {group.entries.filter((e) => e.reason === 'ELPA').length} ELPA •{' '}
                  {group.entries.filter((e) => e.reason === 'Ethio Telecom').length} Telecom
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.entries.map((entry) => {
                  const isElpa = entry.reason === 'ELPA'
                  return (
                    <article
                      key={entry.id}
                      className="rounded-xl border border-[#edf1f5] p-4 text-sm text-[#52657d] hover:border-gray-300 transition bg-[#fafbfc]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <strong className="text-sm font-bold text-[#102d54]">{entry.branchName}</strong>
                        <span className="text-xs text-[#718096]">
                          {new Date(`${entry.incidentDate}T00:00:00`).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                            isElpa
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          <span>{isElpa ? '⚡' : '🌐'}</span>
                          <span>{entry.reason === 'Ethio Telecom' ? 'Ethio Telecom (Network)' : 'ELPA (Power)'}</span>
                        </span>
                      </div>
                      {entry.remark && (
                        <p className="mt-2 text-xs text-[#52657d] italic bg-white p-2 rounded-lg border border-[#eef2f6]">
                          "{entry.remark}"
                        </p>
                      )}
                    </article>
                  )
                })}
              </div>
            </div>
          ))
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
