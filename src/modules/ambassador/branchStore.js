const fieldMap = {
  branchName: 'branch_name',
  branchCode: 'branch_code',
  branchType: 'branch_type',
  branchLocation: 'branch_location',
  ambassadorName: 'ambassador_name',
  ambassadorPhone: 'ambassador_phone',
  backupName: 'backup_name',
  backupPhone: 'backup_phone',
  backupUsername: 'backup_username',
  managerName: 'manager_name',
  managerPhone: 'manager_phone',
  assistantName: 'assistant_name',
  assistantMobile: 'assistant_mobile',
  displayTvIp: 'display_tv_ip',
  kasperskyServerIp: 'kaspersky_server_ip',
  workingComputers: 'working_computers',
  createdBy: 'created_by',
}

const branchCacheTtl = 30_000
let branchCache = null
let branchCacheExpiresAt = 0
let branchRequest = null

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
    managerCanEdit: Boolean(branch.manager_can_edit),
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
  if (branchCache && Date.now() < branchCacheExpiresAt) {
    return branchCache
  }

  if (branchRequest) return branchRequest

  branchRequest = request('/branches')
    .then(({ branches }) => {
      branchCache = branches.map(fromApiBranch)
      branchCacheExpiresAt = Date.now() + branchCacheTtl
      return branchCache
    })
    .finally(() => {
      branchRequest = null
    })

  return branchRequest
}

function clearBranchCache() {
  branchCache = null
  branchCacheExpiresAt = 0
}

export async function createBranch(branch) {
  const { branch: savedBranch } = await request('/branches', {
    method: 'POST',
    body: JSON.stringify(toApiBranch(branch)),
  })
  clearBranchCache()
  return fromApiBranch(savedBranch)
}

export async function updateBranch(id, branch) {
  const { branch: savedBranch } = await request(`/branches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toApiBranch(branch)),
  })
  clearBranchCache()
  return fromApiBranch(savedBranch)
}

export async function deleteBranch(id) {
  await request(`/branches/${id}`, { method: 'DELETE' })
  clearBranchCache()
}

// Lets the ambassador turn on/off the branch manager's permission to update
// the Net Agent and Endpoint details of this branch's computers.
export async function setBranchManagerEdit(id, enabled) {
  const { branch: savedBranch } = await request(`/branches/${id}/manager-edit`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })
  clearBranchCache()
  return fromApiBranch(savedBranch)
}