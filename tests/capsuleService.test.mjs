import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

// Load the actual service with an isolated HTTP client, without a browser or API.
const source = await readFile(new URL('../src/services/capsuleService.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
  .replace(/import axios from 'axios';/, 'const axios = { isAxiosError: () => false };')
  .replace(/import \{ httpClient \} from '.\/httpClient';/, 'const httpClient = globalThis.__capsuleTestClient;')

const calls = []
const response = { data: [{ id: 'capsule-21', status: 'SENT' }], meta: { page: 2, pageSize: 20, total: 21, totalPages: 2 } }
globalThis.__capsuleTestClient = {
  async get(url, config) { calls.push({ url, config }); return { data: response } },
}
const { listCapsules } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
delete globalThis.__capsuleTestClient

test('returns the complete page and metadata and requests 20 items', async () => {
  const result = await listCapsules({ page: 2 })
  assert.equal(result, response)
  assert.equal(calls.at(-1).url, '/api/capsules')
  assert.deepEqual(calls.at(-1).config.params, { page: 2, pageSize: 20 })
})

test('sends each status to the API with the requested page and abort signal', async () => {
  const { signal } = new AbortController()
  for (const status of ['SCHEDULED', 'SENT', 'FAILED']) {
    await listCapsules({ status, page: 1 }, signal)
    assert.deepEqual(calls.at(-1).config.params, { status, page: 1, pageSize: 20 })
    assert.equal(calls.at(-1).config.signal, signal)
  }
})

test('propagates API failures instead of returning local capsule data', async () => {
  const failure = new Error('API unavailable')
  globalThis.__capsuleTestClient = { get: async () => { throw failure } }
  const isolated = await import(`data:text/javascript;base64,${Buffer.from(compiled + '\n// failure case').toString('base64')}`)
  delete globalThis.__capsuleTestClient
  await assert.rejects(isolated.listCapsules(), (error) => error === failure)
})
