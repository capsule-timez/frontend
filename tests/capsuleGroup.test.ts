import { describe, expect, it } from 'vitest'
import type { CapsuleParticipant } from '../src/types/capsule'
import {
  formatParticipantNames,
  isCapsuleCreator,
  isGroupCapsule,
} from '../src/utils/capsuleGroup'

function person(id: string, name: string, isCreator = false): CapsuleParticipant {
  return { id, name, isCreator }
}

describe('isGroupCapsule', () => {
  it('is true only for GROUP', () => {
    expect(isGroupCapsule({ type: 'GROUP' })).toBe(true)
    expect(isGroupCapsule({ type: 'INDIVIDUAL' })).toBe(false)
  })

  it('treats a capsule without type, as the current API returns, as individual', () => {
    expect(isGroupCapsule({})).toBe(false)
  })
})

describe('isCapsuleCreator', () => {
  const participants = [person('u1', 'Ana', true), person('u2', 'Bruno')]

  it('recognizes the creator', () => {
    expect(isCapsuleCreator({ participants }, 'u1')).toBe(true)
  })

  it('denies a participant who is not the creator', () => {
    expect(isCapsuleCreator({ participants }, 'u2')).toBe(false)
  })

  it('denies someone outside the list', () => {
    expect(isCapsuleCreator({ participants }, 'u3')).toBe(false)
  })

  it('denies when the user or the list is unknown', () => {
    expect(isCapsuleCreator({ participants }, undefined)).toBe(false)
    expect(isCapsuleCreator({}, 'u1')).toBe(false)
  })
})

describe('formatParticipantNames', () => {
  const people = ['Ana', 'Bruno', 'Carla', 'Davi', 'Elis'].map((name) => person(name, name))

  it('lists everyone when there are up to three', () => {
    expect(formatParticipantNames(people.slice(0, 1))).toBe('Ana')
    expect(formatParticipantNames(people.slice(0, 3))).toBe('Ana, Bruno, Carla')
  })

  it('summarizes the rest beyond three', () => {
    expect(formatParticipantNames(people.slice(0, 4))).toBe('Ana, Bruno, Carla +1')
    expect(formatParticipantNames(people)).toBe('Ana, Bruno, Carla +2')
  })
})
