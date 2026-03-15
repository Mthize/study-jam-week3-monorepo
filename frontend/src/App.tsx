import { useState, useMemo } from 'react'
import './App.css'
import { loginUser, registerUser } from './lib/api'

type Mode = 'register' | 'login'

const initialForm = {
  name: '',
  surname: '',
  email: '',
  password: '',
}

function App() {
  const [mode, setMode] = useState<Mode>('login')
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
          title: 'Welcome back',
          subtitle: 'Please enter your details to sign in.',
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
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-form-wrapper">
          <div className="auth-header">
            <div className="logo-placeholder"></div>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {isRegister && (
              <div className="input-group-row">
                <div className="input-group">
                  <label htmlFor="name">First name</label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInput}
                    autoComplete="given-name"
                    placeholder="Jane"
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="surname">Surname</label>
                  <input
                    id="surname"
                    type="text"
                    name="surname"
                    value={form.surname}
                    onChange={handleInput}
                    autoComplete="family-name"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
            )}
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleInput}
                autoComplete="email"
                placeholder="jane@example.com"
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleInput}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>

            <button className="btn-primary" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Please wait...' : copy.cta}
            </button>
            {message && <p className={`status-message ${status}`}>{message}</p>}
          </form>

          <div className="auth-switch">
            <p>
              {copy.switchText}{' '}
              <a href="#" onClick={handleModeChange}>
                {copy.switchLink}
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="visual-panel-content">
          <div className="testimonial-card">
            <p className="testimonial-quote">
              "This platform has completely transformed how we build and scale our infrastructure. 
              The performance and reliability are unmatched."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar"></div>
              <div className="author-info">
                <strong>Alex Chen</strong>
                <span>Lead Engineer, TechFlow</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
