import { useState } from 'react'
import { authenticateUser } from '../features/auth/auth.js'

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-[1.15rem] w-[1.15rem] -translate-y-1/2 fill-none stroke-[#8a9aac] stroke-[1.7] stroke-linecap-round stroke-linejoin-round">
      <path d="M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-[1.15rem] w-[1.15rem] -translate-y-1/2 fill-none stroke-[#8a9aac] stroke-[1.7] stroke-linecap-round stroke-linejoin-round">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </svg>
  )
}

function EyeIcon({ isVisible }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.7] stroke-linecap-round stroke-linejoin-round">
      {isVisible ? (
        <>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      ) : (
        <>
          <path d="m3 3 18 18M10.6 6.2A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a18.7 18.7 0 0 1-3.1 3.8M6.2 6.8C3.5 8.6 2 12 2 12s3.5 6 10 6c1.4 0 2.7-.3 3.8-.8" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </>
      )}
    </svg>
  )
}

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const user = await authenticateUser(username, password)
      window.location.assign(`/dashboard/${user.role}`)
    } catch (loginError) {
      if (loginError.status === 422 || loginError.status === 401) {
        setError('Invalid username or password.')
      } else {
        setError('Unable to connect to the server. Please try again.')
      }
      setIsLoading(false)
    }
  }

  function handleInvalid(event) {
    if (!event.currentTarget.checkValidity()) {
      setError('Invalid username or password.')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_12%_8%,rgba(233,185,73,0.12),transparent_30%),linear-gradient(135deg,#f3f7fb_0%,#e8f0f8_100%)] p-6">
      <div className="w-full max-w-[28rem] rounded-2xl border border-white/80 bg-white/[0.96] p-11 shadow-[0_1.5rem_3.5rem_rgba(16,45,84,0.14)] max-[480px]:px-6 max-[480px]:py-8">
        <div className="mb-8 flex min-h-[4.5rem] items-center justify-center">
          <img src="/images/berhan.png" alt="Berhan Bank" className="block max-h-[4.5rem] max-w-[13rem] object-contain" />
        </div>
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-[1.75rem] font-bold leading-tight text-[#102d54]">Welcome</h1>
          <p className="text-[0.9rem] text-[#718096]">Service Desk Information Management System</p>
        </div>

        <form className="flex flex-col" onSubmit={handleSubmit} onInvalid={handleInvalid}>
          <label className="mb-2 text-sm font-semibold text-[#1f2937]" htmlFor="username">Username</label>
          <div className="relative mb-5">
            <UserIcon />
            <input id="username" name="username" type="text" autoComplete="username" placeholder="Enter your username" value={username} onChange={(event) => setUsername(event.target.value)} required className="min-h-12 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] py-3 pl-[2.85rem] pr-4 text-[0.9rem] text-[#1f2937] outline-none transition focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14] placeholder:text-[#a4afbd]" />
          </div>

          <label className="mb-2 text-sm font-semibold text-[#1f2937]" htmlFor="password">Password</label>
          <div className="relative mb-3">
            <LockIcon />
            <input id="password" name="password" type={isPasswordVisible ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required className="min-h-12 w-full rounded-lg border border-[#dce4ee] bg-[#fbfcfe] py-3 pl-[2.85rem] pr-12 text-[0.9rem] text-[#1f2937] outline-none transition focus:border-[#1d5b9e] focus:ring-[3px] focus:ring-[#1d5b9e]/[0.14] placeholder:text-[#a4afbd]" />
            <button type="button" onClick={() => setIsPasswordVisible((visible) => !visible)} aria-label={isPasswordVisible ? 'Hide password' : 'Show password'} aria-pressed={isPasswordVisible} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#718096] transition hover:text-[#1d5b9e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e9b949] focus-visible:outline-offset-1">
              <EyeIcon isVisible={isPasswordVisible} />
            </button>
          </div>
          {error && <p className="mb-5 text-sm font-medium text-[#c2413b]" role="alert">{error}</p>}

          <button type="submit" disabled={isLoading} className="min-h-12 rounded-lg border-0 bg-[#102d54] text-[0.95rem] font-bold text-white transition hover:bg-[#1d5b9e] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e9b949] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-70">
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default LoginPage
