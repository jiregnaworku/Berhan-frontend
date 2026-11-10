async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const error = new Error(body.message || 'The workbook request failed.')
    error.errors = body.errors || {}
    throw error
  }

  return response.status === 204 ? null : response.json()
}

function fromApiRow(row) {
  return {
    id: row.id,
    branchId: row.branch_id,
    ambassadorName: row.ambassador_name || '',
    ipAddress: row.ip_address || '',
    computerName: row.computer_name || '',
    computerJob: row.computer_job || '',
    operatingSystem: row.operating_system || '',
    status: row.status || '',
    networkAgent: row.network_agent || '',
    endpoint: row.endpoint || row.endpoint_protection || '',
    kasperskyStatus: row.kaspersky_status || '',
  }
}

export async function fetchWorkbookRows() {
  const { workbookRows } = await request('/computer-workbook')
  return workbookRows.map(fromApiRow)
}

export async function createWorkbookRow(row) {
  const { workbookRow } = await request('/computer-workbook', {
    method: 'POST',
    body: JSON.stringify({
      branch_id: row.branchId,
      ambassador_name: row.ambassadorName,
      ip_address: row.ipAddress,
      computer_name: row.computerName,
      computer_job: row.computerJob,
      operating_system: row.operatingSystem,
      status: row.status,
      network_agent: row.networkAgent || null,
      endpoint: row.endpoint || null,
      kaspersky_status: row.kasperskyStatus || null,
    }),
  })
  return fromApiRow(workbookRow)
}

export async function updateWorkbookRow(id, row) {
  const { workbookRow } = await request(`/computer-workbook/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      branch_id: row.branchId,
      ip_address: row.ipAddress,
      computer_name: row.computerName,
      computer_job: row.computerJob,
      operating_system: row.operatingSystem,
      status: row.status,
      network_agent: row.networkAgent || null,
      endpoint: row.endpoint || null,
      kaspersky_status: row.kasperskyStatus || null,
    }),
  })
  return fromApiRow(workbookRow)
}

// Branch manager only: updates just the Net Agent and Endpoint values.
export async function updateKasperskyDetails(id, { networkAgent, endpoint }) {
  const { workbookRow } = await request(`/computer-workbook/${id}/kaspersky`, {
    method: 'PATCH',
    body: JSON.stringify({
      network_agent: networkAgent || null,
      endpoint: endpoint || null,
    }),
  })
  return fromApiRow(workbookRow)
}

export async function deleteWorkbookRow(id) {
  await request(`/computer-workbook/${id}`, { method: 'DELETE' })
}