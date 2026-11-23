// Builds the Excel network report (one sheet per ambassador + an optional summary sheet).
// Used by the service desk manager's "Network Report" page.

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const pad = (number) => String(number).padStart(2, '0')

// ---------- Dates ----------

export const toDateString = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export function firstOfMonth(offset = 0) {
  const now = new Date()
  return toDateString(new Date(now.getFullYear(), now.getMonth() + offset, 1))
}

export function lastOfMonth(offset = 0) {
  const now = new Date()
  return toDateString(new Date(now.getFullYear(), now.getMonth() + offset + 1, 0))
}

const parseDay = (text) => {
  const [year, month, day] = text.split('-').map(Number)
  return { year, month, day }
}

// "2026-10-01" + "2026-10-31" -> true (a whole calendar month)
export function isFullMonth(from, to) {
  const a = parseDay(from)
  const b = parseDay(to)
  return a.year === b.year && a.month === b.month && a.day === 1 && b.day === new Date(b.year, b.month, 0).getDate()
}

// "2026-10-05" + "2026-10-28" -> "OCTOBER 5–28, 2026"
export function formatRangeLabel(from, to) {
  const a = parseDay(from)
  const b = parseDay(to)
  const aMonth = MONTH_NAMES[a.month - 1]
  const bMonth = MONTH_NAMES[b.month - 1]

  let label
  if (from === to) label = `${aMonth} ${a.day}, ${a.year}`
  else if (a.year === b.year && a.month === b.month) label = `${aMonth} ${a.day}–${b.day}, ${a.year}`
  else if (a.year === b.year) label = `${aMonth} ${a.day} – ${bMonth} ${b.day}, ${b.year}`
  else label = `${aMonth} ${a.day}, ${a.year} – ${bMonth} ${b.day}, ${b.year}`
  return label.toUpperCase()
}

// ["2026-10-24", "2026-10-28"] -> "October 24 and 28, 2026"
export function formatDateList(dates) {
  const unique = Array.from(new Set(dates)).sort()
  const byMonth = new Map()
  for (const date of unique) {
    const { year, month, day } = parseDay(date)
    const key = `${year}-${month}`
    if (!byMonth.has(key)) byMonth.set(key, { year, month, days: [] })
    byMonth.get(key).days.push(day)
  }
  return Array.from(byMonth.values())
    .map(({ year, month, days }) => {
      const list = days.length > 1 ? `${days.slice(0, -1).join(', ')} and ${days[days.length - 1]}` : String(days[0])
      return `${MONTH_NAMES[month - 1]} ${list}, ${year}`
    })
    .join('; ')
}

// "jiregna.worku" -> "Jiregna Worku"
export function displayName(username) {
  return String(username || '')
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function slug(text) {
  return String(text || '').trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

// ---------- Data ----------

// One row per branch: how many ELPA / Ethio Telecom incidents, on which dates, and any notes
export function buildBranchRows(entries) {
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

export function remarkText(branch) {
  const lines = []
  if (branch.elpa.length) lines.push(`ELPA – ${formatDateList(branch.elpa)}`)
  if (branch.telecom.length) lines.push(`Ethio Telecom – ${formatDateList(branch.telecom)}`)
  if (branch.notes.size) lines.push(`Notes: ${Array.from(branch.notes).join('; ')}`)
  return lines.join('\n')
}

export function countIncidents(branchRows) {
  const telecom = branchRows.reduce((sum, branch) => sum + branch.telecom.length, 0)
  const elpa = branchRows.reduce((sum, branch) => sum + branch.elpa.length, 0)
  return { telecom, elpa, total: telecom + elpa }
}

// ---------- Excel styling ----------

const FONT = 'Calibri'
const COLOR = {
  blue: 'FF003498',
  navy: 'FF102D54',
  tint: 'FFE8EEFB',
  zebra: 'FFF8FAFD',
  border: 'FFD5DCE8',
  text: 'FF1F2937',
  muted: 'FF8A98AB',
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

const HEADER_ROW = 6
const FIRST_DATA_ROW = 7

// Rows 1-5: title, blue line, two info lines (Date + Ambassador/Scope), spacer
function fillTop(sheet, { title, dateLabel, secondLabel, secondValue, columns }) {
  sheet.mergeCells(1, 1, 1, columns)
  sheet.getRow(1).getCell(1).value = title
  paintRange(sheet, 1, 1, columns, {
    font: { name: FONT, size: 17, bold: true, color: { argb: COLOR.navy } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  })
  sheet.getRow(1).height = 34

  sheet.mergeCells(2, 1, 2, columns)
  paintRange(sheet, 2, 1, columns, { fill: solid(COLOR.blue) })
  sheet.getRow(2).height = 4

  const infoRows = [
    [3, 'Date:', dateLabel],
    [4, secondLabel, secondValue],
  ]
  for (const [rowNumber, label, value] of infoRows) {
    sheet.mergeCells(rowNumber, 1, rowNumber, 2)
    sheet.getRow(rowNumber).getCell(1).value = label
    paintRange(sheet, rowNumber, 1, 2, {
      font: { name: FONT, size: 11, bold: true, color: { argb: COLOR.blue } },
      alignment: { vertical: 'middle', horizontal: 'left' },
    })
    sheet.mergeCells(rowNumber, 3, rowNumber, columns)
    sheet.getRow(rowNumber).getCell(3).value = value
    paintRange(sheet, rowNumber, 3, columns, {
      font: { name: FONT, size: 11, bold: true, color: { argb: COLOR.text } },
      alignment: { vertical: 'middle', horizontal: 'left' },
    })
    sheet.getRow(rowNumber).height = 20
  }
  sheet.getRow(5).height = 8
}

function fillHeader(sheet, headers) {
  headers.forEach((text, index) => {
    sheet.getRow(HEADER_ROW).getCell(index + 1).value = text
  })
  paintRange(sheet, HEADER_ROW, 1, headers.length, {
    fill: solid(COLOR.blue),
    font: { name: FONT, size: 10.5, bold: true, color: { argb: COLOR.white } },
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    border: allLines(),
  })
  sheet.getRow(HEADER_ROW).height = 36
}

function paintTotalRow(sheet, rowNumber, columns, leftAligned) {
  for (let c = 1; c <= columns; c += 1) {
    paint(sheet.getRow(rowNumber).getCell(c), {
      fill: solid(COLOR.tint),
      font: { name: FONT, size: 11, bold: true, color: { argb: COLOR.navy } },
      border: { top: thick, left: line, right: line, bottom: thick },
      alignment: { vertical: 'middle', horizontal: leftAligned.includes(c) ? 'left' : 'center', indent: c === columns && leftAligned.includes(c) ? 1 : 0 },
    })
  }
  sheet.getRow(rowNumber).height = 26
}

// The branch-by-branch table of one ambassador (same layout as the ambassador's own report)
function fillAmbassadorSheet(sheet, { title, dateLabel, ambassador, branchRows }) {
  const COLUMNS = 6
  ;[6, 30, 18, 16, 14, 62].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width
  })
  fillTop(sheet, { title, dateLabel, secondLabel: 'Ambassador:', secondValue: ambassador, columns: COLUMNS })
  fillHeader(sheet, ['No.', 'Branch Name', 'Ethio Telecom Side Frequency', 'ELPA Side Frequency', 'Total Incidents', 'Remark'])

  branchRows.forEach((branch, index) => {
    const rowNumber = FIRST_DATA_ROW + index
    const row = sheet.getRow(rowNumber)
    const telecom = branch.telecom.length
    const elpa = branch.elpa.length
    const remark = remarkText(branch)

    ;[index + 1, branch.name, telecom || '–', elpa || '–', telecom + elpa, remark].forEach((value, i) => {
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

  const { telecom, elpa, total } = countIncidents(branchRows)
  const totalRowNumber = FIRST_DATA_ROW + branchRows.length
  const totalRow = sheet.getRow(totalRowNumber)
  sheet.mergeCells(totalRowNumber, 1, totalRowNumber, 2)
  totalRow.getCell(1).value = 'Total'
  totalRow.getCell(3).value = telecom || '–'
  totalRow.getCell(4).value = elpa || '–'
  totalRow.getCell(5).value = total
  totalRow.getCell(6).value = `Total recorded outage incidents: ${total}  •  Branches affected: ${branchRows.length}`
  paintTotalRow(sheet, totalRowNumber, COLUMNS, [1, 6])

  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: Math.max(HEADER_ROW + 1, totalRowNumber - 1), column: COLUMNS },
  }
}

// One row per ambassador (including ambassadors with no outages)
function fillSummarySheet(sheet, { title, dateLabel, rows }) {
  const COLUMNS = 6
  ;[6, 34, 18, 20, 18, 16].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width
  })
  fillTop(sheet, { title, dateLabel, secondLabel: 'Scope:', secondValue: 'All ambassadors', columns: COLUMNS })
  fillHeader(sheet, ['No.', 'Ambassador', 'Branches Affected', 'Ethio Telecom Side Frequency', 'ELPA Side Frequency', 'Total Incidents'])

  rows.forEach((item, index) => {
    const rowNumber = FIRST_DATA_ROW + index
    const row = sheet.getRow(rowNumber)
    ;[index + 1, item.ambassador, item.branches || '–', item.telecom || '–', item.elpa || '–', item.total || '–'].forEach((value, i) => {
      row.getCell(i + 1).value = value
    })

    const zebra = index % 2 === 1 ? solid(COLOR.zebra) : undefined
    for (let c = 1; c <= COLUMNS; c += 1) {
      let font = { name: FONT, size: 10.5, color: { argb: COLOR.text } }
      let fill = zebra
      const value = row.getCell(c).value

      if (c === 1) font = { name: FONT, size: 10.5, bold: true, color: { argb: COLOR.muted } }
      if (c === 2) font = { name: FONT, size: 10.5, bold: true, color: { argb: COLOR.blue } }
      if (c === 3 || c === 4 || c === 5) {
        if (value === '–') font = { name: FONT, size: 10.5, color: { argb: COLOR.muted } }
        else if (c === 4) {
          fill = solid(COLOR.blueFill)
          font = { name: FONT, size: 11, bold: true, color: { argb: COLOR.blue } }
        } else if (c === 5) {
          fill = solid(COLOR.amberFill)
          font = { name: FONT, size: 11, bold: true, color: { argb: COLOR.amberText } }
        }
      }
      if (c === 6) font = value === '–' ? { name: FONT, size: 10.5, color: { argb: COLOR.muted } } : { name: FONT, size: 11, bold: true, color: { argb: COLOR.navy } }

      paint(row.getCell(c), {
        fill,
        font,
        border: allLines(),
        alignment: { vertical: 'middle', horizontal: c === 2 ? 'left' : 'center' },
      })
    }
    row.height = 22
  })

  const totals = rows.reduce(
    (sum, item) => ({
      branches: sum.branches + item.branches,
      telecom: sum.telecom + item.telecom,
      elpa: sum.elpa + item.elpa,
      total: sum.total + item.total,
    }),
    { branches: 0, telecom: 0, elpa: 0, total: 0 },
  )
  const totalRowNumber = FIRST_DATA_ROW + rows.length
  const totalRow = sheet.getRow(totalRowNumber)
  sheet.mergeCells(totalRowNumber, 1, totalRowNumber, 2)
  totalRow.getCell(1).value = 'Total'
  totalRow.getCell(3).value = totals.branches || '–'
  totalRow.getCell(4).value = totals.telecom || '–'
  totalRow.getCell(5).value = totals.elpa || '–'
  totalRow.getCell(6).value = totals.total || '–'
  paintTotalRow(sheet, totalRowNumber, COLUMNS, [1])

  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: Math.max(HEADER_ROW + 1, totalRowNumber - 1), column: COLUMNS },
  }
}

function uniqueSheetName(base, used) {
  const name = String(base || 'Sheet').replace(/[\\/?*:[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Sheet'
  let candidate = name
  let counter = 2
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` ${counter}`
    candidate = `${name.slice(0, 31 - suffix.length)}${suffix}`
    counter += 1
  }
  used.add(candidate.toLowerCase())
  return candidate
}

/**
 * summary: optional [{ ambassador, branches, telecom, elpa, total }] -> first sheet "Summary"
 * sheets:  [{ name, ambassador, branchRows }] -> one sheet each
 */
export async function downloadNetworkWorkbook({ filename, title, dateLabel, summary, sheets }) {
  // Loaded only when a report is made, so it does not slow down the rest of the app
  const loaded = await import('exceljs')
  const ExcelJS = loaded.default ?? loaded

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Berhan Ambassadors'
  const used = new Set()
  const sheetOptions = () => ({
    views: [{ state: 'frozen', ySplit: HEADER_ROW }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  if (summary) {
    const sheet = workbook.addWorksheet(uniqueSheetName('Summary', used), sheetOptions())
    fillSummarySheet(sheet, { title, dateLabel, rows: summary })
  }

  for (const item of sheets) {
    const sheet = workbook.addWorksheet(uniqueSheetName(item.name, used), sheetOptions())
    fillAmbassadorSheet(sheet, { title, dateLabel, ambassador: item.ambassador, branchRows: item.branchRows })
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