import { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';

export function AuthView({
  onLogin,
  onRegister,
  isLoading = false,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  isLoading?: boolean;
}) {
  const [email, setEmail] = useState('demo@priora.local');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Demo User');
  const [error, setError] = useState('');

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.25),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_52%,_#164e63_100%)] px-4">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/95 p-8 shadow-[0_36px_90px_-48px_rgba(15,23,42,0.85)] backdrop-blur">
        <div className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
          Launch Workspace
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950">Priora</h1>
        <p className="mt-3 text-sm text-slate-600">Run cards, reports, scheduling, and team workflows against the live PostgreSQL backend.</p>
        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-6 space-y-3">
          <input className="input-control" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input-control" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            className="input-control"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={isLoading}
            onClick={() => onLogin(email, password).catch((e) => setError(e?.response?.data?.error ?? 'Login failed'))}
          >
            <LogIn className="h-4 w-4" />
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
          <button
            type="button"
            className="btn-secondary flex-1 border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
            disabled={isLoading}
            onClick={() => onRegister(name, email, password).catch((e) => setError(e?.response?.data?.error ?? 'Register failed'))}
          >
            <UserPlus className="h-4 w-4" />
            {isLoading ? 'Creating...' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
