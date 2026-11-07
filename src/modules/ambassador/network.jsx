import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../shared/components/DashboardLayout.jsx'
import { useDashboardToast } from '../../shared/components/dashboardToast.js'
import { fetchBranches } from './branchStore.js'
import { createNetworkRegistration, downloadNetworkReport, fetchNetworkRegistrations } from './networkStore.js'

const emptyRegistration = {
  branchName: '',
  reason: '',
  remark: '',
  incidentDate: new Date().toISOString().slice(0, 10),
}

function Field({ label, name, value, onChange, required = false, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[#52657d]">{label}</span>
      {type === 'textarea' ? (
        <textarea name={name} value={value} onChange={onChange} required={required} rows="3" className="w-full resize-y rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]" />
      ) : (
        <input name={name} type={type} value={value} onChange={onChange} required={required} className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]" />
      )}
    </label>
  )
}

function SelectField({ label, name, value, onChange, options, required = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[#52657d]">{label}</span>
      <select name={name} value={value} onChange={onChange} required={required} className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]">
        <option value="">Select an option</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
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
  const [selectedMonth, setSelectedMonth] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isBranchesLoading, setIsBranchesLoading] = useState(true)

  useEffect(() => {
    fetchBranches().then(setBranches).catch(() => {
      const message = 'Unable to load branch information.'
      setBranches([])
      setError(message)
      notify(message)
    }).finally(() => setIsBranchesLoading(false))
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

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)
    try {
      const savedRegistration = await createNetworkRegistration({ ...form, createdBy: username })
      setRegistrations((current) => selectedMonth && !savedRegistration.incidentDate.startsWith(selectedMonth)
        ? current
        : [savedRegistration, ...current])
      setForm({ ...emptyRegistration, incidentDate: new Date().toISOString().slice(0, 10) })
      setIsFormOpen(false)
      notify('Network report added successfully.', 'success')
    } catch (saveError) {
      const message = Object.values(saveError.errors || {}).flat()[0] || saveError.message
      setError(message)
      notify(message)
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
    setForm({ ...emptyRegistration, incidentDate: new Date().toISOString().slice(0, 10) })
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
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#e09f1f]">Ambassador workspace</p>
          <h1 className="text-2xl font-bold text-[#102d54]">My network reports</h1>
          <p className="mt-1 text-sm text-[#718096]">Record each branch network status for the daily report.</p>
          </div>
          <button type="button" onClick={startNewReport} className="rounded-lg bg-[#102d54] px-4 py-2 text-sm font-bold text-white hover:bg-[#1d5b9e]">Add new</button>
        </div>

        {error && <p className="mb-4 rounded-lg border border-[#f2c5c2] bg-[#fff7f6] p-3 text-sm text-[#c2413b]" role="alert">{error}</p>}
        {isFormOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102d54]/40 p-4">
          <form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.12)] sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#102d54]">Add network report</h2>
              <p className="mt-1 text-xs text-[#718096]">Record a network status report for one of your branches.</p>
            </div>
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-sm font-bold text-[#718096] hover:text-[#102d54]">Close</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-xs font-bold text-[#52657d]">Branch name {isBranchesLoading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#1d5b9e] border-t-transparent" aria-label="Loading branches" />}</span>
              <select name="branchName" value={form.branchName} onChange={handleChange} required disabled={isBranchesLoading} className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14] disabled:cursor-wait disabled:opacity-70">
                <option value="">{isBranchesLoading ? 'Loading branches...' : 'Select a branch'}</option>
                {branches.map((branch) => <option key={branch.id} value={branch.branchName}>{branch.branchName}</option>)}
              </select>
            </label>
            <SelectField label="Reason" name="reason" value={form.reason} onChange={handleChange} options={['ELPA', 'Ethio Telecom']} required />
            <Field label="Report date" name="incidentDate" value={form.incidentDate} onChange={handleChange} required type="date" />
            <div className="sm:col-span-2"><Field label="Exception cause / details" name="remark" value={form.remark} onChange={handleChange} type="textarea" /></div>
          </div>
          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={isSaving} className="rounded-lg bg-[#102d54] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1d5b9e] disabled:cursor-not-allowed disabled:opacity-70">{isSaving ? 'Saving...' : 'Save daily report'}</button>
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-[#dce4ee] px-5 py-2.5 text-sm font-semibold text-[#52657d] hover:border-[#1d5b9e]">Cancel</button>
          </div>
        </form>
        </div>}

        <section className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#102d54]">Monthly registrations</h2>
            <label className="flex items-center gap-2 text-xs font-bold text-[#52657d]">
              Filter month
              <input type="month" value={selectedMonth} onChange={handleMonthChange} className="rounded-lg border border-[#dce4ee] bg-white px-3 py-2 text-xs font-normal text-[#1f2937]" />
              {selectedMonth && <button type="button" onClick={() => setSelectedMonth('')} className="font-bold text-[#1d5b9e]">Clear</button>}
            </label>
            <button type="button" onClick={handleExport} disabled={isExporting} className="rounded-lg border border-[#1d5b9e] px-3 py-2 text-xs font-bold text-[#1d5b9e] hover:bg-[#eef5fc] disabled:cursor-not-allowed disabled:opacity-50">
              {isExporting ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
          {isLoading ? <p className="rounded-xl border border-dashed border-[#cbd7e5] bg-white p-6 text-sm text-[#718096]">Loading registrations...</p> : monthGroups.length === 0 ? <p className="rounded-xl border border-dashed border-[#cbd7e5] bg-white p-6 text-sm text-[#718096]">No network registrations for this period.</p> : monthGroups.map((group) => {
            return (
              <div key={getMonthKey(group.date)} className="rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.05)]">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-[#102d54]">{getMonthLabel(group.date)}</h3>
                  <span className="text-xs text-[#718096]">{getMonthLabel(group.date)}</span>
                </div>
                <div className="grid gap-3">
                  {group.entries.map((entry) => (
                    <article key={entry.id} className="rounded-xl border border-[#edf1f5] p-4 text-sm text-[#52657d]">
                      <div className="flex flex-wrap justify-between gap-2">
                        <strong className="text-[#102d54]">{entry.branchName}</strong>
                        <span>{new Date(`${entry.incidentDate}T00:00:00`).toLocaleDateString()}</span>
                      </div>
                      <p className="mt-2"><strong>Reason:</strong> {entry.reason}</p>
                      {entry.remark && <p className="mt-1"><strong>Remark:</strong> {entry.remark}</p>}
                    </article>
                  ))}
                </div>
              </div>
            )
          })}
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
