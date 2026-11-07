export async function fetchAmbassadors() {
  const response = await fetch('/api/ambassadors', {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  })

  if (!response.ok) throw new Error('Unable to load ambassadors.')

  const { ambassadors } = await response.json()
  return ambassadors
}
