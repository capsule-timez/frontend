import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../src/contexts/AuthContext'
import { ToastProvider } from '../src/contexts/ToastContext'
import { AppRoutes } from '../src/routes/AppRoutes'
import { getCapsule } from '../src/services/capsuleService'
import { listInvites, sendInvites, type CapsuleInvite } from '../src/services/inviteService'
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

const group: Capsule = {
  id: 'capsule-group',
  title: 'Turma 2026',
  text: 'Mensagem',
  recipientEmail: null,
  scheduleDate: '2030-01-01T12:00:00.000Z',
  status: 'SCHEDULED',
  sentAt: null,
  createdAt: '2026-01-01T12:00:00.000Z',
  files: [],
  type: 'GROUP',
  contributionDeadline: '2029-12-01T12:00:00.000Z',
  inviteCode: 'ABC123',
  participants: [
    { id: creator.id, name: creator.name, isCreator: true },
    { id: participant.id, name: participant.name, isCreator: false },
  ],
}

const pending: CapsuleInvite = { id: 'invite-1', email: 'carla@example.com', status: 'PENDING' }
const accepted: CapsuleInvite = { id: 'invite-2', email: 'bruno@example.com', status: 'ACCEPTED' }
const expired: CapsuleInvite = { id: 'invite-3', email: 'davi@example.com', status: 'EXPIRED' }

function apiError(status: number, message: string, details?: unknown) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR', config, undefined, {
    status,
    statusText: '',
    headers: {},
    config,
    data: { status: 'error', code: 'VALIDATION_ERROR', message, details },
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
    sendInvitesMock.mockResolvedValue()
  })

  afterEach(cleanup)

  describe('visibility', () => {
    it('is shown to the creator', async () => {
      await renderDetail()

      expect(screen.getByRole('heading', { name: 'Convidar por e-mail' })).toBeInTheDocument()
      expect(emailsField()).toBeInTheDocument()
      expect(listInvitesMock).toHaveBeenCalledWith(group.id, expect.any(AbortSignal))
    })

    it('is hidden from participants who did not create the capsule', async () => {
      await renderDetail(group, participant)

      expect(screen.queryByRole('heading', { name: 'Convidar por e-mail' })).not.toBeInTheDocument()
      expect(listInvitesMock).not.toHaveBeenCalled()
    })

    it('is hidden on individual capsules', async () => {
      await renderDetail({
        ...group,
        id: 'capsule-individual',
        title: 'Carta para mim',
        type: 'INDIVIDUAL',
        recipientEmail: creator.email,
        contributionDeadline: null,
        inviteCode: null,
        participants: [],
      })

      expect(screen.queryByRole('heading', { name: 'Convidar por e-mail' })).not.toBeInTheDocument()
      expect(listInvitesMock).not.toHaveBeenCalled()
    })

    it.each([
      ['the contribution deadline passed', { contributionDeadline: '2020-01-01T12:00:00.000Z' }],
      ['the capsule was already sent', { status: 'SENT' as const }],
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
      listInvitesMock.mockResolvedValue([pending, accepted, expired, { id: 'invite-4', email: 'eva@example.com', status: 'REVOKED' }])

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
      listInvitesMock.mockResolvedValue([pending, { ...pending, id: 'invite-5', email: 'davi@example.com' }])

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
      sendInvitesMock.mockRejectedValue(apiError(400, 'Dados inválidos.', [
        { field: 'emails.0', message: 'Este e-mail já participa da cápsula.' },
      ]))
      await renderDetail()

      submitEmails('bruno@example.com')

      expect(await screen.findByText('Não foi possível enviar os convites')).toBeInTheDocument()
      expect(screen.getAllByText('Este e-mail já participa da cápsula.').length).toBeGreaterThan(0)
      expect(emailsField()).toHaveValue('bruno@example.com')
      expect(emailsField()).toHaveAttribute('aria-invalid', 'true')
      expect(listInvitesMock).toHaveBeenCalledTimes(1)
    })

    it('does not send twice while a request is in progress', async () => {
      let finish = () => {}
      sendInvitesMock.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve }))
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
