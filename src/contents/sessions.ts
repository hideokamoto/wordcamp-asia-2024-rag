export const loadSessions = async () => {
  const json = await import('../data/sessions.json')
  return json.default
}