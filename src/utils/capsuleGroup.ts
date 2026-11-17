import type { Capsule, CapsuleParticipant } from '../types/capsule'

const MAX_LISTED_PARTICIPANTS = 3

/**
 * A API só manda `type` na criação. No detalhe e na listagem, a cápsula em
 * grupo é a única que traz `participants`.
 */
export function isGroupCapsule(capsule: Pick<Capsule, 'type' | 'participants'>): boolean {
  return capsule.type === 'GROUP' || Array.isArray(capsule.participants)
}

/** A API só envia o código de convite para quem criou a cápsula em grupo. */
export function isGroupOwner(capsule: Pick<Capsule, 'type' | 'participants' | 'inviteCode'>): boolean {
  return isGroupCapsule(capsule) && Boolean(capsule.inviteCode)
}

export function formatParticipantNames(participants: CapsuleParticipant[]): string {
  const names = participants.slice(0, MAX_LISTED_PARTICIPANTS).map((person) => person.name).join(', ')
  const hidden = participants.length - MAX_LISTED_PARTICIPANTS

  return hidden > 0 ? `${names} +${hidden}` : names
}
