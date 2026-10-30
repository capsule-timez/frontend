import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../src/contexts/AuthContext'
import { ToastProvider } from '../src/contexts/ToastContext'
import { AppRoutes } from '../src/routes/AppRoutes'
import { getPublicCapsule } from '../src/services/capsuleService'
import type { PublicCapsule } from '../src/types/capsule'

vi.mock('../src/services/capsuleService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/capsuleService')>()),
  getPublicCapsule: vi.fn(),
}))

const getPublicCapsuleMock = vi.mocked(getPublicCapsule)

const capsule: PublicCapsule = {
  title: 'Formatura',
  text: 'Parabéns pela conquista!\nGuardei isso para hoje.',
  creatorName: 'Maria Souza',
  sentAt: '2026-09-20T09:00:05.123Z',
  files: [
    {
      id: 'file-1',
      fileName: 'foto-turma.jpg',
      mimeType: 'image/jpeg',
      fileSize: 482133,
      createdAt: '2026-01-15T14:31:10.000Z',
      downloadUrl: 'http://storage.test/foto-turma.jpg?X-Amz-Signature=abc',
      downloadUrlExpiresAt: '2026-09-28T19:59:12.000Z',
    },
    {
      id: 'file-2',
      fileName: 'bolo.png',
      mimeType: 'image/png',
      fileSize: 1024,
      createdAt: '2026-01-15T14:32:10.000Z',
      downloadUrl: 'http://storage.test/bolo.png?X-Amz-Signature=def',
      downloadUrlExpiresAt: '2026-09-28T19:59:12.000Z',
    },
  ],
}

function apiError(status?: number) {
  const response = status === undefined ? undefined : {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { status: 'error', code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: 'Falha na API' },
  }
  return new AxiosError('Request failed', 'ERR', undefined, undefined, response)
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

describe('CapsulaPublicaPage (/c/:token)', () => {
  beforeEach(() => {
    localStorage.clear()
    getPublicCapsuleMock.mockReset()
  })

  afterEach(cleanup)

  it('shows the full capsule without login', async () => {
    getPublicCapsuleMock.mockResolvedValue(capsule)

    renderAt('/c/tk_abc123')

    expect(screen.getByRole('status')).toHaveTextContent('Abrindo cápsula')
    expect(await screen.findByRole('heading', { level: 1, name: 'Formatura' })).toBeInTheDocument()
    expect(getPublicCapsuleMock).toHaveBeenCalledWith('tk_abc123', expect.any(AbortSignal))
    expect(screen.getByText(/Parabéns pela conquista!/)).toHaveTextContent(capsule.text.replace('\n', ' '))
    expect(screen.getByText('Maria Souza')).toBeInTheDocument()
    expect(document.querySelector('time')).toHaveAttribute('dateTime', capsule.sentAt)
    expect(screen.getByText(/20 de setembro de 2026/)).toBeInTheDocument()
    // Não foi redirecionado ao login.
    expect(screen.queryByRole('heading', { name: /entrar/i })).not.toBeInTheDocument()
  })

  it('renders the attached images from downloadUrl', async () => {
    getPublicCapsuleMock.mockResolvedValue(capsule)

    renderAt('/c/tk_abc123')

    const photo = await screen.findByRole('img', { name: 'foto-turma.jpg' })
    expect(photo).toHaveAttribute('src', capsule.files[0].downloadUrl)
    expect(screen.getByRole('img', { name: 'bolo.png' })).toHaveAttribute('src', capsule.files[1].downloadUrl)
    expect(screen.getByRole('link', { name: 'foto-turma.jpg' })).toHaveAttribute('href', capsule.files[0].downloadUrl)
    expect(screen.getByRole('link', { name: 'Ver foto-turma.jpg em tamanho original' }))
      .toHaveAttribute('href', capsule.files[0].downloadUrl)
  })

  it('shows a loading state per image until it loads', async () => {
    getPublicCapsuleMock.mockResolvedValue(capsule)

    renderAt('/c/tk_abc123')

    const photo = await screen.findByRole('img', { name: 'foto-turma.jpg' })
    expect(screen.getByRole('status', { name: 'Carregando foto-turma.jpg' })).toBeInTheDocument()

    fireEvent.load(photo)

    expect(screen.queryByRole('status', { name: 'Carregando foto-turma.jpg' })).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Carregando bolo.png' })).toBeInTheDocument()
  })

  it('shows an error state when an image fails to load and keeps the others', async () => {
    getPublicCapsuleMock.mockResolvedValue(capsule)

    renderAt('/c/tk_abc123')

    fireEvent.error(await screen.findByRole('img', { name: 'foto-turma.jpg' }))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Não foi possível carregar a imagem.')
    expect(alert.closest('figure')).toHaveTextContent('foto-turma.jpg')
    expect(screen.queryByRole('img', { name: 'foto-turma.jpg' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'bolo.png' })).toBeInTheDocument()
  })

  it('omits the images section when there are no attachments', async () => {
    getPublicCapsuleMock.mockResolvedValue({ ...capsule, files: [] })

    renderAt('/c/tk_abc123')

    await screen.findByRole('heading', { level: 1, name: 'Formatura' })
    expect(screen.queryByRole('heading', { name: 'Imagens' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows a friendly not-found screen for an invalid or unsent capsule (404)', async () => {
    getPublicCapsuleMock.mockRejectedValue(apiError(404))

    renderAt('/c/token-invalido')

    expect(await screen.findByRole('heading', { name: 'Cápsula não encontrada' })).toBeInTheDocument()
    expect(screen.getByText(/ainda não foi entregue/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
  })

  it('offers a retry on unexpected failures and loads the capsule afterwards', async () => {
    getPublicCapsuleMock.mockRejectedValueOnce(apiError(500)).mockResolvedValueOnce(capsule)

    renderAt('/c/tk_abc123')

    const error = await screen.findByRole('heading', { name: 'Não foi possível abrir a cápsula' })
    expect(within(error.parentElement!).getByText('Falha na API')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Formatura' })).toBeInTheDocument()
    expect(getPublicCapsuleMock).toHaveBeenCalledTimes(2)
  })

  it('shows a connection message when the API is unreachable', async () => {
    getPublicCapsuleMock.mockRejectedValue(apiError())

    renderAt('/c/tk_abc123')

    expect(await screen.findByText(/Não foi possível conectar à API/)).toBeInTheDocument()
  })
})
