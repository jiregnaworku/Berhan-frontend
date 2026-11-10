import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../shared/components/DashboardLayout.jsx'
import { fetchBranches } from '../ambassador/branchStore.js'
import { fetchWorkbookRows, updateKasperskyDetails } from '../ambassador/computerWorkbookStore.js'
import { fetchProfile } from '../../shared/components/settingsStore.js'
import { useDashboardToast } from '../../shared/components/dashboardToast.js'

function valueOrFallback(value) {
  return value || 'Not provided'
}

function SectionCard({ title, subtitle, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-[#e1e8f0] bg-white shadow-[0_8px_24px_rgba(16,45,84,0.05)] ${className}`}>
      <div className="border-b border-[#e8eef5] bg-[#f6f9fc] px-5 py-3.5">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#102d54]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-[#718096]">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function Avatar({ text }) {
  const letter = String(text || '?').trim().charAt(0).toUpperCase() || '?'
  return <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#102d54] to-[#1d5b9e] text-base font-bold text-white">{letter}</span>
}

function Badge({ children }) {
  return <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/25">{children}</span>
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3">
      <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[#61758c]">{label}</dt>
      <dd className="text-sm font-semibold text-[#243b53]">{valueOrFallback(value)}</dd>
    </div>
  )
}

function ContactCard({ role, name, phoneLabel, phone }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#e1e8f0] bg-[#fbfcfe] p-4">
      <Avatar text={name} />
      <div className="min-w-0 flex-1">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#e09f1f]">{role}</p>
        <p className="mt-0.5 truncate text-sm font-bold text-[#102d54]">{valueOrFallback(name)}</p>
        <p className="mt-2 text-xs text-[#718096]">{phoneLabel}</p>
        <p className="text-sm font-semibold text-[#243b53]">{valueOrFallback(phone)}</p>
      </div>
    </div>
  )
}

function StatusBadge({ value }) {
  const text = String(value ?? '').trim()
  if (!text) return <span className="text-[#a0aec0]">—</span>
  const lower = text.toLowerCase()
  const tone = /\b(not|no|offline|off|fail|failed|error|inactive|stopped|down|expired)\b/.test(lower)
    ? 'bg-[#fff1f0] text-[#c2413b] ring-[#f2c5c2]'
    : /(work|online|ok|active|run|up|good|protect|running|enabled)/.test(lower)
      ? 'bg-[#ecfdf5] text-[#065f46] ring-[#c6f6d5]'
      : 'bg-[#eef4f8] text-[#52657d] ring-[#dce4ee]'
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${tone}`}>{text}</span>
}

export function OurBranchContent() {
  const [branch, setBranch] = useState(null)
  const [computers, setComputers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const { notify } = useDashboardToast()
  const [editingComputer, setEditingComputer] = useState(null)
  const [kasperskyForm, setKasperskyForm] = useState({ networkAgent: '', endpoint: '' })
  const [isSavingKaspersky, setIsSavingKaspersky] = useState(false)

  function startKasperskyEdit(computer) {
    setEditingComputer(computer)
    setKasperskyForm({ networkAgent: computer.networkAgent || '', endpoint: computer.endpoint || '' })
  }

  async function handleKasperskySubmit(event) {
    event.preventDefault()
    setIsSavingKaspersky(true)
    try {
      const savedRow = await updateKasperskyDetails(editingComputer.id, kasperskyForm)
      setComputers((current) => current.map((computer) => (computer.id === savedRow.id ? savedRow : computer)))
      setEditingComputer(null)
      notify('Net Agent and Endpoint updated successfully.', 'success')
    } catch (saveError) {
      notify(Object.values(saveError.errors || {}).flat()[0] || saveError.message)
    } finally {
      setIsSavingKaspersky(false)
    }
  }

  useEffect(() => {
    Promise.all([fetchProfile(), fetchBranches(), fetchWorkbookRows()])
      .then(([profile, branches, rows]) => {
        const ownBranch = branches.find((item) => String(item.id) === String(profile.branch_id))
        setBranch(ownBranch || null)
        setComputers(rows.filter((row) => String(row.branchId) === String(profile.branch_id)))
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#e09f1f]">Branch manager workspace</p>
        <h1 className="text-2xl font-bold text-[#102d54]">Our Branch</h1>
        <p className="mt-1 text-sm text-[#718096]">Read-only information entered by your ambassador and service desk team.</p>
      </div>
      {error && <p className="mb-5 rounded-lg border border-[#f2c5c2] bg-[#fff7f6] p-4 text-sm text-[#c2413b]" role="alert">{error}</p>}
      {isLoading ? <p className="flex items-center gap-2 rounded-lg border border-[#dce4ee] bg-white p-4 text-sm text-[#718096]" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1d5b9e] border-t-transparent" />Loading branch information...</p> : !branch ? (
        <p className="rounded-lg border border-[#dce4ee] bg-white p-4 text-sm text-[#718096]">No branch is linked to this account.</p>
      ) : (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#102d54] to-[#1d5b9e] p-5 text-white shadow-[0_10px_28px_rgba(16,45,84,0.18)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#f5c46b]">Branch</p>
                <h2 className="mt-1 text-2xl font-bold">{branch.branchName}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>Code: {valueOrFallback(branch.branchCode)}</Badge>
                  <Badge>Type: {valueOrFallback(branch.branchType)}</Badge>
                  <Badge>Location: {valueOrFallback(branch.branchLocation)}</Badge>
                </div>
              </div>
              <div className="rounded-xl bg-white/10 px-5 py-3 text-center ring-1 ring-white/20">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-white/70">Working computers</p>
                <p className="mt-1 text-2xl font-bold">{valueOrFallback(branch.workingComputers)}</p>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <SectionCard title="Branch contacts" subtitle="People responsible for this branch" className="lg:col-span-2">
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                <ContactCard role="Ambassador" name={branch.ambassadorName} phoneLabel="Ambassador phone" phone={branch.ambassadorPhone} />
                <ContactCard role="Manager" name={branch.managerName} phoneLabel="Manager phone" phone={branch.managerPhone} />
                <ContactCard role="Backup ambassador" name={branch.backupName} phoneLabel="Backup phone" phone={branch.backupPhone} />
                <ContactCard role="Assistant" name={branch.assistantName} phoneLabel="Assistant phone" phone={branch.assistantMobile} />
              </div>
            </SectionCard>

            <SectionCard title="Network details" subtitle="Branch devices and servers">
              <dl className="divide-y divide-[#edf1f5]">
                <DetailRow label="Display TV IP" value={branch.displayTvIp} />
                <DetailRow label="Kaspersky server IP" value={branch.kasperskyServerIp} />
              </dl>
            </SectionCard>
          </div>

          <SectionCard title="Branch computers" subtitle={`${computers.length} ${computers.length === 1 ? 'computer' : 'computers'} registered`}>
            {computers.length === 0 ? <p className="p-5 text-sm text-[#718096]">No computers have been registered yet.</p> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[75rem] text-left text-sm"><thead className="border-b border-[#dfe8ee] bg-[#fbfcfe] text-[10px] uppercase tracking-wide text-[#52657d]"><tr><th className="px-5 py-3">IP address</th><th className="px-5 py-3">Computer name</th><th className="px-5 py-3">Job</th><th className="px-5 py-3">Operating system</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Network agent</th><th className="px-5 py-3">Endpoint</th><th className="px-5 py-3">Kaspersky status</th>{branch.managerCanEdit && <th className="px-5 py-3 text-right">Actions</th>}</tr></thead><tbody className="divide-y divide-[#edf1f5]">{computers.map((computer) => <tr key={computer.id} className="text-[#52657d] hover:bg-[#f8fafc]"><td className="px-5 py-3 font-semibold text-[#102d54]">{computer.ipAddress}</td><td className="px-5 py-3">{valueOrFallback(computer.computerName)}</td><td className="px-5 py-3">{valueOrFallback(computer.computerJob)}</td><td className="px-5 py-3">{computer.operatingSystem}</td><td className="px-5 py-3"><StatusBadge value={computer.status} /></td><td className="px-5 py-3">{valueOrFallback(computer.networkAgent)}</td><td className="px-5 py-3">{valueOrFallback(computer.endpoint)}</td><td className="px-5 py-3"><StatusBadge value={computer.kasperskyStatus} /></td>{branch.managerCanEdit && <td className="px-5 py-3 text-right"><button type="button" onClick={() => startKasperskyEdit(computer)} className="rounded-full border border-[#cfe0f3] px-3 py-1 text-xs font-bold text-[#1d5b9e] hover:bg-[#e8f0fe]">Edit</button></td>}</tr>)}</tbody></table></div>
            )}
          </SectionCard>
        </div>
      )}
      {editingComputer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102d54]/40 p-4">
          <form onSubmit={handleKasperskySubmit} className="w-full max-w-md rounded-2xl border border-[#e5ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(16,45,84,0.12)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#102d54]">Update Kaspersky details</h2>
                <p className="mt-1 text-xs text-[#718096]">Computer {editingComputer.ipAddress}{editingComputer.computerName ? ` · ${editingComputer.computerName}` : ''}</p>
              </div>
              <button type="button" onClick={() => setEditingComputer(null)} className="text-2xl font-semibold text-[#718096]" aria-label="Close Kaspersky form">×</button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-[#52657d]">Net Agent IP / Version</span>
                <input value={kasperskyForm.networkAgent} onChange={(event) => setKasperskyForm((current) => ({ ...current, networkAgent: event.target.value }))} maxLength={60} className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-[#52657d]">Endpoint Protection IP / Version</span>
                <input value={kasperskyForm.endpoint} onChange={(event) => setKasperskyForm((current) => ({ ...current, endpoint: event.target.value }))} maxLength={60} className="min-h-10 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14]" />
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="submit" disabled={isSavingKaspersky} className="rounded-lg bg-[#102d54] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1d5b9e] disabled:cursor-not-allowed disabled:opacity-70">{isSavingKaspersky ? 'Saving...' : 'Save'}</button>
              <button type="button" onClick={() => setEditingComputer(null)} className="rounded-lg border border-[#dce4ee] px-5 py-2.5 text-sm font-semibold text-[#52657d]">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function OurBranch({ username }) {
  return (
    <DashboardLayout roleId="branch-manager" username={username}>
      <OurBranchContent />
    </DashboardLayout>
  )
}

export default OurBranch