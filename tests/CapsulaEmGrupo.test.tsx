import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../src/contexts/AuthContext'
import { ToastProvider } from '../src/contexts/ToastContext'
import { AppRoutes } from '../src/routes/AppRoutes'
import { getCapsule, listCapsules } from '../src/services/capsuleService'
import type { Capsule, CapsuleParticipant, CapsuleSummary } from '../src/types/capsule'

vi.mock('../src/services/capsuleService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/capsuleService')>()),
  getCapsule: vi.fn(),
  listCapsules: vi.fn(),
}))

const getCapsuleMock = vi.mocked(getCapsule)
const listCapsulesMock = vi.mocked(listCapsules)

const creator = { id: 'user-1', name: 'Ana Lima', email: 'ana@example.com' }
const participant = { id: 'user-2', name: 'Bruno Reis', email: 'bruno@example.com' }
const participants: CapsuleParticipant[] = [
  { id: creator.id, name: creator.name, isCreator: true },
  { id: participant.id, name: participant.name, isCreator: false },
]

// Mesmo formato da resposta atual da API: sem nenhum campo de grupo.
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

const group: Capsule = {
  ...individual,
  id: 'capsule-group',
  title: 'Turma 2026',
  type: 'GROUP',
  contributionDeadline: '2029-12-01T12:00:00.000Z',
  inviteCode: 'ABC123',
  participants,
}

function summary(capsule: Capsule): CapsuleSummary {
  const item: CapsuleSummary & Partial<Capsule> = { ...capsule, fileCount: 0 }
  delete item.text
  delete item.files
  delete item.inviteCode
  return item
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
  })

  afterEach(() => {
    cleanup()
    Reflect.deleteProperty(navigator, 'clipboard')
  })

  describe('list', () => {
    function card(title: string) {
      return screen.getByRole('link', { name: title }).closest('li') as HTMLElement
    }

    it('shows the Grupo badge and participants only on group capsules', async () => {
      signIn(creator)
      mockList(summary(group), summary(individual))

      renderAt('/capsulas')
      await screen.findByRole('link', { name: 'Turma 2026' })

      const groupCard = within(card('Turma 2026'))
      expect(groupCard.getByText('Grupo')).toBeInTheDocument()
      expect(groupCard.getByText('Participantes')).toBeInTheDocument()
      expect(groupCard.getByText('Ana Lima, Bruno Reis')).toBeInTheDocument()

      const individualCard = within(card('Carta para mim'))
      expect(individualCard.queryByText('Grupo')).not.toBeInTheDocument()
      expect(individualCard.queryByText('Participantes')).not.toBeInTheDocument()
    })

    it('never shows the invite code', async () => {
      signIn(creator)
      mockList({ ...summary(group), inviteCode: 'ABC123' } as CapsuleSummary)

      renderAt('/capsulas')
      await screen.findByRole('link', { name: 'Turma 2026' })

      expect(screen.queryByText('ABC123')).not.toBeInTheDocument()
    })

    it('keeps the badge when the API does not list participants', async () => {
      signIn(creator)
      mockList({ ...summary(group), participants: undefined })

      renderAt('/capsulas')
      await screen.findByRole('link', { name: 'Turma 2026' })

      const groupCard = within(card('Turma 2026'))
      expect(groupCard.getByText('Grupo')).toBeInTheDocument()
      expect(groupCard.queryByText('Participantes')).not.toBeInTheDocument()
    })
  })

  describe('detail for the creator', () => {
    it('shows the badge, deadline and participants', async () => {
      await renderDetail(group)

      expect(screen.getByText('Grupo')).toBeInTheDocument()
      expect(screen.getByText('Prazo para contribuições')).toBeInTheDocument()
      expect(document.querySelector(`time[datetime="${group.contributionDeadline}"]`)).toBeInTheDocument()

      const list = within(screen.getByRole('heading', { name: 'Participantes' }).parentElement as HTMLElement)
      const items = list.getAllByRole('listitem')
      expect(items).toHaveLength(2)
      expect(items[0]).toHaveTextContent('Ana Lima')
      expect(within(items[0]).getByText('Criador')).toBeInTheDocument()
      expect(items[1]).toHaveTextContent('Bruno Reis')
      expect(within(items[1]).queryByText('Criador')).not.toBeInTheDocument()
    })

    it('shows the invite code and copies it', async () => {
      const writeText = vi.fn(async () => {})
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

      await renderDetail(group)

      expect(screen.getByText('ABC123')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Copiar código' }))

      await waitFor(() => expect(writeText).toHaveBeenCalledWith('ABC123'))
      expect(await screen.findByRole('button', { name: 'Copiado!' })).toBeInTheDocument()
    })

    it('can delete the capsule', async () => {
      await renderDetail(group)

      expect(screen.getByRole('button', { name: 'Excluir cápsula' })).toBeInTheDocument()
    })
  })

  describe('detail for a participant who is not the creator', () => {
    it('does not show the code when the API omits it', async () => {
      await renderDetail({ ...group, inviteCode: null }, participant)

      expect(screen.queryByText('Código de convite')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Copiar código' })).not.toBeInTheDocument()
    })

    it('does not show the code even if the API returns it by mistake', async () => {
      await renderDetail(group, participant)

      expect(screen.queryByText('ABC123')).not.toBeInTheDocument()
      expect(screen.queryByText('Código de convite')).not.toBeInTheDocument()
    })

    it('still shows the badge and the participants', async () => {
      await renderDetail({ ...group, inviteCode: null }, participant)

      expect(screen.getByText('Grupo')).toBeInTheDocument()
      const main = within(screen.getByRole('main'))
      expect(main.getByText('Ana Lima')).toBeInTheDocument()
      expect(main.getByText('Bruno Reis')).toBeInTheDocument()
    })

    it('does not offer to delete the capsule', async () => {
      await renderDetail({ ...group, inviteCode: null }, participant)

      expect(screen.queryByRole('button', { name: 'Excluir cápsula' })).not.toBeInTheDocument()
    })
  })

  describe('incomplete responses', () => {
    it('hides the code when the creator cannot be confirmed', async () => {
      await renderDetail({ ...group, participants: undefined })

      expect(screen.queryByText('ABC123')).not.toBeInTheDocument()
      expect(screen.getByText('Nenhum participante nesta cápsula.')).toBeInTheDocument()
    })

    it('does not show the code on a creator view without one', async () => {
      await renderDetail({ ...group, inviteCode: null })

      expect(screen.queryByText('Código de convite')).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Participantes' })).toBeInTheDocument()
    })
  })

  describe('individual capsule, as the current API returns', () => {
    it('shows nothing about groups and keeps the delete action', async () => {
      await renderDetail(individual)

      expect(screen.queryByText('Grupo')).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Participantes' })).not.toBeInTheDocument()
      expect(screen.queryByText('Prazo para contribuições')).not.toBeInTheDocument()
      expect(screen.queryByText('Código de convite')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Excluir cápsula' })).toBeInTheDocument()
    })
  })
})
