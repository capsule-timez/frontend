import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../src/contexts/AuthContext'
import { ToastProvider } from '../src/contexts/ToastContext'
import { AppRoutes } from '../src/routes/AppRoutes'
import { getCapsule } from '../src/services/capsuleService'
import { listInvites, sendInvites, type CapsuleInvite, type InviteResult } from '../src/services/inviteService'
import type { Capsule } from '../src/types/capsule'

vi.mock('../src/services/capsuleService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/capsuleService')>()),
  getCapsule: vi.fn(),
}))

vi.mock('../src/services/inviteService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/inviteService')>()),
  listInvites: vi.fn(),
  sendInvites: vi.fn(),
}))

const getCapsuleMock = vi.mocked(getCapsule)
const listInvitesMock = vi.mocked(listInvites)
const sendInvitesMock = vi.mocked(sendInvites)

const creator = { id: 'user-1', name: 'Ana Lima', email: 'ana@example.com' }
const participant = { id: 'user-2', name: 'Bruno Reis', email: 'bruno@example.com' }

// Detalhe visto por quem criou: só ele recebe o inviteCode.
const group: Capsule = {
  id: 'capsule-group',
  title: 'Turma 2026',
  text: 'Mensagem',
  recipientEmail: 'turma@example.com',
  scheduleDate: '2030-01-01T12:00:00.000Z',
  status: 'SCHEDULED',
  sentAt: null,
  createdAt: '2026-01-01T12:00:00.000Z',
  files: [],
  inviteCode: 'a1b2c3d4',
  participants: [
    { name: creator.name, role: 'OWNER' },
    { name: participant.name, role: 'MEMBER' },
  ],
  contributions: [],
}

function invite(email: string, status: CapsuleInvite['status']): CapsuleInvite {
  return {
    email,
    status,
    sentAt: '2026-11-13T12:00:00.000Z',
    expiresAt: '2029-12-01T12:00:00.000Z',
    acceptedAt: status === 'ACCEPTED' ? '2026-11-14T12:00:00.000Z' : null,
  }
}

const pending = invite('carla@example.com', 'PENDING')
const accepted = invite('bruno@example.com', 'ACCEPTED')
const expired = invite('davi@example.com', 'EXPIRED')

function sent(...emails: string[]): InviteResult[] {
  return emails.map((email) => ({ email, result: 'SENT' }))
}

function apiError(status: number, message: string, details?: unknown, code = 'VALIDATION_ERROR') {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR', config, undefined, {
    status,
    statusText: '',
    headers: {},
    config,
    data: { status: 'error', code, message, details },
  })
}

async function renderDetail(capsule: Capsule = group, user = creator) {
  localStorage.setItem('capsula:auth', JSON.stringify({ token: 'session-token', user }))
  getCapsuleMock.mockResolvedValue(capsule)
  render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[`/capsulas/${capsule.id}`]}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>,
  )
  await screen.findByRole('heading', { level: 1, name: capsule.title })
}

function emailsField() {
  return screen.getByLabelText('E-mails')
}

function submitEmails(value: string) {
  fireEvent.change(emailsField(), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar convites' }))
}

describe('email invites on the group capsule detail', () => {
  beforeEach(() => {
    localStorage.clear()
    getCapsuleMock.mockReset()
    listInvitesMock.mockReset()
    sendInvitesMock.mockReset()
    listInvitesMock.mockResolvedValue([])
    sendInvitesMock.mockImplementation(async (_id, emails) => sent(...emails))
  })

  afterEach(cleanup)

  describe('visibility', () => {
    it('is shown to the creator', async () => {
      await renderDetail()

      expect(screen.getByRole('heading', { name: 'Convidar por e-mail' })).toBeInTheDocument()
      expect(emailsField()).toBeInTheDocument()
      expect(listInvitesMock).toHaveBeenCalledWith(group.id, expect.any(AbortSignal))
    })

    it('is hidden from members, who do not receive the invite code', async () => {
      await renderDetail({ ...group, inviteCode: undefined }, participant)

      expect(screen.queryByRole('heading', { name: 'Convidar por e-mail' })).not.toBeInTheDocument()
      expect(listInvitesMock).not.toHaveBeenCalled()
    })

    it('is hidden on individual capsules', async () => {
      await renderDetail({
        ...group,
        id: 'capsule-individual',
        title: 'Carta para mim',
        recipientEmail: creator.email,
        inviteCode: undefined,
        participants: undefined,
        contributions: undefined,
      })

      expect(screen.queryByRole('heading', { name: 'Convidar por e-mail' })).not.toBeInTheDocument()
      expect(listInvitesMock).not.toHaveBeenCalled()
    })

    it.each([
      ['the capsule was already sent', { status: 'SENT' as const }],
      ['the deadline returned on creation passed', { contributionDeadline: '2020-01-01T12:00:00.000Z' }],
    ])('keeps only the list when %s', async (_label, changes) => {
      listInvitesMock.mockResolvedValue([pending])

      await renderDetail({ ...group, ...changes })

      expect(await screen.findByText(pending.email)).toBeInTheDocument()
      expect(screen.queryByLabelText('E-mails')).not.toBeInTheDocument()
      expect(screen.getByText(/não é possível enviar novos convites/)).toBeInTheDocument()
    })
  })

  describe('list', () => {
    it('shows each email with its status', async () => {
      listInvitesMock.mockResolvedValue([pending, accepted, expired, invite('eva@example.com', 'REVOKED')])

      await renderDetail()

      const list = await screen.findByRole('list', { name: 'Convites enviados' })
      const items = within(list).getAllByRole('listitem')
      expect(items).toHaveLength(4)
      expect(items[0]).toHaveTextContent('carla@example.com')
      expect(within(items[0]).getByText('Pendente')).toBeInTheDocument()
      expect(within(items[1]).getByText('Aceito')).toBeInTheDocument()
      expect(within(items[2]).getByText('Expirado')).toBeInTheDocument()
      expect(within(items[3]).getByText('REVOKED')).toBeInTheDocument()
    })

    it('says when no invite was sent', async () => {
      await renderDetail()

      expect(await screen.findByText('Nenhum convite enviado.')).toBeInTheDocument()
    })

    it('shows the error and loads again on request', async () => {
      listInvitesMock.mockRejectedValueOnce(apiError(500, 'Erro ao listar convites.'))
      listInvitesMock.mockResolvedValueOnce([pending])

      await renderDetail()

      expect(await screen.findByText('Erro ao listar convites.')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Atualizar convites' }))

      expect(await screen.findByText(pending.email)).toBeInTheDocument()
      expect(screen.queryByText('Erro ao listar convites.')).not.toBeInTheDocument()
    })
  })

  describe('sending', () => {
    it('sends several emails, shows a toast and refreshes the list', async () => {
      await renderDetail()
      await screen.findByText('Nenhum convite enviado.')
      listInvitesMock.mockResolvedValue([pending, invite('davi@example.com', 'PENDING')])

      submitEmails('Carla@Example.com, davi@example.com\ncarla@example.com')

      await waitFor(() => {
        expect(sendInvitesMock).toHaveBeenCalledWith(group.id, ['carla@example.com', 'davi@example.com'])
      })
      expect(await screen.findByText('2 convites enviados!')).toBeInTheDocument()
      expect(await screen.findByText('carla@example.com')).toBeInTheDocument()
      expect(screen.getByText('davi@example.com')).toBeInTheDocument()
      expect(listInvitesMock).toHaveBeenCalledTimes(2)
      expect(emailsField()).toHaveValue('')
    })

    it('uses the singular for a single invite', async () => {
      await renderDetail()

      submitEmails('carla@example.com')

      expect(await screen.findByText('Convite enviado!')).toBeInTheDocument()
    })

    it.each([
      ['empty', '   ', 'Informe ao menos um e-mail.'],
      ['invalid', 'carla@example.com, davi@', 'E-mail inválido: davi@'],
    ])('does not call the API with an %s input', async (_label, value, message) => {
      await renderDetail()

      submitEmails(value)

      expect(await screen.findByText(message)).toBeInTheDocument()
      expect(emailsField()).toHaveAttribute('aria-invalid', 'true')
      expect(sendInvitesMock).not.toHaveBeenCalled()
    })

    it('clears the error when the input changes', async () => {
      await renderDetail()

      submitEmails('')
      expect(await screen.findByText('Informe ao menos um e-mail.')).toBeInTheDocument()
      fireEvent.change(emailsField(), { target: { value: 'c' } })

      expect(screen.queryByText('Informe ao menos um e-mail.')).not.toBeInTheDocument()
    })

    it('keeps the emails and shows the API error when sending fails', async () => {
      sendInvitesMock.mockRejectedValue(apiError(422, 'Dados invalidos', [
        { field: 'emails.0', message: 'Deve ser um e-mail valido' },
      ]))
      await renderDetail()

      submitEmails('bruno@example.com')

      expect(await screen.findByText('Não foi possível enviar os convites')).toBeInTheDocument()
      expect(screen.getAllByText('Deve ser um e-mail valido').length).toBeGreaterThan(0)
      expect(emailsField()).toHaveValue('bruno@example.com')
      expect(emailsField()).toHaveAttribute('aria-invalid', 'true')
      expect(listInvitesMock).toHaveBeenCalledTimes(1)
    })

    it('reports people who already participate and e-mails that failed', async () => {
      sendInvitesMock.mockResolvedValue([
        { email: 'carla@example.com', result: 'SENT' },
        { email: 'bruno@example.com', result: 'ALREADY_MEMBER' },
        { email: 'davi@example.com', result: 'EMAIL_FAILED' },
      ])
      await renderDetail()

      submitEmails('carla@example.com, bruno@example.com, davi@example.com')

      expect(await screen.findByText('Convite enviado!')).toBeInTheDocument()
      expect(screen.getByText('bruno@example.com já participa da cápsula.')).toBeInTheDocument()
      expect(screen.getByText('Não foi possível enviar 1 e-mail de convite')).toBeInTheDocument()
      expect(screen.getByText(/O convite para davi@example.com ficou registrado/)).toBeInTheDocument()
    })

    it('says when nobody new was invited', async () => {
      sendInvitesMock.mockResolvedValue([{ email: 'bruno@example.com', result: 'ALREADY_MEMBER' }])
      await renderDetail()

      submitEmails('bruno@example.com')

      expect(await screen.findByText('Nenhum convite novo')).toBeInTheDocument()
    })

    it('limits each request to 20 e-mails', async () => {
      await renderDetail()

      submitEmails(Array.from({ length: 21 }, (_, index) => `pessoa${index}@example.com`).join(' '))

      expect(await screen.findByText('Envie no máximo 20 e-mails por vez.')).toBeInTheDocument()
      expect(sendInvitesMock).not.toHaveBeenCalled()
    })

    it('closes the form when the API says the deadline passed', async () => {
      sendInvitesMock.mockRejectedValue(apiError(409, 'O prazo de contribuição desta cápsula já passou.', undefined, 'CONTRIBUTION_DEADLINE_PASSED'))
      await renderDetail()

      submitEmails('carla@example.com')

      expect(await screen.findByText('O prazo de contribuição desta cápsula já passou.')).toBeInTheDocument()
      expect(screen.queryByLabelText('E-mails')).not.toBeInTheDocument()
      expect(screen.getByText(/não é possível enviar novos convites/)).toBeInTheDocument()
    })

    it('does not send twice while a request is in progress', async () => {
      let finish = () => {}
      sendInvitesMock.mockImplementation(() => new Promise((resolve) => { finish = () => resolve(sent('carla@example.com')) }))
      await renderDetail()

      fireEvent.change(emailsField(), { target: { value: 'carla@example.com' } })
      const form = emailsField().closest('form') as HTMLFormElement
      fireEvent.submit(form)
      fireEvent.submit(form)

      expect(sendInvitesMock).toHaveBeenCalledTimes(1)
      finish()
      expect(await screen.findByText('Convite enviado!')).toBeInTheDocument()
    })
  })
})
