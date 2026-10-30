import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getPublicCapsule } from '../src/services/capsuleService'
import { httpClient } from '../src/services/httpClient'

const capsule = {
  title: 'Formatura',
  text: 'Parabéns!',
  creatorName: 'Maria Souza',
  sentAt: '2026-09-20T09:00:05.123Z',
  files: [],
}

describe('getPublicCapsule', () => {
  const originalAdapter = httpClient.defaults.adapter
  let requests: InternalAxiosRequestConfig[]

  beforeEach(() => {
    requests = []
    localStorage.clear()
    httpClient.defaults.adapter = async (config) => {
      requests.push(config)
      return { data: capsule, status: 200, statusText: 'OK', headers: {}, config }
    }
  })

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter
  })

  it('requests the public endpoint with the encoded token and returns the capsule', async () => {
    const { signal } = new AbortController()

    await expect(getPublicCapsule('tk/a b', signal)).resolves.toEqual(capsule)

    expect(requests).toHaveLength(1)
    expect(requests[0].method).toBe('get')
    expect(requests[0].url).toBe('/api/public/capsules/tk%2Fa%20b')
    expect(requests[0].signal).toBe(signal)
  })

  it('does not send an Authorization header without a session', async () => {
    await getPublicCapsule('tk_123')

    expect(requests[0].headers.get('Authorization')).toBeFalsy()
  })
})
