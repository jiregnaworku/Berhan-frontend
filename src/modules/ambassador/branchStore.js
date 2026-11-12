const fieldMap = {
  branchName: 'branch_name',
  branchCode: 'branch_code',
  branchType: 'branch_type',
  branchLocation: 'branch_location',
  ambassadorName: 'ambassador_name',
  ambassadorPhone: 'ambassador_phone',
  ambassadorUsername: 'ambassador_username',
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

// Master list of branches for the dropdown (all of them, even ones already added).
export async function fetchBranchDirectory() {
  const { branches } = await request('/branch-directory')
  return branches.map(({ code, name, branch_type }) => ({
    code,
    name,
    type: branch_type,
  }))
}

// Service desk manager: add a completely new branch to the master list.
export async function createDirectoryBranch({ code, name, type }) {
  const { branch } = await request('/branch-directory', {
    method: 'POST',
    body: JSON.stringify({ code, name, branch_type: type }),
  })
  return { code: branch.code, name: branch.name, type: branch.branch_type }
}

// Service desk manager: remove an unused branch from the master list.
export async function deleteDirectoryBranch(code) {
  await request(`/branch-directory/${encodeURIComponent(code)}`, { method: 'DELETE' })
}
// Service desk manager: edit a branch's name, code or type in the master list.
// If the branch is already added, the updated branch is returned too.
export async function updateDirectoryBranch(currentCode, { code, name, type }) {
  const { entry, branch } = await request(`/branch-directory/${encodeURIComponent(currentCode)}`, {
    method: 'PUT',
    body: JSON.stringify({ code, name, branch_type: type }),
  })
  clearBranchCache()
  return {
    entry: { code: entry.code, name: entry.name, type: entry.branch_type },
    branch: branch ? fromApiBranch(branch) : null,
  }
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