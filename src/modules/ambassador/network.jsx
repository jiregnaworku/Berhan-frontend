import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../shared/components/DashboardLayout.jsx'
import { fetchBranches } from './branchStore.js'
import { getNetworkRegistrations, saveNetworkRegistrations } from './networkStore.js'

const emptyRegistration = {
  branchName: '',
  reason: '',
  remark: '',
  ethioTelecomSide: '',
  ethioTelecomFrequency: '',
  elphaSide: '',
  elphaFrequency: '',
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

function getMonthKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}`
}

function getMonthLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function NetworkContent({ username }) {
  const [branches, setBranches] = useState([])
  const [registrations, setRegistrations] = useState(getNetworkRegistrations)
  const [form, setForm] = useState(emptyRegistration)

  useEffect(() => {
    fetchBranches().then(setBranches).catch(() => setBranches([]))
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const updated = [
      { ...form, id: crypto.randomUUID(), createdAt: new Date().toISOString(), createdBy: username },
      ...registrations,
    ]
    saveNetworkRegistrations(updated)
    setRegistrations(updated)
    setForm(emptyRegistration)
  }

  const now = new Date()
  const grouped = registrations.reduce((groups, registration) => {
    const date = new Date(registration.createdAt)
    const key = getMonthKey(date)
    if (!groups[key]) groups[key] = { date, entries: [] }
    groups[key].entries.push(registration)
    return groups
  }, {})
  const monthGroups = Object.values(grouped).sort((a, b) => b.date - a.date)

  return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#e09f1f]">Ambassador workspace</p>
          <h1 className="text-2xl font-bold text-[#102d54]">Network registration</h1>
          <p className="mt-1 text-sm text-[#718096]">Record frequently occurring network outages by branch.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.05)] sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-[#52657d]">Branch name</span>
              <select name="branchName" value={form.branchName} onChange={handleChange} required className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]">
                <option value="">Select a branch</option>
                {branches.map((branch) => <option key={branch.id} value={branch.branchName}>{branch.branchName}</option>)}
              </select>
            </label>
            <Field label="Reason" name="reason" value={form.reason} onChange={handleChange} required />
            <div className="sm:col-span-2"><Field label="Remark" name="remark" value={form.remark} onChange={handleChange} type="textarea" /></div>
            <h2 className="text-sm font-bold text-[#102d54] sm:col-span-2">Network sides and frequency</h2>
            <Field label="Ethio Telecom side" name="ethioTelecomSide" value={form.ethioTelecomSide} onChange={handleChange} />
            <Field label="Ethio Telecom frequency" name="ethioTelecomFrequency" value={form.ethioTelecomFrequency} onChange={handleChange} />
            <Field label="ELPHA side" name="elphaSide" value={form.elphaSide} onChange={handleChange} />
            <Field label="ELPHA frequency" name="elphaFrequency" value={form.elphaFrequency} onChange={handleChange} />
          </div>
          <button type="submit" className="mt-6 rounded-lg bg-[#102d54] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1d5b9e]">Register outage</button>
        </form>

        <section className="mt-6 space-y-5">
          <h2 className="text-lg font-bold text-[#102d54]">Monthly registrations</h2>
          {monthGroups.length === 0 ? <p className="rounded-xl border border-dashed border-[#cbd7e5] bg-white p-6 text-sm text-[#718096]">No network registrations yet.</p> : monthGroups.map((group) => {
            const isCurrent = getMonthKey(group.date) === getMonthKey(now)
            const isPrevious = getMonthKey(group.date) === getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))
            return (
              <div key={getMonthKey(group.date)} className="rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.05)]">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-[#102d54]">{isCurrent ? 'This month' : isPrevious ? 'Last month' : getMonthLabel(group.date)}</h3>
                  <span className="text-xs text-[#718096]">{getMonthLabel(group.date)}</span>
                </div>
                <div className="grid gap-3">
                  {group.entries.map((entry) => (
                    <article key={entry.id} className="rounded-xl border border-[#edf1f5] p-4 text-sm text-[#52657d]">
                      <div className="flex flex-wrap justify-between gap-2">
                        <strong className="text-[#102d54]">{entry.branchName}</strong>
                        <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="mt-2"><strong>Reason:</strong> {entry.reason}</p>
                      {entry.remark && <p className="mt-1"><strong>Remark:</strong> {entry.remark}</p>}
                      <p className="mt-1"><strong>Ethio Telecom:</strong> {entry.ethioTelecomSide || '—'} / {entry.ethioTelecomFrequency || '—'}</p>
                      <p className="mt-1"><strong>ELPHA:</strong> {entry.elphaSide || '—'} / {entry.elphaFrequency || '—'}</p>
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
