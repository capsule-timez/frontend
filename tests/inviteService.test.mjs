import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/services/inviteService.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText.replace(/import \{ httpClient \} from '.\/httpClient';/, 'const httpClient = globalThis.__inviteTestClient;')

const calls = []
// Formato de GET /api/capsules/:id/invites no backend.
const invite = {
  email: 'amiga@example.com',
  status: 'PENDING',
  sentAt: '2026-11-13T12:00:00.000Z',
  expiresAt: '2026-12-01T12:00:00.000Z',
  acceptedAt: null,
}
const results = [
  { email: 'amiga@example.com', result: 'SENT' },
  { email: 'outro@example.com', result: 'ALREADY_MEMBER' },
]
let listResponse = { data: [invite] }
let sendResponse = { invites: results }
// POST /api/invites/:token/accept devolve o detalhe da cápsula.
let acceptResponse = { id: 'capsule-1', title: 'Turma', participants: [] }

globalThis.__inviteTestClient = {
  async get(...args) {
    calls.push(['get', ...args])
    return { data: listResponse }
  },
  async post(...args) {
    calls.push(['post', ...args])
    const response = args[0].endsWith('/accept') ? acceptResponse : sendResponse
    if (response instanceof Error) throw response
    return { data: response }
  },
}
const { sendInvites, listInvites, acceptInvite } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
)
delete globalThis.__inviteTestClient

test('posts multiple emails and returns the result of each one', async () => {
  const emails = ['amiga@example.com', 'outro@example.com']

  assert.deepEqual(await sendInvites('c/1', emails), results)
  assert.deepEqual(calls.at(-1), ['post', '/api/capsules/c%2F1/invites', { emails }])
})

test('rejects a send response without the invite results', async () => {
  sendResponse = { data: results }
  await assert.rejects(sendInvites('c/1', ['amiga@example.com']), /resultado dos convites/)
  sendResponse = { invites: results }
})

test('reads the invite list from data, without requiring an id', async () => {
  const { signal } = new AbortController()

  assert.deepEqual(await listInvites('c/1', signal), [invite])
  assert.deepEqual(calls.at(-1), ['get', '/api/capsules/c%2F1/invites', { signal }])

  listResponse = { data: [{ email: 'amiga@example.com' }] }
  await assert.rejects(listInvites('c/1'), /lista de convites inválida/)
  listResponse = [invite]
  await assert.rejects(listInvites('c/1'), /lista de convites inválida/)
  listResponse = { data: [invite] }
})

test('encodes the token and takes the capsule id from the returned detail', async () => {
  const { signal } = new AbortController()
  assert.equal(await acceptInvite('token/1', signal), 'capsule-1')
  assert.deepEqual(calls.at(-1), ['post', '/api/invites/token%2F1/accept', undefined, { signal }])

  acceptResponse = { capsuleId: 'capsule-1' }
  await assert.rejects(acceptInvite('token/1'), /qual cápsula/)

  acceptResponse = new Error('Convite não encontrado.')
  await assert.rejects(acceptInvite('token/1'), (error) => error === acceptResponse)
})
