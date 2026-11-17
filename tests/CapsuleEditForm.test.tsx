import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../src/contexts/AuthContext'
import { ToastProvider } from '../src/contexts/ToastContext'
import { AppRoutes } from '../src/routes/AppRoutes'
import { getCapsule, updateCapsule } from '../src/services/capsuleService'
import { listInvites } from '../src/services/inviteService'
import type { Capsule } from '../src/types/capsule'
import { toDateTimeLocalValue } from '../src/utils/capsuleValidation'

vi.mock('../src/services/capsuleService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/capsuleService')>()),
  getCapsule: vi.fn(),
  updateCapsule: vi.fn(),
}))

vi.mock('../src/services/inviteService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/inviteService')>()),
  listInvites: vi.fn(),
}))

const getCapsuleMock = vi.mocked(getCapsule)
const updateCapsuleMock = vi.mocked(updateCapsule)
const listInvitesMock = vi.mocked(listInvites)

const DAY = 24 * 60 * 60_000
const user = { id: 'user-1', name: 'Ana Lima', email: 'ana@example.com' }

const capsule: Capsule = {
  id: 'capsule-1',
  title: 'Carta para mim',
  text: 'Olá, futuro',
  recipientEmail: user.email,
  scheduleDate: new Date(Date.now() + 30 * DAY).toISOString(),
  status: 'SCHEDULED',
  sentAt: null,
  createdAt: '2026-01-01T12:00:00.000Z',
  files: [],
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

async function renderDetail(value: Capsule = capsule) {
  localStorage.setItem('capsula:auth', JSON.stringify({ token: 'session-token', user }))
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
  await screen.findByRole('heading', { level: 1, name: value.title })
}

function openEditor() {
  fireEvent.click(screen.getByRole('button', { name: 'Editar cápsula' }))
}

function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function save() {
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
}

describe('editing a scheduled capsule', () => {
  beforeEach(() => {
    localStorage.clear()
    getCapsuleMock.mockReset()
    updateCapsuleMock.mockReset()
    listInvitesMock.mockReset()
    listInvitesMock.mockResolvedValue([])
  })

  afterEach(cleanup)

  it('opens the form with the current values', async () => {
    await renderDetail()

    openEditor()

    expect(screen.getByLabelText('Título')).toHaveValue('Carta para mim')
    expect(screen.getByLabelText('Mensagem')).toHaveValue('Olá, futuro')
    expect(screen.getByLabelText('E-mail do destinatário')).toHaveValue(user.email)
    expect(screen.getByLabelText('Data e hora de entrega')).toHaveValue(toDateTimeLocalValue(new Date(capsule.scheduleDate)))
    expect(screen.queryByRole('button', { name: 'Excluir cápsula' })).not.toBeInTheDocument()
  })

  it('sends only the changed fields, then shows the refreshed capsule', async () => {
    updateCapsuleMock.mockResolvedValue({ ...capsule, title: 'Novo título' })
    await renderDetail()
    getCapsuleMock.mockResolvedValue({ ...capsule, title: 'Novo título', recipientEmail: 'outra@example.com' })

    openEditor()
    change('Título', '  Novo título ')
    change('E-mail do destinatário', 'outra@example.com')
    save()

    await waitFor(() => expect(updateCapsuleMock).toHaveBeenCalledWith('capsule-1', {
      title: 'Novo título',
      recipientEmail: 'outra@example.com',
    }))
    expect(await screen.findByText('Cápsula atualizada!')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Novo título' })).toBeInTheDocument()
    expect(screen.getByText('outra@example.com')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument()
  })

  it('sends the new delivery date in UTC', async () => {
    updateCapsuleMock.mockResolvedValue(capsule)
    await renderDetail()
    const date = new Date(Date.now() + 60 * DAY)
    date.setSeconds(0, 0)

    openEditor()
    change('Data e hora de entrega', toDateTimeLocalValue(date))
    save()

    await waitFor(() => expect(updateCapsuleMock).toHaveBeenCalledWith('capsule-1', { scheduleDate: date.toISOString() }))
  })

  it('closes without calling the API when nothing changed', async () => {
    await renderDetail()

    openEditor()
    save()

    expect(updateCapsuleMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Editar cápsula' })).toBeInTheDocument()
  })

  it('validates the fields before calling the API', async () => {
    await renderDetail()

    openEditor()
    change('Título', ' ')
    change('E-mail do destinatário', 'invalido')
    save()

    expect(await screen.findByText('Informe um título.')).toBeInTheDocument()
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveFocus()
    expect(updateCapsuleMock).not.toHaveBeenCalled()
  })

  it('shows validation errors returned by the API on the fields', async () => {
    updateCapsuleMock.mockRejectedValue(apiError(422, 'VALIDATION_ERROR', 'Dados invalidos', [
      { field: 'scheduleDate', message: 'Deve ser uma data em UTC (sufixo Z) pelo menos 1 minuto no futuro' },
    ]))
    await renderDetail()

    openEditor()
    change('Título', 'Outro')
    save()

    expect(await screen.findByText('Deve ser uma data em UTC (sufixo Z) pelo menos 1 minuto no futuro')).toBeInTheDocument()
    expect(screen.getByText('Revise os campos destacados.')).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveValue('Outro')
  })

  it('reloads the capsule when it can no longer be edited', async () => {
    updateCapsuleMock.mockRejectedValue(apiError(409, 'CAPSULE_NOT_EDITABLE', 'A cápsula não pode ser editada: já foi enviada ou está com falha.'))
    await renderDetail()
    getCapsuleMock.mockResolvedValue({ ...capsule, status: 'SENT', sentAt: new Date().toISOString() })

    openEditor()
    change('Título', 'Tarde demais')
    save()

    expect(await screen.findByText('A cápsula não pode ser editada: já foi enviada ou está com falha.')).toBeInTheDocument()
    await waitFor(() => expect(getCapsuleMock).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Enviada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar cápsula' })).not.toBeInTheDocument()
  })

  it('cancels without saving', async () => {
    await renderDetail()

    openEditor()
    change('Título', 'Descartado')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByText('Olá, futuro')).toBeInTheDocument()
    expect(updateCapsuleMock).not.toHaveBeenCalled()
  })

  it.each([
    ['a sent capsule', { status: 'SENT' as const }],
    ['a group capsule seen by a member', { participants: [{ name: 'Bruno', role: 'OWNER' as const }], contributions: [] }],
  ])('is not offered for %s', async (_label, changes) => {
    await renderDetail({ ...capsule, ...changes })

    expect(screen.queryByRole('button', { name: 'Editar cápsula' })).not.toBeInTheDocument()
  })

  it('is offered to the owner of a group capsule', async () => {
    await renderDetail({ ...capsule, participants: [{ name: user.name, role: 'OWNER' }], contributions: [], inviteCode: 'a1b2' })

    expect(screen.getByRole('button', { name: 'Editar cápsula' })).toBeInTheDocument()
  })
})
