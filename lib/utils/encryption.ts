import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

// Use a dedicated ENCRYPTION_KEY if available, fallback to NEXTAUTH_SECRET, otherwise error
const SECRET_KEY = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET

function getKey(): Buffer {
  if (!SECRET_KEY) {
    throw new Error('Missing ENCRYPTION_KEY or NEXTAUTH_SECRET for database encryption.')
  }
  // Ensure the key is exactly 32 bytes for AES-256
  return crypto.scryptSync(SECRET_KEY, 'salt', 32)
}

/**
 * Encrypts a plaintext string and returns it in the format: iv:authTag:encryptedData
 */
export function encryptToken(text: string | null | undefined): string | null {
  if (!text) return null

  try {
    const iv = crypto.randomBytes(16)
    const key = getKey()
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag().toString('hex')
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`
  } catch (err) {
    console.error('[encryption] Failed to encrypt text:', err)
    return null
  }
}

/**
 * Decrypts an encrypted string created by encryptToken
 */
export function decryptToken(encryptedText: string | null | undefined): string | null {
  if (!encryptedText) return null

  // If the text doesn't look like our encrypted format, it might be legacy plaintext
  if (!encryptedText.includes(':')) {
    return encryptedText
  }

  try {
    const parts = encryptedText.split(':')
    if (parts.length !== 3) {
      return encryptedText // Fallback for plain tokens that happen to have colons
    }

    const [ivHex, authTagHex, encryptedHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const encryptedData = Buffer.from(encryptedHex, 'hex')

    const key = getKey()
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedData)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
  } catch (err) {
    console.error('[encryption] Failed to decrypt text:', err)
    // Return original string instead of erroring, to prevent hard crashes for legacy tokens
    return encryptedText
  }
}
