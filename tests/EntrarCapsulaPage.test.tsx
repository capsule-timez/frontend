import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../src/contexts/AuthContext'
import { ToastProvider } from '../src/contexts/ToastContext'
import { AppRoutes } from '../src/routes/AppRoutes'
import { getCapsule, joinCapsule, listCapsules } from '../src/services/capsuleService'
import type { Capsule, CapsuleSummary, PaginatedResponse } from '../src/types/capsule'

vi.mock('../src/services/capsuleService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/capsuleService')>()),
  getCapsule: vi.fn(),
  joinCapsule: vi.fn(),
  listCapsules: vi.fn(),
}))

const getCapsuleMock = vi.mocked(getCapsule)
const joinCapsuleMock = vi.mocked(joinCapsule)
const listCapsulesMock = vi.mocked(listCapsules)

const user = { id: 'user-2', name: 'Bruno Reis', email: 'bruno@example.com' }

const capsule: Capsule = {
  id: 'capsule-1',
  title: 'Turma 2026',
  text: 'Mensagem do grupo',
  recipientEmail: 'turma@example.com',
  scheduleDate: '2030-01-01T12:00:00.000Z',
  status: 'SCHEDULED',
  sentAt: null,
  createdAt: '2026-01-01T12:00:00.000Z',
  files: [],
  type: 'GROUP',
  contributionDeadline: '2029-12-01T12:00:00.000Z',
  inviteCode: null,
  participants: [
    { id: 'user-1', name: 'Ana Lima', isCreator: true },
    { id: 'user-2', name: 'Bruno Reis', isCreator: false },
  ],
}

function page(data: CapsuleSummary[]): PaginatedResponse<CapsuleSummary> {
  return { data, meta: { page: 1, pageSize: 20, total: data.length, totalPages: 1 } }
}

function summary(): CapsuleSummary {
  const item: CapsuleSummary & Partial<Capsule> = { ...capsule, fileCount: 0 }
  delete item.text
  delete item.files
  delete item.inviteCode
  return item
}

function apiError(status: number, code: string, message: string, details?: unknown) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR', config, undefined, {
    status,
    statusText: '',
    headers: {},
    config,
    data: { status: 'error', code, message, details },
  })
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

function submitCode(code: string) {
  fireEvent.change(screen.getByLabelText('Código de convite'), { target: { value: code } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar na cápsula' }))
}

describe('EntrarCapsulaPage (/capsulas/entrar)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('capsula:auth', JSON.stringify({ token: 'session-token', user }))
    getCapsuleMock.mockReset()
    joinCapsuleMock.mockReset()
    listCapsulesMock.mockReset()
    listCapsulesMock.mockResolvedValue(page([]))
  })

  afterEach(cleanup)

  describe('access', () => {
    it('is reachable from the capsule list', async () => {
      renderAt('/capsulas')

      fireEvent.click(await screen.findByRole('link', { name: 'Entrar com código' }))

      expect(await screen.findByRole('heading', { name: 'Entrar em uma cápsula' })).toBeInTheDocument()
      expect(getCapsuleMock).not.toHaveBeenCalled()
    })

    it('is not treated as a capsule id by the /capsulas/:id route', () => {
      renderAt('/capsulas/entrar')

      expect(screen.getByLabelText('Código de convite')).toBeInTheDocument()
      expect(getCapsuleMock).not.toHaveBeenCalled()
    })

    it('requires a session', async () => {
      localStorage.clear()

      renderAt('/capsulas/entrar')

      expect(await screen.findByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()
      expect(screen.queryByLabelText('Código de convite')).not.toBeInTheDocument()
    })
  })

  describe('form validation', () => {
    it.each([
      ['empty', ''],
      ['blank', '    '],
    ])('does not call the API with a %s code', (_label, code) => {
      renderAt('/capsulas/entrar')

      submitCode(code)

      expect(screen.getByText('Informe o código de convite.')).toBeInTheDocument()
      expect(screen.getByLabelText('Código de convite')).toHaveFocus()
      expect(joinCapsuleMock).not.toHaveBeenCalled()
    })

    it('clears the error when the code is edited', () => {
      renderAt('/capsulas/entrar')

      submitCode('')
      fireEvent.change(screen.getByLabelText('Código de convite'), { target: { value: 'A' } })

      expect(screen.queryByText('Informe o código de convite.')).not.toBeInTheDocument()
    })
  })

  describe('valid code', () => {
    it('trims the code, joins and opens the capsule detail', async () => {
      joinCapsuleMock.mockResolvedValue(capsule)
      getCapsuleMock.mockResolvedValue(capsule)
      renderAt('/capsulas/entrar')

      submitCode('  ABC123 ')

      expect(await screen.findByRole('heading', { level: 1, name: 'Turma 2026' })).toBeInTheDocument()
      expect(joinCapsuleMock).toHaveBeenCalledWith('ABC123')
      expect(getCapsuleMock).toHaveBeenCalledWith('capsule-1', expect.any(AbortSignal))
      expect(screen.getByText('Você entrou na cápsula!')).toBeInTheDocument()
    })

    it('makes the capsule appear in the list afterwards', async () => {
      let joined = false
      joinCapsuleMock.mockImplementation(async () => {
        joined = true
        return capsule
      })
      getCapsuleMock.mockResolvedValue(capsule)
      listCapsulesMock.mockImplementation(async () => page(joined ? [summary()] : []))
      renderAt('/capsulas')

      expect(await screen.findByText('Nenhuma cápsula por aqui ainda')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('link', { name: 'Entrar com código' }))
      submitCode('ABC123')
      await screen.findByRole('heading', { level: 1, name: 'Turma 2026' })
      fireEvent.click(screen.getByRole('link', { name: 'Voltar para cápsulas' }))

      expect(await screen.findByRole('link', { name: 'Turma 2026' })).toHaveAttribute('href', '/capsulas/capsule-1')
    })

    it('disables the button while joining, avoiding a double submission', async () => {
      joinCapsuleMock.mockReturnValue(new Promise(() => {}))
      renderAt('/capsulas/entrar')

      submitCode('ABC123')

      expect(await screen.findByRole('button', { name: 'Entrando…' })).toBeDisabled()
      expect(joinCapsuleMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('API errors show the API message in a toast', () => {
    it.each([
      ['invalid code', 404, 'NOT_FOUND', 'Código de convite inválido.'],
      ['closed deadline', 409, 'CONTRIBUTION_DEADLINE_PASSED', 'O prazo para contribuições foi encerrado.'],
    ])('%s', async (_label, status, code, message) => {
      joinCapsuleMock.mockRejectedValue(apiError(status, code, message))
      renderAt('/capsulas/entrar')

      submitCode('ABC123')

      const toast = await screen.findByRole('alert')
      expect(toast).toHaveClass('toast')
      expect(toast).toHaveTextContent(message)
      expect(screen.getByLabelText('Código de convite')).toHaveValue('ABC123')
      expect(screen.getByRole('button', { name: 'Entrar na cápsula' })).toBeEnabled()
      expect(getCapsuleMock).not.toHaveBeenCalled()
    })

    it('also marks the field on a validation error', async () => {
      joinCapsuleMock.mockRejectedValue(
        apiError(422, 'VALIDATION_ERROR', 'Dados invalidos', [{ field: 'inviteCode', message: 'Formato inválido' }]),
      )
      renderAt('/capsulas/entrar')

      submitCode('???')

      expect(await screen.findByText('Dados invalidos')).toBeInTheDocument()
      expect(screen.getByText('Formato inválido')).toBeInTheDocument()
      expect(screen.getByLabelText('Código de convite')).toHaveAttribute('aria-invalid', 'true')
    })

    it('reports a connection failure', async () => {
      joinCapsuleMock.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
      renderAt('/capsulas/entrar')

      submitCode('ABC123')

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível conectar à API'),
      )
    })
  })
})
