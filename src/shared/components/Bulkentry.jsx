import { useEffect, useMemo, useRef, useState } from 'react'
import { createWorkbookRow } from '../../modules/ambassador/computerWorkbookStore'

const MAX_ROWS = 500
const MAX_PICKER_OPTIONS = 40
const PARALLEL_SAVES = 3
const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/

const TEMPLATE_HEADERS = ['IP Address', 'Computer Name', 'Computer Model', 'Kaspersky Endpoint', 'Operating System']

const norm = (value) => String(value ?? '').toLowerCase().trim()

const fieldClass =
  'min-h-10 w-full rounded-xl border border-[#e3e8ef] bg-white px-3 text-sm text-[#1f2937] outline-none transition placeholder:text-[#a0aec0] focus:border-[#003498] focus:ring-2 focus:ring-[#003498]/15'

// ---------- Reading the file ----------

// Excel cells can hold text, numbers, dates, formulas or rich text: always turn them into plain text
function cellText(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    if (value instanceof Date) return value.toISOString().slice(0, 10)
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('').trim()
    if ('result' in value) return cellText(value.result)
    if ('text' in value) return cellText(value.text)
    if ('hyperlink' in value) return String(value.hyperlink)
    return ''
  }
  return String(value).trim()
}

function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, '')
  const firstLine = clean.split(/\r?\n/, 1)[0] || ''
  const delimiter = [',', ';', '\t']
    .map((candidate) => [candidate, firstLine.split(candidate).length])
    .sort((a, b) => b[1] - a[1])[0][0]

  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i]
    if (quoted) {
      if (char === '"' && clean[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') quoted = false
      else cell += char
    } else if (char === '"') quoted = true
    else if (char === delimiter) {
      row.push(cell)
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && clean[i + 1] === '\n') i += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += char
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.map((cells) => cells.map((text) => text.trim()))
}

// Which of our fields does a column header mean? (spelling and wording can differ a little)
function fieldFor(header) {
  const text = String(header ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return null
  if (/branch|mto|printer|customer|managed|status|agent|user|scanner|job/.test(text)) return null
  if (/endpoint|kasper/.test(text)) return 'endpoint'
  if (/operating|\bos\b|sytem|sgtem/.test(text)) return 'operatingSystem'
  if (/model/.test(text)) return 'computerModel'
  if (/name|host/.test(text)) return 'computerName'
  if (/\bip\b|ipaddress/.test(text)) return 'ipAddress'
  return null
}

function findHeader(table) {
  for (let r = 0; r < Math.min(table.length, 25); r += 1) {
    const columns = {}
    table[r].forEach((text, c) => {
      const field = fieldFor(text)
      if (field && columns[field] === undefined) columns[field] = c
    })
    if (columns.ipAddress !== undefined) return { headerIndex: r, columns }
  }
  return null
}

// "Windows 10 Pro N" -> "Windows 10", "Win 11" -> "Windows 11", anything else -> "" (the ambassador picks it)
function normalizeOs(text) {
  const value = String(text ?? '').toLowerCase()
  if (/\b11\b/.test(value)) return 'Windows 11'
  if (/\b10\b/.test(value)) return 'Windows 10'
  return ''
}

function extractItems(table, header) {
  const items = []
  for (let r = header.headerIndex + 1; r < table.length; r += 1) {
    const cells = table[r]
    const get = (field) => (header.columns[field] === undefined ? '' : String(cells[header.columns[field]] ?? '').trim())
    const item = {
      excelRow: r + 1,
      ip: get('ipAddress'),
      name: get('computerName'),
      model: get('computerModel'),
      endpoint: get('endpoint'),
      osRaw: get('operatingSystem'),
    }
    if (!item.ip && !item.name && !item.model && !item.endpoint && !item.osRaw) continue
    // "Total number of computers = 7" style lines are not computers
    if (cells.some((text) => /^total/i.test(String(text ?? '').trim()))) continue
    item.os = normalizeOs(item.osRaw)
    items.push(item)
  }
  return items
}

async function readComputersFile(file) {
  const lower = file.name.toLowerCase()
  const tables = []

  if (lower.endsWith('.csv')) {
    tables.push(parseCsv(await file.text()))
  } else if (lower.endsWith('.xlsx')) {
    // Loaded only when a file is read, so it does not slow down the rest of the app
    const loaded = await import('exceljs')
    const ExcelJS = loaded.default ?? loaded
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await file.arrayBuffer())
    workbook.eachSheet((sheet) => {
      const table = []
      for (let r = 1; r <= sheet.rowCount; r += 1) {
        const row = sheet.getRow(r)
        const cells = []
        for (let c = 1; c <= sheet.columnCount; c += 1) cells.push(cellText(row.getCell(c).value))
        table.push(cells)
      }
      tables.push(table)
    })
  } else {
    throw new Error('Please upload an .xlsx or .csv file. (For an older .xls file, open it in Excel and save it as .xlsx.)')
  }

  for (const table of tables) {
    const header = findHeader(table)
    if (header) {
      const items = extractItems(table, header)
      if (items.length === 0) throw new Error('No computers were found in the file.')
      if (items.length > MAX_ROWS) throw new Error(`The file has ${items.length} computers. Please upload at most ${MAX_ROWS} at a time.`)
      return items
    }
  }
  throw new Error(`Could not find the column headers. Please use the template: ${TEMPLATE_HEADERS.join(', ')}.`)
}

// An empty sheet with the right headers (and a list for the operating system), plus an example sheet
async function downloadTemplate() {
  const loaded = await import('exceljs')
  const ExcelJS = loaded.default ?? loaded
  const workbook = new ExcelJS.Workbook()
  const widths = [18, 28, 20, 22, 20]

  const styleHeader = (sheet) => {
    TEMPLATE_HEADERS.forEach((text, index) => {
      const cell = sheet.getRow(1).getCell(index + 1)
      cell.value = text
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003498' } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      sheet.getColumn(index + 1).width = widths[index]
    })
    sheet.getRow(1).height = 24
  }

  const sheet = workbook.addWorksheet('Computers', { views: [{ state: 'frozen', ySplit: 1 }] })
  styleHeader(sheet)
  for (let r = 2; r <= 300; r += 1) {
    sheet.getRow(r).getCell(5).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Windows 10,Windows 11"'],
    }
  }

  const example = workbook.addWorksheet('Example')
  styleHeader(example)
  example.addRow(['10.10.12.34', 'BRH-BOLE-PC01', 'OptiPlex 5070', '14.0.0.504', 'Windows 10'])
  example.addRow(['10.10.12.35', 'BRH-BOLE-PC02', 'OptiPlex 3080', '14.0.0.504', 'Windows 11'])

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'computers-template.xlsx'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// ---------- Branch picker (type a name or code) ----------

function BranchSelect({ branches, value, onChange, disabled }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const selected = branches.find((branch) => String(branch.id) === String(value))
  const matches = useMemo(() => {
    const tokens = norm(query).split(/\s+/).filter(Boolean)
    const indexed = branches.map((branch) => ({ branch, key: norm(`${branch.branchName} ${branch.branchCode}`) }))
    const list = tokens.length ? indexed.filter((item) => tokens.every((token) => item.key.includes(token))) : indexed
    return { items: list.slice(0, MAX_PICKER_OPTIONS), total: list.length }
  }, [branches, query])

  useEffect(() => {
    if (!isOpen) return undefined
    function handleOutside(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        autoComplete="off"
        disabled={disabled}
        value={isOpen ? query : selected ? selected.branchName : ''}
        placeholder={branches.length ? 'Choose the branch' : 'You have no branches yet'}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        className={`${fieldClass} pr-9 disabled:bg-[#f6f8fb]`}
      />
      <span className="pointer-events-none absolute right-3 top-2.5 text-[#8a98ab]">▾</span>

      {isOpen && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-[#e3e8ef] bg-white shadow-xl">
          <ul className="max-h-60 overflow-y-auto">
            {matches.items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-[#718096]">No branch found</li>
            ) : (
              matches.items.map(({ branch }) => (
                <li key={branch.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(String(branch.id))
                      setIsOpen(false)
                      setQuery('')
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-[#eef3fc]"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#102d54]">{branch.branchName}</span>
                    {branch.branchCode && (
                      <span className="shrink-0 rounded-full bg-[#f1f4f9] px-2.5 py-0.5 font-mono text-xs text-[#52657d]">
                        {branch.branchCode}
                      </span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
          {matches.total > matches.items.length && (
            <p className="border-t border-[#f0f3f7] bg-[#f8fafc] px-4 py-2 text-xs text-[#718096]">
              Showing {matches.items.length} of {matches.total}. Keep typing to narrow it down.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Button + dialog ----------

export default function BulkEntryButton({ branches = [], rows = [], onImported }) {
  const [isOpen, setIsOpen] = useState(false)
  const [phase, setPhase] = useState('select') // select -> importing -> done
  const [branchId, setBranchId] = useState('')
  const [fileName, setFileName] = useState('')
  const [items, setItems] = useState([])
  const [isReading, setIsReading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [result, setResult] = useState({ saved: 0, failed: [], stopped: '' })
  const fileInputRef = useRef(null)

  const selectedBranch = branches.find((branch) => String(branch.id) === String(branchId))

  function openDialog() {
    setPhase('select')
    setBranchId('')
    setFileName('')
    setItems([])
    setError('')
    setResult({ saved: 0, failed: [], stopped: '' })
    setIsOpen(true)
  }

  function closeDialog() {
    if (phase === 'importing') return
    setIsOpen(false)
  }

  useEffect(() => {
    if (!isOpen) return undefined
    function handleEscape(event) {
      if (event.key === 'Escape' && phase !== 'importing') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, phase])

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    setItems([])
    setFileName(file.name)
    setIsReading(true)
    try {
      setItems(await readComputersFile(file))
    } catch (readError) {
      setError(readError.message || 'The file could not be read.')
    } finally {
      setIsReading(false)
    }
  }

  // Computers that are already in the chosen branch (same IP) are skipped
  const existingIps = useMemo(
    () => new Set(rows.filter((row) => String(row.branchId) === String(branchId)).map((row) => String(row.ipAddress).trim())),
    [rows, branchId],
  )

  const analyzed = useMemo(() => {
    const seen = new Map()
    return items.map((item) => {
      let issue = ''
      if (!item.ip) issue = 'Missing IP address'
      else if (!IPV4.test(item.ip)) issue = 'Invalid IP address'
      else if (seen.has(item.ip)) issue = `Repeated (row ${seen.get(item.ip)})`
      else if (branchId && existingIps.has(item.ip)) issue = 'Already in this branch'
      else if (item.name.length > 120) issue = 'Name is too long'
      else if (item.model.length > 100) issue = 'Model is too long'
      else if (item.endpoint.length > 60) issue = 'Endpoint is too long'
      else if (!item.os) issue = 'Choose the operating system'
      if (item.ip && IPV4.test(item.ip) && !seen.has(item.ip)) seen.set(item.ip, item.excelRow)
      return { ...item, issue }
    })
  }, [items, existingIps, branchId])

  const ready = analyzed.filter((item) => !item.issue)
  const skipped = analyzed.length - ready.length

  function setOs(excelRow, value) {
    setItems((current) => current.map((item) => (item.excelRow === excelRow ? { ...item, os: value } : item)))
  }

  async function runImport() {
    if (!selectedBranch || ready.length === 0) return
    setError('')
    setPhase('importing')
    setProgress({ done: 0, total: ready.length })

    const saved = []
    const failed = []
    let stopped = ''

    const save = (item) =>
      createWorkbookRow({
        branchId: selectedBranch.id,
        ipAddress: item.ip,
        computerName: item.name,
        computerModel: item.model,
        computerJob: '', // the ambassador fills these in one by one afterwards
        chequeScanner: 'No',
        operatingSystem: item.os,
        status: 'Active',
        networkAgent: '',
        endpoint: item.endpoint,
        kasperskyStatus: '',
        remark: '',
      })

    // The first computer goes alone: if the server itself fails (not a normal validation message), stop right away
    try {
      saved.push(await save(ready[0]))
    } catch (firstError) {
      const isValidation = Object.keys(firstError.errors || {}).length > 0
      const message = Object.values(firstError.errors || {}).flat()[0] || firstError.message
      if (!isValidation) {
        setResult({ saved: 0, failed: [], stopped: message })
        setProgress({ done: 1, total: ready.length })
        setPhase('done')
        return
      }
      failed.push({ item: ready[0], message })
    }
    setProgress({ done: 1, total: ready.length })

    let cursor = 1
    async function worker() {
      while (cursor < ready.length) {
        const item = ready[cursor]
        cursor += 1
        try {
          saved.push(await save(item))
        } catch (saveError) {
          failed.push({ item, message: Object.values(saveError.errors || {}).flat()[0] || saveError.message })
        }
        setProgress((current) => ({ ...current, done: current.done + 1 }))
      }
    }
    await Promise.all(Array.from({ length: Math.min(PARALLEL_SAVES, ready.length - 1) }, worker))

    setResult({ saved: saved.length, failed, stopped })
    setPhase('done')
    if (saved.length > 0 && onImported) onImported(saved)
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="rounded-full border border-[#003498] px-5 py-2 text-sm font-semibold text-[#003498] transition hover:bg-[#eef4ff]"
      >
        Bulk entry
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#102d54]/50 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDialog()
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="bulk-entry-title" className="my-8 w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="bulk-entry-title" className="text-xl font-bold text-[#102d54]">Bulk entry</h2>
                <p className="mt-1 text-sm text-[#718096]">Add many computers to one branch from an Excel file.</p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                disabled={phase === 'importing'}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8a98ab] transition hover:bg-[#f1f4f9] hover:text-[#1f2937] disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            {phase === 'select' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className="mb-1 block text-xs font-semibold text-[#52657d]">1. Branch</span>
                    <BranchSelect branches={branches} value={branchId} onChange={setBranchId} />
                  </div>
                  <div>
                    <span className="mb-1 block text-xs font-semibold text-[#52657d]">2. Excel file (.xlsx or .csv)</span>
                    <div className="flex items-center gap-2">
                      <input ref={fileInputRef} type="file" accept=".xlsx,.csv" onChange={handleFile} className="hidden" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isReading}
                        className="min-h-10 rounded-xl bg-[#f1f4f9] px-4 text-sm font-semibold text-[#003498] transition hover:bg-[#e8eefb] disabled:opacity-60"
                      >
                        {isReading ? 'Reading...' : fileName ? 'Choose another file' : 'Choose file'}
                      </button>
                      <span className="min-w-0 flex-1 truncate text-xs text-[#8a98ab]">{fileName}</span>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-xs text-[#718096]">
                  Columns: {TEMPLATE_HEADERS.join(', ')}.{' '}
                  <button type="button" onClick={downloadTemplate} className="font-semibold text-[#003498] hover:underline">
                    Download the template
                  </button>
                </p>

                {error && (
                  <p className="mt-4 rounded-xl bg-[#fdeceb] px-4 py-2.5 text-sm text-[#b3372f]" role="alert">
                    {error}
                  </p>
                )}

                {analyzed.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#102d54]">
                        {ready.length} ready
                        {skipped > 0 && <span className="ml-2 font-normal text-amber-700">{skipped} skipped</span>}
                      </p>
                      <p className="text-xs text-[#8a98ab]">Job, cheque scanner and Kaspersky status stay empty. You fill them in after the import.</p>
                    </div>

                    <div className="max-h-72 overflow-auto rounded-2xl border border-[#e8edf3]">
                      <table className="w-full min-w-[40rem] text-left text-xs">
                        <thead className="sticky top-0 bg-[#f8fafc] text-[#52657d]">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Row</th>
                            <th className="px-3 py-2 font-semibold">IP address</th>
                            <th className="px-3 py-2 font-semibold">Name</th>
                            <th className="px-3 py-2 font-semibold">Model</th>
                            <th className="px-3 py-2 font-semibold">Endpoint</th>
                            <th className="px-3 py-2 font-semibold">Operating system</th>
                            <th className="px-3 py-2 font-semibold">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0f3f7]">
                          {analyzed.map((item) => (
                            <tr key={item.excelRow} className={item.issue && item.issue !== 'Choose the operating system' ? 'bg-[#fffaf0]' : ''}>
                              <td className="px-3 py-2 text-[#8a98ab]">{item.excelRow}</td>
                              <td className="px-3 py-2 font-mono text-[#102d54]">{item.ip || '—'}</td>
                              <td className="max-w-[9rem] truncate px-3 py-2">{item.name || '—'}</td>
                              <td className="max-w-[8rem] truncate px-3 py-2">{item.model || '—'}</td>
                              <td className="px-3 py-2 font-mono">{item.endpoint || '—'}</td>
                              <td className="px-3 py-2">
                                {item.os ? (
                                  item.os
                                ) : (
                                  <select
                                    value=""
                                    onChange={(event) => setOs(item.excelRow, event.target.value)}
                                    aria-label={`Operating system for row ${item.excelRow}`}
                                    className="rounded-lg border border-[#e3e8ef] bg-white px-2 py-1 text-xs"
                                  >
                                    <option value="">{item.osRaw ? `"${item.osRaw}"?` : 'Choose'}</option>
                                    <option value="Windows 10">Windows 10</option>
                                    <option value="Windows 11">Windows 11</option>
                                  </select>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {item.issue ? (
                                  <span className="font-semibold text-amber-700">{item.issue}</span>
                                ) : (
                                  <span className="font-semibold text-emerald-700">Ready</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-end gap-2">
                  <button type="button" onClick={closeDialog} className="rounded-full px-5 py-2 text-sm font-medium text-[#52657d] transition hover:bg-[#f1f4f9]">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={runImport}
                    disabled={!selectedBranch || ready.length === 0}
                    className="rounded-full bg-[#003498] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#00246B] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {!selectedBranch
                      ? 'Choose a branch'
                      : ready.length === 0
                      ? 'Nothing to import'
                      : `Import ${ready.length} ${ready.length === 1 ? 'computer' : 'computers'}`}
                  </button>
                </div>
              </>
            )}

            {phase === 'importing' && (
              <div className="py-8 text-center">
                <p className="text-sm font-semibold text-[#102d54]">
                  Saving to {selectedBranch?.branchName}... {progress.done} of {progress.total}
                </p>
                <div className="mx-auto mt-4 h-2 w-full max-w-sm overflow-hidden rounded-full bg-[#e8eefb]">
                  <div
                    className="h-full rounded-full bg-[#003498] transition-all"
                    style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-[#8a98ab]">Please keep this window open.</p>
              </div>
            )}

            {phase === 'done' && (
              <div>
                {result.stopped ? (
                  <p className="rounded-2xl bg-[#fdeceb] px-4 py-3 text-sm text-[#b3372f]" role="alert">
                    The import was stopped because the server could not save the first computer: {result.stopped}
                  </p>
                ) : (
                  <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    {result.saved} {result.saved === 1 ? 'computer was' : 'computers were'} added to {selectedBranch?.branchName}.
                  </p>
                )}

                {result.failed.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-semibold text-[#b3372f]">{result.failed.length} could not be saved</p>
                    <ul className="max-h-40 divide-y divide-[#f0f3f7] overflow-auto rounded-2xl border border-[#e8edf3] text-xs">
                      {result.failed.map(({ item, message }) => (
                        <li key={item.excelRow} className="flex flex-wrap gap-x-3 px-3 py-2">
                          <span className="font-mono text-[#102d54]">{item.ip}</span>
                          <span className="text-[#b3372f]">{message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.saved > 0 && (
                  <p className="mt-4 rounded-2xl bg-[#f6f8fb] px-4 py-3 text-sm text-[#52657d]">
                    Next, open each new computer with <strong>Edit</strong> and fill in its job, cheque scanner and Kaspersky status.
                    They are tagged <strong>Details needed</strong> until you do.
                  </p>
                )}

                <div className="mt-6 flex justify-end">
                  <button type="button" onClick={() => setIsOpen(false)} className="rounded-full bg-[#003498] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#00246B]">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}