import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../src/contexts/AuthContext'
import { ToastProvider } from '../src/contexts/ToastContext'
import { AppRoutes } from '../src/routes/AppRoutes'
import { authService } from '../src/services/authService'
import { getCapsule, listCapsules } from '../src/services/capsuleService'
import { httpClient } from '../src/services/httpClient'
import { acceptInvite } from '../src/services/inviteService'
import type { Capsule } from '../src/types/capsule'

vi.mock('../src/services/capsuleService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/capsuleService')>()),
  getCapsule: vi.fn(),
  listCapsules: vi.fn(),
}))

vi.mock('../src/services/inviteService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/inviteService')>()),
  acceptInvite: vi.fn(),
}))

vi.mock('../src/services/authService', () => ({
  authService: { login: vi.fn(), register: vi.fn() },
}))

const getCapsuleMock = vi.mocked(getCapsule)
const listCapsulesMock = vi.mocked(listCapsules)
const acceptInviteMock = vi.mocked(acceptInvite)
const loginMock = vi.mocked(authService.login)
const registerMock = vi.mocked(authService.register)

const user = { id: 'user-2', name: 'Bruno Reis', email: 'bruno@example.com' }

const capsule: Capsule = {
  id: 'capsule-1',
  title: 'Turma 2026',
  text: 'Mensagem',
  recipientEmail: 'turma@example.com',
  scheduleDate: '2030-01-01T12:00:00.000Z',
  status: 'SCHEDULED',
  sentAt: null,
  createdAt: '2026-01-01T12:00:00.000Z',
  files: [],
  participants: [
    { name: 'Ana Lima', role: 'OWNER' },
    { name: user.name, role: 'MEMBER' },
  ],
  contributions: [],
}

const CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONTRIBUTION_DEADLINE_PASSED',
  422: 'VALIDATION_ERROR',
  500: 'INTERNAL_ERROR',
}

function apiError(status: number, message?: string) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR', config, undefined, {
    status,
    statusText: '',
    headers: {},
    config,
    data: message === undefined ? {} : { status: 'error', code: CODES[status] ?? 'ERROR', message },
  })
}

function networkError() {
  return new AxiosError('Network Error', 'ERR_NETWORK', { headers: new AxiosHeaders() })
}

function signIn() {
  localStorage.setItem('capsula:auth', JSON.stringify({ token: 'session-token', user }))
}

function renderAt(path: string) {
  return render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>,
  )
}

function fillLogin() {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: user.email } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo123' } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('ConvitePage (/convite/:token)', () => {
  beforeEach(() => {
    localStorage.clear()
    getCapsuleMock.mockReset()
    listCapsulesMock.mockReset()
    acceptInviteMock.mockReset()
    loginMock.mockReset()
    registerMock.mockReset()
    getCapsuleMock.mockResolvedValue(capsule)
    listCapsulesMock.mockResolvedValue({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
    acceptInviteMock.mockResolvedValue(capsule.id)
    loginMock.mockResolvedValue({ token: 'session-token', user })
    registerMock.mockResolvedValue()
  })

  afterEach(cleanup)

  describe('with a session', () => {
    beforeEach(signIn)

    it('accepts the invite and opens the capsule detail', async () => {
      renderAt('/convite/token-1')

      expect(await screen.findByRole('heading', { level: 1, name: capsule.title })).toBeInTheDocument()
      expect(acceptInviteMock).toHaveBeenCalledTimes(1)
      expect(acceptInviteMock).toHaveBeenCalledWith('token-1', expect.any(AbortSignal))
      expect(getCapsuleMock).toHaveBeenCalledWith(capsule.id, expect.any(AbortSignal))
      expect(screen.getByText('Você entrou na cápsula!')).toBeInTheDocument()
    })

    it('shows a loading message while accepting', async () => {
      acceptInviteMock.mockReturnValue(new Promise(() => {}))

      renderAt('/convite/token-1')

      expect(await screen.findByText('Aceitando convite…')).toBeInTheDocument()
    })

    it.each([
      ['an invalid, used or expired invite (404)', apiError(404, 'Convite não encontrado.'), 'Este convite é inválido, expirou ou já foi utilizado.'],
      ['a closed capsule (409)', apiError(409, 'O prazo de contribuição desta cápsula já passou.'), 'O prazo para entrar nesta cápsula já terminou.'],
      ['a 4xx without a message', apiError(400), 'Este convite é inválido, expirou ou já foi utilizado.'],
    ])('explains %s with a friendly message', async (_label, error, message) => {
      acceptInviteMock.mockRejectedValue(error)

      renderAt('/convite/token-1')

      expect(await screen.findByRole('heading', { name: 'Convite indisponível' })).toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent(message)
      expect(screen.getByText(/peça um novo convite/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Ver minhas cápsulas' })).toHaveAttribute('href', '/capsulas')
      expect(getCapsuleMock).not.toHaveBeenCalled()
    })

    it('uses the API message on other client errors', async () => {
      acceptInviteMock.mockRejectedValue(apiError(403, 'Acesso negado'))

      renderAt('/convite/token-1')

      expect(await screen.findByRole('alert')).toHaveTextContent('Acesso negado')
    })

    it.each([
      ['a network failure', networkError()],
      ['a server error', apiError(500, 'Erro interno.')],
    ])('can try again after %s', async (_label, error) => {
      acceptInviteMock.mockRejectedValueOnce(error)

      renderAt('/convite/token-1')

      fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }))

      expect(await screen.findByRole('heading', { level: 1, name: capsule.title })).toBeInTheDocument()
      expect(acceptInviteMock).toHaveBeenCalledTimes(2)
    })

    it('asks for login again and returns to the invite when the session expired', async () => {
      // Passa pelo httpClient real para que o interceptor de 401 encerre a sessão.
      acceptInviteMock.mockImplementationOnce(async (token) => {
        await httpClient.post(`/api/invites/${token}/accept`, undefined, {
          adapter: (config) => Promise.reject(new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
            status: 401,
            statusText: '',
            headers: {},
            config,
            data: { status: 'error', code: 'UNAUTHORIZED', message: 'Token inválido.' },
          })),
        })
        return capsule.id
      })

      renderAt('/convite/token-1')

      expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()
      expect(screen.getByText('Sua sessão expirou')).toBeInTheDocument()

      fillLogin()

      expect(await screen.findByRole('heading', { level: 1, name: capsule.title })).toBeInTheDocument()
      expect(acceptInviteMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('without a session', () => {
    it('asks for login without calling the API', async () => {
      renderAt('/convite/token-1')

      expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()
      expect(screen.getByText('Entre para aceitar o convite para a cápsula.')).toBeInTheDocument()
      expect(acceptInviteMock).not.toHaveBeenCalled()
    })

    it('goes back to the invite after login and opens the capsule', async () => {
      renderAt('/convite/token-1')
      await screen.findByRole('heading', { name: 'Bem-vindo de volta' })

      fillLogin()

      expect(await screen.findByRole('heading', { level: 1, name: capsule.title })).toBeInTheDocument()
      expect(acceptInviteMock).toHaveBeenCalledWith('token-1', expect.any(AbortSignal))
      expect(screen.getByText('Agora vamos aceitar o seu convite.')).toBeInTheDocument()
    })

    it.each([
      ['card footer', 1],
      ['header', 0],
    ])('keeps the invite when the user creates an account from the %s', async (_label, index) => {
      renderAt('/convite/token-1')
      await screen.findByRole('heading', { name: 'Bem-vindo de volta' })

      fireEvent.click(screen.getAllByRole('link', { name: 'Criar conta' })[index])
      expect(await screen.findByText('Crie sua conta para aceitar o convite para a cápsula.')).toBeInTheDocument()

      fireEvent.change(screen.getByLabelText('Nome'), { target: { value: user.name } })
      fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: user.email } })
      fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo123' } })
      fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

      expect(await screen.findByRole('heading', { level: 1, name: capsule.title })).toBeInTheDocument()
      expect(acceptInviteMock).toHaveBeenCalledWith('token-1', expect.any(AbortSignal))
    })

    it('shows the friendly error after login when the invite is no longer valid', async () => {
      acceptInviteMock.mockRejectedValue(apiError(404, 'Convite não encontrado.'))
      renderAt('/convite/token-1')
      await screen.findByRole('heading', { name: 'Bem-vindo de volta' })

      fillLogin()

      expect(await screen.findByRole('heading', { name: 'Convite indisponível' })).toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent('Este convite é inválido, expirou ou já foi utilizado.')
    })

    it('goes to the list after login from any other page', async () => {
      renderAt('/capsulas/nova')
      await screen.findByRole('heading', { name: 'Bem-vindo de volta' })
      expect(screen.getByText('Entre para acompanhar suas cápsulas do tempo.')).toBeInTheDocument()

      fillLogin()

      await waitFor(() => expect(listCapsulesMock).toHaveBeenCalled())
      expect(acceptInviteMock).not.toHaveBeenCalled()
    })
  })
})
