export const MAX_IMAGES_PER_CAPSULE = 5
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Valida tipo e tamanho antes de enviar; devolve a mensagem de erro ou `null`. */
export function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `“${file.name}” não é um tipo aceito. Use JPEG, PNG ou WebP.`
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `“${file.name}” excede o limite de 10 MB.`
  }
  if (file.size === 0) {
    return `“${file.name}” está vazio.`
  }
  return null
}
