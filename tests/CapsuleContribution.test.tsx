import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../src/contexts/AuthContext'
import { ToastProvider } from '../src/contexts/ToastContext'
import { AppRoutes } from '../src/routes/AppRoutes'
import { contributeToCapsule, getCapsule, uploadCapsuleFile } from '../src/services/capsuleService'
import type { Capsule, CapsuleFile } from '../src/types/capsule'

vi.mock('../src/services/capsuleService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/capsuleService')>()),
  contributeToCapsule: vi.fn(),
  getCapsule: vi.fn(),
  uploadCapsuleFile: vi.fn(),
}))

const contributeMock = vi.mocked(contributeToCapsule)
const getCapsuleMock = vi.mocked(getCapsule)
const uploadMock = vi.mocked(uploadCapsuleFile)

const DAY = 24 * 60 * 60_000
const user = { id: 'user-2', name: 'Bruno Reis', email: 'bruno@example.com' }

const file: CapsuleFile = {
  id: 'file-1',
  fileName: 'foto.png',
  mimeType: 'image/png',
  fileSize: 1024,
  createdAt: '2026-01-01T12:00:00.000Z',
  downloadUrl: 'http://storage.test/foto.png',
  downloadUrlExpiresAt: '2026-01-01T13:00:00.000Z',
}

function capsule(overrides: Partial<Capsule> = {}): Capsule {
  return {
    id: 'capsule-1',
    title: 'Turma 2026',
    text: 'Texto do criador, ainda lacrado',
    recipientEmail: null,
    scheduleDate: new Date(Date.now() + 30 * DAY).toISOString(),
    status: 'SCHEDULED',
    sentAt: null,
    createdAt: '2026-01-01T12:00:00.000Z',
    files: [],
    type: 'GROUP',
    contributionDeadline: new Date(Date.now() + 10 * DAY).toISOString(),
    inviteCode: null,
    participants: [
      { id: 'user-1', name: 'Ana Lima', isCreator: true, hasContributed: true },
      { id: user.id, name: user.name, isCreator: false, hasContributed: false },
    ],
    myContribution: null,
    ...overrides,
  }
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

async function renderDetail(value: Capsule) {
  getCapsuleMock.mockResolvedValue(value)
  render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[`/capsulas/${value.id}`]}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>,
  )
  await screen.findByRole('heading', { name: 'Sua contribuição' })
}

function typeMessage(value: string) {
  fireEvent.change(screen.getByLabelText('Sua mensagem'), { target: { value } })
}

function pickImages(...names: string[]) {
  fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
    target: { files: names.map((name) => new File(['x'], name, { type: 'image/png' })) },
  })
}

describe('group capsule contribution', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('capsula:auth', JSON.stringify({ token: 'session-token', user }))
    contributeMock.mockReset()
    getCapsuleMock.mockReset()
    uploadMock.mockReset()
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(cleanup)

  describe('what the detail shows', () => {
    it('replaces the message and attachments with the personal contribution', async () => {
      await renderDetail(capsule())

      expect(screen.queryByRole('heading', { name: 'Mensagem' })).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Anexos' })).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Adicionar imagens' })).not.toBeInTheDocument()
      expect(screen.queryByText('Texto do criador, ainda lacrado')).not.toBeInTheDocument()
    })

    it('marks who has already contributed', async () => {
      await renderDetail(capsule())

      const [ana, bruno] = screen.getAllByRole('listitem')
      expect(ana).toHaveTextContent('Contribuiu')
      expect(bruno).not.toHaveTextContent('Contribuiu')
    })

    it('offers the form while the deadline is open', async () => {
      await renderDetail(capsule())

      expect(screen.getByLabelText('Sua mensagem')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Enviar contribuição' })).toBeInTheDocument()
      expect(screen.getByText(/^0\/1 ·/)).toBeInTheDocument()
    })

    it.each([
      ['the deadline has passed', { contributionDeadline: new Date(Date.now() - DAY).toISOString() }],
      ['the capsule was already sent', { status: 'SENT' as const }],
      ['the API sends no deadline', { contributionDeadline: null }],
    ])('hides the form when %s', async (_label, overrides) => {
      await renderDetail(capsule(overrides))

      expect(screen.queryByLabelText('Sua mensagem')).not.toBeInTheDocument()
      expect(screen.getByText('Você não enviou uma contribuição para esta cápsula.')).toBeInTheDocument()
    })

    it('shows a sent contribution without allowing another text', async () => {
      await renderDetail(capsule({ myContribution: { id: 'c1', text: 'Meu texto', file } }))

      expect(screen.getByText('Meu texto')).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'foto.png' })).toBeInTheDocument()
      expect(screen.queryByLabelText('Sua mensagem')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Escolher imagens' })).not.toBeInTheDocument()
    })

    it('still accepts the image of a contribution sent without one', async () => {
      await renderDetail(capsule({ myContribution: { id: 'c1', text: 'Meu texto', file: null } }))

      expect(screen.queryByLabelText('Sua mensagem')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Escolher imagens' })).toBeEnabled()
      expect(screen.queryByRole('button', { name: 'Enviar imagem' })).not.toBeInTheDocument()
    })
  })

  describe('sending', () => {
    it.each([
      ['empty', ''],
      ['blank', '   '],
    ])('requires the text, without calling the API, when it is %s', async (_label, value) => {
      await renderDetail(capsule())

      typeMessage(value)
      fireEvent.click(screen.getByRole('button', { name: 'Enviar contribuição' }))

      expect(await screen.findByText('Escreva sua mensagem.')).toBeInTheDocument()
      expect(contributeMock).not.toHaveBeenCalled()
    })

    it('sends only the text when there is no image, and refreshes the capsule', async () => {
      await renderDetail(capsule())
      contributeMock.mockResolvedValue({ id: 'c1', text: 'Meu texto', file: null })
      getCapsuleMock.mockResolvedValue(capsule({ myContribution: { id: 'c1', text: 'Meu texto', file: null } }))

      typeMessage('  Meu texto ')
      fireEvent.click(screen.getByRole('button', { name: 'Enviar contribuição' }))

      expect(await screen.findByText('Contribuição enviada!')).toBeInTheDocument()
      expect(contributeMock).toHaveBeenCalledWith('capsule-1', 'Meu texto')
      expect(uploadMock).not.toHaveBeenCalled()
      expect(await screen.findByText('Meu texto')).toBeInTheDocument()
      expect(screen.queryByLabelText('Sua mensagem')).not.toBeInTheDocument()
    })

    it('sends the text and then the image', async () => {
      await renderDetail(capsule())
      contributeMock.mockResolvedValue({ id: 'c1', text: 'Meu texto', file: null })
      uploadMock.mockResolvedValue(file)
      getCapsuleMock.mockResolvedValue(capsule({ myContribution: { id: 'c1', text: 'Meu texto', file } }))

      typeMessage('Meu texto')
      pickImages('foto.png')
      fireEvent.click(screen.getByRole('button', { name: 'Enviar contribuição' }))

      expect(await screen.findByRole('img', { name: 'foto.png' })).toBeInTheDocument()
      expect(uploadMock).toHaveBeenCalledTimes(1)
      expect(uploadMock.mock.calls[0][0]).toBe('capsule-1')
      expect(contributeMock.mock.invocationCallOrder[0]).toBeLessThan(uploadMock.mock.invocationCallOrder[0])
    })

    it('allows only 1 image', async () => {
      await renderDetail(capsule())

      pickImages('um.png', 'dois.png')

      expect(screen.getAllByRole('img', { name: /Miniatura/ })).toHaveLength(1)
      expect(screen.getByText(/“dois.png” não foi adicionada/)).toBeInTheDocument()
    })

    it('keeps the saved text and lets the user retry only the failed image', async () => {
      await renderDetail(capsule())
      contributeMock.mockResolvedValue({ id: 'c1', text: 'Meu texto', file: null })
      uploadMock.mockRejectedValueOnce(apiError(413, 'FILE_TOO_LARGE', 'Arquivo muito grande'))
      getCapsuleMock.mockResolvedValue(capsule({ myContribution: { id: 'c1', text: 'Meu texto', file: null } }))

      typeMessage('Meu texto')
      pickImages('foto.png')
      fireEvent.click(screen.getByRole('button', { name: 'Enviar contribuição' }))

      expect(await screen.findByText('A imagem não foi enviada')).toBeInTheDocument()
      const retry = await screen.findByRole('button', { name: 'Enviar imagem' })
      expect(screen.getByText('Arquivo muito grande')).toBeInTheDocument()

      uploadMock.mockResolvedValueOnce(file)
      fireEvent.click(retry)

      await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(2))
      expect(contributeMock).toHaveBeenCalledTimes(1)
    })

    it('shows the API message and keeps the text when sending fails', async () => {
      await renderDetail(capsule())
      contributeMock.mockRejectedValue(
        apiError(409, 'CONTRIBUTION_DEADLINE_PASSED', 'O prazo para contribuições foi encerrado.'),
      )

      typeMessage('Meu texto')
      pickImages('foto.png')
      fireEvent.click(screen.getByRole('button', { name: 'Enviar contribuição' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('O prazo para contribuições foi encerrado.')
      expect(screen.getByLabelText('Sua mensagem')).toHaveValue('Meu texto')
      expect(uploadMock).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Enviar contribuição' })).toBeEnabled()
    })

    it('marks the field on a validation error from the API', async () => {
      await renderDetail(capsule())
      contributeMock.mockRejectedValue(
        apiError(422, 'VALIDATION_ERROR', 'Dados invalidos', [{ field: 'text', message: 'Texto recusado' }]),
      )

      typeMessage('Meu texto')
      fireEvent.click(screen.getByRole('button', { name: 'Enviar contribuição' }))

      expect(await screen.findByText('Texto recusado')).toBeInTheDocument()
      expect(screen.getByLabelText('Sua mensagem')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('individual capsule', () => {
    it('keeps the message and attachments, with no contribution section', async () => {
      getCapsuleMock.mockResolvedValue(capsule({
        type: undefined,
        recipientEmail: 'ana@example.com',
        participants: undefined,
        myContribution: undefined,
      }))
      render(
        <ToastProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={['/capsulas/capsule-1']}>
              <AppRoutes />
            </MemoryRouter>
          </AuthProvider>
        </ToastProvider>,
      )

      expect(await screen.findByRole('heading', { name: 'Mensagem' })).toBeInTheDocument()
      expect(screen.getByText('ana@example.com')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Anexos' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Sua contribuição' })).not.toBeInTheDocument()
    })
  })
})
