import { describe, expect, it } from 'vitest'
import type { CapsuleParticipant } from '../src/types/capsule'
import { formatParticipantNames, isGroupCapsule, isGroupOwner } from '../src/utils/capsuleGroup'

function person(name: string, role: CapsuleParticipant['role'] = 'MEMBER'): CapsuleParticipant {
  return { name, role }
}

describe('isGroupCapsule', () => {
  it('uses the type sent on creation', () => {
    expect(isGroupCapsule({ type: 'GROUP' })).toBe(true)
    expect(isGroupCapsule({ type: 'INDIVIDUAL' })).toBe(false)
  })

  it('recognizes the detail and list items by the participants the API sends only for groups', () => {
    expect(isGroupCapsule({ participants: [person('Ana', 'OWNER')] })).toBe(true)
    expect(isGroupCapsule({ participants: [] })).toBe(true)
  })

  it('treats a capsule without type and participants as individual', () => {
    expect(isGroupCapsule({})).toBe(false)
  })
})

describe('isGroupOwner', () => {
  const participants = [person('Ana', 'OWNER'), person('Bruno')]

  it('recognizes the owner by the invite code the API sends only to them', () => {
    expect(isGroupOwner({ participants, inviteCode: 'abc123' })).toBe(true)
  })

  it('denies a member, who never receives the code', () => {
    expect(isGroupOwner({ participants })).toBe(false)
    expect(isGroupOwner({ participants, inviteCode: '' })).toBe(false)
  })

  it('denies an individual capsule even with a code', () => {
    expect(isGroupOwner({ inviteCode: 'abc123' })).toBe(false)
  })
})

describe('formatParticipantNames', () => {
  const people = ['Ana', 'Bruno', 'Carla', 'Davi', 'Elis'].map((name) => person(name))

  it('lists everyone when there are up to three', () => {
    expect(formatParticipantNames(people.slice(0, 1))).toBe('Ana')
    expect(formatParticipantNames(people.slice(0, 3))).toBe('Ana, Bruno, Carla')
  })

  it('summarizes the rest beyond three', () => {
    expect(formatParticipantNames(people.slice(0, 4))).toBe('Ana, Bruno, Carla +1')
    expect(formatParticipantNames(people)).toBe('Ana, Bruno, Carla +2')
  })
})
