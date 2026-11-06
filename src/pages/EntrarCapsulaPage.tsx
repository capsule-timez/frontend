import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ButtonLink } from '../components/Button/Button'
import { Card } from '../components/Card/Card'
import { FormField } from '../components/FormField/FormField'
import { PageHeader } from '../components/PageHeader/PageHeader'
import { useToast } from '../contexts/ToastContext'
import { getApiErrorDetails, joinCapsule } from '../services/capsuleService'
import './EntrarCapsulaPage.css'

const CODE_FIELD_ID = 'capsule-invite-code'

export function EntrarCapsulaPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const inviteCode = code.trim()
    if (!inviteCode) {
      setError('Informe o código de convite.')
      document.getElementById(CODE_FIELD_ID)?.focus()
      return
    }

    setError(undefined)
    setIsSubmitting(true)
    try {
      const capsule = await joinCapsule(inviteCode)
      toast.success('Você entrou na cápsula!')
      navigate(`/capsulas/${encodeURIComponent(capsule.id)}`)
    } catch (err) {
      const details = getApiErrorDetails(err)
      toast.error(details.message)
      setError(details.fieldErrors.inviteCode)
      setIsSubmitting(false)
    }
  }

  return (
    <section className="entrar-capsula page-enter">
      <ButtonLink to="/capsulas" variant="ghost">Voltar para cápsulas</ButtonLink>
      <PageHeader
        title="Entrar em uma cápsula"
        description="Recebeu um código de convite? Use-o para participar de uma cápsula em grupo."
      />
      <Card className="entrar-capsula__card">
        <form className="entrar-capsula__form" onSubmit={handleSubmit} noValidate>
          <FormField
            id={CODE_FIELD_ID}
            name="inviteCode"
            label="Código de convite"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={code}
            error={error}
            onChange={(event) => {
              setCode(event.target.value)
              setError(undefined)
            }}
          />
          <div className="entrar-capsula__actions">
            <Button type="submit" icon="users" loading={isSubmitting}>
              {isSubmitting ? 'Entrando…' : 'Entrar na cápsula'}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  )
}
