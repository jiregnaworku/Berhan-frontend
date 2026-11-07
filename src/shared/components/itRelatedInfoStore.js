function fromApiInfo(info) {
  return {
    id: info.id,
    category: info.category || '',
    entryType: info.entry_type || 'member',
    parentId: info.parent_id || '',
    members: (info.members || []).map(fromApiInfo),
    title: info.title || '',
    description: info.description || '',
    contactName: info.contact_name || '',
    teamPhone: info.team_phone || '',
    officePhone: info.office_phone || '',
  }
}

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const error = new Error(body.message || 'The IT information request failed.')
    error.errors = body.errors || {}
    throw error
  }
  return response.status === 204 ? null : response.json()
}

export async function fetchItRelatedInfos() {
  const { itRelatedInfos } = await request('/it-related-infos')
  return itRelatedInfos.map(fromApiInfo)
}

function toApiInfo(info) {
  return {
    category: info.category,
    entry_type: info.entryType,
    parent_id: info.parentId || null,
    title: info.title,
    description: info.description,
    contact_name: info.contactName,
    team_phone: info.teamPhone,
    office_phone: info.officePhone,
  }
}

export async function createItRelatedInfo(info) {
  const { itRelatedInfo } = await request('/it-related-infos', { method: 'POST', body: JSON.stringify(toApiInfo(info)) })
  return fromApiInfo(itRelatedInfo)
}

export async function updateItRelatedInfo(id, info) {
  const { itRelatedInfo } = await request(`/it-related-infos/${id}`, { method: 'PUT', body: JSON.stringify(toApiInfo(info)) })
  return fromApiInfo(itRelatedInfo)
}

export async function deleteItRelatedInfo(id) {
  await request(`/it-related-infos/${id}`, { method: 'DELETE' })
}
