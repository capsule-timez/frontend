import { describe, expect, it } from 'vitest'
import {
  getMinContributionDeadline,
  toDateTimeLocalValue,
  validateCapsuleForm,
  validateContributionDeadline,
  type CapsuleFormValues,
} from '../src/utils/capsuleValidation'

const now = new Date(2026, 5, 15, 12, 0, 30)

function local(year: number, month: number, day: number, hour = 12, minute = 0) {
  return toDateTimeLocalValue(new Date(year, month - 1, day, hour, minute))
}

const schedule = local(2026, 6, 30)

const baseValues: CapsuleFormValues = {
  type: 'INDIVIDUAL',
  title: 'Carta',
  text: 'Olá, futuro',
  scheduleDate: schedule,
  contributionDeadline: '',
  recipientMode: 'self',
  recipientEmail: '',
}

describe('validateContributionDeadline', () => {
  it('accepts a deadline in the future and before the delivery date', () => {
    expect(validateContributionDeadline(local(2026, 6, 20), schedule, now)).toBeUndefined()
  })

  it('requires a value', () => {
    expect(validateContributionDeadline('', schedule, now)).toBe('Escolha o prazo para contribuições.')
  })

  it('rejects a malformed date', () => {
    expect(validateContributionDeadline('não é data', schedule, now)).toBe('Data inválida.')
  })

  it.each([
    ['in the past', local(2026, 6, 14)],
    ['in the current minute, already elapsed', local(2026, 6, 15, 12, 0)],
  ])('rejects a deadline %s', (_label, value) => {
    expect(validateContributionDeadline(value, schedule, now)).toBe(
      'O prazo para contribuições precisa estar no futuro.',
    )
  })

  it.each([
    ['equal to', schedule],
    ['after', local(2026, 7, 1)],
  ])('rejects a deadline %s the delivery date', (_label, value) => {
    expect(validateContributionDeadline(value, schedule, now)).toBe(
      'O prazo para contribuições precisa ser antes da data de entrega.',
    )
  })

  it('accepts the last minute before delivery', () => {
    expect(validateContributionDeadline(local(2026, 6, 30, 11, 59), schedule, now)).toBeUndefined()
  })

  it.each([
    ['empty', ''],
    ['invalid', 'não é data'],
  ])('only checks the future when the delivery date is %s', (_label, scheduleDate) => {
    expect(validateContributionDeadline(local(2026, 6, 20), scheduleDate, now)).toBeUndefined()
    expect(validateContributionDeadline(local(2026, 6, 14), scheduleDate, now)).toBe(
      'O prazo para contribuições precisa estar no futuro.',
    )
  })
})

describe('getMinContributionDeadline', () => {
  it('returns the start of the next minute, which validation accepts', () => {
    const min = getMinContributionDeadline(now)

    expect(min).toEqual(new Date(2026, 5, 15, 12, 1, 0))
    expect(validateContributionDeadline(toDateTimeLocalValue(min), schedule, now)).toBeUndefined()
  })
})

describe('validateCapsuleForm', () => {
  it('ignores the deadline of an individual capsule', () => {
    expect(validateCapsuleForm(baseValues, now)).toEqual({})
    expect(validateCapsuleForm({ ...baseValues, contributionDeadline: local(2020, 1, 1) }, now)).toEqual({})
  })

  it('requires the deadline of a group capsule', () => {
    expect(validateCapsuleForm({ ...baseValues, type: 'GROUP' }, now)).toEqual({
      contributionDeadline: 'Escolha o prazo para contribuições.',
    })
  })

  it('accepts a group capsule with a valid deadline', () => {
    const values = { ...baseValues, type: 'GROUP' as const, contributionDeadline: local(2026, 6, 20) }

    expect(validateCapsuleForm(values, now)).toEqual({})
  })

  it('reports the deadline along with the other invalid fields', () => {
    const errors = validateCapsuleForm(
      { ...baseValues, type: 'GROUP', title: ' ', contributionDeadline: local(2026, 7, 1) },
      now,
    )

    expect(Object.keys(errors).sort()).toEqual(['contributionDeadline', 'title'])
  })
})
