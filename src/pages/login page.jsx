import { useState } from 'react'
import { authenticateUser } from '../features/auth/auth.js'

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-[1.15rem] w-[1.15rem] -translate-y-1/2 fill-none stroke-[#9aa8b8] stroke-[1.7] stroke-linecap-round stroke-linejoin-round transition-colors duration-300 peer-focus:stroke-[#1d5b9e]">
      <path d="M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-[1.15rem] w-[1.15rem] -translate-y-1/2 fill-none stroke-[#9aa8b8] stroke-[1.7] stroke-linecap-round stroke-linejoin-round transition-colors duration-300 peer-focus:stroke-[#1d5b9e]">
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
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_15%_10%,rgba(247,148,29,0.16),transparent_32%),radial-gradient(circle_at_90%_95%,rgba(29,91,158,0.14),transparent_35%),linear-gradient(145deg,#f6f9fc_0%,#e6eef7_100%)] p-6 font-['Inter','Plus_Jakarta_Sans','Segoe_UI',system-ui,sans-serif] antialiased [text-rendering:optimizeLegibility]">
      <div className="grid w-full max-w-[56rem] overflow-hidden rounded-3xl border border-white bg-white shadow-[0_2rem_4rem_-1rem_rgba(16,45,84,0.18),0_0_0_1px_rgba(16,45,84,0.04)] md:grid-cols-[1fr_1.05fr]">
        <section className="relative flex flex-col justify-center overflow-hidden bg-[linear-gradient(160deg,#0f3d7a_0%,#1d5b9e_100%)] px-10 py-12 text-left max-md:py-10 md:px-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#f7941d]/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="mb-6 h-1 w-12 rounded-full bg-[#f7941d]" />
            <h1 className="mb-3 text-[2.2rem] font-semibold leading-tight tracking-[-0.02em] text-white">Welcome Back</h1>
            <p className="max-w-[18rem] text-[1rem] font-normal leading-relaxed tracking-[0.005em] text-white/75">Service Desk Information Management System</p>
          </div>
        </section>

        <section className="flex flex-col justify-center p-11 max-[480px]:px-6 max-[480px]:py-9">
          <div className="mb-9 flex min-h-[4.5rem] items-center justify-center">
            <img src="/images/berhan.png" alt="Berhan Bank" className="block max-h-[4.5rem] max-w-[13rem] object-contain" />
          </div>

          <form className="flex flex-col" onSubmit={handleSubmit} onInvalid={handleInvalid}>
            <label className="mb-2 text-[0.85rem] font-medium tracking-[0.01em] text-[#102d54]" htmlFor="username">Username</label>
            <div className="relative mb-5">
              <input id="username" name="username" type="text" autoComplete="username" placeholder="Enter your username" value={username} onChange={(event) => setUsername(event.target.value)} required className="peer min-h-[3.1rem] w-full rounded-xl border border-[#e1e8f0] bg-[#f8fafc] py-3 pl-[2.85rem] pr-4 text-[0.92rem] text-[#102d54] outline-none transition-all duration-300 hover:border-[#c9d6e4] focus:border-[#1d5b9e] focus:bg-white focus:ring-4 focus:ring-[#f7941d]/20 placeholder:text-[#a9b4c2]" />
              <UserIcon />
            </div>

            <label className="mb-2 text-[0.85rem] font-medium tracking-[0.01em] text-[#102d54]" htmlFor="password">Password</label>
            <div className="relative mb-4">
              <input id="password" name="password" type={isPasswordVisible ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required className="peer min-h-[3.1rem] w-full rounded-xl border border-[#e1e8f0] bg-[#f8fafc] py-3 pl-[2.85rem] pr-12 text-[0.92rem] text-[#102d54] outline-none transition-all duration-300 hover:border-[#c9d6e4] focus:border-[#1d5b9e] focus:bg-white focus:ring-4 focus:ring-[#f7941d]/20 placeholder:text-[#a9b4c2]" />
              <LockIcon />
              <button type="button" onClick={() => setIsPasswordVisible((visible) => !visible)} aria-label={isPasswordVisible ? 'Hide password' : 'Show password'} aria-pressed={isPasswordVisible} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#8695a7] transition-all duration-300 hover:bg-[#eef3f9] hover:text-[#1d5b9e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f7941d] focus-visible:outline-offset-1">
                <EyeIcon isVisible={isPasswordVisible} />
              </button>
            </div>
            {error && <p className="mb-5 rounded-lg bg-[#fdf1f0] px-3.5 py-2.5 text-[0.85rem] font-medium text-[#c2413b]" role="alert">{error}</p>}

            <button type="submit" disabled={isLoading} className="mt-2 min-h-[3.1rem] rounded-xl border-0 bg-[linear-gradient(135deg,#0f3d7a_0%,#1d5b9e_100%)] text-[0.95rem] font-semibold tracking-[0.02em] text-white shadow-[0_0.6rem_1.4rem_-0.4rem_rgba(16,45,84,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0.9rem_1.8rem_-0.4rem_rgba(16,45,84,0.5)] active:translate-y-0 active:shadow-[0_0.3rem_0.8rem_-0.3rem_rgba(16,45,84,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f7941d] focus-visible:outline-offset-2 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none">
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

export default LoginPage