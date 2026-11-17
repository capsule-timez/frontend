import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../src/contexts/AuthContext'
import { ToastProvider } from '../src/contexts/ToastContext'
import { AppRoutes } from '../src/routes/AppRoutes'
import { getCapsule, listCapsules } from '../src/services/capsuleService'
import { listInvites } from '../src/services/inviteService'
import type { Capsule, CapsuleParticipant, CapsuleSummary } from '../src/types/capsule'

vi.mock('../src/services/capsuleService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/capsuleService')>()),
  getCapsule: vi.fn(),
  listCapsules: vi.fn(),
}))

vi.mock('../src/services/inviteService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/inviteService')>()),
  listInvites: vi.fn(),
}))

const getCapsuleMock = vi.mocked(getCapsule)
const listCapsulesMock = vi.mocked(listCapsules)
const listInvitesMock = vi.mocked(listInvites)

const creator = { id: 'user-1', name: 'Ana Lima', email: 'ana@example.com' }
const participant = { id: 'user-2', name: 'Bruno Reis', email: 'bruno@example.com' }
const participants: CapsuleParticipant[] = [
  { name: creator.name, role: 'OWNER' },
  { name: participant.name, role: 'MEMBER' },
]

// Formatos de GET /api/capsules/:id: o grupo traz participants e contributions, sem type.
const individual: Capsule = {
  id: 'capsule-individual',
  title: 'Carta para mim',
  text: 'Olá, futuro',
  recipientEmail: creator.email,
  scheduleDate: '2030-01-01T12:00:00.000Z',
  status: 'SCHEDULED',
  sentAt: null,
  createdAt: '2026-01-01T12:00:00.000Z',
  files: [],
}

const memberView: Capsule = {
  ...individual,
  id: 'capsule-group',
  title: 'Turma 2026',
  text: 'Mensagem da turma',
  recipientEmail: 'turma@example.com',
  participants,
  contributions: [],
}

const ownerView: Capsule = { ...memberView, inviteCode: 'a1b2c3d4' }

function summary({ id, title, recipientEmail, scheduleDate, status, sentAt, createdAt, participants: people }: Capsule): CapsuleSummary {
  return { id, title, recipientEmail, scheduleDate, status, sentAt, createdAt, fileCount: 0, ...(people && { participants: people }) }
}

function signIn(user: typeof creator) {
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

function mockList(...capsules: CapsuleSummary[]) {
  listCapsulesMock.mockResolvedValue({
    data: capsules,
    meta: { page: 1, pageSize: 20, total: capsules.length, totalPages: 1 },
  })
}

async function renderDetail(capsule: Capsule, user = creator) {
  signIn(user)
  getCapsuleMock.mockResolvedValue(capsule)
  renderAt(`/capsulas/${capsule.id}`)
  await screen.findByRole('heading', { level: 1, name: capsule.title })
}

describe('group capsules in the list and detail', () => {
  beforeEach(() => {
    localStorage.clear()
    getCapsuleMock.mockReset()
    listCapsulesMock.mockReset()
    listInvitesMock.mockReset()
    listInvitesMock.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
    Reflect.deleteProperty(navigator, 'clipboard')
  })

  describe('list', () => {
    function card(title: string) {
      return screen.getByRole('link', { name: title }).closest('li') as HTMLElement
    }

    it('shows the Grupo badge and participants on items that bring participants', async () => {
      signIn(creator)
      mockList(summary(memberView), summary(individual))

      renderAt('/capsulas')
      await screen.findByRole('link', { name: 'Turma 2026' })

      const groupCard = within(card('Turma 2026'))
      expect(groupCard.getByText('Grupo')).toBeInTheDocument()
      expect(groupCard.getByText('Ana Lima, Bruno Reis')).toBeInTheDocument()
      expect(groupCard.getByText('turma@example.com')).toBeInTheDocument()

      const individualCard = within(card('Carta para mim'))
      expect(individualCard.queryByText('Grupo')).not.toBeInTheDocument()
      expect(individualCard.getByText(creator.email)).toBeInTheDocument()
    })

    it('keeps the badge when the group has no participants listed', async () => {
      signIn(creator)
      mockList({ ...summary(memberView), participants: [] })

      renderAt('/capsulas')
      await screen.findByRole('link', { name: 'Turma 2026' })

      expect(within(card('Turma 2026')).getByText('Grupo')).toBeInTheDocument()
    })
  })

  describe('detail for the owner', () => {
    it('shows the badge, the recipient, the message and the participants by role', async () => {
      await renderDetail(ownerView)

      expect(screen.getByText('Grupo')).toBeInTheDocument()
      expect(screen.getByText('turma@example.com')).toBeInTheDocument()
      expect(screen.getByText('Mensagem da turma')).toBeInTheDocument()
      expect(screen.queryByText('Prazo para contribuições')).not.toBeInTheDocument()

      const list = within(screen.getByRole('heading', { name: 'Participantes' }).parentElement as HTMLElement)
      const items = list.getAllByRole('listitem')
      expect(items).toHaveLength(2)
      expect(items[0]).toHaveTextContent('Ana Lima')
      expect(within(items[0]).getByText('Criador')).toBeInTheDocument()
      expect(within(items[1]).queryByText('Criador')).not.toBeInTheDocument()
    })

    it('shows the deadline and who has contributed when the API sends them', async () => {
      await renderDetail({
        ...ownerView,
        type: 'GROUP',
        contributionDeadline: '2029-12-01T12:00:00.000Z',
        participants: [
          { name: creator.name, role: 'OWNER', hasContributed: false },
          { name: participant.name, role: 'MEMBER', hasContributed: true },
        ],
      })

      expect(screen.getByText('Prazo para contribuições')).toBeInTheDocument()
      expect(document.querySelector('time[datetime="2029-12-01T12:00:00.000Z"]')).toBeInTheDocument()
      const list = within(screen.getByRole('heading', { name: 'Participantes' }).parentElement as HTMLElement)
      const [ana, bruno] = list.getAllByRole('listitem')
      expect(within(ana).queryByText('Contribuiu')).not.toBeInTheDocument()
      expect(within(bruno).getByText('Contribuiu')).toBeInTheDocument()
    })

    it('shows the invite code and copies it', async () => {
      const writeText = vi.fn(async () => {})
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

      await renderDetail(ownerView)

      expect(screen.getByText('a1b2c3d4')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Copiar código' }))

      await waitFor(() => expect(writeText).toHaveBeenCalledWith('a1b2c3d4'))
      expect(await screen.findByRole('button', { name: 'Copiado!' })).toBeInTheDocument()
    })

    it('can invite by email, attach images and delete the capsule', async () => {
      await renderDetail(ownerView)

      expect(screen.getByRole('heading', { name: 'Convidar por e-mail' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Adicionar imagens' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Excluir cápsula' })).toBeInTheDocument()
    })
  })

  describe('detail for a member', () => {
    it('does not show the code, invites, uploads or delete', async () => {
      await renderDetail(memberView, participant)

      expect(screen.queryByText('Código de convite')).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Convidar por e-mail' })).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Adicionar imagens' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Excluir cápsula' })).not.toBeInTheDocument()
      expect(listInvitesMock).not.toHaveBeenCalled()
    })

    it('still shows the badge, the message and the participants', async () => {
      await renderDetail(memberView, participant)

      expect(screen.getByText('Grupo')).toBeInTheDocument()
      expect(screen.getByText('Mensagem da turma')).toBeInTheDocument()
      const main = within(screen.getByRole('main'))
      expect(main.getByText('Ana Lima')).toBeInTheDocument()
      expect(main.getByText('Bruno Reis')).toBeInTheDocument()
    })

    it('shows the attachments of the capsule without offering uploads', async () => {
      await renderDetail({
        ...memberView,
        files: [{
          id: 'file-1',
          fileName: 'convite.png',
          mimeType: 'image/png',
          fileSize: 2048,
          createdAt: '2026-01-01T12:00:00.000Z',
          downloadUrl: 'http://storage.test/convite.png',
          downloadUrlExpiresAt: '2026-01-01T13:00:00.000Z',
        }],
      }, participant)

      expect(screen.getByRole('heading', { name: 'Anexos' })).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'convite.png' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Adicionar imagens' })).not.toBeInTheDocument()
    })
  })

  describe('individual capsule', () => {
    it('shows nothing about groups and keeps the creator actions', async () => {
      await renderDetail(individual)

      expect(screen.queryByText('Grupo')).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Participantes' })).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Contribuições' })).not.toBeInTheDocument()
      expect(screen.queryByText('Código de convite')).not.toBeInTheDocument()
      expect(screen.getByText('Olá, futuro')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Adicionar imagens' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Excluir cápsula' })).toBeInTheDocument()
    })
  })
})
