const fieldMap = {
  branchName: 'branch_name',
  reason: 'reason',
  remark: 'remark',
  ethioTelecomSide: 'ethio_telecom_side',
  ethioTelecomFrequency: 'ethio_telecom_frequency',
  elphaSide: 'elpha_side',
  elphaFrequency: 'elpha_frequency',
  incidentDate: 'incident_date',
}

function fromApiRegistration(registration) {
  return {
    id: registration.id,
    createdAt: registration.created_at,
    createdBy: registration.created_by,
    ...Object.fromEntries(
      Object.entries(fieldMap).map(([frontendName, apiName]) => [frontendName, registration[apiName] ?? '']),
    ),
  }
}

function toApiRegistration(registration) {
  return Object.fromEntries(
    Object.entries(fieldMap).map(([frontendName, apiName]) => [apiName, registration[frontendName]]),
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
    const error = new Error(body.message || 'The network registration request failed.')
    error.errors = body.errors || {}
    throw error
  }

  return response.json()
}

export async function fetchNetworkRegistrations(month = '') {
  const query = month ? `?month=${encodeURIComponent(month)}` : ''
  const { registrations } = await request(`/network-registrations${query}`)
  return registrations.map(fromApiRegistration)
}

export async function createNetworkRegistration(registration) {
  const payload = toApiRegistration(registration)
  if (Array.isArray(registration.branchNames) && registration.branchNames.length > 0) {
    payload.branch_names = registration.branchNames
  }
  const result = await request('/network-registrations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const first = fromApiRegistration(result.registration)
  const all = Array.isArray(result.registrations)
    ? result.registrations.map(fromApiRegistration)
    : [first]
  return {
    registration: first,
    registrations: all,
  }
}

export async function downloadNetworkReport(month, ambassadorName) {
  let fileHandle = null
  if ('showSaveFilePicker' in window) {
    const safeName = (ambassadorName || 'Ambassador').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')
    fileHandle = await window.showSaveFilePicker({
      suggestedName: `${safeName}_${month}_Network_Report.pdf`,
      types: [{ description: 'PDF document', accept: { 'application/pdf': ['.pdf'] } }],
    })
  }

  const response = await fetch(`/api/network-registrations/export?month=${encodeURIComponent(month)}`, {
    headers: { Accept: 'application/pdf' },
    credentials: 'include',
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || 'The network report could not be exported.')
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `${month}-network-status.pdf`

  if (fileHandle) {
    const writable = await fileHandle.createWritable()
    await writable.write(blob)
    await writable.close()
    return
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
