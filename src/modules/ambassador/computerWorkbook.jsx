import { useEffect, useState } from 'react'
import { useDashboardToast } from '../../shared/components/dashboardToast.js'
import { fetchBranches } from './branchStore.js'
import { fetchAmbassadors } from '../service-desk-manager/ambassadorStore.js'
import {
  createWorkbookRow,
  deleteWorkbookRow,
  fetchWorkbookRows,
  updateWorkbookRow,
} from './computerWorkbookStore.js'

const emptyRow = {
  branchId: '',
  ipAddress: '',
  computerName: '',
  computerJob: '',
  operatingSystem: '',
  status: 'Active',
  networkAgent: '',
  endpoint: '',
  kasperskyStatus: 'Updated',
}

function WorkbookInput({ name, label, value, onChange, required = false, type = 'text', placeholder = '' }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#52657d]">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="min-h-9 w-full rounded-md border border-[#dce4ee] bg-[#fbfcfe] px-2.5 text-xs text-[#1f2937] outline-none transition focus:border-[#003498] focus:ring-2 focus:ring-[#003498]/20"
      />
    </label>
  )
}

function WorkbookSelect({ name, label, value, onChange, children, required = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#52657d]">{label}</span>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="min-h-9 w-full rounded-md border border-[#dce4ee] bg-[#fbfcfe] px-2.5 text-xs text-[#1f2937] outline-none transition focus:border-[#003498] focus:ring-2 focus:ring-[#003498]/20"
      >
        {children}
      </select>
    </label>
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
      computerJob: row.computerJob || '',
      operatingSystem: row.operatingSystem || '',
      status: row.status || 'Active',
      networkAgent: row.networkAgent || '',
      endpoint: row.endpoint || '',
      kasperskyStatus: row.kasperskyStatus || 'Updated',
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

  const branchName = (branchId) =>
    branches.find((branch) => String(branch.id) === String(branchId))?.branchName || 'Unknown branch'

  const filteredRows = rows.filter((row) => {
    const query = searchText.trim().toLowerCase()
    const matchesSearch =
      !query ||
      String(row.ipAddress).toLowerCase().includes(query) ||
      String(row.computerName).toLowerCase().includes(query) ||
      String(row.networkAgent).toLowerCase().includes(query) ||
      String(row.endpoint).toLowerCase().includes(query)
    const matchesBranch = !filterBranch || String(row.branchId) === String(filterBranch)
    const matchesAmbassador =
      !filterAmbassador || String(row.ambassadorName).toLowerCase().includes(filterAmbassador.toLowerCase())
    const matchesKaspersky = !filterKaspersky || String(row.kasperskyStatus) === filterKaspersky
    return matchesSearch && matchesBranch && matchesAmbassador && matchesKaspersky
  })

  return (
    <div className="mx-auto max-w-[90rem]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#e09f1f]">
            {isManager ? 'Service desk operations' : 'Ambassador workspace'}
          </p>
          <h1 className="text-2xl font-bold text-[#102d54]">{isManager ? 'Computer & Kaspersky Management' : 'My Computers & Kaspersky'}</h1>
          <p className="mt-1 text-xs text-[#718096]">
            Register and manage branch computer workstations, hardware specs, and Kaspersky antivirus compliance in one place.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={startNewComputer}
            className="rounded-xl bg-[#003498] px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-[#00246B] transition"
          >
            + Add Computer
          </button>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-[#dce4ee] px-4 py-2 text-sm font-semibold text-[#52657d] hover:border-[#003498] hover:text-[#003498] transition"
            >
              Back
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-[#f2c5c2] bg-[#fff7f6] p-3 text-sm text-[#c2413b]" role="alert">
          {error}
        </p>
      )}

      {isLoading && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-[#dce4ee] bg-white p-3 text-sm text-[#718096]" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#003498] border-t-transparent" />
          Loading computers...
        </p>
      )}

      {/* Add / Edit Computer Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102d54]/60 backdrop-blur-sm p-4 overflow-y-auto">
          <form
            onSubmit={handleSubmit}
            className="my-8 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#e5ebf2] bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-[#102d54]">
                  {editingId ? 'Edit Computer Record' : 'Register New Computer'}
                </h2>
                <p className="mt-0.5 text-xs text-[#718096]">
                  Enter workstation specifications and Kaspersky antivirus status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition font-bold"
              >
                ✕
              </button>
            </div>

            {/* Computer Specs */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#003498]">
                1. Computer Information
              </p>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
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
                  label="Computer IP Address"
                  value={form.ipAddress}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 10.10.12.34"
                />
                <WorkbookInput
                  name="computerName"
                  label="Computer Name (Optional)"
                  value={form.computerName}
                  onChange={handleChange}
                  placeholder="e.g. BRH-BOLE-PC01"
                />
                <WorkbookSelect name="computerJob" label="Computer Job" value={form.computerJob} onChange={handleChange} required>
                  <option value="">Select job</option>
                  <option value="MTO">MTO</option>
                  <option value="Normal">Normal</option>
                </WorkbookSelect>
                <WorkbookSelect name="operatingSystem" label="Operating System" value={form.operatingSystem} onChange={handleChange} required>
                  <option value="">Select OS</option>
                  <option value="Windows 10">Windows 10</option>
                  <option value="Windows 11">Windows 11</option>
                </WorkbookSelect>
                <WorkbookSelect name="status" label="Computer Status" value={form.status} onChange={handleChange} required>
                  <option value="Active">Active</option>
                  <option value="Not active">Not active</option>
                </WorkbookSelect>
              </div>
            </div>

            {/* Kaspersky Antivirus Section (Merged into Computer Management!) */}
            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#003498] flex items-center gap-1.5">
                <span>🛡️</span>
                <span>2. Kaspersky Antivirus Details</span>
              </p>
              <div className="grid gap-3 sm:grid-cols-3 bg-[#f8fafc] p-3.5 rounded-xl border border-[#e2e8f0]">
                <WorkbookInput
                  name="networkAgent"
                  label="Net Agent IP / Version"
                  value={form.networkAgent}
                  onChange={handleChange}
                  placeholder="e.g. 192.168.1.10 or 14.2"
                />
                <WorkbookInput
                  name="endpoint"
                  label="Endpoint Protection IP / Version"
                  value={form.endpoint}
                  onChange={handleChange}
                  placeholder="e.g. 192.168.1.10 or 12.5"
                />
                <WorkbookSelect
                  name="kasperskyStatus"
                  label="Kaspersky Status"
                  value={form.kasperskyStatus}
                  onChange={handleChange}
                >
                  <option value="Updated">Updated</option>
                  <option value="Not updated">Not updated</option>
                </WorkbookSelect>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setForm(emptyRow)
                  setEditingId(null)
                  setIsFormOpen(false)
                }}
                className="rounded-xl border border-[#dce4ee] px-5 py-2 text-xs font-semibold text-[#52657d] hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-[#003498] px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-[#00246B] transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Register Computer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <WorkbookSelect
            name="filterBranch"
            label="Filter by Branch"
            value={filterBranch}
            onChange={(event) => setFilterBranch(event.target.value)}
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.branchName}
              </option>
            ))}
          </WorkbookSelect>

          {isManager && (
            <WorkbookSelect
              name="filterAmbassador"
              label="Filter by Ambassador"
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
          )}

          <WorkbookSelect
            name="filterKaspersky"
            label="Filter by Kaspersky"
            value={filterKaspersky}
            onChange={(event) => setFilterKaspersky(event.target.value)}
          >
            <option value="">All Kaspersky statuses</option>
            <option value="Updated">Updated</option>
            <option value="Not updated">Not updated</option>
          </WorkbookSelect>

          <div className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#52657d]">
              Search IP / Name / Agent
            </span>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Type IP, computer name, or agent..."
              className="min-h-9 w-60 rounded-md border border-[#dce4ee] bg-[#fbfcfe] px-2.5 text-xs text-[#1f2937] outline-none transition focus:border-[#003498] focus:ring-2 focus:ring-[#003498]/20"
            />
          </div>
        </div>

        {(searchText || filterBranch || filterAmbassador || filterKaspersky) && (
          <button
            type="button"
            onClick={() => {
              setSearchText('')
              setFilterBranch('')
              setFilterAmbassador('')
              setFilterKaspersky('')
            }}
            className="rounded-xl border border-[#dce4ee] px-3 py-1.5 text-xs font-semibold text-[#52657d] hover:border-[#003498] hover:text-[#003498] transition"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Computer and Kaspersky Data Table */}
      <section className="mt-4 overflow-hidden rounded-2xl border border-[#e5ebf2] bg-white shadow-[0_8px_24px_rgba(16,45,84,0.05)]">
        <div className="flex items-center justify-between border-b border-[#e4eaf0] bg-[#f8fafc] px-5 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#102d54]">
              {isManager ? 'All Registered Computers & Kaspersky Status' : 'My Branch Computers & Kaspersky'}
            </h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
              {filteredRows.length} of {rows.length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#52657d]">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              ● {rows.filter((r) => r.kasperskyStatus === 'Updated').length} Updated
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
              ▲ {rows.filter((r) => r.kasperskyStatus === 'Not updated').length} Needs Update
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[68rem]">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_0.7fr_0.8fr_0.8fr_0.9fr_0.9fr_0.9fr_auto] gap-2.5 border-b border-[#dfe8ee] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#52657d] bg-[#fdfefe]">
              <span>Branch</span>
              <span>Computer IP</span>
              <span>Computer Name</span>
              <span>Job</span>
              <span>OS</span>
              <span>Status</span>
              <span>Net Agent</span>
              <span>Endpoint</span>
              <span>Kaspersky</span>
              <span className="text-right">Actions</span>
            </div>

            {isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-[#718096]">Loading computers and Kaspersky status...</p>
            ) : filteredRows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#718096]">No computers found matching your criteria.</p>
            ) : (
              filteredRows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[1.2fr_1fr_1fr_0.7fr_0.8fr_0.8fr_0.9fr_0.9fr_0.9fr_auto] items-center gap-2.5 border-b border-[#edf1f5] px-4 py-3 text-xs text-[#52657d] last:border-0 hover:bg-blue-50/20 transition-colors"
                >
                  <span className="font-semibold text-[#102d54] truncate">{branchName(row.branchId)}</span>
                  <span className="font-mono text-[11px] text-[#102d54]">{row.ipAddress}</span>
                  <span className="truncate">{row.computerName || '—'}</span>
                  <span>{row.computerJob || '—'}</span>
                  <span>{row.operatingSystem}</span>
                  <span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        row.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {row.status}
                    </span>
                  </span>
                  <span className="font-mono text-[11px]">{row.networkAgent || '—'}</span>
                  <span className="font-mono text-[11px]">{row.endpoint || '—'}</span>
                  <span>
                    {row.kasperskyStatus ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          row.kasperskyStatus === 'Updated'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        <span>{row.kasperskyStatus === 'Updated' ? '✓' : '▲'}</span>
                        <span>{row.kasperskyStatus}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 italic text-[11px]">—</span>
                    )}
                  </span>
                  <div className="flex items-center justify-end gap-3 text-right">
                    <button
                      type="button"
                      onClick={() => editRow(row)}
                      className="font-bold text-[#003498] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      className="font-bold text-[#c2413b] hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
      <p className="mt-3 text-xs text-[#718096]">Signed in as {username}.</p>
    </div>
  )
}
