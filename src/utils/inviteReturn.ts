const INVITE_PATH = /^\/convite\/[^/\\?#]+$/


export function getInviteReturnPath(state: unknown): string | null {
  const returnTo = typeof state === 'object' && state !== null && 'returnTo' in state
    ? state.returnTo
    : undefined

  return typeof returnTo === 'string' && INVITE_PATH.test(returnTo) ? returnTo : null
}
