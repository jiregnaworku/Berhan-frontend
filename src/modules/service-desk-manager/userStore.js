async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const error = new Error(body.message || 'The user request failed.')
    error.errors = body.errors || {}
    throw error
  }

  return response.json()
}

export async function fetchUsers() {
  const { users } = await request('/users')
  return users
}

export async function createUser(user) {
  const { user: savedUser } = await request('/users', {
    method: 'POST',
    body: JSON.stringify(user),
  })
  return savedUser
}

export async function fetchAmbassadors() {
  const { ambassadors } = await request('/ambassadors')
  return ambassadors
}

export async function updateUser(id, user) {
  const { user: savedUser } = await request(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(user),
  })
  return savedUser
}

export async function deleteUser(id) {
  await request(`/users/${id}`, { method: 'DELETE' })
}