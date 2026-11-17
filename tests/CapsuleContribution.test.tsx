import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../src/contexts/AuthContext'
import { ToastProvider } from '../src/contexts/ToastContext'
import { AppRoutes } from '../src/routes/AppRoutes'
import { contributeToCapsule, getCapsule, uploadCapsuleFile } from '../src/services/capsuleService'
import { listInvites } from '../src/services/inviteService'
import type { Capsule, CapsuleContribution, CapsuleFile } from '../src/types/capsule'

vi.mock('../src/services/capsuleService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/capsuleService')>()),
  contributeToCapsule: vi.fn(),
  getCapsule: vi.fn(),
  uploadCapsuleFile: vi.fn(),
}))

vi.mock('../src/services/inviteService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/inviteService')>()),
  listInvites: vi.fn(),
}))

const contributeMock = vi.mocked(contributeToCapsule)
const getCapsuleMock = vi.mocked(getCapsule)
const uploadMock = vi.mocked(uploadCapsuleFile)
const listInvitesMock = vi.mocked(listInvites)

const DAY = 24 * 60 * 60_000
const user = { id: 'user-2', name: 'Bruno Reis', email: 'bruno@example.com' }

function image(id: string, fileName: string): CapsuleFile {
  return {
    id,
    fileName,
    mimeType: 'image/png',
    fileSize: 1024,
    createdAt: '2026-01-01T12:00:00.000Z',
    downloadUrl: `http://storage.test/${fileName}`,
    downloadUrlExpiresAt: '2026-01-01T13:00:00.000Z',
  }
}

const anaText: CapsuleContribution = {
  id: 'contribution-1',
  author: { name: 'Ana Lima' },
  text: 'Que saudade da turma!',
  createdAt: '2026-01-02T12:00:00.000Z',
  files: [],
}

const brunoPhotos: CapsuleContribution = {
  id: 'contribution-2',
  author: { name: 'Bruno Reis' },
  text: null,
  createdAt: '2026-01-03T12:00:00.000Z',
  files: [image('file-1', 'formatura.png'), image('file-2', 'viagem.png')],
}

// Mesmo formato de GET /api/capsules/:id para um MEMBER: sem type, prazo nem inviteCode.
function capsule(overrides: Partial<Capsule> = {}): Capsule {
  return {
    id: 'capsule-1',
    title: 'Turma 2026',
    text: 'Mensagem de quem criou',
    recipientEmail: 'turma@example.com',
    scheduleDate: new Date(Date.now() + 30 * DAY).toISOString(),
    status: 'SCHEDULED',
    sentAt: null,
    createdAt: '2026-01-01T12:00:00.000Z',
    files: [],
    participants: [
      { name: 'Ana Lima', role: 'OWNER' },
      { name: user.name, role: 'MEMBER' },
    ],
    contributions: [anaText],
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
  await screen.findByRole('heading', { name: 'Contribuições' })
}

function messageField() {
  return screen.getByLabelText('Sua mensagem (opcional com imagens)')
}

function typeMessage(value: string) {
  fireEvent.change(messageField(), { target: { value } })
}

function pickImages(...names: string[]) {
  fireEvent.change(document.querySelector('.capsule-contribution input[type="file"]') as HTMLInputElement, {
    target: { files: names.map((name) => new File(['x'], name, { type: 'image/png' })) },
  })
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Enviar contribuição' }))
}

describe('group capsule contribution', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('capsula:auth', JSON.stringify({ token: 'session-token', user }))
    contributeMock.mockReset()
    getCapsuleMock.mockReset()
    uploadMock.mockReset()
    listInvitesMock.mockReset()
    listInvitesMock.mockResolvedValue([])
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(cleanup)

  describe('what a member sees', () => {
    it('shows the message, the recipient and the participants by role', async () => {
      await renderDetail(capsule())

      expect(screen.getByText('Mensagem de quem criou')).toBeInTheDocument()
      expect(screen.getByText('turma@example.com')).toBeInTheDocument()
      expect(screen.getByText('Grupo')).toBeInTheDocument()
      const list = within(screen.getByRole('heading', { name: 'Participantes' }).parentElement as HTMLElement)
      const [ana, bruno] = list.getAllByRole('listitem')
      expect(within(ana).getByText('Criador')).toBeInTheDocument()
      expect(within(bruno).queryByText('Criador')).not.toBeInTheDocument()
    })

    it('does not offer what only the owner can do', async () => {
      await renderDetail(capsule())

      expect(screen.queryByRole('heading', { name: 'Convidar por e-mail' })).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Adicionar imagens' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Excluir cápsula' })).not.toBeInTheDocument()
      expect(listInvitesMock).not.toHaveBeenCalled()
    })

    it('lists every contribution with author, text and images', async () => {
      await renderDetail(capsule({ contributions: [anaText, brunoPhotos] }))

      const list = screen.getByRole('list', { name: 'Contribuições' })
      const [first, second] = Array.from(list.children) as HTMLElement[]
      expect(list.children).toHaveLength(2)
      expect(first).toHaveTextContent('Ana Lima')
      expect(first).toHaveTextContent('Que saudade da turma!')
      expect(second).toHaveTextContent('Bruno Reis')
      expect(within(second).getByRole('img', { name: 'formatura.png' })).toBeInTheDocument()
      expect(within(second).getByRole('img', { name: 'viagem.png' })).toBeInTheDocument()
    })

    it('says when nobody has contributed', async () => {
      await renderDetail(capsule({ contributions: [] }))

      expect(screen.getByText('Ninguém contribuiu ainda.')).toBeInTheDocument()
    })

    it('offers the form while the capsule is scheduled', async () => {
      await renderDetail(capsule())

      expect(messageField()).toBeInTheDocument()
      expect(screen.getByText(/até 3 imagens/)).toBeInTheDocument()
    })

    it.each(['SENT', 'FAILED'] as const)('hides the form when the capsule is %s', async (status) => {
      await renderDetail(capsule({ status }))

      expect(screen.queryByLabelText('Sua mensagem (opcional com imagens)')).not.toBeInTheDocument()
      expect(screen.getByText('O prazo para contribuições desta cápsula terminou.')).toBeInTheDocument()
    })
  })

  describe('sending', () => {
    it('sends only the text, refreshes the capsule and lets the user contribute again', async () => {
      contributeMock.mockResolvedValue({ ...anaText, id: 'contribution-3', author: { name: user.name }, text: 'Oi, turma' })
      await renderDetail(capsule())
      getCapsuleMock.mockResolvedValue(capsule({
        contributions: [anaText, { ...anaText, id: 'contribution-3', author: { name: user.name }, text: 'Oi, turma' }],
      }))

      typeMessage('  Oi, turma  ')
      submit()

      await waitFor(() => expect(contributeMock).toHaveBeenCalledWith('capsule-1', { text: 'Oi, turma', images: [] }))
      expect(await screen.findByText('Contribuição enviada!')).toBeInTheDocument()
      expect(await screen.findByText('Oi, turma')).toBeInTheDocument()
      expect(getCapsuleMock).toHaveBeenCalledTimes(2)
      expect(messageField()).toHaveValue('')
      expect(uploadMock).not.toHaveBeenCalled()
    })

    it('sends text and images in a single request, without the capsule upload route', async () => {
      contributeMock.mockResolvedValue(brunoPhotos)
      await renderDetail(capsule())

      typeMessage('Fotos')
      pickImages('a.png', 'b.png')
      submit()

      await waitFor(() => expect(contributeMock).toHaveBeenCalledTimes(1))
      const [, input] = contributeMock.mock.calls[0]
      expect(input.text).toBe('Fotos')
      expect(input.images?.map((file) => file.name)).toEqual(['a.png', 'b.png'])
      expect(uploadMock).not.toHaveBeenCalled()
      expect(await screen.findByText('Contribuição enviada!')).toBeInTheDocument()
    })

    it('accepts images without text', async () => {
      contributeMock.mockResolvedValue(brunoPhotos)
      await renderDetail(capsule())

      pickImages('a.png')
      submit()

      await waitFor(() => expect(contributeMock).toHaveBeenCalledWith('capsule-1', {
        text: undefined,
        images: [expect.objectContaining({ name: 'a.png' })],
      }))
    })

    it.each(['', '   '])('requires a text or an image, without calling the API (%j)', async (value) => {
      await renderDetail(capsule())

      typeMessage(value)
      submit()

      expect(await screen.findByText('Escreva uma mensagem ou escolha ao menos uma imagem.')).toBeInTheDocument()
      expect(contributeMock).not.toHaveBeenCalled()
    })

    it('allows up to 3 images per contribution', async () => {
      await renderDetail(capsule())

      pickImages('1.png', '2.png', '3.png', '4.png')

      expect(screen.getByText('“4.png” não foi adicionada: o limite é de 3 imagens.')).toBeInTheDocument()
    })

    it('closes the form when the API says the deadline passed', async () => {
      contributeMock.mockRejectedValue(apiError(409, 'CONTRIBUTION_DEADLINE_PASSED', 'O prazo de contribuição desta cápsula já passou.'))
      await renderDetail(capsule())

      typeMessage('Atrasado')
      submit()

      expect(await screen.findByText('O prazo de contribuição desta cápsula já passou.')).toBeInTheDocument()
      expect(screen.getByText('O prazo para contribuições desta cápsula terminou.')).toBeInTheDocument()
      expect(screen.queryByLabelText('Sua mensagem (opcional com imagens)')).not.toBeInTheDocument()
    })

    it('marks the field and keeps the text on a validation error', async () => {
      contributeMock.mockRejectedValue(apiError(422, 'VALIDATION_ERROR', 'Dados invalidos', [
        { field: 'text', message: 'Deve ter no maximo 2.000 caracteres' },
      ]))
      await renderDetail(capsule())

      typeMessage('Texto')
      submit()

      expect(await screen.findByText('Deve ter no maximo 2.000 caracteres')).toBeInTheDocument()
      expect(messageField()).toHaveAttribute('aria-invalid', 'true')
      expect(messageField()).toHaveValue('Texto')
    })
  })
})
