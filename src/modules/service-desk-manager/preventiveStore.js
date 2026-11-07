function fromApiOperation(operation) {
  return {
    id: operation.id,
    ambassadorId: operation.ambassador_id,
    ambassadorName: operation.ambassador?.name || `${operation.ambassador?.first_name || ''} ${operation.ambassador?.last_name || ''}`.trim() || operation.ambassador?.username || 'Unknown',
    branchId: operation.branch_id,
    branchName: operation.branch?.branch_name || 'Unknown',
    operationDate: operation.operation_date ? operation.operation_date.slice(0, 10) : '',
    documentName: operation.document_name,
  }
}

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, { ...options, headers: { Accept: 'application/json', ...options.headers }, credentials: 'include' })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const error = new Error(body.message || (response.status === 413 ? 'The scanned document is too large for the server.' : 'The preventive operations request failed.'))
    error.errors = body.errors || {}
    throw error
  }
  return response.status === 204 ? null : response.json()
}

export async function fetchPreventiveOperations(filters = {}) {
  const params = new URLSearchParams()
  if (filters.month) params.set('month', filters.month)
  if (filters.day) params.set('day', filters.day)
  const { preventiveOperations } = await request(`/preventive-operations${params.toString() ? `?${params}` : ''}`)
  return preventiveOperations.map(fromApiOperation)
}

function formDataFor(operation, document) {
  const data = new FormData()
  data.append('ambassador_id', operation.ambassadorId)
  data.append('branch_id', operation.branchId)
  data.append('operation_date', operation.operationDate)
  if (document) data.append('document', document)
  return data
}

export async function createPreventiveOperation(operation, document) {
  const { preventiveOperation } = await request('/preventive-operations', { method: 'POST', body: formDataFor(operation, document) })
  return fromApiOperation(preventiveOperation)
}

export async function updatePreventiveOperation(id, operation, document) {
  const data = formDataFor(operation, document)
  data.append('_method', 'PUT')
  const { preventiveOperation } = await request(`/preventive-operations/${id}`, { method: 'POST', body: data })
  return fromApiOperation(preventiveOperation)
}

export async function deletePreventiveOperation(id) {
  await request(`/preventive-operations/${id}`, { method: 'DELETE' })
}

export function preventiveDocumentUrl(id) {
  return `/api/preventive-operations/${id}/download`
}
