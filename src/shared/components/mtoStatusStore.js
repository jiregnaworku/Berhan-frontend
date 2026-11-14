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
    const error = new Error(body.message || 'The MTO status request failed.')
    error.errors = body.errors || {}
    throw error
  }

  return response.status === 204 ? null : response.json()
}

function fromApiBranch(branch) {
  return {
    id: branch.id,
    branchName: branch.branch_name || '',
    branchCode: branch.branch_code || '',
    createdBy: branch.created_by || '',
    mtoCanEdit: Boolean(branch.mto_can_edit),
  }
}

function fromApiStatus(row) {
  return {
    id: row.id,
    branchId: row.branch_id,
    mto: row.mto || '',
    status: row.status || '',
    remark: row.remark || '',
    submittedBy: row.submitted_by || '',
    reviewState: row.review_state || 'pending',
    acceptedBy: row.accepted_by || '',
    acceptedAt: row.accepted_at || '',
    createdAt: row.created_at || '',
  }
}

// Branches in the caller's scope (ambassador: own, branch manager: own branch,
// service desk manager: all) together with the MTO status reports of those branches.
export async function fetchMtoOverview() {
  const { branches, mtoStatuses } = await request('/mto-statuses')
  return {
    branches: branches.map(fromApiBranch),
    mtoStatuses: mtoStatuses.map(fromApiStatus),
  }
}

// Branch manager only (and only while editing is turned on for the branch).
export async function submitMtoStatus({ mto, status, remark }) {
  const { mtoStatus } = await request('/mto-statuses', {
    method: 'POST',
    body: JSON.stringify({ mto, status, remark: remark || null }),
  })
  return fromApiStatus(mtoStatus)
}

// Ambassador only: respond "accepted" to a report from one of their branches.
export async function acceptMtoStatus(id) {
  const { mtoStatus } = await request(`/mto-statuses/${id}/accept`, { method: 'PATCH' })
  return fromApiStatus(mtoStatus)
}

// Ambassador (own branch) or service desk manager (any branch).
export async function setBranchMtoEdit(branchId, enabled) {
  const result = await request(`/mto-statuses/access/${branchId}`, {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  })
  return { branchId: result.branch_id, mtoCanEdit: Boolean(result.mto_can_edit) }
}

// Ambassador: all of their own branches. Service desk manager: all branches.
export async function setAllMtoEdit(enabled) {
  const result = await request('/mto-statuses/access', {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  })
  return { count: result.count, mtoCanEdit: Boolean(result.mto_can_edit) }
}