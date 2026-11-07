import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../shared/components/DashboardLayout.jsx'
import { useDashboardToast } from '../../shared/components/dashboardToast.js'
import { fetchBranches } from './branchStore.js'
import { fetchWorkbookRows } from './computerWorkbookStore.js'
import {
  createKasperskyStatus,
  deleteKasperskyStatus,
  fetchKasperskyStatuses,
  updateKasperskyStatus,
} from './kasperskyStore.js'

const emptyStatus = {
  branchId: '',
  computerId: '',
  networkAgent: '',
  endpoint: '',
  status: '',
}

function StatusSelect({ label, name, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[#52657d]">{label}</span>
      <select name={name} value={value} onChange={onChange} required className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]">
        <option value="">Select status</option>
        <option value="Updated">Updated</option>
        <option value="Not updated">Not updated</option>
      </select>
    </label>
  )
}

function IpInput({ label, name, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[#52657d]">{label}</span>
      <input name={name} type="text" inputMode="decimal" value={value} onChange={onChange} required placeholder="e.g. 192.168.1.10" className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]" />
    </label>
  )
}

export function KasperskyContent({ username, roleId = 'ambassador' }) {
  const { notify } = useDashboardToast()
  const isManager = roleId === 'service-desk-manager'
  const [branches, setBranches] = useState([])
  const [computers, setComputers] = useState([])
  const [statuses, setStatuses] = useState([])
  const [form, setForm] = useState(emptyStatus)
  const [editingId, setEditingId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchBranches(), fetchWorkbookRows(), fetchKasperskyStatuses()])
      .then(([loadedBranches, loadedComputers, loadedStatuses]) => {
        setBranches(isManager ? loadedBranches : loadedBranches.filter((branch) => branch.createdBy === username))
        setComputers(loadedComputers)
        setStatuses(loadedStatuses)
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

  function startNewStatus() {
    setError('')
    setForm(emptyStatus)
    setEditingId(null)
    setIsFormOpen(true)
  }

  function handleBranchChange(event) {
    setForm((current) => ({ ...current, branchId: event.target.value, computerId: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)
    try {
      const savedStatus = editingId
        ? await updateKasperskyStatus(editingId, form)
        : await createKasperskyStatus(form)
      setStatuses((current) => editingId
        ? current.map((item) => item.id === editingId ? savedStatus : item)
        : [savedStatus, ...current])
      setForm(emptyStatus)
      setEditingId(null)
      setIsFormOpen(false)
      notify(editingId ? 'Kaspersky status updated successfully.' : 'Kaspersky status added successfully.', 'success')
    } catch (saveError) {
      const message = Object.values(saveError.errors || {}).flat()[0] || saveError.message
      setError(message)
      notify(message)
    } finally {
      setIsSaving(false)
    }
  }

  function editStatus(status) {
    setForm(status)
    setEditingId(status.id)
    setIsFormOpen(true)
  }

  async function handleDelete(id) {
    try {
      await deleteKasperskyStatus(id)
      setStatuses((current) => current.filter((item) => item.id !== id))
    } catch (deleteError) {
      setError(deleteError.message)
      notify(deleteError.message)
    }
  }

  const branchName = (branchId) => branches.find((branch) => String(branch.id) === String(branchId))?.branchName || 'Unknown branch'
  const branchComputers = computers.filter((computer) => String(computer.branchId) === String(form.branchId))
  const computerIp = (computerId) => computers.find((computer) => String(computer.id) === String(computerId))?.ipAddress || 'Unknown computer'

  return (
    <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#e09f1f]">{isManager ? 'Service desk operations' : 'Ambassador workspace'}</p>
            <h1 className="text-2xl font-bold text-[#102d54]">Kaspersky Status</h1>
            <p className="mt-1 text-sm text-[#718096]">{isManager ? 'Add and edit Kaspersky updates for all ambassador computers.' : 'Track Kaspersky updates for computers in your branches.'}</p>
          </div>
          <button type="button" onClick={startNewStatus} className="rounded-lg bg-[#102d54] px-4 py-2 text-sm font-bold text-white hover:bg-[#1d5b9e]">Add new</button>
        </div>

        {error && <p className="mb-4 rounded-lg border border-[#f2c5c2] bg-[#fff7f6] p-3 text-sm text-[#c2413b]" role="alert">{error}</p>}
        {isLoading && <p className="mb-4 flex items-center gap-2 rounded-lg border border-[#dce4ee] bg-white p-3 text-sm text-[#718096]" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1d5b9e] border-t-transparent" />Loading Kaspersky statuses...</p>}

        {isFormOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102d54]/40 p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.12)] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#102d54]">{editingId ? 'Edit Kaspersky status' : 'Add Kaspersky status'}</h2>
                <p className="mt-1 text-xs text-[#718096]">Update the security status for one of your branches.</p>
              </div>
              <button type="button" onClick={() => setIsFormOpen(false)} className="text-sm font-bold text-[#718096] hover:text-[#102d54]">Close</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-[#52657d]">Branch name</span>
                <select name="branchId" value={form.branchId} onChange={handleBranchChange} required className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]">
                  <option value="">Select a branch</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branchName}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-[#52657d]">Computer IP address</span>
                <select name="computerId" value={form.computerId} onChange={handleChange} required className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]">
                  <option value="">{form.branchId ? 'Select a computer' : 'Select a branch first'}</option>
                  {branchComputers.map((computer) => <option key={computer.id} value={computer.id}>{computer.ipAddress}{computer.computerName ? ` - ${computer.computerName}` : ''}</option>)}
                </select>
              </label>
              <IpInput label="Network agent (Net Agent) IP" name="networkAgent" value={form.networkAgent} onChange={handleChange} />
              <IpInput label="Endpoint IP" name="endpoint" value={form.endpoint} onChange={handleChange} />
              <StatusSelect label="Status" name="status" value={form.status} onChange={handleChange} />
            </div>
            <div className="mt-6 flex gap-3">
              <button type="submit" disabled={isSaving} className="rounded-lg bg-[#102d54] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1d5b9e] disabled:cursor-not-allowed disabled:opacity-70">{isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Add status'}</button>
              <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-[#dce4ee] px-5 py-2.5 text-sm font-semibold text-[#52657d] hover:border-[#1d5b9e]">Cancel</button>
            </div>
          </form>
        </div>}

        <section className="overflow-hidden rounded-xl border border-[#e5ebf2] bg-white shadow-[0_8px_24px_rgba(16,45,84,0.05)]">
          <div className="flex items-center justify-between border-b border-[#e4eaf0] bg-[#f4f8fa] px-4 py-3">
            <h2 className="text-sm font-bold text-[#075b78]">{isManager ? 'All Kaspersky statuses' : 'My Kaspersky statuses'}</h2>
            <span className="text-[11px] text-[#52657d]">{statuses.length} records</span>
          </div>
          {isLoading ? <p className="px-4 py-8 text-sm text-[#718096]">Loading Kaspersky statuses...</p> : statuses.length === 0 ? <p className="px-4 py-8 text-sm text-[#718096]">No Kaspersky statuses have been added yet.</p> : (
            <div className="overflow-x-auto">
              <div className="min-w-[42rem]">
                <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] gap-3 border-b border-[#dfe8ee] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[#52657d]">
                  <span>Branch</span><span>Computer IP</span><span>Net Agent</span><span>Endpoint</span><span>Status</span><span>Actions</span>
                </div>
                {statuses.map((status) => (
                  <div key={status.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] items-center gap-3 border-b border-[#edf1f5] px-4 py-3 text-xs text-[#52657d] last:border-0">
                    <span className="font-semibold text-[#102d54]">{branchName(status.branchId)}</span>
                    <span>{computerIp(status.computerId)}</span><span>{status.networkAgent}</span><span>{status.endpoint}</span><span>{status.status}</span>
                    <div className="flex gap-3"><button type="button" onClick={() => editStatus(status)} className="font-bold text-[#1d5b9e] hover:underline">Edit</button><button type="button" onClick={() => handleDelete(status.id)} className="font-bold text-[#c2413b] hover:underline">Delete</button></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
    </div>
  )
}

function Kaspersky({ username }) {
  return (
    <DashboardLayout roleId="ambassador" username={username}>
      <KasperskyContent username={username} />
    </DashboardLayout>
  )
}

export default Kaspersky
