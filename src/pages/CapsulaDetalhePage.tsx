import axios from 'axios'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../components/Badge/Badge'
import { Button, ButtonLink } from '../components/Button/Button'
import { Card } from '../components/Card/Card'
import { CapsuleContribution } from '../components/CapsuleContribution/CapsuleContribution'
import { CapsuleEditForm } from '../components/CapsuleEditForm/CapsuleEditForm'
import { CapsuleInvites } from '../components/CapsuleInvites/CapsuleInvites'
import { CapsuleStatusBadge } from '../components/CapsuleStatusBadge/CapsuleStatusBadge'
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { ImagePicker } from '../components/ImagePicker/ImagePicker'
import { InviteCode } from '../components/InviteCode/InviteCode'
import { PageHeader } from '../components/PageHeader/PageHeader'
import { useToast } from '../contexts/ToastContext'
import { useImageSelection } from '../hooks/useImageSelection'
import { deleteCapsule, getApiErrorDetails, getCapsule } from '../services/capsuleService'
import type { Capsule } from '../types/capsule'
import { isGroupCapsule, isGroupOwner } from '../utils/capsuleGroup'
import { formatDateTime } from '../utils/formatDate'
import { MAX_IMAGES_PER_CAPSULE } from '../utils/imageValidation'
import './CapsulaDetalhePage.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'success'; capsule: Capsule }
  | { status: 'not-found' }
  | { status: 'error'; message: string }

export function CapsulaDetalhePage() {
  const { id = '' } = useParams()
  // Remount on navigation so another capsule's content is never displayed while loading.
  return <CapsulaDetalhe key={id} id={id} />
}

function CapsulaDetalhe({ id }: { id: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const isGroup = state.status === 'success' && isGroupCapsule(state.capsule)
  const isOwner = state.status === 'success' && isGroupOwner(state.capsule)
  // Na cápsula individual, quem vê o detalhe é sempre quem a criou.
  const canManage = !isGroup || isOwner
  const attachedCount = state.status === 'success' ? state.capsule.files.length : 0
  // As imagens já anexadas ocupam vagas do limite por cápsula.
  const images = useImageSelection(MAX_IMAGES_PER_CAPSULE - attachedCount)

  async function refreshCapsule() {
    const capsule = await getCapsule(id)
    setState({ status: 'success', capsule })
  }

  async function handleEditDone(notEditable?: boolean) {
    setEditing(false)
    if (notEditable) {
      setState({ status: 'loading' })
      setAttempt((value) => value + 1)
      return
    }
    try {
      await refreshCapsule()
    } catch (error) {
      toast.error('Alterações salvas, mas não foi possível atualizar a cápsula', {
        description: getApiErrorDetails(error).message,
      })
    }
  }

  async function handleUpload() {
    const { sent, failed } = await images.upload(id)
    if (sent > 0) {
      // Atualiza só os anexos, sem voltar para a tela de carregamento.
      try {
        await refreshCapsule()
      } catch (error) {
        toast.error('Imagens enviadas, mas não foi possível atualizar a cápsula', {
          description: getApiErrorDetails(error).message,
        })
      }
    }
    if (failed === 0 && sent > 0) {
      toast.success(sent === 1 ? 'Imagem anexada!' : `${sent} imagens anexadas!`)
    } else if (failed > 0) {
      toast.error(`${failed} ${failed === 1 ? 'imagem não foi enviada' : 'imagens não foram enviadas'}`, {
        description: 'Veja o erro em cada miniatura e tente novamente.',
      })
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteCapsule(id)
      toast.success('Cápsula excluída com sucesso.')
      navigate('/capsulas')
    } catch (error) {
      const { code, message } = getApiErrorDetails(error)
      toast.error(message)
      setDeleting(false)
      setConfirmingDelete(false)
      // Status mudou (ex.: já enviada) ou a cápsula sumiu: recarrega para refletir o estado real.
      if (code === 'CAPSULE_NOT_EDITABLE' || code === 'NOT_FOUND') {
        setState({ status: 'loading' })
        setAttempt((value) => value + 1)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    getCapsule(id, controller.signal)
      .then((capsule) => {
        if (!controller.signal.aborted) setState({ status: 'success', capsule })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setState({ status: 'not-found' })
        } else {
          setState({ status: 'error', message: getApiErrorDetails(error).message })
        }
      })
    return () => controller.abort()
  }, [id, attempt])

  return (
    <section className="capsula-detalhe page-enter">
      <ButtonLink to="/capsulas" variant="ghost">Voltar para cápsulas</ButtonLink>
      {state.status === 'loading' && <p role="status" aria-busy="true">Carregando cápsula…</p>}
      {state.status === 'not-found' && (
        <EmptyState icon="alert" title="Cápsula não encontrada" />
      )}
      {state.status === 'error' && (
        <EmptyState
          icon="alert"
          title="Não foi possível carregar a cápsula"
          description={state.message}
          action={<Button variant="secondary" onClick={() => {
            setState({ status: 'loading' })
            setAttempt((value) => value + 1)
          }}>Tentar novamente</Button>}
        />
      )}
      {state.status === 'success' && (
        <>
          <PageHeader title={state.capsule.title} />
          {editing ? (
            <CapsuleEditForm capsule={state.capsule} onCancel={() => setEditing(false)} onDone={handleEditDone} />
          ) : (
            <Card className="capsula-detalhe__content">
              <dl className="capsula-detalhe__meta">
                <div><dt>Destinatário</dt><dd>{state.capsule.recipientEmail}</dd></div>
                <div><dt>Data de entrega</dt><dd><time dateTime={state.capsule.scheduleDate}>{formatDateTime(state.capsule.scheduleDate)}</time></dd></div>
                <div><dt>Status</dt><dd><CapsuleStatusBadge status={state.capsule.status} /></dd></div>
                {isGroup && <div><dt>Tipo</dt><dd><Badge tone="info" icon="users">Grupo</Badge></dd></div>}
                {isGroup && state.capsule.contributionDeadline && (
                  <div><dt>Prazo para contribuições</dt><dd><time dateTime={state.capsule.contributionDeadline}>{formatDateTime(state.capsule.contributionDeadline)}</time></dd></div>
                )}
              </dl>
              <h2>Mensagem</h2>
              <p className="capsula-detalhe__message">{state.capsule.text}</p>
            </Card>
          )}
          {isOwner && <CapsuleInvites capsule={state.capsule} />}
          {isOwner && state.capsule.inviteCode && (
            <Card className="capsula-detalhe__content">
              <h2>Convide participantes</h2>
              <InviteCode code={state.capsule.inviteCode} />
            </Card>
          )}
          {isGroup && (
            <Card className="capsula-detalhe__content">
              <h2>Participantes</h2>
              {!state.capsule.participants?.length ? <p>Nenhum participante nesta cápsula.</p> : (
                <ul className="capsula-detalhe__participants">
                  {state.capsule.participants.map((participant, index) => (
                    <li key={`${participant.role}-${index}`}>
                      {participant.name}
                      {participant.role === 'OWNER' && <Badge tone="warning">Criador</Badge>}
                      {participant.hasContributed && <Badge tone="success" icon="check">Contribuiu</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
          {isGroup && <CapsuleContribution capsule={state.capsule} onContributed={refreshCapsule} />}
          {(canManage || state.capsule.files.length > 0) && (
            <Card className="capsula-detalhe__content">
              <h2>Anexos</h2>
              {state.capsule.files.length === 0 ? <p>Nenhum anexo nesta cápsula.</p> : (
                <ul className="capsula-detalhe__files">
                  {state.capsule.files.map((file) => (
                    <li key={file.id}>
                      {file.mimeType.startsWith('image/') && (
                        <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            className="capsula-detalhe__image"
                            src={file.downloadUrl}
                            alt={file.fileName}
                            loading="lazy"
                          />
                        </a>
                      )}
                      <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer">{file.fileName}</a>
                      <span> ({new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(file.fileSize / 1024)} KB)</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
          {canManage && state.capsule.status === 'SCHEDULED' && attachedCount < MAX_IMAGES_PER_CAPSULE && (
            <Card className="capsula-detalhe__content">
              <h2>Adicionar imagens</h2>
              <ImagePicker
                items={images.items}
                rejections={images.rejections}
                maxFiles={MAX_IMAGES_PER_CAPSULE - attachedCount}
                disabled={images.isUploading}
                onAdd={images.add}
                onRemove={images.remove}
              />
              {images.items.length > 0 && (
                <div className="capsula-detalhe__upload">
                  <Button icon="send" loading={images.isUploading} onClick={() => void handleUpload()}>
                    {images.isUploading ? 'Enviando…' : 'Enviar imagens'}
                  </Button>
                </div>
              )}
            </Card>
          )}
          {state.capsule.status === 'SCHEDULED' && canManage && !editing && (
            <div className="capsula-detalhe__actions">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Editar cápsula
              </Button>
              <Button variant="danger" icon="trash" onClick={() => setConfirmingDelete(true)}>
                Excluir cápsula
              </Button>
            </div>
          )}
          <ConfirmDialog
            open={confirmingDelete}
            title="Excluir esta cápsula?"
            description="A cápsula e seus anexos serão removidos e ela não será mais enviada. Esta ação não pode ser desfeita."
            confirmLabel="Excluir"
            loading={deleting}
            onConfirm={() => void handleDelete()}
            onCancel={() => setConfirmingDelete(false)}
          />
        </>
      )}
    </section>
  )
}
