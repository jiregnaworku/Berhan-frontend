import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../shared/components/DashboardLayout.jsx'
import { createBranch, deleteBranch, fetchBranches, updateBranch } from './branchStore.js'

const emptyBranch = {
  branchName: '', branchLocation: '', ambassadorName: '', ambassadorPhone: '',
  backupName: '', backupPhone: '', managerName: '', managerPhone: '',
  assistantName: '', assistantMobile: '',
  displayTvIp: '', kasperskyServerIp: '', workingComputers: '',
}

function Field({ label, name, value, onChange, type = 'text', required = false, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[#52657d]">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        min={type === 'number' ? '0' : undefined}
        placeholder={placeholder}
        className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]"
      />
    </label>
  )
}

export function BranchEntryContent({ onBack, onSaved }) {
  const [branches, setBranches] = useState([])
  const [form, setForm] = useState(emptyBranch)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchBranches().then(setBranches).catch(() => setError('Unable to load branches.'))
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
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
    } catch (saveError) {
      setError(Object.values(saveError.errors || {}).flat()[0] || saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  function editBranch(branch) {
    setForm(branch)
    setEditingId(branch.id)
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
    }
    if (editingId === id) {
      setForm(emptyBranch)
      setEditingId(null)
    }
  }

  function cancelEdit() {
    setForm(emptyBranch)
    setEditingId(null)
  }

  return (
    <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#e09f1f]">Ambassador workspace</p>
            <h1 className="text-2xl font-bold text-[#102d54]">Branch details</h1>
          </div>
          <button type="button" onClick={onBack} className="rounded-lg border border-[#dce4ee] px-4 py-2 text-sm font-semibold text-[#52657d] hover:border-[#1d5b9e] hover:text-[#1d5b9e]">Back to branches</button>
        </div>

        {error && <p className="mb-4 rounded-lg border border-[#f2c5c2] bg-[#fff7f6] p-3 text-sm text-[#c2413b]" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.05)] sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#102d54]">{editingId ? 'Edit branch' : 'Add branch'}</h2>
            <p className="mt-1 text-xs text-[#718096]">Enter contact, network, and equipment information.</p>
          </div>

          <div className="grid gap-4 border-b border-[#edf1f5] pb-5 sm:grid-cols-2">
            <Field label="Branch name" name="branchName" value={form.branchName} onChange={handleChange} required />
            <Field label="Branch location / address" name="branchLocation" value={form.branchLocation} onChange={handleChange} />
          </div>

          <div className="mt-5 grid gap-4 border-b border-[#edf1f5] pb-5 sm:grid-cols-2">
            <h3 className="text-sm font-bold text-[#102d54] sm:col-span-2">Ambassador and backup</h3>
            <Field label="Ambassador name" name="ambassadorName" value={form.ambassadorName} onChange={handleChange} />
            <Field label="Ambassador mobile" name="ambassadorPhone" value={form.ambassadorPhone} onChange={handleChange} />
            <Field label="Backup name" name="backupName" value={form.backupName} onChange={handleChange} />
            <Field label="Backup mobile" name="backupPhone" value={form.backupPhone} onChange={handleChange} />
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
            {editingId && <button type="button" onClick={cancelEdit} className="rounded-lg border border-[#dce4ee] px-5 py-2.5 text-sm font-semibold text-[#52657d] hover:border-[#1d5b9e]">Cancel</button>}
          </div>
        </form>

        <section className="mt-6 rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.05)] sm:p-6">
          <h2 className="text-lg font-bold text-[#102d54]">Saved branches ({branches.length})</h2>
          {branches.length === 0 ? <p className="mt-3 text-sm text-[#718096]">No branches added yet.</p> : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {branches.map((branch) => (
                <article key={branch.id} className="rounded-xl border border-[#e5ebf2] p-4">
                  <h3 className="font-bold text-[#102d54]">{branch.branchName}</h3>
                  <p className="mt-1 text-xs text-[#718096]">{branch.branchLocation || 'Location not provided'}</p>
                  <p className="mt-3 text-sm text-[#52657d]">{branch.workingComputers} working computers</p>
                  <div className="mt-4 flex gap-4">
                    <button type="button" onClick={() => editBranch(branch)} className="text-sm font-bold text-[#1d5b9e] hover:underline">Edit</button>
                    <button type="button" onClick={() => handleDelete(branch.id)} className="text-sm font-bold text-[#c2413b] hover:underline">Delete</button>
                  </div>
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
      <BranchEntryContent onBack={() => window.location.assign('/dashboard/ambassador')} />
    </DashboardLayout>
  )
}

export default BranchEntry
