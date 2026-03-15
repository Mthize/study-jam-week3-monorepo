import { useState, useMemo, useEffect } from 'react'
import './App.css'
import { API_BASE_URL, exchangeOAuthCode, loginUser, registerUser } from './lib/api'
import { AuthLayout } from './components/auth/AuthLayout'
import { AuthBrand } from './components/auth/AuthBrand'
import { SocialAuthButtons } from './components/auth/SocialAuthButtons'
import { AuthDivider } from './components/auth/AuthDivider'
import { EmailAuthButton } from './components/auth/EmailAuthButton'
import { AuthForm } from './components/auth/AuthForm'

type Mode = 'register' | 'login'

const initialForm = {
  name: '',
  surname: '',
  email: '',
  password: '',
}

const TOKEN_STORAGE_KEY = 'auth_token'

function formatProviderLabel(provider?: string | null) {
  if (!provider) return 'OAuth'
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}

function persistToken(token: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } catch (error) {
    console.warn('Unable to persist auth token', error)
  }
}

function App() {
  const [mode, setMode] = useState<Mode>('login')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const isRegister = mode === 'register'
  const shouldShowStatus = Boolean(message && status !== 'idle')

  const copy = useMemo(() => {
    return isRegister
      ? {
          title: 'Create an account',
          subtitle: 'Enter your details to get started.',
          cta: 'Sign up',
          switchText: 'Already have an account?',
          switchLink: 'Sign in',
        }
      : {
          title: 'Sign in to your account',
          subtitle: 'Welcome back! Please enter your details.',
          cta: 'Sign in',
          switchText: "Don't have an account?",
          switchLink: 'Sign up',
        }
  }, [mode])

  function handleInput(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleModeChange(e: React.MouseEvent) {
    e.preventDefault()
    const nextMode = mode === 'login' ? 'register' : 'login'
    setMode(nextMode)
    setStatus('idle')
    setMessage('')
    setShowEmailForm(false)
    if (nextMode === 'login') {
      setForm((prev) => ({ ...prev, name: '', surname: '' }))
    }
  }

  function handleOAuthRedirect(provider: 'google' | 'github') {
    if (!API_BASE_URL) {
      setStatus('error')
      setMessage('API base URL is not configured. Set VITE_API_BASE_URL to continue.')
      return
    }

    try {
      const target = new URL(`${API_BASE_URL}/auth/${provider}`)
      if (typeof window !== 'undefined') {
        target.searchParams.set('redirect', `${window.location.origin}${window.location.pathname}`)
        setStatus('loading')
        setMessage(`Redirecting to ${formatProviderLabel(provider)}...`)
        window.location.href = target.toString()
      }
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Unable to start OAuth flow.')
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const oauthStatus = params.get('oauth')
    if (!oauthStatus) return

    const processOAuthResult = async () => {
      if (oauthStatus === 'success') {
        const code = params.get('code')
        const provider = params.get('provider')
        if (code) {
          try {
            const response = await exchangeOAuthCode(code)
            persistToken(response.data.token)
            setStatus('success')
            setMessage(`Signed in with ${formatProviderLabel(provider)}.`)
          } catch (error) {
            setStatus('error')
            setMessage(error instanceof Error ? error.message : 'Failed to complete OAuth login.')
          }
        } else {
          setStatus('error')
          setMessage('OAuth login completed without a code.')
        }
      } else {
        const errorMessage = params.get('message')
        setStatus('error')
        setMessage(errorMessage || 'OAuth login failed.')
      }

      setShowEmailForm(false)
      const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.hash}`
      window.history.replaceState({}, document.title, cleanUrl)
    }

    processOAuthResult()
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('loading')
    setMessage('')
    try {
      const response = isRegister
        ? await registerUser(form)
        : await loginUser({ email: form.email, password: form.password })

      persistToken(response.data.token)
      setStatus('success')
      setMessage(isRegister ? 'Registration successful.' : 'Login successful.')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Unexpected error.')
    }
  }

  return (
    <AuthLayout>
      <div className="auth-header">
        <AuthBrand />
        <h1>{copy.title}</h1>
        {showEmailForm && <p>{copy.subtitle}</p>}
      </div>

      {!showEmailForm ? (
        <div className="auth-step-social">
          <SocialAuthButtons
            onGitHubClick={() => handleOAuthRedirect('github')}
            onGoogleClick={() => handleOAuthRedirect('google')}
            disabled={status === 'loading'}
          />
          {shouldShowStatus && (
            <p
              className={`status-message ${status}`}
              role={status === 'error' ? 'alert' : 'status'}
              aria-live={status === 'error' ? 'assertive' : 'polite'}
              aria-atomic="true"
            >
              {message}
            </p>
          )}
          <AuthDivider />
          <EmailAuthButton onClick={() => setShowEmailForm(true)} />
        </div>
      ) : (
        <AuthForm
          isRegister={isRegister}
          form={form}
          handleInput={handleInput}
          handleSubmit={handleSubmit}
          status={status}
          message={message}
          cta={copy.cta}
        />
      )}

      <div className="auth-switch">
        <p>
          {copy.switchText}{' '}
          <a href="#" onClick={handleModeChange}>
            {copy.switchLink}
          </a>
        </p>
      </div>
    </AuthLayout>
  )
}

export default App
