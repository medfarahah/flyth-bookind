import { useEffect } from 'react'
import { useAuth } from '@clerk/react'
import { setClerkTokenGetter } from '../api/client.js'

/**
 * Sends Clerk session JWTs on API requests (see server requireAuth).
 */
export function ClerkTokenBridge() {
  const { getToken, isSignedIn } = useAuth()

  useEffect(() => {
    setClerkTokenGetter(async () => {
      if (!isSignedIn) return null
      try {
        return await getToken({ skipCache: true })
      } catch {
        return null
      }
    })
    return () => setClerkTokenGetter(null)
  }, [getToken, isSignedIn])

  return null
}
