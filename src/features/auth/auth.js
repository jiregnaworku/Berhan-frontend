const SESSION_KEY = 'berhan-authenticated'

export function getAuthenticatedUser() {
  try {
    const user = JSON.parse(sessionStorage.getItem(SESSION_KEY))
    return user && user.role && user.username ? user : null
  } catch {
    return null
  }
}

export async function authenticateUser(username, password) {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username: username.trim(), password }),
  })

  if (!response.ok) {
    const error = new Error('Unable to sign in.')
    error.status = response.status
    throw error
  }

  const { user } = await response.json()
  const session = { username: user.username, role: user.role }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export async function clearSession() {
  try {
    await fetch('/api/logout', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'include',
    })
  } finally {
    sessionStorage.removeItem(SESSION_KEY)
  }
}
