import { SignUp } from '@clerk/react'
import { useLocation } from 'react-router-dom'

export function SignUpPage() {
  const location = useLocation()
  const from = location.state?.from
  const redirectPath = from?.pathname
    ? `${from.pathname}${from.search || ''}${from.hash || ''}`
    : '/'

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-gradient-to-b from-blue-50/60 to-white px-4 py-12">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl={redirectPath}
      />
    </div>
  )
}
