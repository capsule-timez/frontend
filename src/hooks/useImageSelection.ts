import { useCallback, useEffect, useRef, useState } from 'react'
import { getApiErrorDetails, uploadCapsuleFile } from '../services/capsuleService'
import { validateImage } from '../utils/imageValidation'

export type ImageStatus = 'pending' | 'uploading' | 'error'

export interface SelectedImage {
  key: string
  file: File
  previewUrl: string
  status: ImageStatus
  error?: string
}

/**
 * Controla as imagens escolhidas para uma cápsula: valida ao adicionar, gera
 * miniaturas e envia uma a uma. Imagens enviadas com sucesso saem da lista; as
 * que falharam ficam, com o erro da API, para nova tentativa.
 */
export function useImageSelection(maxFiles: number) {
  const [items, setItems] = useState<SelectedImage[]>([])
  const [rejections, setRejections] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const itemsRef = useRef<SelectedImage[]>([])
  const nextKey = useRef(0)

  const commit = useCallback((next: SelectedImage[]) => {
    itemsRef.current = next
    setItems(next)
  }, [])

  // Libera as URLs de miniatura ao desmontar.
  useEffect(
    () => () => {
      for (const item of itemsRef.current) URL.revokeObjectURL(item.previewUrl)
    },
    [],
  )

  const add = useCallback(
    (fileList: FileList | File[]) => {
      const accepted: SelectedImage[] = []
      const messages: string[] = []
      let slots = maxFiles - itemsRef.current.length

      for (const file of Array.from(fileList)) {
        const problem = validateImage(file)
        if (problem) {
          messages.push(problem)
        } else if (slots <= 0) {
          messages.push(`“${file.name}” não foi adicionada: o limite é de ${maxFiles} imagens por cápsula.`)
        } else {
          slots -= 1
          accepted.push({
            key: String(nextKey.current++),
            file,
            previewUrl: URL.createObjectURL(file),
            status: 'pending',
          })
        }
      }

      setRejections(messages)
      if (accepted.length > 0) commit([...itemsRef.current, ...accepted])
    },
    [maxFiles, commit],
  )

  const remove = useCallback(
    (key: string) => {
      const removed = itemsRef.current.find((item) => item.key === key)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      commit(itemsRef.current.filter((item) => item.key !== key))
      setRejections([])
    },
    [commit],
  )

  const patch = useCallback(
    (key: string, changes: Partial<SelectedImage>) => {
      commit(itemsRef.current.map((item) => (item.key === key ? { ...item, ...changes } : item)))
    },
    [commit],
  )

  /** Envia as imagens da lista em sequência; devolve quantas foram e quantas falharam. */
  const upload = useCallback(
    async (capsuleId: string): Promise<{ sent: number; failed: number }> => {
      setIsUploading(true)
      setRejections([])
      let sent = 0
      let failed = 0
      for (const { key, file } of [...itemsRef.current]) {
        patch(key, { status: 'uploading', error: undefined })
        try {
          await uploadCapsuleFile(capsuleId, file)
          const done = itemsRef.current.find((item) => item.key === key)
          if (done) URL.revokeObjectURL(done.previewUrl)
          commit(itemsRef.current.filter((item) => item.key !== key))
          sent += 1
        } catch (error) {
          patch(key, { status: 'error', error: getApiErrorDetails(error).message })
          failed += 1
        }
      }
      setIsUploading(false)
      return { sent, failed }
    },
    [commit, patch],
  )

  return { items, rejections, isUploading, add, remove, upload }
}
