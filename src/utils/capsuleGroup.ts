import type { Capsule, CapsuleParticipant } from '../types/capsule'

const MAX_LISTED_PARTICIPANTS = 3

export function isGroupCapsule(capsule: Pick<Capsule, 'type'>): boolean {
  return capsule.type === 'GROUP'
}

export function isCapsuleCreator(
  capsule: Pick<Capsule, 'participants'>,
  userId: string | undefined,
): boolean {
  return Boolean(capsule.participants?.some((person) => person.id === userId && person.isCreator))
}

export function formatParticipantNames(participants: CapsuleParticipant[]): string {
  const names = participants.slice(0, MAX_LISTED_PARTICIPANTS).map((person) => person.name).join(', ')
  const hidden = participants.length - MAX_LISTED_PARTICIPANTS

  return hidden > 0 ? `${names} +${hidden}` : names
}
