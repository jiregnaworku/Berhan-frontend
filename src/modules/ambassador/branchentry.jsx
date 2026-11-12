import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../shared/components/DashboardLayout.jsx'
import { useDashboardToast } from '../../shared/components/dashboardToast.js'
import {
  createBranch,
  createDirectoryBranch,
  deleteBranch,
  deleteDirectoryBranch,
  fetchBranchDirectory,
  fetchBranches,
  updateBranch,
  updateDirectoryBranch,
} from './branchStore.js'
import { fetchAmbassadors } from '../service-desk-manager/ambassadorStore.js'

const emptyBranch = {
  branchName: '', branchCode: '', branchType: '', branchLocation: '', ambassadorName: '', ambassadorPhone: '',
  ambassadorUsername: '',
  backupUsername: '', backupName: '', backupPhone: '', managerName: '', managerPhone: '',
  assistantName: '', assistantMobile: '',
  displayTvIp: '', kasperskyServerIp: '', workingComputers: '',
}

const emptyListEntry = { code: '', name: '', type: 'Branch' }

const byName = (a, b) => a.name.localeCompare(b.name)

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
        className={`min-h-10 w-full rounded-lg border border-[#dce4ee] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14] ${readOnly ? 'bg-[#f1f5f9]' : 'bg-[#fbfcfe]'}`}
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
  const [directory, setDirectory] = useState([])
  const [form, setForm] = useState(emptyBranch)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [ambassadors, setAmbassadors] = useState([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // "New branch to list" / "Edit list entry" (service desk manager only)
  const [isListFormOpen, setIsListFormOpen] = useState(false)
  const [editingListCode, setEditingListCode] = useState(null)
  const [listEntry, setListEntry] = useState(emptyListEntry)
  const [listError, setListError] = useState('')
  const [isSavingList, setIsSavingList] = useState(false)

  // "Manage list" (service desk manager only)
  const [isManageListOpen, setIsManageListOpen] = useState(false)
  const [listSearch, setListSearch] = useState('')
  const [manageError, setManageError] = useState('')

  const ambassador = ambassadors.find((item) => item.username === username)
  const ambassadorName = ambassador?.name || ''

  const usedCodes = new Set(branches.map((branch) => branch.branchCode))
  const searchText = listSearch.trim().toLowerCase()
  const visibleDirectory = directory.filter((item) => !searchText
    || item.name.toLowerCase().includes(searchText)
    || item.code.toLowerCase().includes(searchText))

  const editedBranch = editingListCode ? branches.find((branch) => branch.branchCode === editingListCode) : null

  useEffect(() => {
    Promise.all([
      fetchBranches(),
      fetchAmbassadors(),
      fetchBranchDirectory(),
    ]).then(([loadedBranches, loadedAmbassadors, loadedDirectory]) => {
      setAmbassadors(loadedAmbassadors)
      setDirectory(loadedDirectory)
      const ambassador = loadedAmbassadors.find((item) => item.username === username)
      const ambassadorName = ambassador?.name || ''
      setBranches(roleId === 'ambassador'
        ? loadedBranches.filter((branch) => branch.createdBy === username || branch.ambassadorName === ambassadorName)
        : loadedBranches)
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

  // Picking a branch fills the name, code and type from the master list.
  function handleDirectoryChange(event) {
    const entry = directory.find((item) => item.code === event.target.value)
    setForm((current) => ({
      ...current,
      branchCode: entry?.code || '',
      branchName: entry?.name || '',
      branchType: entry?.type || '',
    }))
  }

  // Service desk manager picks the ambassador of the branch.
  function handleAmbassadorChange(event) {
    const ambassador = ambassadors.find((item) => item.username === event.target.value)
    setForm((current) => ({
      ...current,
      ambassadorUsername: ambassador?.username || '',
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
    setError('')
    setForm({ ...branch, ambassadorUsername: '' })
    setEditingId(branch.id)
    setIsFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this branch?')) return
    try {
      await deleteBranch(id)
      const updated = branches.filter((branch) => branch.id !== id)
      setBranches(updated)
      onSaved?.(updated)
      notify('Branch deleted successfully.', 'success')
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

  function startNewListEntry() {
    setListError('')
    setEditingListCode(null)
    setListEntry(emptyListEntry)
    setIsListFormOpen(true)
  }

  function startEditListEntry(item) {
    setListError('')
    setEditingListCode(item.code)
    setListEntry({ code: item.code, name: item.name, type: item.type })
    setIsListFormOpen(true)
  }

  function closeListForm() {
    setIsListFormOpen(false)
    setEditingListCode(null)
    setListEntry(emptyListEntry)
  }

  function handleListEntryChange(event) {
    const { name, value } = event.target
    setListEntry((current) => ({ ...current, [name]: value }))
  }

  async function handleListEntrySubmit(event) {
    event.preventDefault()
    setListError('')
    setIsSavingList(true)
    try {
      if (editingListCode) {
        const { entry, branch } = await updateDirectoryBranch(editingListCode, listEntry)
        setDirectory((current) => current
          .map((item) => (item.code === editingListCode ? entry : item))
          .sort(byName))
        if (branch) {
          // The branch is already added: it follows the change, everything else stays.
          const updated = branches.map((item) => (item.id === branch.id ? branch : item))
          setBranches(updated)
          onSaved?.(updated)
        }
        notify(`"${entry.name}" was updated.`, 'success')
      } else {
        const created = await createDirectoryBranch(listEntry)
        setDirectory((current) => [...current, created].sort(byName))
        notify(`"${created.name}" was added to the branch list.`, 'success')
      }
      closeListForm()
    } catch (saveError) {
      const message = Object.values(saveError.errors || {}).flat()[0] || saveError.message
      setListError(message)
    } finally {
      setIsSavingList(false)
    }
  }

  function openManageList() {
    setManageError('')
    setListSearch('')
    setIsManageListOpen(true)
  }

  async function handleDeleteFromList(item) {
    if (!window.confirm(`Remove "${item.name}" (${item.code}) from the branch list?`)) return
    setManageError('')
    try {
      await deleteDirectoryBranch(item.code)
      setDirectory((current) => current.filter((entry) => entry.code !== item.code))
      notify(`"${item.name}" was removed from the branch list.`, 'success')
    } catch (deleteError) {
      setManageError(deleteError.message)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#e09f1f]">{roleId === 'service-desk-manager' ? 'Service desk operations' : 'Ambassador workspace'}</p>
            <h1 className="text-2xl font-bold text-[#102d54]">{roleId === 'ambassador' ? 'My branches' : 'Manage branches'}</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            {roleId === 'service-desk-manager' && (
              <>
                <button type="button" onClick={openManageList} className="rounded-lg border border-[#dce4ee] px-4 py-2 text-sm font-semibold text-[#52657d] hover:border-[#1d5b9e] hover:text-[#1d5b9e]">Manage list</button>
                <button type="button" onClick={startNewListEntry} className="rounded-lg border border-[#102d54] px-4 py-2 text-sm font-bold text-[#102d54] hover:bg-[#102d54] hover:text-white">New branch to list</button>
              </>
            )}
            <button type="button" onClick={startNewBranch} className="rounded-lg bg-[#102d54] px-4 py-2 text-sm font-bold text-white hover:bg-[#1d5b9e]">Add new</button>
            <button type="button" onClick={onBack} className="rounded-lg border border-[#dce4ee] px-4 py-2 text-sm font-semibold text-[#52657d] hover:border-[#1d5b9e] hover:text-[#1d5b9e]">Back to branches</button>
          </div>
        </div>

        {error && !isFormOpen && <p className="mb-4 rounded-lg border border-[#f2c5c2] bg-[#fff7f6] p-3 text-sm text-[#c2413b]" role="alert">{error}</p>}
        {isLoading && <p className="mb-4 flex items-center gap-2 rounded-lg border border-[#dce4ee] bg-white p-3 text-sm text-[#718096]" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1d5b9e] border-t-transparent" />Loading branches...</p>}

        {isManageListOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102d54]/40 p-4">
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.12)] sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#102d54]">Manage branch list ({directory.length})</h2>
                  <p className="mt-1 text-xs text-[#718096]">Edit a name or code, or delete entries that are not in use.</p>
                </div>
                <button type="button" onClick={() => setIsManageListOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl font-semibold leading-none text-[#718096] hover:bg-[#eef4f8] hover:text-[#102d54]" aria-label="Close manage list">×</button>
              </div>

              <input
                type="search"
                value={listSearch}
                onChange={(event) => setListSearch(event.target.value)}
                placeholder="Search by name or code..."
                className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]"
              />

              {manageError && <p className="mt-3 rounded-lg border border-[#f2c5c2] bg-[#fff7f6] p-3 text-sm text-[#c2413b]" role="alert">{manageError}</p>}

              <div className="mt-4 overflow-y-auto rounded-lg border border-[#e5ebf2]">
                {visibleDirectory.length === 0 ? (
                  <p className="p-4 text-sm text-[#718096]">No branches found.</p>
                ) : visibleDirectory.map((item) => (
                  <div key={item.code} className="flex items-center justify-between gap-3 border-b border-[#edf1f5] px-3 py-2 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#102d54]">{item.name}</p>
                      <p className="text-xs text-[#718096]">{item.code} · {item.type}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {usedCodes.has(item.code) && <span className="text-xs font-semibold text-[#718096]">In use</span>}
                      <button type="button" onClick={() => startEditListEntry(item)} className="text-sm font-bold text-[#1d5b9e] hover:underline">Edit</button>
                      {!usedCodes.has(item.code) && (
                        <button type="button" onClick={() => handleDeleteFromList(item)} className="text-sm font-bold text-[#c2413b] hover:underline">Delete</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => setIsManageListOpen(false)} className="rounded-lg border border-[#dce4ee] px-5 py-2.5 text-sm font-semibold text-[#52657d] hover:border-[#1d5b9e]">Close</button>
              </div>
            </div>
          </div>
        )}

        {isListFormOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102d54]/40 p-4">
            <form onSubmit={handleListEntrySubmit} className="w-full max-w-md rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.12)] sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#102d54]">{editingListCode ? 'Edit branch in list' : 'New branch to list'}</h2>
                  <p className="mt-1 text-xs text-[#718096]">
                    {editingListCode
                      ? 'Change the name, code or type of this branch.'
                      : 'Adds a completely new branch to the dropdown that ambassadors and service desk managers choose from.'}
                  </p>
                </div>
                <button type="button" onClick={closeListForm} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl font-semibold leading-none text-[#718096] hover:bg-[#eef4f8] hover:text-[#102d54]" aria-label="Close branch list form">×</button>
              </div>

              {editedBranch && (
                <p className="mb-4 rounded-lg bg-[#f4f8fa] p-3 text-xs text-[#52657d]">
                  This branch is already added{editedBranch.ambassadorName ? ` and assigned to ${editedBranch.ambassadorName}` : ''}. Its ambassador and all other information stay as they are. If you change the code, the branch manager must sign in with the new code as the username.
                </p>
              )}

              <div className="grid gap-4">
                <Field label="Branch name" name="name" value={listEntry.name} onChange={handleListEntryChange} required placeholder="e.g. BISHOFTU BRANCH" />
                <Field label="Branch code" name="code" value={listEntry.code} onChange={handleListEntryChange} required placeholder="e.g. 410" />
                <SelectField label="Branch type" name="type" value={listEntry.type} onChange={handleListEntryChange} required>
                  <option value="Branch">Branch</option>
                  <option value="District">District</option>
                  <option value="Head office">Head office</option>
                </SelectField>
              </div>

              {listError && <p className="mt-4 rounded-lg border border-[#f2c5c2] bg-[#fff7f6] p-3 text-sm text-[#c2413b]" role="alert">{listError}</p>}

              <div className="mt-6 flex gap-3">
                <button type="submit" disabled={isSavingList} className="rounded-lg bg-[#102d54] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1d5b9e] disabled:cursor-not-allowed disabled:opacity-70">{isSavingList ? 'Saving...' : editingListCode ? 'Save changes' : 'Add to list'}</button>
                <button type="button" onClick={closeListForm} className="rounded-lg border border-[#dce4ee] px-5 py-2.5 text-sm font-semibold text-[#52657d] hover:border-[#1d5b9e]">Cancel</button>
              </div>
            </form>
          </div>
        )}

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
            {!editingId && (
              <div className="sm:col-span-2">
                <SelectField label="Select branch" name="branchCode" value={form.branchCode} onChange={handleDirectoryChange} required>
                  <option value="">Select a branch...</option>
                  {directory.map((item) => (
                    <option key={item.code} value={item.code}>{item.name} ({item.code})</option>
                  ))}
                </SelectField>
              </div>
            )}
            <Field label="Branch name" name="branchName" value={form.branchName} onChange={() => {}} readOnly placeholder="Filled automatically" />
            <Field label="Branch code" name="branchCode" value={form.branchCode} onChange={() => {}} readOnly placeholder="Filled automatically" />
            <Field label="Branch type" name="branchType" value={form.branchType} onChange={() => {}} readOnly placeholder="Filled automatically" />
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
                {editingId && (
                  <p className="rounded-lg bg-[#f4f8fa] p-3 text-xs text-[#52657d] sm:col-span-2">Choosing a different ambassador moves this branch to that ambassador. The previous ambassador will no longer see or manage it.</p>
                )}
                <SelectField
                  label="Ambassador name"
                  name="ambassadorUsername"
                  value={form.ambassadorUsername || ambassadors.find((ambassador) => ambassador.name === form.ambassadorName)?.username || ''}
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

          {error && <p className="mt-4 rounded-lg border border-[#f2c5c2] bg-[#fff7f6] p-3 text-sm text-[#c2413b]" role="alert">{error}</p>}

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
                    {roleId === 'service-desk-manager' && (
                      <p className="truncate text-xs text-[#52657d]">Ambassador: {branch.ambassadorName || 'Not assigned'}</p>
                    )}
                  </div>
                  <p className="text-xs text-[#52657d]"><span className="font-bold text-[#102d54]">{branch.workingComputers}</span> working computers</p>
                  {(roleId === 'service-desk-manager' || branch.createdBy === username || (roleId === 'ambassador' && branch.ambassadorName === ambassadorName)) && <div className="flex gap-4">
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