import { useEffect, useMemo, useState } from 'react'
import { useDashboardToast } from '../../shared/components/dashboardToast.js'
import { fetchBranches, setBranchManagerEdit } from './branchStore.js'
import { fetchAmbassadors } from '../service-desk-manager/ambassadorStore.js'
import {
  COMPUTER_JOB_OPTIONS,
  computerJobLabel,
  createWorkbookRow,
  deleteWorkbookRow,
  fetchWorkbookRows,
  updateWorkbookRow,
} from './computerWorkbookStore.js'
import ComputerReportButton from './ComputerReportButton.jsx'

const PAGE_SIZE = 30

const emptyRow = {
  branchId: '',
  ipAddress: '',
  computerName: '',
  computerModel: '',
  computerJob: '',
  chequeScanner: 'No',
  operatingSystem: '',
  status: 'Active',
  networkAgent: '',
  endpoint: '',
  kasperskyStatus: 'Updated',
  remark: '',
}

const fieldClass =
  'min-h-10 w-full rounded-xl border border-[#e3e8ef] bg-white px-3 text-sm text-[#1f2937] outline-none transition placeholder:text-[#a0aec0] focus:border-[#003498] focus:ring-2 focus:ring-[#003498]/15'

function WorkbookInput({ name, label, value, onChange, required = false, type = 'text', placeholder = '', maxLength }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[#52657d]">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        className={fieldClass}
      />
    </label>
  )
}

function WorkbookSelect({ name, label, value, onChange, children, required = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[#52657d]">{label}</span>
      <select name={name} value={value} onChange={onChange} required={required} className={fieldClass}>
        {children}
      </select>
    </label>
  )
}

function Tag({ children, tone = 'plain' }) {
  const tones = {
    plain: 'bg-[#f1f4f9] text-[#52657d]',
    blue: 'bg-[#e8eefb] text-[#003498]',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
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

export function ComputerWorkbookContent({ onBack, username, roleId = 'ambassador' }) {
  const { notify } = useDashboardToast()
  const isManager = roleId === 'service-desk-manager'
  const [branches, setBranches] = useState([])
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyRow)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [filterAmbassador, setFilterAmbassador] = useState('')
  const [filterKaspersky, setFilterKaspersky] = useState('')
  const [ambassadors, setAmbassadors] = useState([])
  const [permissionBranchId, setPermissionBranchId] = useState('')
  const [isTogglingEdit, setIsTogglingEdit] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    Promise.all([fetchBranches(), fetchWorkbookRows(), fetchAmbassadors()])
      .then(([loadedBranches, loadedRows, loadedAmbassadors]) => {
        setBranches(isManager ? loadedBranches : loadedBranches.filter((branch) => branch.createdBy === username))
        setRows(loadedRows)
        setAmbassadors(loadedAmbassadors)
      })
      .catch((loadError) => {
        setError(loadError.message)
        notify(loadError.message)
      })
      .finally(() => setIsLoading(false))
  }, [isManager, notify, username])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)
    try {
      const savedRow = editingId
        ? await updateWorkbookRow(editingId, form)
        : await createWorkbookRow(form)
      setRows((current) =>
        editingId
          ? current.map((row) => (row.id === editingId ? savedRow : row))
          : [savedRow, ...current],
      )
      setForm(emptyRow)
      setEditingId(null)
      setIsFormOpen(false)
      notify(editingId ? 'Computer & Kaspersky details updated.' : 'Computer & Kaspersky registered successfully.', 'success')
    } catch (saveError) {
      const message = Object.values(saveError.errors || {}).flat()[0] || saveError.message
      setError(message)
      notify(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this computer record?')) return
    try {
      await deleteWorkbookRow(id)
      setRows((current) => current.filter((row) => row.id !== id))
      notify('Computer record deleted.', 'success')
    } catch (deleteError) {
      setError(deleteError.message)
      notify(deleteError.message)
    }
  }

  function editRow(row) {
    setForm({
      branchId: row.branchId || '',
      ipAddress: row.ipAddress || '',
      computerName: row.computerName || '',
      computerModel: row.computerModel || '',
      computerJob: row.computerJob || '',
      chequeScanner: row.chequeScanner || 'No',
      operatingSystem: row.operatingSystem || '',
      status: row.status || 'Active',
      networkAgent: row.networkAgent || '',
      endpoint: row.endpoint || '',
      kasperskyStatus: row.kasperskyStatus || 'Updated',
      remark: row.remark || '',
    })
    setEditingId(row.id)
    setIsFormOpen(true)
  }

  function startNewComputer() {
    setError('')
    setForm(emptyRow)
    setEditingId(null)
    setIsFormOpen(true)
  }

  const selectedPermissionBranch = branches.find((branch) => String(branch.id) === String(permissionBranchId))
  const isManagerEditOn = Boolean(selectedPermissionBranch?.managerCanEdit)

  async function handleToggleManagerEdit() {
    if (!selectedPermissionBranch) return
    setIsTogglingEdit(true)
    try {
      const saved = await setBranchManagerEdit(selectedPermissionBranch.id, !selectedPermissionBranch.managerCanEdit)
      setBranches((current) =>
        current.map((branch) => (branch.id === saved.id ? { ...branch, managerCanEdit: saved.managerCanEdit } : branch)),
      )
      notify(
        saved.managerCanEdit
          ? 'Branch manager can now update the Net Agent and Endpoint of this branch.'
          : 'Branch manager editing turned off for this branch.',
        'success',
      )
    } catch (toggleError) {
      notify(Object.values(toggleError.errors || {}).flat()[0] || toggleError.message)
    } finally {
      setIsTogglingEdit(false)
    }
  }

  const branchName = (branchId) =>
    branches.find((branch) => String(branch.id) === String(branchId))?.branchName || 'Unknown branch'

  // One search box for everything: the text of each row is built once, then every typed word must match
  const indexedRows = useMemo(
    () =>
      rows.map((row) => ({
        row,
        text: [
          row.ipAddress,
          row.computerName,
          row.computerModel,
          computerJobLabel(row.computerJob),
          row.chequeScanner === 'Yes' ? 'cheque scanner' : '',
          row.networkAgent,
          row.endpoint,
        ]
          .join(' ')
          .toLowerCase(),
      })),
    [rows],
  )

  // Filtered computers, sorted by branch so each branch forms one group
  const filteredRows = useMemo(() => {
    const tokens = searchText.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return indexedRows
      .filter(({ row, text }) => {
        const matchesSearch = tokens.every((token) => text.includes(token))
        const matchesBranch = !filterBranch || String(row.branchId) === String(filterBranch)
        const matchesAmbassador =
          !filterAmbassador || String(row.ambassadorName).toLowerCase().includes(filterAmbassador.toLowerCase())
        const matchesKaspersky = !filterKaspersky || String(row.kasperskyStatus) === filterKaspersky
        return matchesSearch && matchesBranch && matchesAmbassador && matchesKaspersky
      })
      .map(({ row }) => row)
      .sort(
        (a, b) =>
          branchName(a.branchId).localeCompare(branchName(b.branchId))
          || String(a.ipAddress).localeCompare(String(b.ipAddress), undefined, { numeric: true }),
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexedRows, branches, searchText, filterBranch, filterAmbassador, filterKaspersky])

  useEffect(() => setVisibleCount(PAGE_SIZE), [searchText, filterBranch, filterAmbassador, filterKaspersky])

  // Per-branch totals (over everything that matches) and the rows shown so far
  const branchStats = useMemo(() => {
    const stats = new Map()
    for (const row of filteredRows) {
      const key = String(row.branchId)
      const entry = stats.get(key) || { count: 0, needUpdate: 0 }
      entry.count += 1
      if (row.kasperskyStatus === 'Not updated') entry.needUpdate += 1
      stats.set(key, entry)
    }
    return stats
  }, [filteredRows])

  const groups = useMemo(() => {
    const result = []
    for (const row of filteredRows.slice(0, visibleCount)) {
      const key = String(row.branchId)
      const last = result[result.length - 1]
      if (last && last.key === key) last.items.push(row)
      else result.push({ key, branchId: row.branchId, owner: row.ambassadorName, items: [row] })
    }
    return result
  }, [filteredRows, visibleCount])

  const updatedCount = rows.filter((row) => row.kasperskyStatus === 'Updated').length
  const needsUpdateCount = rows.filter((row) => row.kasperskyStatus === 'Not updated').length
  const hasFilters = Boolean(searchText || filterBranch || filterAmbassador || filterKaspersky)

  return (
    <div className="mx-auto max-w-5xl text-[#1f2937]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#102d54]">{isManager ? 'Computers' : 'My computers'}</h1>
          <p className="mt-1 text-sm text-[#718096]">
            {isManager
              ? 'Every branch computer and its Kaspersky status.'
              : 'The computers of your branches and their Kaspersky status.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ComputerReportButton rows={rows} branches={branches} />
          <button
            type="button"
            onClick={startNewComputer}
            className="rounded-full bg-[#003498] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#00246B]"
          >
            + Add a computer
          </button>
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
      </div>

      {error && (
        <p className="mb-4 rounded-2xl bg-[#fdeceb] px-4 py-3 text-sm text-[#b3372f]" role="alert">
          {error}
        </p>
      )}

      {/* Add / Edit Computer Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#102d54]/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="my-8 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#102d54]">{editingId ? 'Edit computer' : 'Add a computer'}</h2>
                <p className="mt-1 text-sm text-[#718096]">Fill in the computer and its Kaspersky details.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8a98ab] transition hover:bg-[#f1f4f9] hover:text-[#1f2937]"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <WorkbookSelect name="branchId" label="Branch" value={form.branchId} onChange={handleChange} required>
                <option value="">Select branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branchName}
                  </option>
                ))}
              </WorkbookSelect>
              <WorkbookInput
                name="ipAddress"
                label="IP address"
                value={form.ipAddress}
                onChange={handleChange}
                required
                placeholder="e.g. 10.10.12.34"
              />
              <WorkbookInput
                name="computerName"
                label="Computer name (optional)"
                value={form.computerName}
                onChange={handleChange}
                placeholder="e.g. BRH-BOLE-PC01"
              />
              <WorkbookInput
                name="computerModel"
                label="Computer model (optional)"
                value={form.computerModel}
                onChange={handleChange}
                maxLength={100}
                placeholder="e.g. OptiPlex 5070"
              />
              <WorkbookSelect name="computerJob" label="Computer job" value={form.computerJob} onChange={handleChange} required>
                <option value="">Select job</option>
                {COMPUTER_JOB_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </WorkbookSelect>
              <WorkbookSelect
                name="chequeScanner"
                label="Cheque scanner computer"
                value={form.chequeScanner}
                onChange={handleChange}
                required
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </WorkbookSelect>
              <WorkbookSelect name="operatingSystem" label="Operating system" value={form.operatingSystem} onChange={handleChange} required>
                <option value="">Select OS</option>
                <option value="Windows 10">Windows 10</option>
                <option value="Windows 11">Windows 11</option>
              </WorkbookSelect>
              <WorkbookSelect name="status" label="Computer status" value={form.status} onChange={handleChange} required>
                <option value="Active">Active</option>
                <option value="Not active">Not active</option>
              </WorkbookSelect>
            </div>

            <div className="mt-6 rounded-2xl bg-[#f6f8fb] p-4">
              <p className="mb-3 text-sm font-semibold text-[#102d54]">Kaspersky</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <WorkbookInput
                  name="networkAgent"
                  label="Net Agent IP / version"
                  value={form.networkAgent}
                  onChange={handleChange}
                  placeholder="e.g. 192.168.1.10 or 14.2"
                />
                <WorkbookInput
                  name="endpoint"
                  label="Endpoint IP / version"
                  value={form.endpoint}
                  onChange={handleChange}
                  placeholder="e.g. 192.168.1.10 or 12.5"
                />
                <WorkbookSelect name="kasperskyStatus" label="Status" value={form.kasperskyStatus} onChange={handleChange}>
                  <option value="Updated">Updated</option>
                  <option value="Not updated">Not updated</option>
                </WorkbookSelect>
              </div>
            </div>

            <label className="mt-6 block">
              <span className="mb-1 block text-xs font-semibold text-[#52657d]">Any issue? (optional)</span>
              <textarea
                name="remark"
                value={form.remark}
                onChange={handleChange}
                rows="3"
                maxLength={255}
                placeholder="e.g. slow, no internet, Kaspersky not updating"
                className={`${fieldClass} resize-none py-2`}
              />
              <span className="mt-1 block text-right text-[11px] text-[#8a98ab]">{form.remark.length}/255</span>
            </label>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setForm(emptyRow)
                  setEditingId(null)
                  setIsFormOpen(false)
                }}
                className="rounded-full px-5 py-2 text-sm font-medium text-[#52657d] transition hover:bg-[#f1f4f9]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-full bg-[#003498] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#00246B] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Add computer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Branch manager editing switch */}
      <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f6f8fb] px-5 py-4">
        <h2 className="text-sm font-semibold text-[#102d54]">Let a branch manager edit Kaspersky</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-52">
            <select
              aria-label="Branch"
              value={permissionBranchId}
              onChange={(event) => setPermissionBranchId(event.target.value)}
              className={fieldClass}
            >
              <option value="">Select branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branchName}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isManagerEditOn}
            disabled={!selectedPermissionBranch || isTogglingEdit}
            onClick={handleToggleManagerEdit}
            className="flex min-h-10 items-center gap-2.5 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-[#52657d] transition hover:text-[#003498] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${isManagerEditOn ? 'bg-emerald-500' : 'bg-gray-300'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${isManagerEditOn ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </span>
            {isTogglingEdit ? 'Saving...' : isManagerEditOn ? 'Editing on' : 'Editing off'}
          </button>
        </div>
      </section>

      {/* Search and filters */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          <WorkbookInput
            name="search"
            label="Search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="IP, name, model, job, cheque scanner..."
          />
        </div>
        <div className="w-44">
          <WorkbookSelect name="filterBranch" label="Branch" value={filterBranch} onChange={(event) => setFilterBranch(event.target.value)}>
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.branchName}
              </option>
            ))}
          </WorkbookSelect>
        </div>
        {isManager && (
          <div className="w-44">
            <WorkbookSelect
              name="filterAmbassador"
              label="Ambassador"
              value={filterAmbassador}
              onChange={(event) => setFilterAmbassador(event.target.value)}
            >
              <option value="">All ambassadors</option>
              {ambassadors.map((ambassador) => (
                <option key={ambassador.id} value={ambassador.name}>
                  {ambassador.name}
                </option>
              ))}
            </WorkbookSelect>
          </div>
        )}
        <div className="w-44">
          <WorkbookSelect
            name="filterKaspersky"
            label="Kaspersky"
            value={filterKaspersky}
            onChange={(event) => setFilterKaspersky(event.target.value)}
          >
            <option value="">Any status</option>
            <option value="Updated">Updated</option>
            <option value="Not updated">Not updated</option>
          </WorkbookSelect>
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearchText('')
              setFilterBranch('')
              setFilterAmbassador('')
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
          {filteredRows.length} {filteredRows.length === 1 ? 'computer' : 'computers'}
          {hasFilters && <span className="ml-2 font-normal text-[#8a98ab]">of {rows.length}</span>}
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

      {/* Computers, one card per branch */}
      {isLoading ? (
        <p className="rounded-2xl bg-[#f6f8fb] px-4 py-10 text-center text-sm text-[#718096]">
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#003498] border-t-transparent align-middle" />
          Loading computers...
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-[#f6f8fb] px-4 py-14 text-center">
          <p className="text-base font-semibold text-[#102d54]">No computers yet</p>
          <p className="mt-1 text-sm text-[#718096]">Add your first computer to start tracking its Kaspersky status.</p>
          <button
            type="button"
            onClick={startNewComputer}
            className="mt-5 rounded-full bg-[#003498] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#00246B]"
          >
            + Add a computer
          </button>
        </div>
      ) : filteredRows.length === 0 ? (
        <p className="rounded-2xl bg-[#f6f8fb] px-4 py-10 text-center text-sm text-[#718096]">
          No computers match what you're looking for.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const name = branchName(group.branchId)
            const stats = branchStats.get(group.key) || { count: group.items.length, needUpdate: 0 }
            return (
              <details key={group.key} open className="group overflow-hidden rounded-2xl border border-[#e8edf3] bg-white">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 transition hover:bg-[#f8fafc] [&::-webkit-details-marker]:hidden">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8eefb] text-base font-bold text-[#003498]">
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold text-[#102d54]">{name}</span>
                    <span className="block truncate text-xs text-[#8a98ab]">
                      {isManager && group.owner ? `${group.owner} • ` : ''}
                      {stats.count} {stats.count === 1 ? 'computer' : 'computers'}
                    </span>
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      stats.needUpdate === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {stats.needUpdate === 0 ? 'All up to date' : `${stats.needUpdate} need an update`}
                  </span>
                  <span className="text-[#8a98ab] transition group-open:rotate-180" aria-hidden="true">
                    ▾
                  </span>
                </summary>

                <ul className="divide-y divide-[#f0f3f7] border-t border-[#f0f3f7]">
                  {group.items.map((row) => {
                    const isUpdated = row.kasperskyStatus === 'Updated'
                    const subline = [row.computerName ? row.ipAddress : '', row.computerModel].filter(Boolean).join(' • ')
                    return (
                      <li key={row.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 transition hover:bg-[#fafbfd]">
                        <div className="min-w-[13rem] flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-300'}`}
                              title={row.status}
                            />
                            <p className="truncate text-sm font-semibold text-[#102d54]">{row.computerName || row.ipAddress}</p>
                          </div>
                          {subline && <p className="mt-0.5 pl-[18px] text-xs text-[#8a98ab]">{subline}</p>}
                          <div className="mt-2 flex flex-wrap gap-1.5 pl-[18px]">
                            {row.computerJob && <Tag>{computerJobLabel(row.computerJob)}</Tag>}
                            {row.operatingSystem && <Tag>{row.operatingSystem}</Tag>}
                            {row.chequeScanner === 'Yes' && <Tag tone="blue">Cheque scanner</Tag>}
                            {row.status !== 'Active' && <Tag>{row.status}</Tag>}
                          </div>
                        </div>

                        <div className="grid min-w-[12rem] flex-1 grid-cols-2 gap-4">
                          <Detail label="Net Agent">{row.networkAgent || '—'}</Detail>
                          <Detail label="Endpoint">{row.endpoint || '—'}</Detail>
                        </div>

                        <div className="flex items-center gap-1">
                          {row.kasperskyStatus ? (
                            <span
                              className={`mr-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                isUpdated ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${isUpdated ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              {row.kasperskyStatus}
                            </span>
                          ) : (
                            <span className="mr-2 text-xs italic text-gray-400">No status</span>
                          )}
                          <button
                            type="button"
                            onClick={() => editRow(row)}
                            className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#003498] transition hover:bg-[#e8eefb]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#b3372f] transition hover:bg-[#fdeceb]"
                          >
                            Delete
                          </button>
                        </div>

                        {row.remark && (
                          <p className="w-full rounded-xl bg-[#fff6e0] px-3 py-2 text-xs text-[#8a5a00]">
                            <span className="font-semibold">Issue:</span> {row.remark}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </details>
            )
          })}

          {filteredRows.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="w-full rounded-2xl bg-[#f6f8fb] py-3 text-sm font-semibold text-[#003498] transition hover:bg-[#e8eefb]"
            >
              Show {Math.min(PAGE_SIZE, filteredRows.length - visibleCount)} more ({filteredRows.length - visibleCount} not shown yet)
            </button>
          )}
        </div>
      )}

      <p className="mt-6 text-xs text-[#8a98ab]">Signed in as {username}</p>
    </div>
  )
}