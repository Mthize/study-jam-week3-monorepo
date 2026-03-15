import { useState, useMemo } from 'react'
import './App.css'
import { loginUser, registerUser } from './lib/api'
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

function App() {
  const [mode, setMode] = useState<Mode>('login')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const isRegister = mode === 'register'

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('loading')
    setMessage('')
    try {
      if (isRegister) {
        await registerUser(form)
      } else {
        await loginUser({ email: form.email, password: form.password })
      }
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
          <SocialAuthButtons />
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
