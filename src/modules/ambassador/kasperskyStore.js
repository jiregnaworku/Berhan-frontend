const fieldMap = {
  branchId: 'branch_id',
  computerId: 'computer_workbook_id',
  networkAgent: 'network_agent',
  endpoint: 'endpoint',
  status: 'status',
}

function fromApiStatus(status) {
  return {
    id: status.id,
    ...Object.fromEntries(
      Object.entries(fieldMap).map(([frontendName, apiName]) => [frontendName, status[apiName] ?? '']),
    ),
  }
}

function toApiStatus(status) {
  return Object.fromEntries(
    Object.entries(fieldMap).map(([frontendName, apiName]) => [apiName, status[frontendName]]),
  )
}

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const error = new Error(body.message || 'The Kaspersky status request failed.')
    error.errors = body.errors || {}
    throw error
  }

  return response.status === 204 ? null : response.json()
}

export async function fetchKasperskyStatuses() {
  const { statuses } = await request('/kaspersky-statuses')
  return statuses.map(fromApiStatus)
}

export async function createKasperskyStatus(status) {
  const { status: savedStatus } = await request('/kaspersky-statuses', {
    method: 'POST',
    body: JSON.stringify(toApiStatus(status)),
  })
  return fromApiStatus(savedStatus)
}

export async function updateKasperskyStatus(id, status) {
  const { status: savedStatus } = await request(`/kaspersky-statuses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toApiStatus(status)),
  })
  return fromApiStatus(savedStatus)
}

export async function deleteKasperskyStatus(id) {
  await request(`/kaspersky-statuses/${id}`, { method: 'DELETE' })
}
