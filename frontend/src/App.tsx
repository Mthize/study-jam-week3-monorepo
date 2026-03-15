import { useMemo, useState } from 'react'
import './App.css'
import { API_BASE_URL, loginUser, registerUser } from './lib/api'
import type { AuthResponse } from './lib/types'

type Mode = 'register' | 'login'

const initialForm = {
  name: '',
  surname: '',
  email: '',
  password: '',
}

function App() {
  const [mode, setMode] = useState<Mode>('register')
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<AuthResponse['data'] | null>(null)

  const isRegister = mode === 'register'

  const copy = useMemo(() => {
    return mode === 'register'
      ? {
          title: 'Create a new workspace login',
          description:
            'Spin up your Study Jam account so you can build right alongside the deployed backend.',
          cta: 'Register account',
        }
      : {
          title: 'Welcome back',
          description:
            'Sign in with the credentials you registered to verify the end-to-end pipeline.',
          cta: 'Sign in',
        }
  }, [mode])

  function handleInput(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleModeChange(nextMode: Mode) {
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
      const response = isRegister
        ? await registerUser(form)
        : await loginUser({ email: form.email, password: form.password })
      setResult(response.data)
      setStatus('success')
      setMessage(isRegister ? 'Registration successful.' : 'Login successful.')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Unexpected error.')
    }
  }

  return (
    <div className="page">
      <main className="shell">
        <header className="hero">
          <p className="eyebrow">Backend live at {API_BASE_URL}</p>
          <h1>Access the Study Jam platform</h1>
          <p className="lede">
            Cloud Run already serves the NestJS backend. This frontend lets you prove registrations
            and logins hit that live stack before we expand the product surface.
          </p>
        </header>

        <section className="workspace">
          <div className="card auth">
            <div className="mode-toggle" role="tablist" aria-label="Authentication mode">
              {(['register', 'login'] as Mode[]).map((option) => (
                <button
                  key={option}
                  role="tab"
                  aria-selected={mode === option}
                  className={mode === option ? 'active' : ''}
                  onClick={() => handleModeChange(option)}
                  type="button"
                >
                  {option === 'register' ? 'Register' : 'Login'}
                </button>
              ))}
            </div>
            <div className="card-body">
              <div className="card-copy">
                <h2>{copy.title}</h2>
                <p>{copy.description}</p>
              </div>

              <form onSubmit={handleSubmit} className="auth-form">
                {isRegister && (
                  <div className="grid">
                    <label>
                      <span>First name</span>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleInput}
                        autoComplete="given-name"
                        required
                      />
                    </label>
                    <label>
                      <span>Surname</span>
                      <input
                        type="text"
                        name="surname"
                        value={form.surname}
                        onChange={handleInput}
                        autoComplete="family-name"
                        required
                      />
                    </label>
                  </div>
                )}
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleInput}
                    autoComplete="email"
                    required
                  />
                </label>
                <label>
                  <span>Password</span>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleInput}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    minLength={8}
                    required
                  />
                </label>
                <button className="primary" type="submit" disabled={status === 'loading'}>
                  {status === 'loading' ? 'One moment...' : copy.cta}
                </button>
                {message && <p className={`status ${status}`}>{message}</p>}
              </form>
            </div>
          </div>

          <aside className="card summary">
            <div>
              <p className="eyebrow">Deployment checklist</p>
              <h3>Backend Phase Complete</h3>
              <ul className="checklist">
                {[
                  'Cloud Run revision healthy',
                  'Secrets injected from Secret Manager',
                  'Cloud SQL socket connectivity',
                ].map((item) => (
                  <li key={item}>
                    <span>✔</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="divider" />

            <div>
              <p className="eyebrow">Latest response</p>
              {result ? (
                <div className="response-card">
                  <h4>{result.user.name + ' ' + result.user.surname}</h4>
                  <p className="muted">{result.user.email}</p>
                  <dl>
                    <div>
                      <dt>User ID</dt>
                      <dd>#{result.user.id}</dd>
                    </div>
                    <div>
                      <dt>Token preview</dt>
                      <dd className="token">{result.token.slice(0, 32)}...</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <p className="muted">Submit either form to capture the live API response.</p>
              )}
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}

export default App
