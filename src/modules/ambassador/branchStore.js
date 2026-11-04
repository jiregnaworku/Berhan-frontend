const fieldMap = {
  branchName: 'branch_name',
  branchLocation: 'branch_location',
  ambassadorName: 'ambassador_name',
  ambassadorPhone: 'ambassador_phone',
  backupName: 'backup_name',
  backupPhone: 'backup_phone',
  managerName: 'manager_name',
  managerPhone: 'manager_phone',
  assistantName: 'assistant_name',
  assistantMobile: 'assistant_mobile',
  displayTvIp: 'display_tv_ip',
  kasperskyServerIp: 'kaspersky_server_ip',
  workingComputers: 'working_computers',
}

function toApiBranch(branch) {
  return Object.fromEntries(
    Object.entries(fieldMap).map(([frontendName, apiName]) => [apiName, branch[frontendName]]),
  )
}

function fromApiBranch(branch) {
  return {
    id: branch.id,
    ...Object.fromEntries(
      Object.entries(fieldMap).map(([frontendName, apiName]) => [frontendName, branch[apiName] ?? '']),
    ),
  }
}

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
    const error = new Error(body.message || 'The branch request failed.')
    error.status = response.status
    error.errors = body.errors || {}
    throw error
  }

  return response.status === 204 ? null : response.json()
}

export async function fetchBranches() {
  const { branches } = await request('/branches')
  return branches.map(fromApiBranch)
}

export async function createBranch(branch) {
  const { branch: savedBranch } = await request('/branches', {
    method: 'POST',
    body: JSON.stringify(toApiBranch(branch)),
  })
  return fromApiBranch(savedBranch)
}

export async function updateBranch(id, branch) {
  const { branch: savedBranch } = await request(`/branches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toApiBranch(branch)),
  })
  return fromApiBranch(savedBranch)
}

export async function deleteBranch(id) {
  await request(`/branches/${id}`, { method: 'DELETE' })
}
