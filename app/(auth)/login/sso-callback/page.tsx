'use client'

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

// ── SSO Callback Page ─────────────────────────────────
// Clerk redirects here after Google/OAuth sign-in.
// AuthenticateWithRedirectCallback handles the token exchange
// and then redirects the user to the dashboard.

export default function SSOCallbackPage() {
  return (
    <AuthenticateWithRedirectCallback
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    />
  )
}
