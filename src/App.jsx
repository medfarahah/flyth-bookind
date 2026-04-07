import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { ClerkTokenBridge } from './components/ClerkTokenBridge.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { HomePage } from './pages/HomePage'
import { ResultsPage } from './pages/ResultsPage'
import { BookingPage } from './pages/BookingPage'
import { SignInPage } from './pages/SignInPage.jsx'
import { SignUpPage } from './pages/SignUpPage.jsx'
import { MyBookingsPage } from './pages/MyBookingsPage.jsx'

function Layout({ children }) {
  return (
    <div className="min-h-dvh font-sans text-slate-800 antialiased">
      <Navbar />
      <main>{children}</main>
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        <p>Flyth — Clerk + Express + PostgreSQL.</p>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ClerkTokenBridge />
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route
            path="/booking"
            element={
              <ProtectedRoute>
                <BookingPage />
              </ProtectedRoute>
            }
          />
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route path="/login" element={<Navigate to="/sign-in" replace />} />
          <Route path="/register" element={<Navigate to="/sign-up" replace />} />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <MyBookingsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
