import { useEffect, useMemo, useState } from 'react'

// ---------- Helpers ----------

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const pad = (number) => String(number).padStart(2, '0')
const toMonthString = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
const shiftMonth = (months) => {
  const now = new Date()
  return toMonthString(new Date(now.getFullYear(), now.getMonth() + months, 1))
}

// "jiregna.worku" -> "Jiregna Worku"
function displayName(username) {
  return String(username || '')
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

// "2026-10" + "2026-10" -> "OCTOBER 1–31, 2026"
function formatRangeLabel(from, to) {
  const [fromYear, fromMonth] = from.split('-').map(Number)
  const [toYear, toMonth] = to.split('-').map(Number)
  const lastDay = new Date(toYear, toMonth, 0).getDate()
  const fromName = MONTH_NAMES[fromMonth - 1]
  const toName = MONTH_NAMES[toMonth - 1]

  let label
  if (from === to) label = `${fromName} 1–${lastDay}, ${fromYear}`
  else if (fromYear === toYear) label = `${fromName} 1 – ${toName} ${lastDay}, ${toYear}`
  else label = `${fromName} 1, ${fromYear} – ${toName} ${lastDay}, ${toYear}`
  return label.toUpperCase()
}

// ["2026-10-24", "2026-10-28"] -> "October 24 and 28, 2026"
function formatDateList(dates) {
  const unique = Array.from(new Set(dates)).sort()
  const byMonth = new Map()
  for (const date of unique) {
    const [year, month, day] = date.split('-')
    const key = `${year}-${month}`
    if (!byMonth.has(key)) byMonth.set(key, { year, month: Number(month), days: [] })
    byMonth.get(key).days.push(Number(day))
  }
  return Array.from(byMonth.values())
    .map(({ year, month, days }) => {
      const list = days.length > 1 ? `${days.slice(0, -1).join(', ')} and ${days[days.length - 1]}` : String(days[0])
      return `${MONTH_NAMES[month - 1]} ${list}, ${year}`
    })
    .join('; ')
}

// One row per branch: how many ELPA / Ethio Telecom incidents, on which dates, and any notes
function buildBranchRows(entries) {
  const byBranch = new Map()
  for (const entry of entries) {
    const name = entry.branchName || 'Unknown branch'
    if (!byBranch.has(name)) byBranch.set(name, { name, elpa: [], telecom: [], notes: new Set() })
    const branch = byBranch.get(name)
    const date = String(entry.incidentDate || '').slice(0, 10)
    if (entry.reason === 'ELPA') branch.elpa.push(date)
    else if (entry.reason === 'Ethio Telecom') branch.telecom.push(date)
    if (entry.remark && entry.remark.trim()) branch.notes.add(entry.remark.trim())
  }
  return Array.from(byBranch.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function remarkText(branch) {
  const lines = []
  if (branch.elpa.length) lines.push(`ELPA – ${formatDateList(branch.elpa)}`)
  if (branch.telecom.length) lines.push(`Ethio Telecom – ${formatDateList(branch.telecom)}`)
  if (branch.notes.size) lines.push(`Notes: ${Array.from(branch.notes).join('; ')}`)
  return lines.join('\n')
}

// ---------- Excel ----------

const FONT = 'Calibri'
const COLOR = {
  blue: 'FF003498',
  navy: 'FF102D54',
  tint: 'FFE8EEFB',
  zebra: 'FFF8FAFD',
  border: 'FFD5DCE8',
  text: 'FF1F2937',
  muted: 'FF8A98ab',
  amberFill: 'FFFFF3D6',
  amberText: 'FF8A5A00',
  blueFill: 'FFE3ECFB',
  white: 'FFFFFFFF',
}

const solid = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const line = { style: 'thin', color: { argb: COLOR.border } }
const thick = { style: 'medium', color: { argb: COLOR.blue } }
const allLines = () => ({ top: line, left: line, bottom: line, right: line })

function paint(cell, { fill, font, border, alignment }) {
  if (fill) cell.fill = fill
  if (font) cell.font = font
  if (border) cell.border = border
  if (alignment) cell.alignment = alignment
}

function paintRange(sheet, row, left, right, style) {
  for (let c = left; c <= right; c += 1) {
    paint(sheet.getRow(row).getCell(c), {
      fill: style.fill && { ...style.fill },
      font: style.font && { ...style.font },
      border: style.border && { ...style.border },
      alignment: style.alignment && { ...style.alignment },
    })
  }
}

async function downloadNetworkExcel({ filename, title, dateLabel, ambassador, branchRows }) {
  // Loaded only when a report is made, so it does not slow down the rest of the app
  const loaded = await import('exceljs')
  const ExcelJS = loaded.default ?? loaded

  const HEADER_ROW = 6
  const FIRST_DATA_ROW = 7
  const COLUMNS = 6

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Berhan Ambassadors'
  const sheet = workbook.addWorksheet('Network report', {
    views: [{ state: 'frozen', ySplit: HEADER_ROW }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  ;[6, 30, 18, 16, 14, 62].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width
  })

  // Row 1: title, row 2: thin blue line
  sheet.mergeCells(1, 1, 1, COLUMNS)
  sheet.getRow(1).getCell(1).value = title
  paintRange(sheet, 1, 1, COLUMNS, {
    font: { name: FONT, size: 17, bold: true, color: { argb: COLOR.navy } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  })
  sheet.getRow(1).height = 34

  sheet.mergeCells(2, 1, 2, COLUMNS)
  paintRange(sheet, 2, 1, COLUMNS, { fill: solid(COLOR.blue) })
  sheet.getRow(2).height = 4

  // Rows 3 and 4: date and ambassador
  const metaRows = [
    [3, 'Date:', dateLabel],
    [4, 'Ambassador:', ambassador],
  ]
  for (const [rowNumber, label, value] of metaRows) {
    sheet.mergeCells(rowNumber, 1, rowNumber, 2)
    sheet.getRow(rowNumber).getCell(1).value = label
    paintRange(sheet, rowNumber, 1, 2, {
      font: { name: FONT, size: 11, bold: true, color: { argb: COLOR.blue } },
      alignment: { vertical: 'middle', horizontal: 'left' },
    })
    sheet.mergeCells(rowNumber, 3, rowNumber, COLUMNS)
    sheet.getRow(rowNumber).getCell(3).value = value
    paintRange(sheet, rowNumber, 3, COLUMNS, {
      font: { name: FONT, size: 11, bold: true, color: { argb: COLOR.text } },
      alignment: { vertical: 'middle', horizontal: 'left' },
    })
    sheet.getRow(rowNumber).height = 20
  }
  sheet.getRow(5).height = 8

  // Row 6: table header
  ;['No.', 'Branch Name', 'Ethio Telecom Side Frequency', 'ELPA Side Frequency', 'Total Incidents', 'Remark'].forEach(
    (text, index) => {
      sheet.getRow(HEADER_ROW).getCell(index + 1).value = text
    },
  )
  paintRange(sheet, HEADER_ROW, 1, COLUMNS, {
    fill: solid(COLOR.blue),
    font: { name: FONT, size: 10.5, bold: true, color: { argb: COLOR.white } },
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    border: allLines(),
  })
  sheet.getRow(HEADER_ROW).height = 36

  // One row per branch
  let telecomTotal = 0
  let elpaTotal = 0
  branchRows.forEach((branch, index) => {
    const rowNumber = FIRST_DATA_ROW + index
    const row = sheet.getRow(rowNumber)
    const telecom = branch.telecom.length
    const elpa = branch.elpa.length
    telecomTotal += telecom
    elpaTotal += elpa
    const remark = remarkText(branch)

    const values = [index + 1, branch.name, telecom || '–', elpa || '–', telecom + elpa, remark]
    values.forEach((value, i) => {
      row.getCell(i + 1).value = value
    })

    const zebra = index % 2 === 1 ? solid(COLOR.zebra) : undefined
    for (let c = 1; c <= COLUMNS; c += 1) {
      let font = { name: FONT, size: 10.5, color: { argb: COLOR.text } }
      let fill = zebra
      let horizontal = 'center'

      if (c === 1) font = { name: FONT, size: 10.5, bold: true, color: { argb: COLOR.muted } }
      if (c === 2) {
        font = { name: FONT, size: 10.5, bold: true, color: { argb: COLOR.blue } }
        horizontal = 'left'
      }
      if (c === 3) {
        if (telecom > 0) {
          fill = solid(COLOR.blueFill)
          font = { name: FONT, size: 11, bold: true, color: { argb: COLOR.blue } }
        } else font = { name: FONT, size: 10.5, color: { argb: COLOR.muted } }
      }
      if (c === 4) {
        if (elpa > 0) {
          fill = solid(COLOR.amberFill)
          font = { name: FONT, size: 11, bold: true, color: { argb: COLOR.amberText } }
        } else font = { name: FONT, size: 10.5, color: { argb: COLOR.muted } }
      }
      if (c === 5) font = { name: FONT, size: 11, bold: true, color: { argb: COLOR.navy } }
      if (c === 6) horizontal = 'left'

      paint(row.getCell(c), {
        fill,
        font,
        border: allLines(),
        alignment: { vertical: 'middle', horizontal, wrapText: c === 6, indent: c === 6 ? 1 : 0 },
      })
    }

    const lineCount = remark.split('\n').reduce((sum, text) => sum + Math.max(1, Math.ceil(text.length / 70)), 0)
    row.height = Math.max(24, lineCount * 15 + 8)
  })

  // Total row
  const totalRowNumber = FIRST_DATA_ROW + branchRows.length
  const totalIncidents = telecomTotal + elpaTotal
  const totalRow = sheet.getRow(totalRowNumber)
  sheet.mergeCells(totalRowNumber, 1, totalRowNumber, 2)
  totalRow.getCell(1).value = 'Total'
  totalRow.getCell(3).value = telecomTotal || '–'
  totalRow.getCell(4).value = elpaTotal || '–'
  totalRow.getCell(5).value = totalIncidents
  totalRow.getCell(6).value = `Total recorded outage incidents: ${totalIncidents}  •  Branches affected: ${branchRows.length}`
  for (let c = 1; c <= COLUMNS; c += 1) {
    paint(totalRow.getCell(c), {
      fill: solid(COLOR.tint),
      font: { name: FONT, size: 11, bold: true, color: { argb: COLOR.navy } },
      border: { top: thick, left: line, right: line, bottom: thick },
      alignment: { vertical: 'middle', horizontal: c === 1 || c === 6 ? 'left' : 'center', indent: c === 6 ? 1 : 0 },
    })
  }
  totalRow.height = 26

  // Filter arrows on the header, like a normal Excel table
  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: Math.max(HEADER_ROW + 1, totalRowNumber - 1), column: COLUMNS },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// ---------- Button + dialog ----------

export default function NetworkReportButton({ registrations = [], username = '', initialFrom = '', initialTo = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  function openDialog() {
    const start = initialFrom || initialTo || shiftMonth(0)
    let end = initialTo || shiftMonth(0)
    if (end < start) end = start
    setFrom(start)
    setTo(end)
    setError('')
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen) return undefined
    function handleEscape(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  function handleFromChange(event) {
    const value = event.target.value
    setFrom(value)
    if (value && to && value > to) setTo(value)
  }

  function handleToChange(event) {
    const value = event.target.value
    setTo(value)
    if (value && from && value < from) setFrom(value)
  }

  const rangeIsValid = Boolean(from && to && from <= to)

  const entriesInRange = useMemo(() => {
    if (!rangeIsValid) return []
    return registrations.filter((entry) => {
      const month = String(entry.incidentDate || '').slice(0, 7)
      return month >= from && month <= to
    })
  }, [registrations, from, to, rangeIsValid])

  const branchCount = useMemo(() => new Set(entriesInRange.map((entry) => entry.branchName)).size, [entriesInRange])

  const presets = [
    { label: 'This month', from: shiftMonth(0), to: shiftMonth(0) },
    { label: 'Last month', from: shiftMonth(-1), to: shiftMonth(-1) },
    { label: 'Last 3 months', from: shiftMonth(-2), to: shiftMonth(0) },
  ]

  async function generateReport() {
    if (!rangeIsValid || entriesInRange.length === 0 || isGenerating) return
    setError('')
    setIsGenerating(true)
    try {
      await downloadNetworkExcel({
        filename: `network-report-${from}${from === to ? '' : `-to-${to}`}.xlsx`,
        title: from === to ? 'BRANCH NETWORK ASSESSMENT MONTHLY REPORT' : 'BRANCH NETWORK ASSESSMENT REPORT',
        dateLabel: formatRangeLabel(from, to),
        ambassador: displayName(username),
        branchRows: buildBranchRows(entriesInRange),
      })
      setIsOpen(false)
    } catch (reportError) {
      setError(`The report could not be created. ${reportError?.message || ''}`.trim())
    } finally {
      setIsGenerating(false)
    }
  }

  const monthInputClass =
    'min-h-10 w-full rounded-xl border border-[#e3e8ef] bg-white px-3 text-sm text-[#1f2937] outline-none transition focus:border-[#003498] focus:ring-2 focus:ring-[#003498]/15'

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="rounded-full border border-[#003498] px-4 py-2 text-sm font-semibold text-[#003498] transition hover:bg-[#003498] hover:text-white"
      >
        Excel report
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#102d54]/50 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false)
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="network-report-title" className="my-8 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="network-report-title" className="text-xl font-bold text-[#102d54]">Excel report</h2>
                <p className="mt-1 text-sm text-[#718096]">Choose the months. Every branch with an outage in that time is listed.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close report dialog" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8a98ab] transition hover:bg-[#f1f4f9] hover:text-[#1f2937]">✕</button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setFrom(preset.from)
                    setTo(preset.to)
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    from === preset.from && to === preset.to
                      ? 'bg-[#003498] text-white'
                      : 'bg-[#f1f4f9] text-[#52657d] hover:bg-[#e8eefb] hover:text-[#003498]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#52657d]">From month</span>
                <input type="month" value={from} onChange={handleFromChange} className={monthInputClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#52657d]">To month</span>
                <input type="month" value={to} onChange={handleToChange} className={monthInputClass} />
              </label>
            </div>

            <p className="mt-4 rounded-xl bg-[#f6f8fb] px-4 py-2.5 text-sm text-[#52657d]" role="status">
              {!rangeIsValid
                ? 'Choose both months.'
                : entriesInRange.length === 0
                ? 'No outages were recorded in this period.'
                : `${entriesInRange.length} ${entriesInRange.length === 1 ? 'incident' : 'incidents'} in ${branchCount} ${branchCount === 1 ? 'branch' : 'branches'} will be included.`}
            </p>

            {error && (
              <p className="mt-3 rounded-xl bg-[#fdeceb] px-4 py-2.5 text-sm text-[#b3372f]" role="alert">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-full px-5 py-2 text-sm font-medium text-[#52657d] transition hover:bg-[#f1f4f9]">Cancel</button>
              <button
                type="button"
                onClick={generateReport}
                disabled={!rangeIsValid || entriesInRange.length === 0 || isGenerating}
                className="rounded-full bg-[#003498] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#00246B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? 'Preparing...' : 'Download Excel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}