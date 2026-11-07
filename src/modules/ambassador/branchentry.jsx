import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../shared/components/DashboardLayout.jsx'
import { useDashboardToast } from '../../shared/components/dashboardToast.js'
import { createBranch, deleteBranch, fetchBranches, updateBranch } from './branchStore.js'
import { fetchAmbassadors } from '../service-desk-manager/ambassadorStore.js'

const emptyBranch = {
  branchName: '', branchCode: '', branchType: '', branchLocation: '', ambassadorName: '', ambassadorPhone: '',
  backupUsername: '', backupName: '', backupPhone: '', managerName: '', managerPhone: '',
  assistantName: '', assistantMobile: '',
  displayTvIp: '', kasperskyServerIp: '', workingComputers: '',
}

function Field({ label, name, value, onChange, type = 'text', required = false, placeholder, readOnly = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[#52657d]">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        readOnly={readOnly}
        min={type === 'number' ? '0' : undefined}
        placeholder={placeholder}
        className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]"
      />
    </label>
  )
}

function SelectField({ label, name, value, onChange, required = false, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[#52657d]">{label}</span>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]"
      >
        {children}
      </select>
    </label>
  )
}

export function BranchEntryContent({ onBack, onSaved, username, roleId = 'ambassador' }) {
  const { notify } = useDashboardToast()
  const [branches, setBranches] = useState([])
  const [form, setForm] = useState(emptyBranch)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [ambassadors, setAmbassadors] = useState([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchBranches(),
      fetchAmbassadors(),
    ]).then(([loadedBranches, loadedAmbassadors]) => {
      setBranches(roleId === 'ambassador'
        ? loadedBranches.filter((branch) => branch.createdBy === username)
        : loadedBranches)
      setAmbassadors(loadedAmbassadors)
    }).catch(() => {
      const message = 'Unable to load branch information.'
      setError(message)
      notify(message)
    })
      .finally(() => setIsLoading(false))
  }, [notify, roleId, username])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleAmbassadorChange(event) {
    const ambassador = ambassadors.find((item) => item.username === event.target.value)
    setForm((current) => ({
      ...current,
      ambassadorName: ambassador?.name || '',
      ambassadorPhone: ambassador?.phone || '',
    }))
  }

  function handleBackupChange(event) {
    const backup = ambassadors.find((item) => item.username === event.target.value)
    setForm((current) => ({
      ...current,
      backupUsername: backup?.username || '',
      backupName: backup?.name || '',
      backupPhone: backup?.phone || '',
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)
    try {
      const savedBranch = editingId
        ? await updateBranch(editingId, form)
        : await createBranch(form)
      const updated = editingId
        ? branches.map((branch) => branch.id === editingId ? savedBranch : branch)
        : [...branches, savedBranch]
      setBranches(updated)
      onSaved?.(updated)
      setForm(emptyBranch)
      setEditingId(null)
      setIsFormOpen(false)
      notify(editingId ? 'Branch updated successfully.' : 'Branch added successfully.', 'success')
    } catch (saveError) {
      const message = Object.values(saveError.errors || {}).flat()[0] || saveError.message
      setError(message)
      notify(message)
    } finally {
      setIsSaving(false)
    }
  }

  function editBranch(branch) {
    setForm(branch)
    setEditingId(branch.id)
    setIsFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(id) {
    try {
      await deleteBranch(id)
      const updated = branches.filter((branch) => branch.id !== id)
      setBranches(updated)
      onSaved?.(updated)
    } catch (deleteError) {
      setError(deleteError.message)
      notify(deleteError.message)
    }
    if (editingId === id) {
      setForm(emptyBranch)
      setEditingId(null)
    }
  }

  function startNewBranch() {
    setError('')
    setForm(emptyBranch)
    setEditingId(null)
    setIsFormOpen(true)
  }

  function cancelEdit() {
    setForm(emptyBranch)
    setEditingId(null)
  }

  return (
    <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#e09f1f]">{roleId === 'service-desk-manager' ? 'Service desk operations' : 'Ambassador workspace'}</p>
            <h1 className="text-2xl font-bold text-[#102d54]">{roleId === 'ambassador' ? 'My branches' : 'Manage branches'}</h1>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={startNewBranch} className="rounded-lg bg-[#102d54] px-4 py-2 text-sm font-bold text-white hover:bg-[#1d5b9e]">Add new</button>
            <button type="button" onClick={onBack} className="rounded-lg border border-[#dce4ee] px-4 py-2 text-sm font-semibold text-[#52657d] hover:border-[#1d5b9e] hover:text-[#1d5b9e]">Back to branches</button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg border border-[#f2c5c2] bg-[#fff7f6] p-3 text-sm text-[#c2413b]" role="alert">{error}</p>}
        {isLoading && <p className="mb-4 flex items-center gap-2 rounded-lg border border-[#dce4ee] bg-white p-3 text-sm text-[#718096]" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1d5b9e] border-t-transparent" />Loading branches...</p>}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102d54]/40 p-4">
            <form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.12)] sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#102d54]">{editingId ? 'Edit branch' : 'Add branch'}</h2>
              <p className="mt-1 text-xs text-[#718096]">Enter contact, network, and equipment information.</p>
            </div>
            <button type="button" onClick={() => setIsFormOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl font-semibold leading-none text-[#718096] hover:bg-[#eef4f8] hover:text-[#102d54]" aria-label="Close branch form">×</button>
          </div>

          <div className="grid gap-4 border-b border-[#edf1f5] pb-5 sm:grid-cols-2">
            <Field label="Branch name" name="branchName" value={form.branchName} onChange={handleChange} required />
            <Field label="Branch code" name="branchCode" value={form.branchCode} onChange={handleChange} required placeholder="e.g. 205" />
            <SelectField label="Branch type" name="branchType" value={form.branchType} onChange={handleChange} required>
              <option value="">Select type</option>
              <option value="Branch">Branch</option>
              <option value="District">District</option>
              <option value="Head office">Head office</option>
            </SelectField>
            <Field label="Branch location / address" name="branchLocation" value={form.branchLocation} onChange={handleChange} />
          </div>

          <div className="mt-5 grid gap-4 border-b border-[#edf1f5] pb-5 sm:grid-cols-2">
            <h3 className="text-sm font-bold text-[#102d54] sm:col-span-2">Ambassador and backup</h3>
            {roleId === 'ambassador' ? (
              <>
                <p className="rounded-lg bg-[#f4f8fa] p-3 text-xs text-[#52657d] sm:col-span-2">Ambassador details are taken from your signed-in account.</p>
                <SelectField label="Backup ambassador" name="backupUsername" value={form.backupUsername} onChange={handleBackupChange}>
                  <option value="">Select backup ambassador</option>
                  {ambassadors.filter((ambassador) => ambassador.username !== username).map((ambassador) => (
                    <option key={ambassador.id} value={ambassador.username}>{ambassador.name} ({ambassador.username})</option>
                  ))}
                </SelectField>
              </>
            ) : (
              <>
                <SelectField
                  label="Ambassador name"
                  name="ambassadorUsername"
                  value={ambassadors.find((ambassador) => ambassador.name === form.ambassadorName)?.username || ''}
                  onChange={handleAmbassadorChange}
                >
                  <option value="">Select ambassador</option>
                  {ambassadors.map((ambassador) => (
                    <option key={ambassador.id} value={ambassador.username}>{ambassador.name}</option>
                  ))}
                </SelectField>
                <Field label="Ambassador mobile" name="ambassadorPhone" value={form.ambassadorPhone} onChange={() => {}} required={false} readOnly />
                <SelectField label="Backup name" name="backupUsername" value={form.backupUsername} onChange={handleBackupChange}>
                  <option value="">Select backup ambassador</option>
                  {ambassadors.map((ambassador) => (
                    <option key={ambassador.id} value={ambassador.username}>{ambassador.name}</option>
                  ))}
                </SelectField>
                <Field label="Backup mobile" name="backupPhone" value={form.backupPhone} onChange={() => {}} required={false} readOnly />
              </>
            )}
          </div>

          <div className="mt-5 grid gap-4 border-b border-[#edf1f5] pb-5 sm:grid-cols-2">
            <h3 className="text-sm font-bold text-[#102d54] sm:col-span-2">Branch manager and assistant</h3>
            <Field label="Branch manager name" name="managerName" value={form.managerName} onChange={handleChange} />
            <Field label="Branch manager direct phone" name="managerPhone" value={form.managerPhone} onChange={handleChange} />
            <Field label="Assistant name" name="assistantName" value={form.assistantName} onChange={handleChange} />
            <Field label="Assistant mobile" name="assistantMobile" value={form.assistantMobile} onChange={handleChange} />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <h3 className="text-sm font-bold text-[#102d54] sm:col-span-2">Equipment and network</h3>
            <Field label="Display TV IP address" name="displayTvIp" value={form.displayTvIp} onChange={handleChange} placeholder="192.168..." />
            <Field label="Kaspersky server IP address" name="kasperskyServerIp" value={form.kasperskyServerIp} onChange={handleChange} placeholder="192.168..." />
            <Field label="Working computers" name="workingComputers" value={form.workingComputers} onChange={handleChange} type="number" required />
          </div>

          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={isSaving} className="rounded-lg bg-[#102d54] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1d5b9e] disabled:cursor-not-allowed disabled:opacity-70">{isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Add branch'}</button>
            <button type="button" onClick={() => { cancelEdit(); setIsFormOpen(false) }} className="rounded-lg border border-[#dce4ee] px-5 py-2.5 text-sm font-semibold text-[#52657d] hover:border-[#1d5b9e]">Cancel</button>
          </div>
            </form>
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.05)] sm:p-6">
          <h2 className="text-lg font-bold text-[#102d54]">{roleId === 'ambassador' ? 'My branches' : 'Saved branches'} ({branches.length})</h2>
          {isLoading ? <p className="mt-3 flex items-center gap-2 text-sm text-[#718096]"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1d5b9e] border-t-transparent" />Loading branches...</p> : branches.length === 0 ? <p className="mt-3 text-sm text-[#718096]">No branches added yet.</p> : (
            <div className="mt-4 overflow-hidden rounded-lg border border-[#e5ebf2]">
              {branches.map((branch) => (
                <article key={branch.id} className="grid min-h-14 grid-cols-[minmax(9rem,1.4fr)_minmax(8rem,1fr)_auto] items-center gap-3 border-b border-[#edf1f5] px-4 py-3 last:border-0 sm:gap-6">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-[#102d54]">{branch.branchName}</h3>
                    <p className="truncate text-xs text-[#718096]">{branch.branchLocation || 'Location not provided'}</p>
                  </div>
                  <p className="text-xs text-[#52657d]"><span className="font-bold text-[#102d54]">{branch.workingComputers}</span> working computers</p>
                  {(roleId === 'service-desk-manager' || branch.createdBy === username) && <div className="flex gap-4">
                    <button type="button" onClick={() => editBranch(branch)} className="text-sm font-bold text-[#1d5b9e] hover:underline">Edit</button>
                    <button type="button" onClick={() => handleDelete(branch.id)} className="text-sm font-bold text-[#c2413b] hover:underline">Delete</button>
                  </div>}
                </article>
              ))}
            </div>
          )}
        </section>
    </div>
  )
}

function BranchEntry({ username }) {
  return (
    <DashboardLayout roleId="ambassador" username={username}>
      <BranchEntryContent username={username} onBack={() => window.location.assign('/dashboard/ambassador')} />
    </DashboardLayout>
  )
}

export default BranchEntry
