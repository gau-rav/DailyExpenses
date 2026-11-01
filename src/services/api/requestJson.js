export async function requestJson(path, options = {}, fallbackMessage = status => `Request failed (${status})`) {
  const requestOptions = { credentials: 'include', ...options }
  if (options.body && !options.headers) requestOptions.headers = { 'Content-Type': 'application/json' }

  const response = await fetch(path, requestOptions)
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.ok) throw new Error(data.error || fallbackMessage(response.status))
  return data
}
