import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')

if (ENCRYPTION_KEY.length !== 64) { // 32 bytes * 2 for hex
  console.warn('ENCRYPTION_KEY environment variable should be a 64-character hexadecimal string. Generating a new key for this session (DO NOT USE IN PRODUCTION).')
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const tag = cipher.getAuthTag()
  return iv.toString('hex') + ':' + encrypted + ':' + tag.toString('hex')
}

export function decrypt(text: string): string {
  const parts = text.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted string format')
  }

  const iv = Buffer.from(parts[0], 'hex')
  const encryptedText = parts[1]
  const tag = Buffer.from(parts[2], 'hex')
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
  decipher.setAuthTag(tag)
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
