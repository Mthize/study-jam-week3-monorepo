import React from 'react';

type AuthFormProps = {
  isRegister: boolean;
  form: any;
  handleInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  cta: string;
};

export function AuthForm({
  isRegister,
  form,
  handleInput,
  handleSubmit,
  status,
  message,
  cta
}: AuthFormProps) {
  return (
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
        {status === 'loading' ? 'Please wait...' : cta}
      </button>
      
      {message && (
        <p
          className={`status-message ${status}`}
          role={status === 'error' ? 'alert' : 'status'}
          aria-live={status === 'error' ? 'assertive' : 'polite'}
          aria-atomic="true"
        >
          {message}
        </p>
      )}
    </form>
  );
}
