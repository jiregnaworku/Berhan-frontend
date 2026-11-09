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
  status: '',
}

function WorkbookInput({ name, label, value, onChange, required = false, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#52657d]">{label}</span>
      <input name={name} type={type} value={value} onChange={onChange} required={required} className="min-h-9 w-full rounded-md border border-[#dce4ee] bg-[#fbfcfe] px-2.5 text-xs text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-2 focus:ring-[#1d5b9e]/[0.14]" />
    </label>
  )
}

function WorkbookSelect({ name, label, value, onChange, children, required = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#52657d]">{label}</span>
      <select name={name} value={value} onChange={onChange} required={required} className="min-h-9 w-full rounded-md border border-[#dce4ee] bg-[#fbfcfe] px-2.5 text-xs text-[#1f2937] outline-none focus:border-[#1d5b9e]">
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
      setRows((current) => editingId
        ? current.map((row) => row.id === editingId ? savedRow : row)
        : [savedRow, ...current])
      setForm(emptyRow)
      setEditingId(null)
      setIsFormOpen(false)
      notify(editingId ? 'Computer updated successfully.' : 'Computer added successfully.', 'success')
    } catch (saveError) {
      const message = Object.values(saveError.errors || {}).flat()[0] || saveError.message
      setError(message)
      notify(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteWorkbookRow(id)
      setRows((current) => current.filter((row) => row.id !== id))
    } catch (deleteError) {
      setError(deleteError.message)
      notify(deleteError.message)
    }
  }

  function editRow(row) {
    setForm(row)
    setEditingId(row.id)
    setIsFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startNewComputer() {
    setError('')
    setForm(emptyRow)
    setEditingId(null)
    setIsFormOpen(true)
  }

  const branchName = (branchId) => branches.find((branch) => String(branch.id) === String(branchId))?.branchName || 'Unknown branch'

  const filteredRows = rows.filter((row) => {
    const query = searchText.trim().toLowerCase()
    const matchesSearch = !query
      || String(row.ipAddress).toLowerCase().includes(query)
      || String(row.computerName).toLowerCase().includes(query)
    const matchesBranch = !filterBranch || String(row.branchId) === String(filterBranch)
    const matchesAmbassador = !filterAmbassador
      || String(row.ambassadorName).toLowerCase().includes(filterAmbassador.toLowerCase())
    return matchesSearch && matchesBranch && matchesAmbassador
  })

  return (
    <div className="mx-auto max-w-[90rem]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#e09f1f]">{isManager ? 'Service desk operations' : 'Ambassador workspace'}</p>
          <h1 className="text-2xl font-bold text-[#102d54]">{isManager ? 'Computers' : 'My computers'}</h1>
          <p className="mt-1 text-xs text-[#718096]">{isManager ? 'Full control of all ambassador computer records.' : 'Add computers for your branches.'}</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={startNewComputer} className="rounded-lg bg-[#102d54] px-4 py-2 text-sm font-bold text-white hover:bg-[#1d5b9e]">Add new</button>
          <button type="button" onClick={onBack} className="rounded-lg border border-[#dce4ee] px-4 py-2 text-sm font-semibold text-[#52657d] hover:border-[#1d5b9e] hover:text-[#1d5b9e]">Back</button>
        </div>
      </div>
      {error && <p className="mb-4 rounded-lg border border-[#f2c5c2] bg-[#fff7f6] p-3 text-sm text-[#c2413b]" role="alert">{error}</p>}
      {isLoading && <p className="mb-4 flex items-center gap-2 rounded-lg border border-[#dce4ee] bg-white p-3 text-sm text-[#718096]" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1d5b9e] border-t-transparent" />Loading computers...</p>}
      {isFormOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102d54]/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-4xl rounded-xl border border-[#e5ebf2] bg-white p-4 shadow-[0_8px_24px_rgba(16,45,84,0.12)]">
        <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-[#102d54]">{editingId ? 'Edit computer' : 'Add computer'}</h2><p className="mt-1 text-xs text-[#718096]">Add a computer record for one of your branches.</p></div><button type="button" onClick={() => setIsFormOpen(false)} className="text-sm font-bold text-[#718096] hover:text-[#102d54]">Close</button></div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <WorkbookSelect name="branchId" label="Branch" value={form.branchId} onChange={handleChange} required>
            <option value="">Select branch</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branchName}</option>)}
          </WorkbookSelect>
          <WorkbookInput name="ipAddress" label="Computer IP address" value={form.ipAddress} onChange={handleChange} required />
          <WorkbookInput name="computerName" label="Computer name (optional)" value={form.computerName} onChange={handleChange} />
          <WorkbookSelect name="computerJob" label="Computer job" value={form.computerJob} onChange={handleChange} required>
            <option value="">Select job</option>
            <option value="MTO">MTO</option>
            <option value="Normal">Normal</option>
          </WorkbookSelect>
          <WorkbookSelect name="operatingSystem" label="Operating system" value={form.operatingSystem} onChange={handleChange} required>
            <option value="">Select OS</option>
            <option value="Windows 10">Windows 10</option>
            <option value="Windows 11">Windows 11</option>
          </WorkbookSelect>
          <WorkbookSelect name="status" label="Computer status" value={form.status} onChange={handleChange} required>
            <option value="">Select status</option>
            <option value="Active">Active</option>
            <option value="Not active">Not active</option>
          </WorkbookSelect>
        </div>
        <div className="mt-4 flex gap-3">
          <button type="submit" disabled={isSaving} className="rounded-lg bg-[#102d54] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1d5b9e] disabled:cursor-not-allowed disabled:opacity-70">{isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Add computer'}</button>
          <button type="button" onClick={() => { setForm(emptyRow); setEditingId(null); setIsFormOpen(false) }} className="rounded-lg border border-[#dce4ee] px-5 py-2.5 text-sm font-semibold text-[#52657d]">Cancel</button>
        </div>
      </form>
      </div>}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <WorkbookSelect
            name="filterBranch"
            label="Search by branch"
            value={filterBranch}
            onChange={(event) => setFilterBranch(event.target.value)}
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.branchName}</option>
            ))}
          </WorkbookSelect>
          <WorkbookSelect
            name="filterAmbassador"
            label="Search by ambassador"
            value={filterAmbassador}
            onChange={(event) => setFilterAmbassador(event.target.value)}
          >
            <option value="">All ambassadors</option>
            {ambassadors.map((ambassador) => (
              <option key={ambassador.id} value={ambassador.name}>{ambassador.name}</option>
            ))}
          </WorkbookSelect>
          <div className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#52657d]">Search IP or computer name</span>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Type IP address or computer name..."
              className="min-h-9 w-full rounded-md border border-[#dce4ee] bg-[#fbfcfe] px-2.5 text-xs text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-2 focus:ring-[#1d5b9e]/[0.14]"
            />
          </div>
        </div>
        <button type="button" onClick={() => { setSearchText(''); setFilterBranch(''); setFilterAmbassador('') }} className="rounded-md border border-[#dce4ee] px-3 py-2 text-xs font-semibold text-[#52657d] hover:border-[#1d5b9e]">Clear filters</button>
      </div>
      <section className="mt-6 overflow-hidden rounded-xl border border-[#e5ebf2] bg-white shadow-[0_8px_24px_rgba(16,45,84,0.05)]">
        <div className="flex items-center justify-between border-b border-[#e4eaf0] bg-[#f4f8fa] px-4 py-3">
          <h2 className="text-sm font-bold text-[#075b78]">{isManager ? 'Saved computers' : 'My computers'}</h2>
          <span className="text-[11px] text-[#52657d]">{filteredRows.length} of {rows.length} computers</span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[58rem]">
            <div className="grid grid-cols-[1.2fr_1.1fr_1.2fr_0.8fr_0.9fr_0.9fr_auto] gap-3 border-b border-[#dfe8ee] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[#52657d]">
              <span>Branch</span><span>IP address</span><span>Computer name</span><span>Job</span><span>OS</span><span>Status</span><span>Actions</span>
            </div>
            {isLoading ? <p className="px-4 py-8 text-sm text-[#718096]">Loading computers...</p> : filteredRows.length === 0 ? <p className="px-4 py-8 text-sm text-[#718096]">No computers match your filters.</p> : filteredRows.map((row) => (
              <div key={row.id} className="grid grid-cols-[1.2fr_1.1fr_1.2fr_0.8fr_0.9fr_0.9fr_auto] items-center gap-3 border-b border-[#edf1f5] px-4 py-3 text-xs text-[#52657d] last:border-0">
                <span className="font-semibold text-[#102d54]">{branchName(row.branchId)}</span><span>{row.ipAddress}</span><span>{row.computerName || '—'}</span><span>{row.computerJob || '—'}</span><span>{row.operatingSystem}</span><span>{row.status}</span>
                <div className="flex gap-3"><button type="button" onClick={() => editRow(row)} className="font-bold text-[#1d5b9e] hover:underline">Edit</button><button type="button" onClick={() => handleDelete(row.id)} className="font-bold text-[#c2413b] hover:underline">Delete</button></div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <p className="mt-3 text-xs text-[#718096]">Signed in as {username}.</p>
    </div>
  )
}
