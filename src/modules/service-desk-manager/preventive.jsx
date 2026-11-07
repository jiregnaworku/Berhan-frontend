import { useEffect, useState } from 'react'
import { useDashboardToast } from '../../shared/components/dashboardToast.js'
import { fetchAmbassadors } from './ambassadorStore.js'
import { fetchBranches } from '../ambassador/branchStore.js'
import { createPreventiveOperation, deletePreventiveOperation, fetchPreventiveOperations, preventiveDocumentUrl, updatePreventiveOperation } from './preventiveStore.js'

const emptyForm = { ambassadorId: '', branchId: '', operationDate: '' }

function PreventiveOperation() {
  const { notify } = useDashboardToast()
  const [operations, setOperations] = useState([])
  const [ambassadors, setAmbassadors] = useState([])
  const [branches, setBranches] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [selectedFile, setSelectedFile] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')

  useEffect(() => {
    Promise.all([fetchAmbassadors(), fetchBranches()]).then(([loadedAmbassadors, loadedBranches]) => {
      setAmbassadors(loadedAmbassadors)
      setBranches(loadedBranches)
    }).catch((loadError) => {
      setError(loadError.message)
      notify(loadError.message)
    })
  }, [notify])

  useEffect(() => {
    fetchPreventiveOperations({ month, day })
      .then(setOperations)
      .catch((loadError) => {
        setError(loadError.message)
        notify(loadError.message)
      })
      .finally(() => setIsLoading(false))
  }, [month, day, notify])

  function openForm(operation = null) {
    setEditingId(operation?.id || null)
    setForm(operation ? { ambassadorId: operation.ambassadorId, branchId: operation.branchId, operationDate: operation.operationDate } : emptyForm)
    setSelectedFile(null)
    setError('')
    setIsFormOpen(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!editingId && !selectedFile) {
      const message = 'Please upload the scanned preventive operation document.'
      setError(message)
      notify(message)
      return
    }
    setIsSaving(true)
    try {
      const saved = editingId ? await updatePreventiveOperation(editingId, form, selectedFile) : await createPreventiveOperation(form, selectedFile)
      setOperations((current) => editingId ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current])
      setIsFormOpen(false)
      notify(editingId ? 'Preventive operation updated successfully.' : 'Preventive operation saved successfully.', 'success')
    } catch (saveError) {
      const message = Object.values(saveError.errors || {}).flat()[0] || saveError.message
      setError(message)
      notify(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this preventive operation document?')) return
    try {
      await deletePreventiveOperation(id)
      setOperations((current) => current.filter((item) => item.id !== id))
      notify('Preventive operation deleted successfully.', 'success')
    } catch (deleteError) {
      setError(deleteError.message)
      notify(deleteError.message)
    }
  }

  function exportReport() {
    const header = ['Date', 'Ambassador', 'Branch', 'Document']
    const rows = operations.map((item) => [item.operationDate, item.ambassadorName, item.branchName, item.documentName])
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `preventive-operations-${month || 'report'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#d7e1e8] pb-5">
        <div><p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#e09f1f]">Service desk operations</p><h1 className="text-2xl font-bold text-[#102d54]">Preventive Operations</h1><p className="mt-1 text-sm text-[#718096]">Manage scanned preventive operation records and monthly reports.</p></div>
        <div className="flex gap-2"><button type="button" onClick={exportReport} disabled={operations.length === 0} className="rounded-md border border-[#1d5b9e] px-3 py-2 text-sm font-bold text-[#1d5b9e] disabled:opacity-50">Export report</button><button type="button" onClick={() => openForm()} className="rounded-md bg-[#102d54] px-3 py-2 text-sm font-bold text-white">Add new</button></div>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold text-[#52657d]">Month<input type="month" value={month} onChange={(event) => { setMonth(event.target.value); setDay('') }} className="mt-1 block h-10 w-full rounded-md border border-[#d6e0ea] px-3 font-normal" /></label><label className="text-sm font-bold text-[#52657d]">Day<input type="date" value={day} onChange={(event) => setDay(event.target.value)} className="mt-1 block h-10 w-full rounded-md border border-[#d6e0ea] px-3 font-normal" /></label></div>
      {error && <p className="mb-4 rounded-md border border-[#f2c5c2] bg-[#fff7f6] p-3 text-sm text-[#c2413b]" role="alert">{error}</p>}
      {isLoading ? <p className="rounded-md border border-[#d7e1e8] bg-white p-4 text-sm text-[#718096]">Loading preventive operations...</p> : operations.length === 0 ? <p className="rounded-md border border-[#d7e1e8] bg-white p-4 text-sm text-[#718096]">No preventive operations found for this filter.</p> : <div className="overflow-x-auto rounded-md border border-[#d7e1e8] bg-white"><table className="w-full min-w-[50rem] text-left text-sm"><thead className="border-b border-[#d7e1e8] bg-[#f5f8fa] text-xs uppercase text-[#52657d]"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Ambassador</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Document</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-[#edf1f5]">{operations.map((operation) => <tr key={operation.id}><td className="px-4 py-3">{operation.operationDate}</td><td className="px-4 py-3">{operation.ambassadorName}</td><td className="px-4 py-3">{operation.branchName}</td><td className="px-4 py-3"><a href={preventiveDocumentUrl(operation.id)} target="_blank" rel="noreferrer" className="font-semibold text-[#1d5b9e] hover:underline">{operation.documentName}</a></td><td className="px-4 py-3"><button type="button" onClick={() => openForm(operation)} className="mr-3 font-bold text-[#1d5b9e]">Edit</button><button type="button" onClick={() => handleDelete(operation.id)} className="font-bold text-[#c2413b]">Delete</button></td></tr>)}</tbody></table></div>}
      {isFormOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102d54]/40 p-4"><form onSubmit={handleSubmit} className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-lg font-bold text-[#102d54]">{editingId ? 'Edit preventive operation' : 'Add preventive operation'}</h2><p className="mt-1 text-sm text-[#718096]">Save the operation details and scanned document.</p></div><button type="button" onClick={() => setIsFormOpen(false)} className="text-2xl text-[#718096]" aria-label="Close">×</button></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-[#52657d]">Ambassador<select value={form.ambassadorId} onChange={(event) => setForm({ ...form, ambassadorId: event.target.value })} required className="mt-1 min-h-10 w-full rounded-md border border-[#dce4ee] px-3 text-sm font-normal"><option value="">Choose ambassador</option>{ambassadors.map((ambassador) => <option key={ambassador.id} value={ambassador.id}>{ambassador.name || `${ambassador.first_name} ${ambassador.last_name}`}</option>)}</select></label><label className="text-xs font-bold text-[#52657d]">Branch<select value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })} required className="mt-1 min-h-10 w-full rounded-md border border-[#dce4ee] px-3 text-sm font-normal"><option value="">Choose branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branchName}</option>)}</select></label><label className="text-xs font-bold text-[#52657d]">Date<input type="date" value={form.operationDate} onChange={(event) => setForm({ ...form, operationDate: event.target.value })} required className="mt-1 min-h-10 w-full rounded-md border border-[#dce4ee] px-3 text-sm font-normal" /></label><label className="text-xs font-bold text-[#52657d]">Scanned document<input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} required={!editingId} className="mt-1 block w-full text-sm font-normal" /></label></div><div className="mt-6 flex gap-3"><button type="submit" disabled={isSaving} className="rounded-md bg-[#102d54] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{isSaving ? 'Saving...' : 'Save'}</button><button type="button" onClick={() => setIsFormOpen(false)} className="rounded-md border border-[#dce4ee] px-4 py-2 text-sm font-bold text-[#52657d]">Cancel</button></div></form></div>}
    </main>
  )
}

export default PreventiveOperation
