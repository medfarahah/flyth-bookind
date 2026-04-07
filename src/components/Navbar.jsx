import { Link } from 'react-router-dom'
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/react'

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md transition-shadow duration-300">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90"
        >
          <img
            src="/logo.png"
            alt="fly frend"
            className="h-9 w-auto max-h-10 max-w-[min(100vw-8rem,11rem)] object-contain object-left"
            width={176}
            height={40}
            decoding="async"
          />
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <Show when="signed-in">
            <Link
              to="/bookings"
              className="rounded-full px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              My bookings
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-9 w-9 ring-2 ring-slate-200',
                },
              }}
            />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                className="rounded-full px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Log in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                type="button"
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700"
              >
                Sign up
              </button>
            </SignUpButton>
          </Show>
        </nav>
      </div>
    </header>
  )
}
