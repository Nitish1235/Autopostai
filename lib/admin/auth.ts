import { cookies } from 'next/headers'
import { createHmac } from 'crypto'

const ADMIN_COOKIE = 'admin_token'
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function getSecret(): string {
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
    if (!secret) {
        throw new Error('[ADMIN AUTH] AUTH_SECRET or NEXTAUTH_SECRET env var is required')
    }
    return secret
}

// ── Create signed admin token ────────────────────────

export function createAdminToken(): string {
    const payload = JSON.stringify({
        role: 'admin',
        iat: Date.now(),
    })
    const hmac = createHmac('sha256', getSecret())
    hmac.update(payload)
    const signature = hmac.digest('hex')
    const token = Buffer.from(payload).toString('base64') + '.' + signature
    return token
}

// ── Verify admin token ───────────────────────────────

export function verifyAdminToken(token: string): boolean {
    try {
        const [payloadB64, signature] = token.split('.')
        if (!payloadB64 || !signature) return false

        const payload = Buffer.from(payloadB64, 'base64').toString('utf-8')
        const hmac = createHmac('sha256', getSecret())
        hmac.update(payload)
        const expectedSignature = hmac.digest('hex')

        if (signature !== expectedSignature) return false

        const data = JSON.parse(payload)
        if (data.role !== 'admin') return false

        // Check if token is expired (7 days)
        if (Date.now() - data.iat > TOKEN_MAX_AGE * 1000) return false

        return true
    } catch {
        return false
    }
}

// ── Check admin auth from request ────────────────────

export async function isAdminAuthenticated(): Promise<boolean> {
    const cookieStore = await cookies()
    const token = cookieStore.get(ADMIN_COOKIE)?.value
    if (!token) return false
    return verifyAdminToken(token)
}

// ── Validate credentials ─────────────────────────────

export function validateAdminCredentials(
    username: string,
    password: string
): boolean {
    const validUser = process.env.ADMIN_USERNAME
    const validPass = process.env.ADMIN_PASSWORD
    if (!validUser || !validPass) {
        throw new Error('[ADMIN AUTH] ADMIN_USERNAME and ADMIN_PASSWORD env vars are required')
    }
    return username === validUser && password === validPass
}

export { ADMIN_COOKIE, TOKEN_MAX_AGE }
