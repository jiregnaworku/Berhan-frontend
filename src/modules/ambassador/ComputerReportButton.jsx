import { useEffect, useMemo, useState } from 'react'

const contentOptions = [
  { value: 'ip', label: 'IP addresses only', hint: 'The computer IP of every computer.' },
  { value: 'names', label: 'Computer names only', hint: 'Computers without a name are skipped.' },
  { value: 'all', label: 'All information', hint: 'IP, name, job, OS, status, Net Agent, Endpoint and Kaspersky status.' },
]

const columnsByContent = {
  ip: [['Computer IP', 'ipAddress']],
  names: [['Computer name', 'computerName']],
  all: [
    ['Computer IP', 'ipAddress'],
    ['Computer name', 'computerName'],
    ['Job', 'computerJob'],
    ['Operating system', 'operatingSystem'],
    ['Status', 'status'],
    ['Net Agent', 'networkAgent'],
    ['Endpoint', 'endpoint'],
    ['Kaspersky status', 'kasperskyStatus'],
  ],
}

function csvCell(value) {
  let text = String(value ?? '')
  // Stop spreadsheet apps from treating text as a formula.
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

function downloadCsv(filename, lines) {
  // The BOM makes Excel open the file with the correct encoding.
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function slug(text) {
  return String(text || '').trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

export default function ComputerReportButton({ rows = [], branches = [] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [scope, setScope] = useState('all')
  const [branchId, setBranchId] = useState('')
  const [content, setContent] = useState('all')

  useEffect(() => {
    if (!isOpen) return undefined
    function handleEscape(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const branchName = (id) => branches.find((branch) => String(branch.id) === String(id))?.branchName || 'Unknown branch'

  const selectedRows = useMemo(() => {
    let list = scope === 'one' ? rows.filter((row) => String(row.branchId) === String(branchId)) : rows
    if (content === 'names') list = list.filter((row) => row.computerName)
    return [...list].sort((a, b) =>
      branchName(a.branchId).localeCompare(branchName(b.branchId))
      || String(a.ipAddress).localeCompare(String(b.ipAddress), undefined, { numeric: true }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, branches, scope, branchId, content])

  const canGenerate = selectedRows.length > 0 && (scope === 'all' || branchId !== '')

  function generateReport() {
    if (!canGenerate) return
    const columns = columnsByContent[content]
    const includeBranch = scope === 'all'
    const header = [...(includeBranch ? ['Branch'] : []), ...columns.map(([label]) => label)]
    const lines = [
      header.map(csvCell).join(','),
      ...selectedRows.map((row) =>
        [...(includeBranch ? [branchName(row.branchId)] : []), ...columns.map(([, key]) => row[key])]
          .map(csvCell)
          .join(','),
      ),
    ]
    const scopeName = scope === 'one' ? slug(branchName(branchId)) || 'branch' : 'all-branches'
    const date = new Date().toISOString().slice(0, 10)
    downloadCsv(`computers-${scopeName}-${content}-${date}.csv`, lines)
    setIsOpen(false)
  }

  const radioCard = (selected) =>
    `flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${selected ? 'border-[#003498] bg-[#eef4ff]' : 'border-[#dce4ee] bg-white hover:border-[#9bb6e6]'}`

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-xl border border-[#003498] px-4 py-2 text-sm font-bold text-[#003498] transition hover:bg-[#eef4ff]"
      >
        Generate Report
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#102d54]/60 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false)
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="computer-report-title" className="my-8 w-full max-w-xl rounded-2xl border border-[#e5ebf2] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 id="computer-report-title" className="text-lg font-bold text-[#102d54]">Generate computer report</h2>
                <p className="mt-0.5 text-xs text-[#718096]">Choose the branches and what to include. The report downloads as a CSV file you can open in Excel.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close report dialog" className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">✕</button>
            </div>

            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#003498]">1. Branches</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={radioCard(scope === 'all')}>
                <input type="radio" name="report-scope" checked={scope === 'all'} onChange={() => setScope('all')} className="mt-1" />
                <span><span className="block text-sm font-bold text-[#102d54]">All branches</span><span className="block text-xs text-[#718096]">Adds a Branch column.</span></span>
              </label>
              <label className={radioCard(scope === 'one')}>
                <input type="radio" name="report-scope" checked={scope === 'one'} onChange={() => setScope('one')} className="mt-1" />
                <span><span className="block text-sm font-bold text-[#102d54]">One branch</span><span className="block text-xs text-[#718096]">Pick the branch below.</span></span>
              </label>
            </div>
            {scope === 'one' && (
              <select value={branchId} onChange={(event) => setBranchId(event.target.value)} aria-label="Branch for the report" className="mt-3 min-h-9 w-full rounded-md border border-[#dce4ee] bg-[#fbfcfe] px-2.5 text-xs text-[#1f2937] outline-none focus:border-[#003498] focus:ring-2 focus:ring-[#003498]/20">
                <option value="">Select branch</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branchName}</option>)}
              </select>
            )}

            <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-[#003498]">2. What to include</p>
            <div className="space-y-2">
              {contentOptions.map((option) => (
                <label key={option.value} className={radioCard(content === option.value)}>
                  <input type="radio" name="report-content" checked={content === option.value} onChange={() => setContent(option.value)} className="mt-1" />
                  <span><span className="block text-sm font-bold text-[#102d54]">{option.label}</span><span className="block text-xs text-[#718096]">{option.hint}</span></span>
                </label>
              ))}
            </div>

            <p className="mt-4 rounded-lg bg-[#f8fafc] px-3 py-2 text-xs text-[#52657d]" role="status">
              {scope === 'one' && !branchId
                ? 'Select a branch to see how many computers will be included.'
                : `${selectedRows.length} ${selectedRows.length === 1 ? 'computer' : 'computers'} will be included.`}
            </p>

            <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl border border-[#dce4ee] px-5 py-2 text-xs font-semibold text-[#52657d] transition hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={generateReport} disabled={!canGenerate} className="rounded-xl bg-[#003498] px-6 py-2 text-xs font-bold text-white shadow-md transition hover:bg-[#00246B] disabled:cursor-not-allowed disabled:opacity-60">Download report</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}