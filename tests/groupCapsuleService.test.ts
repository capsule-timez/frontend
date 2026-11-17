import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { contributeToCapsule, createCapsule, getApiErrorDetails, joinCapsule, updateCapsule } from '../src/services/capsuleService'
import { httpClient, setAuthTokenGetter } from '../src/services/httpClient'

const capsule = { id: 'capsule-1', title: 'Turma', type: 'GROUP', inviteCode: 'ABC123' }

function apiError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR', config, undefined, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  })
}

describe('group capsule requests', () => {
  const originalAdapter = httpClient.defaults.adapter
  let requests: InternalAxiosRequestConfig[]

  beforeEach(() => {
    requests = []
    setAuthTokenGetter(() => 'session-token')
    httpClient.defaults.adapter = async (config) => {
      requests.push(config)
      return { data: capsule, status: 201, statusText: 'Created', headers: {}, config }
    }
  })

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter
    setAuthTokenGetter(() => null)
  })

  it('joins through POST /api/capsules/join with the code and the session token', async () => {
    await expect(joinCapsule('ABC123')).resolves.toEqual(capsule)

    expect(requests).toHaveLength(1)
    expect(requests[0].method).toBe('post')
    expect(requests[0].url).toBe('/api/capsules/join')
    expect(JSON.parse(requests[0].data as string)).toEqual({ inviteCode: 'ABC123' })
    expect(requests[0].headers.get('Authorization')).toBe('Bearer session-token')
  })

  it('sends type, contributionDeadline and the recipient on POST /api/capsules', async () => {
    const input = {
      title: 'Turma',
      text: 'Mensagem',
      recipientEmail: 'ana@example.com',
      scheduleDate: '2026-12-31T12:00:00.000Z',
      type: 'GROUP' as const,
      contributionDeadline: '2026-12-01T12:00:00.000Z',
    }

    await createCapsule(input)

    expect(requests[0].method).toBe('post')
    expect(requests[0].url).toBe('/api/capsules')
    expect(JSON.parse(requests[0].data as string)).toEqual(input)
  })

  it('sends a text-only contribution as JSON to POST /api/capsules/:id/contributions', async () => {
    await contributeToCapsule('capsule/1', { text: 'Minha mensagem' })

    expect(requests[0].method).toBe('post')
    expect(requests[0].url).toBe('/api/capsules/capsule%2F1/contributions')
    expect(JSON.parse(requests[0].data as string)).toEqual({ text: 'Minha mensagem' })
    expect(requests[0].headers.get('Authorization')).toBe('Bearer session-token')
  })

  it('sends text and images together as multipart in the files field', async () => {
    const images = [
      new File(['a'], 'a.png', { type: 'image/png' }),
      new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
    ]

    await contributeToCapsule('capsule-1', { text: 'Fotos da turma', images })

    expect(requests).toHaveLength(1)
    const form = requests[0].data as FormData
    expect(form).toBeInstanceOf(FormData)
    expect(form.get('text')).toBe('Fotos da turma')
    expect(form.getAll('files')).toEqual(images)
  })

  it('sends only images without an empty text field', async () => {
    const image = new File(['a'], 'a.png', { type: 'image/png' })

    await contributeToCapsule('capsule-1', { images: [image] })

    const form = requests[0].data as FormData
    expect(form.has('text')).toBe(false)
    expect(form.getAll('files')).toEqual([image])
  })

  it('updates a capsule through PATCH /api/capsules/:id with only the given fields', async () => {
    await updateCapsule('capsule/1', { title: 'Novo', scheduleDate: '2027-01-01T12:00:00.000Z' })

    expect(requests[0].method).toBe('patch')
    expect(requests[0].url).toBe('/api/capsules/capsule%2F1')
    expect(JSON.parse(requests[0].data as string)).toEqual({ title: 'Novo', scheduleDate: '2027-01-01T12:00:00.000Z' })
    expect(requests[0].headers.get('Authorization')).toBe('Bearer session-token')
  })

  it('propagates a join failure', async () => {
    const failure = apiError(404, { status: 'error', code: 'NOT_FOUND', message: 'Código inválido' })
    httpClient.defaults.adapter = async () => {
      throw failure
    }

    await expect(joinCapsule('NOPE')).rejects.toBe(failure)
  })
})

describe('getApiErrorDetails for join errors', () => {
  it('keeps the API message and code', () => {
    const error = apiError(409, {
      status: 'error',
      code: 'CONTRIBUTION_DEADLINE_PASSED',
      message: 'O prazo para contribuições foi encerrado.',
    })

    expect(getApiErrorDetails(error)).toEqual({
      code: 'CONTRIBUTION_DEADLINE_PASSED',
      message: 'O prazo para contribuições foi encerrado.',
      fieldErrors: {},
    })
  })

  it('maps validation details by field', () => {
    const error = apiError(422, {
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Dados invalidos',
      details: [{ field: 'inviteCode', message: 'Campo obrigatorio' }],
    })

    expect(getApiErrorDetails(error).fieldErrors).toEqual({ inviteCode: 'Campo obrigatorio' })
  })
})
