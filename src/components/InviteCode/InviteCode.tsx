import { useEffect, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { Button } from '../Button/Button'
import './InviteCode.css'

const COPIED_FEEDBACK_MS = 2000

export function InviteCode({ code }: { code: string }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success('Código copiado!')
    } catch {
      toast.error('Não foi possível copiar o código', {
        description: 'Selecione o código e copie manualmente.',
      })
    }
  }

  return (
    <div className="invite-code">
      <div className="invite-code__text">
        <span className="invite-code__label">Código de convite</span>
        <code className="invite-code__value">{code}</code>
      </div>
      <Button variant="secondary" icon={copied ? 'check' : 'copy'} onClick={() => void handleCopy()}>
        {copied ? 'Copiado!' : 'Copiar código'}
      </Button>
    </div>
  )
}
