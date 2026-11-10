function fromApiRecord(record) {
  return {
    id: record.id,
    ambassadorId: record.ambassador_id,
    ambassadorName: record.ambassador?.name || `${record.ambassador?.first_name || ''} ${record.ambassador?.last_name || ''}`.trim() || record.ambassador?.username || 'Unknown',
    branchId: record.branch_id,
    branchName: record.branch?.branch_name || 'Unknown',
    awarenessDate: record.awareness_date ? record.awareness_date.slice(0, 10) : '',
    documentName: record.document_name,
  }
}

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, { ...options, headers: { Accept: 'application/json', ...options.headers }, credentials: 'include' })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const error = new Error(body.message || (response.status === 413 ? 'The scanned document is too large for the server.' : 'The IT awareness request failed.'))
    error.errors = body.errors || {}
    throw error
  }
  return response.status === 204 ? null : response.json()
}

export async function fetchItAwarenessRecords(filters = {}) {
  const params = new URLSearchParams()
  if (filters.month) params.set('month', filters.month)
  if (filters.day) params.set('day', filters.day)
  if (filters.year) params.set('year', filters.year)
  const { itAwarenessRecords } = await request(`/it-awareness${params.toString() ? `?${params}` : ''}`)
  return itAwarenessRecords.map(fromApiRecord)
}

function formDataFor(record, document) {
  const data = new FormData()
  data.append('ambassador_id', record.ambassadorId)
  data.append('branch_id', record.branchId)
  data.append('awareness_date', record.awarenessDate)
  if (document) data.append('document', document)
  return data
}

export async function createItAwarenessRecord(record, document) {
  const { itAwarenessRecord } = await request('/it-awareness', { method: 'POST', body: formDataFor(record, document) })
  return fromApiRecord(itAwarenessRecord)
}

export async function updateItAwarenessRecord(id, record, document) {
  const data = formDataFor(record, document)
  data.append('_method', 'PUT')
  const { itAwarenessRecord } = await request(`/it-awareness/${id}`, { method: 'POST', body: data })
  return fromApiRecord(itAwarenessRecord)
}

export async function deleteItAwarenessRecord(id) {
  await request(`/it-awareness/${id}`, { method: 'DELETE' })
}

export function itAwarenessDocumentUrl(id) {
  return `/api/it-awareness/${id}/download`
}