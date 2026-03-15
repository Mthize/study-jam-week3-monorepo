import type { ReactNode } from 'react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-container">
      <div className="auth-glow" />
      <div className="auth-content">
        <div className="auth-stack">
          {children}
        </div>
      </div>
    </div>
  );
}
