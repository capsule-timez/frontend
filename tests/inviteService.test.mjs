import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/services/inviteService.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText.replace(/import \{ httpClient \} from '.\/httpClient';/, 'const httpClient = globalThis.__inviteTestClient;')

const calls = []
const invite = { id: 'invite-1', email: 'amiga@example.com', status: 'PENDING' }
let acceptResponse = { capsuleId: 'capsule-1' }

globalThis.__inviteTestClient = {
  async get(...args) {
    calls.push(['get', ...args])
    return { data: { data: [invite] } }
  },
  async post(...args) {
    calls.push(['post', ...args])
    if (acceptResponse instanceof Error) throw acceptResponse
    return { data: acceptResponse }
  },
}
const { sendInvites, listInvites, acceptInvite } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
)
delete globalThis.__inviteTestClient

test('posts multiple emails and reads the invite list', async () => {
  const emails = [invite.email, 'outro@example.com']
  const { signal } = new AbortController()

  await sendInvites('c/1', emails)
  assert.deepEqual(await listInvites('c/1', signal), [invite])
  assert.deepEqual(calls.slice(-2), [
    ['post', '/api/capsules/c%2F1/invites', { emails }],
    ['get', '/api/capsules/c%2F1/invites', { signal }],
  ])
})

test('encodes the token and requires a capsule ID before redirecting', async () => {
  const { signal } = new AbortController()
  assert.equal(await acceptInvite('token/1', signal), 'capsule-1')
  assert.deepEqual(calls.at(-1), ['post', '/api/invites/token%2F1/accept', undefined, { signal }])

  acceptResponse = {}
  await assert.rejects(acceptInvite('token/1'), /qual cápsula/)

  acceptResponse = new Error('Convite expirado.')
  await assert.rejects(acceptInvite('token/1'), (error) => error === acceptResponse)
})
