import { useEffect, useMemo, useState } from 'react'
import { computerJobLabel } from './computerWorkbookStore.js'

const contentOptions = [
  { value: 'ip', label: 'IP addresses only', hint: 'The computer IP of every computer.' },
  { value: 'names', label: 'Computer names only', hint: 'Computers without a name are skipped.' },
  {
    value: 'all',
    label: 'All information',
    hint: 'Computer details, Kaspersky, cheque scanner and remark.',
  },
]

// ---------- Report layout (Excel) ----------

const GROUP = {
  computer: 'Computers Information',
  kaspersky: 'Kaspersky Endpoint Protection',
  scanner: 'Cheque Scanner',
  remark: 'Remark / Issue',
}

// Simple palette: Berhan blue + soft tints
const COLOR = {
  blue: 'FF003498',
  navy: 'FF102D54',
  tint: 'FFE8EEFB',
  softAmber: 'FFFFF3D6',
  totalFill: 'FFEEF3FC',
  border: 'FFD5DCE8',
  text: 'FF1F2937',
  muted: 'FF8A98AB',
  green: 'FF1E8E5A',
  red: 'FFC0392B',
  errorFill: 'FFFDE2E0',
  errorText: 'FFB3372F',
  noteFill: 'FFFFF4CC',
  noteText: 'FF8A5A00',
  white: 'FFFFFFFF',
}

const kasperskyText = (status) =>
  status === 'Updated' ? 'Installed and updated' : status === 'Not updated' ? 'Installed and not updated' : ''

// hideWhenEmpty: the column is left out when none of the computers has a value for it
const reportColumns = [
  { key: 'ipAddress', header: 'IP Address', group: GROUP.computer, width: 17, value: (row) => row.ipAddress },
  { key: 'computerName', header: 'Computer Name', group: GROUP.computer, width: 26, value: (row) => row.computerName },
  { key: 'computerModel', header: 'Computer Model', group: GROUP.computer, width: 17, value: (row) => row.computerModel },
  { key: 'computerJob', header: 'Job', group: GROUP.computer, width: 18, value: (row) => computerJobLabel(row.computerJob) },
  { key: 'managedKaspIp', header: 'Kasper Managed IP', group: GROUP.computer, width: 18, hideWhenEmpty: true, value: (row) => row.managedKaspIp },
  { key: 'operatingSystem', header: 'Operating System', group: GROUP.computer, width: 18, value: (row) => row.operatingSystem },
  { key: 'kasperskyStatus', header: 'Status', group: GROUP.kaspersky, width: 25, value: (row) => kasperskyText(row.kasperskyStatus) },
  { key: 'networkAgent', header: 'Net Agent', group: GROUP.kaspersky, width: 16, value: (row) => row.networkAgent },
  { key: 'endpoint', header: 'EndPoint Version', group: GROUP.kaspersky, width: 17, value: (row) => row.endpoint },
  { key: 'chequeScanner', header: 'Cheque Scanner', group: GROUP.scanner, width: 16, value: (row) => (row.chequeScanner === 'Yes' ? 'Yes' : 'NO CHK') },
  {
    key: 'remark',
    header: 'Remark / Issue',
    group: GROUP.remark,
    width: 36,
    wrap: true,
    value: (row) => (row.status === 'Not active' ? (row.remark ? `Not working: ${row.remark}` : 'Not working') : row.remark),
  },
]

const columnsByContent = {
  ip: ['ipAddress'],
  names: ['computerName'],
  all: reportColumns.map((column) => column.key),
}

const FONT = 'Calibri'
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

function paintRange(sheet, top, left, bottom, right, style) {
  for (let r = top; r <= bottom; r += 1) {
    for (let c = left; c <= right; c += 1) {
      paint(sheet.getRow(r).getCell(c), {
        fill: style.fill && { ...style.fill },
        font: style.font && { ...style.font },
        border: style.border && { ...style.border },
        alignment: style.alignment && { ...style.alignment },
      })
    }
  }
}

async function downloadExcel({ filename, columns, groups, ambassadorLabel }) {
  // Loaded only when a report is made, so it does not slow down the rest of the app
  const loaded = await import('exceljs')
  const ExcelJS = loaded.default ?? loaded

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Berhan Ambassadors'
  const sheet = workbook.addWorksheet('Computers', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  const firstDataColumn = 3 // column A = No., B = Branch Name
  const totalColumns = columns.length + 2

  sheet.getColumn(1).width = 6
  sheet.getColumn(2).width = 30
  columns.forEach((column, index) => {
    sheet.getColumn(index + firstDataColumn).width = column.width
  })

  // Row 1: ambassador name
  const titleStyle = {
    fill: solid(COLOR.softAmber),
    font: { name: FONT, size: 11, bold: true, color: { argb: COLOR.navy } },
    alignment: { vertical: 'middle', horizontal: 'left', indent: 1 },
    border: allLines(),
  }
  const label = 'Assigned Branches Ambassador Name: -'
  if (totalColumns >= 6) {
    sheet.mergeCells(1, 1, 1, 3)
    sheet.getRow(1).getCell(1).value = label
    paintRange(sheet, 1, 1, 1, 3, titleStyle)
    sheet.mergeCells(1, 4, 1, 6)
    sheet.getRow(1).getCell(4).value = ambassadorLabel
    paintRange(sheet, 1, 4, 1, 6, { ...titleStyle, font: { name: FONT, size: 11, bold: true, italic: true, color: { argb: COLOR.navy } } })
  } else {
    sheet.mergeCells(1, 1, 1, totalColumns)
    sheet.getRow(1).getCell(1).value = `${label} ${ambassadorLabel}`.trim()
    paintRange(sheet, 1, 1, 1, totalColumns, titleStyle)
  }
  sheet.getRow(1).height = 24

  // Rows 3 and 4: header (group bands + column names)
  const bandStyle = (fill) => ({
    fill: solid(fill),
    font: { name: FONT, size: 10.5, bold: true, color: { argb: COLOR.white } },
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    border: allLines(),
  })
  const subHeaderStyle = {
    fill: solid(COLOR.tint),
    font: { name: FONT, size: 10, bold: true, color: { argb: COLOR.navy } },
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    border: allLines(),
  }

  ;['No.', 'Branch Name'].forEach((text, index) => {
    sheet.mergeCells(3, index + 1, 4, index + 1)
    sheet.getRow(3).getCell(index + 1).value = text
    paintRange(sheet, 3, index + 1, 4, index + 1, bandStyle(COLOR.navy))
  })

  // Groups alternate between two blues; a group with a single column gets one tall header cell
  let start = 0
  let groupNumber = 0
  while (start < columns.length) {
    let end = start
    while (end + 1 < columns.length && columns[end + 1].group === columns[start].group) end += 1
    const first = start + firstDataColumn
    const last = end + firstDataColumn
    const fill = groupNumber % 2 === 0 ? COLOR.blue : COLOR.navy

    if (first === last) {
      sheet.mergeCells(3, first, 4, first)
      sheet.getRow(3).getCell(first).value = columns[start].header
      paintRange(sheet, 3, first, 4, first, bandStyle(fill))
    } else {
      sheet.mergeCells(3, first, 3, last)
      sheet.getRow(3).getCell(first).value = columns[start].group
      paintRange(sheet, 3, first, 3, last, bandStyle(fill))
      for (let c = first; c <= last; c += 1) {
        const cell = sheet.getRow(4).getCell(c)
        cell.value = columns[c - firstDataColumn].header
        paint(cell, subHeaderStyle)
      }
    }
    groupNumber += 1
    start = end + 1
  }
  sheet.getRow(3).height = 22
  sheet.getRow(4).height = 22

  // One block per branch: numbered rows, then a "Total" row with a thick line under it
  groups.forEach((group, groupIndex) => {
    group.items.forEach((row, itemIndex) => {
      const excelRow = sheet.addRow([
        itemIndex === 0 ? groupIndex + 1 : '',
        itemIndex === 0 ? group.name : '',
        ...columns.map((column) => column.value(row) ?? ''),
      ])

      const isNotActive = row.status === 'Not active'
      const hasRemark = Boolean(row.remark)

      for (let c = 1; c <= totalColumns; c += 1) {
        const cell = excelRow.getCell(c)
        const column = c >= firstDataColumn ? columns[c - firstDataColumn] : null
        let font = { name: FONT, size: 10, color: { argb: COLOR.text } }
        let fill

        if (c === 1) font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.muted } }
        if (c === 2) font = { name: FONT, size: 10.5, bold: true, color: { argb: COLOR.blue } }

        if (column?.key === 'ipAddress') {
          if (isNotActive) {
            fill = solid(COLOR.errorFill)
            font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.errorText } }
          } else if (hasRemark) {
            fill = solid(COLOR.noteFill)
            font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.noteText } }
          }
        }

        if (column?.key === 'endpoint' && row.kasperskyStatus) {
          font = {
            name: FONT,
            size: 10,
            bold: true,
            color: { argb: row.kasperskyStatus === 'Updated' ? COLOR.green : COLOR.red },
          }
        }

        if (column?.key === 'chequeScanner') {
          font =
            row.chequeScanner === 'Yes'
              ? { name: FONT, size: 10, bold: true, color: { argb: COLOR.blue } }
              : { name: FONT, size: 10, color: { argb: COLOR.muted } }
        }

        paint(cell, {
          fill,
          font,
          border: allLines(),
          alignment: {
            vertical: 'middle',
            horizontal: c === 1 ? 'center' : 'left',
            wrapText: Boolean(column?.wrap),
          },
        })
      }
    })

    const totalRow = sheet.addRow([])
    const mergeEnd = Math.min(4, totalColumns)
    sheet.mergeCells(totalRow.number, 2, totalRow.number, mergeEnd)
    totalRow.getCell(2).value = `Total number of computers = ${group.items.length}`
    for (let c = 1; c <= totalColumns; c += 1) {
      paint(totalRow.getCell(c), {
        fill: solid(COLOR.totalFill),
        font: { name: FONT, size: 10.5, bold: true, color: { argb: COLOR.navy } },
        border: { top: line, left: line, right: line, bottom: thick },
        alignment: { vertical: 'middle', horizontal: 'left' },
      })
    }
    totalRow.height = 21
  })

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

function slug(text) {
  return String(text || '').trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

export default function ComputerReportButton({ rows = [], branches = [] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [scope, setScope] = useState('all')
  const [branchId, setBranchId] = useState('')
  const [content, setContent] = useState('all')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

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

  async function generateReport() {
    if (!canGenerate || isGenerating) return
    setError('')
    setIsGenerating(true)
    try {
      const keys = columnsByContent[content]
      const columns = reportColumns.filter(
        (column) =>
          keys.includes(column.key)
          && (!column.hideWhenEmpty || selectedRows.some((row) => column.value(row))),
      )

      // selectedRows is already sorted by branch, so each branch is one block
      const groups = []
      for (const row of selectedRows) {
        const key = String(row.branchId)
        const last = groups[groups.length - 1]
        if (last && last.key === key) last.items.push(row)
        else groups.push({ key, name: branchName(row.branchId), items: [row] })
      }

      const names = Array.from(new Set(selectedRows.map((row) => row.ambassadorName).filter(Boolean)))
      const ambassadorLabel = names.length === 1 ? names[0] : names.length > 1 ? 'All ambassadors' : ''

      const scopeName = scope === 'one' ? slug(branchName(branchId)) || 'branch' : 'all-branches'
      const date = new Date().toISOString().slice(0, 10)
      await downloadExcel({
        filename: `computers-${scopeName}-${content}-${date}.xlsx`,
        columns,
        groups,
        ambassadorLabel,
      })
      setIsOpen(false)
    } catch (reportError) {
      setError(`The report could not be created. ${reportError?.message || ''}`.trim())
    } finally {
      setIsGenerating(false)
    }
  }

  const radioCard = (selected) =>
    `flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${selected ? 'border-[#003498] bg-[#eef4ff]' : 'border-[#dce4ee] bg-white hover:border-[#9bb6e6]'}`

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError('')
          setIsOpen(true)
        }}
        className="rounded-full border border-[#003498] px-5 py-2 text-sm font-semibold text-[#003498] transition hover:bg-[#eef4ff]"
      >
        Generate report
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#102d54]/50 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false)
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="computer-report-title" className="my-8 w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="computer-report-title" className="text-xl font-bold text-[#102d54]">Generate report</h2>
                <p className="mt-1 text-sm text-[#718096]">Downloads as an Excel file, one block per branch with its total.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close report dialog" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8a98ab] transition hover:bg-[#f1f4f9] hover:text-[#1f2937]">✕</button>
            </div>

            <p className="mb-2 text-sm font-semibold text-[#102d54]">Which branches?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={radioCard(scope === 'all')}>
                <input type="radio" name="report-scope" checked={scope === 'all'} onChange={() => setScope('all')} className="mt-1" />
                <span><span className="block text-sm font-semibold text-[#102d54]">All branches</span><span className="block text-xs text-[#718096]">One block per branch.</span></span>
              </label>
              <label className={radioCard(scope === 'one')}>
                <input type="radio" name="report-scope" checked={scope === 'one'} onChange={() => setScope('one')} className="mt-1" />
                <span><span className="block text-sm font-semibold text-[#102d54]">One branch</span><span className="block text-xs text-[#718096]">Pick it below.</span></span>
              </label>
            </div>
            {scope === 'one' && (
              <select value={branchId} onChange={(event) => setBranchId(event.target.value)} aria-label="Branch for the report" className="mt-3 min-h-10 w-full rounded-xl border border-[#e3e8ef] bg-white px-3 text-sm text-[#1f2937] outline-none focus:border-[#003498] focus:ring-2 focus:ring-[#003498]/15">
                <option value="">Select branch</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branchName}</option>)}
              </select>
            )}

            <p className="mb-2 mt-5 text-sm font-semibold text-[#102d54]">What to include?</p>
            <div className="space-y-2">
              {contentOptions.map((option) => (
                <label key={option.value} className={radioCard(content === option.value)}>
                  <input type="radio" name="report-content" checked={content === option.value} onChange={() => setContent(option.value)} className="mt-1" />
                  <span><span className="block text-sm font-semibold text-[#102d54]">{option.label}</span><span className="block text-xs text-[#718096]">{option.hint}</span></span>
                </label>
              ))}
            </div>

            <p className="mt-4 rounded-xl bg-[#f6f8fb] px-4 py-2.5 text-sm text-[#52657d]" role="status">
              {scope === 'one' && !branchId
                ? 'Select a branch to see how many computers will be included.'
                : `${selectedRows.length} ${selectedRows.length === 1 ? 'computer' : 'computers'} will be included.`}
            </p>

            {error && (
              <p className="mt-3 rounded-xl bg-[#fdeceb] px-4 py-2.5 text-sm text-[#b3372f]" role="alert">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-full px-5 py-2 text-sm font-medium text-[#52657d] transition hover:bg-[#f1f4f9]">Cancel</button>
              <button type="button" onClick={generateReport} disabled={!canGenerate || isGenerating} className="rounded-full bg-[#003498] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#00246B] disabled:cursor-not-allowed disabled:opacity-60">
                {isGenerating ? 'Preparing...' : 'Download report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}