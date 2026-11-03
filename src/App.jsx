import { useEffect } from 'react'
import HomePage from './pages/home page.jsx'
import LoginPage from './pages/login page.jsx'

function RedirectToLogin() {
  useEffect(() => {
    window.location.replace('/login')
  }, [])

  return null
}

function App() {
  const path = window.location.pathname

  if (path === '/home') {
    const isAuthenticated =
      sessionStorage.getItem('berhan-authenticated') === 'true'

    return isAuthenticated ? <HomePage /> : <RedirectToLogin />
  }

  return <LoginPage />
}

export default App
