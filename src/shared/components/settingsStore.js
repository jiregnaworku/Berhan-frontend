async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const error = new Error(body.message || 'The settings request failed.')
    error.errors = body.errors || {}
    throw error
  }

  return response.json()
}

export async function fetchProfile() {
  const { user } = await request('/user')
  return user
}

export async function updateProfile(form) {
  const { user } = await request('/profile', {
    method: 'PUT',
    body: JSON.stringify({
      email: form.email,
      current_password: form.currentPassword,
      password: form.newPassword,
      password_confirmation: form.confirmPassword,
    }),
  })
  return user
}
