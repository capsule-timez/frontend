import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../src/contexts/AuthContext'
import { ToastProvider } from '../src/contexts/ToastContext'
import { AppRoutes } from '../src/routes/AppRoutes'
import { createCapsule, getCapsule, listCapsules, uploadCapsuleFile } from '../src/services/capsuleService'
import type { Capsule } from '../src/types/capsule'
import { toDateTimeLocalValue } from '../src/utils/capsuleValidation'

vi.mock('../src/services/capsuleService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/capsuleService')>()),
  createCapsule: vi.fn(),
  getCapsule: vi.fn(),
  listCapsules: vi.fn(),
  uploadCapsuleFile: vi.fn(),
}))

const createCapsuleMock = vi.mocked(createCapsule)
const uploadCapsuleFileMock = vi.mocked(uploadCapsuleFile)

const DAY = 24 * 60 * 60_000
const user = { id: 'user-1', name: 'Ana Lima', email: 'ana@example.com' }

function daysFromNow(days: number) {
  const date = new Date(Date.now() + days * DAY)
  date.setSeconds(0, 0)
  return toDateTimeLocalValue(date)
}

function createdCapsule(overrides: Partial<Capsule> = {}): Capsule {
  return {
    id: 'capsule-1',
    title: 'Formatura',
    text: 'Mensagem',
    recipientEmail: user.email,
    scheduleDate: new Date(Date.now() + 30 * DAY).toISOString(),
    status: 'SCHEDULED',
    sentAt: null,
    createdAt: new Date().toISOString(),
    files: [],
    ...overrides,
  }
}

function validationError(details: { field: string; message: string }[]) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR', config, undefined, {
    status: 422,
    statusText: '',
    headers: {},
    config,
    data: { status: 'error', code: 'VALIDATION_ERROR', message: 'Dados invalidos', details },
  })
}

function renderPage() {
  return render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={['/capsulas/nova']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>,
  )
}

function change(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function fillCommonFields(scheduleDate = daysFromNow(30)) {
  change('Título', 'Formatura')
  change('Mensagem', 'Mensagem')
  change('Data e hora de entrega', scheduleDate)
}

function chooseGroup() {
  fireEvent.click(screen.getByRole('radio', { name: /Em grupo/ }))
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Lacrar cápsula' }))
}

function mockClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
}

describe('NovaCapsulaPage: group capsule option', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('capsula:auth', JSON.stringify({ token: 'session-token', user }))
    createCapsuleMock.mockReset()
    uploadCapsuleFileMock.mockReset()
    vi.mocked(getCapsule).mockReset().mockReturnValue(new Promise(() => {}))
    vi.mocked(listCapsules).mockReset().mockReturnValue(new Promise(() => {}))
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    cleanup()
    Reflect.deleteProperty(navigator, 'clipboard')
  })

  describe('choosing the type', () => {
    it('starts as individual, without the deadline field', () => {
      renderPage()

      expect(screen.getByRole('radio', { name: /Individual/ })).toBeChecked()
      expect(screen.getByRole('radio', { name: /Em grupo/ })).not.toBeChecked()
      expect(screen.queryByLabelText('Prazo para contribuições')).not.toBeInTheDocument()
    })

    it('shows the deadline field only for group', () => {
      renderPage()

      chooseGroup()
      expect(screen.getByLabelText('Prazo para contribuições')).toHaveAttribute('type', 'datetime-local')

      fireEvent.click(screen.getByRole('radio', { name: /Individual/ }))
      expect(screen.queryByLabelText('Prazo para contribuições')).not.toBeInTheDocument()
    })

    it('limits the deadline picker to the delivery date', () => {
      renderPage()
      const scheduleDate = daysFromNow(30)

      change('Data e hora de entrega', scheduleDate)
      chooseGroup()

      expect(screen.getByLabelText('Prazo para contribuições')).toHaveAttribute('max', scheduleDate)
    })
  })

  describe('individual capsule keeps working as before', () => {
    it('sends the same payload as before, without group fields', async () => {
      createCapsuleMock.mockResolvedValue(createdCapsule())
      renderPage()
      const scheduleDate = daysFromNow(30)

      fillCommonFields(scheduleDate)
      submit()

      await waitFor(() => expect(createCapsuleMock).toHaveBeenCalledTimes(1))
      expect(createCapsuleMock.mock.calls[0][0]).toStrictEqual({
        title: 'Formatura',
        text: 'Mensagem',
        recipientEmail: user.email,
        scheduleDate: new Date(scheduleDate).toISOString(),
      })
    })

    it('goes to the list without showing an invite code', async () => {
      createCapsuleMock.mockResolvedValue(createdCapsule())
      renderPage()

      fillCommonFields()
      submit()

      expect(await screen.findByRole('heading', { name: 'Suas cápsulas' })).toBeInTheDocument()
      expect(screen.getByText('Cápsula agendada!')).toBeInTheDocument()
      expect(screen.queryByText('Código de convite')).not.toBeInTheDocument()
    })

    it('does not send a deadline typed before switching back to individual', async () => {
      createCapsuleMock.mockResolvedValue(createdCapsule())
      renderPage()

      fillCommonFields()
      chooseGroup()
      change('Prazo para contribuições', daysFromNow(-1))
      fireEvent.click(screen.getByRole('radio', { name: /Individual/ }))
      submit()

      await waitFor(() => expect(createCapsuleMock).toHaveBeenCalledTimes(1))
      expect(createCapsuleMock.mock.calls[0][0]).not.toHaveProperty('contributionDeadline')
      expect(createCapsuleMock.mock.calls[0][0]).not.toHaveProperty('type')
    })

    it('still opens the detail when an image upload fails', async () => {
      createCapsuleMock.mockResolvedValue(createdCapsule())
      uploadCapsuleFileMock.mockRejectedValue(new Error('falha'))
      renderPage()

      fillCommonFields()
      fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
        target: { files: [new File(['x'], 'foto.png', { type: 'image/png' })] },
      })
      submit()

      await waitFor(() => expect(getCapsule).toHaveBeenCalledWith('capsule-1', expect.any(AbortSignal)))
      expect(screen.getByText('Cápsula criada, mas algumas imagens não foram enviadas')).toBeInTheDocument()
    })
  })

  describe('invalid deadline shows the error on the field and does not call the API', () => {
    it.each([
      ['empty', () => '', 'Escolha o prazo para contribuições.'],
      ['in the past', () => daysFromNow(-1), 'O prazo para contribuições precisa estar no futuro.'],
      ['after the delivery', () => daysFromNow(31), 'O prazo para contribuições precisa ser antes da data de entrega.'],
      ['equal to the delivery', () => daysFromNow(30), 'O prazo para contribuições precisa ser antes da data de entrega.'],
    ])('%s', async (_label, deadline, message) => {
      renderPage()

      fillCommonFields(daysFromNow(30))
      chooseGroup()
      if (deadline()) change('Prazo para contribuições', deadline())
      submit()

      const field = screen.getByLabelText('Prazo para contribuições')
      expect(await screen.findByText(message)).toBeInTheDocument()
      expect(field).toHaveAttribute('aria-invalid', 'true')
      expect(field).toHaveFocus()
      expect(createCapsuleMock).not.toHaveBeenCalled()
    })

    it('flags the deadline as soon as it is chosen', () => {
      renderPage()

      fillCommonFields()
      chooseGroup()
      change('Prazo para contribuições', daysFromNow(-1))

      expect(screen.getByText('O prazo para contribuições precisa estar no futuro.')).toBeInTheDocument()
    })

    it('revalidates the deadline when the delivery date moves before it', () => {
      renderPage()

      fillCommonFields(daysFromNow(30))
      chooseGroup()
      change('Prazo para contribuições', daysFromNow(10))
      expect(screen.getByLabelText('Prazo para contribuições')).not.toHaveAttribute('aria-invalid')

      change('Data e hora de entrega', daysFromNow(5))
      expect(screen.getByText('O prazo para contribuições precisa ser antes da data de entrega.')).toBeInTheDocument()

      change('Data e hora de entrega', daysFromNow(30))
      expect(screen.getByLabelText('Prazo para contribuições')).not.toHaveAttribute('aria-invalid')
    })

    it('revalidates the deadline when a date shortcut moves the delivery before it', () => {
      renderPage()

      fillCommonFields(daysFromNow(30))
      chooseGroup()
      change('Prazo para contribuições', daysFromNow(10))
      fireEvent.click(screen.getByRole('button', { name: 'Amanhã' }))

      expect(screen.getByText('O prazo para contribuições precisa ser antes da data de entrega.')).toBeInTheDocument()
    })

    it('clears the error when switching back to individual', () => {
      renderPage()

      fillCommonFields()
      chooseGroup()
      change('Prazo para contribuições', daysFromNow(-1))
      fireEvent.click(screen.getByRole('radio', { name: /Individual/ }))
      chooseGroup()

      expect(screen.getByLabelText('Prazo para contribuições')).toHaveValue('')
      expect(screen.getByLabelText('Prazo para contribuições')).not.toHaveAttribute('aria-invalid')
    })
  })

  describe('group capsule', () => {
    function group() {
      return createdCapsule({
        type: 'GROUP',
        contributionDeadline: new Date(Date.now() + 10 * DAY).toISOString(),
        inviteCode: 'ABC123',
      })
    }

    async function createGroup() {
      fillCommonFields()
      chooseGroup()
      change('Prazo para contribuições', daysFromNow(10))
      submit()
      return screen.findByRole('heading', { name: 'Cápsula em grupo criada!' })
    }

    function pickImages(...names: string[]) {
      fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
        target: { files: names.map((name) => new File(['x'], name, { type: 'image/png' })) },
      })
    }

    it('replaces the recipient choice with delivery to all participants', () => {
      renderPage()

      expect(screen.getByRole('radio', { name: /Para mim/ })).toBeInTheDocument()

      chooseGroup()

      expect(screen.queryByRole('radio', { name: /Para mim/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('radio', { name: /Para outra pessoa/ })).not.toBeInTheDocument()
      expect(screen.getByText('todos os participantes')).toBeInTheDocument()
    })

    it('ignores an invalid e-mail typed before switching to group', async () => {
      createCapsuleMock.mockResolvedValue(group())
      renderPage()

      fireEvent.click(screen.getByRole('radio', { name: /Para outra pessoa/ }))
      change('E-mail do destinatário', 'invalido')
      await createGroup()

      expect(createCapsuleMock.mock.calls[0][0]).not.toHaveProperty('recipientEmail')
    })

    it('allows only 1 image', () => {
      renderPage()

      chooseGroup()
      pickImages('um.png', 'dois.png')

      expect(screen.getByRole('img', { name: 'Miniatura de um.png' })).toBeInTheDocument()
      expect(screen.queryByRole('img', { name: 'Miniatura de dois.png' })).not.toBeInTheDocument()
      expect(screen.getByText(/“dois.png” não foi adicionada: o limite é de 1 imagem\./)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Escolher imagens' })).toBeDisabled()
    })

    it('keeps only the first image when switching to group, and warns about it', () => {
      renderPage()

      pickImages('um.png', 'dois.png', 'tres.png')
      expect(screen.getAllByRole('img', { name: /Miniatura/ })).toHaveLength(3)

      chooseGroup()

      expect(screen.getAllByRole('img', { name: /Miniatura/ })).toHaveLength(1)
      expect(screen.getByRole('img', { name: 'Miniatura de um.png' })).toBeInTheDocument()
      expect(screen.getByText('Em grupo, cada pessoa anexa 1 imagem')).toBeInTheDocument()
    })

    it('keeps up to 5 images on an individual capsule', () => {
      renderPage()

      pickImages('um.png', 'dois.png', 'tres.png', 'quatro.png', 'cinco.png')

      expect(screen.getAllByRole('img', { name: /Miniatura/ })).toHaveLength(5)
    })

    it('sends type and contributionDeadline in UTC, without a recipient', async () => {
      createCapsuleMock.mockResolvedValue(group())
      renderPage()
      const scheduleDate = daysFromNow(30)
      const deadline = daysFromNow(10)

      fillCommonFields(scheduleDate)
      chooseGroup()
      change('Prazo para contribuições', deadline)
      submit()

      await waitFor(() => expect(createCapsuleMock).toHaveBeenCalledTimes(1))
      expect(createCapsuleMock.mock.calls[0][0]).toStrictEqual({
        title: 'Formatura',
        text: 'Mensagem',
        scheduleDate: new Date(scheduleDate).toISOString(),
        type: 'GROUP',
        contributionDeadline: new Date(deadline).toISOString(),
      })
      expect(createCapsuleMock.mock.calls[0][0].contributionDeadline).toMatch(/Z$/)
    })

    it('shows the invite code at the end, with links to continue', async () => {
      createCapsuleMock.mockResolvedValue(group())
      renderPage()

      await createGroup()

      expect(screen.getByText('ABC123')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Ver cápsula' })).toHaveAttribute('href', '/capsulas/capsule-1')
      expect(within(screen.getByRole('main')).getByRole('link', { name: 'Minhas cápsulas' })).toHaveAttribute('href', '/capsulas')
      expect(screen.queryByRole('button', { name: 'Lacrar cápsula' })).not.toBeInTheDocument()
    })

    it('copies the invite code', async () => {
      const writeText = vi.fn(async () => {})
      mockClipboard(writeText)
      createCapsuleMock.mockResolvedValue(group())
      renderPage()

      await createGroup()
      fireEvent.click(screen.getByRole('button', { name: 'Copiar código' }))

      await waitFor(() => expect(writeText).toHaveBeenCalledWith('ABC123'))
      expect(await screen.findByRole('button', { name: 'Copiado!' })).toBeInTheDocument()
      expect(screen.getByText('Código copiado!')).toBeInTheDocument()
    })

    it('reports when the code cannot be copied, keeping it visible', async () => {
      mockClipboard(async () => {
        throw new Error('negado')
      })
      createCapsuleMock.mockResolvedValue(group())
      renderPage()

      await createGroup()
      fireEvent.click(screen.getByRole('button', { name: 'Copiar código' }))

      expect(await screen.findByText('Não foi possível copiar o código')).toBeInTheDocument()
      expect(screen.getByText('ABC123')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Copiar código' })).toBeInTheDocument()
    })

    it('reports a browser without clipboard support', async () => {
      createCapsuleMock.mockResolvedValue(group())
      renderPage()

      await createGroup()
      fireEvent.click(screen.getByRole('button', { name: 'Copiar código' }))

      expect(await screen.findByText('Não foi possível copiar o código')).toBeInTheDocument()
    })

    it('still shows the invite code when an image upload fails', async () => {
      createCapsuleMock.mockResolvedValue(group())
      uploadCapsuleFileMock.mockRejectedValue(new Error('falha'))
      renderPage()

      fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
        target: { files: [new File(['x'], 'foto.png', { type: 'image/png' })] },
      })
      await createGroup()

      expect(screen.getByText('ABC123')).toBeInTheDocument()
      expect(screen.getByText('Cápsula criada, mas algumas imagens não foram enviadas')).toBeInTheDocument()
    })

    it('falls back to the list if the API does not return a code', async () => {
      createCapsuleMock.mockResolvedValue(createdCapsule({ type: 'GROUP', inviteCode: null }))
      renderPage()

      fillCommonFields()
      chooseGroup()
      change('Prazo para contribuições', daysFromNow(10))
      submit()

      expect(await screen.findByRole('heading', { name: 'Suas cápsulas' })).toBeInTheDocument()
    })

    it('shows a deadline rejected by the API on the field', async () => {
      createCapsuleMock.mockRejectedValue(
        validationError([{ field: 'contributionDeadline', message: 'Prazo rejeitado pela API' }]),
      )
      renderPage()

      fillCommonFields()
      chooseGroup()
      change('Prazo para contribuições', daysFromNow(10))
      submit()

      expect(await screen.findByText('Prazo rejeitado pela API')).toBeInTheDocument()
      expect(screen.getByLabelText('Prazo para contribuições')).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByText('Revise os campos destacados.')).toBeInTheDocument()
    })

    it('shows the API message when the invalid field has no input on the form', async () => {
      createCapsuleMock.mockRejectedValue(validationError([{ field: 'type', message: 'Campo nao permitido' }]))
      renderPage()

      fillCommonFields()
      chooseGroup()
      change('Prazo para contribuições', daysFromNow(10))
      submit()

      const alert = await screen.findByText('Não foi possível criar a cápsula')
      expect(within(alert.closest('.toast') as HTMLElement).getByText('Dados invalidos')).toBeInTheDocument()
      expect(screen.queryByText('Revise os campos destacados.')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Lacrar cápsula' })).toBeEnabled()
    })
  })
})
