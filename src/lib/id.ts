export function uid(prefix = ''): string {
  const rnd = Math.random().toString(36).slice(2, 10)
  return `${prefix}${Date.now().toString(36)}${rnd}`
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** รหัสเพื่อน 6 ตัวอักษร เช่น RUN-7KQ2 */
export function friendCode(): string {
  let out = ''
  for (let i = 0; i < 4; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return `RUN-${out}`
}

export function normalizeCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, '')
  if (cleaned.startsWith('RUN-')) return cleaned
  return `RUN-${cleaned.replace(/^RUN/, '')}`
}
