const NETWORK_KEY = 'berhan-ambassador-network-registrations'

export function getNetworkRegistrations() {
  try {
    const registrations = JSON.parse(sessionStorage.getItem(NETWORK_KEY))
    return Array.isArray(registrations) ? registrations : []
  } catch {
    return []
  }
}

export function saveNetworkRegistrations(registrations) {
  sessionStorage.setItem(NETWORK_KEY, JSON.stringify(registrations))
}
