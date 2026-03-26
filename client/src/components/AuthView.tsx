import { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';

export function AuthView({
  onLogin,
  onRegister,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('demo@priora.local');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Demo User');
  const [error, setError] = useState('');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
        <h1 className="text-center text-3xl font-bold text-gray-900">Priora</h1>
        <p className="mt-1 text-center text-sm text-gray-600">Local-first Kanban · PostgreSQL backend</p>
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
            onClick={() => onLogin(email, password).catch((e) => setError(e?.response?.data?.error ?? 'Login failed'))}
          >
            <LogIn className="h-4 w-4" />
            Login
          </button>
          <button
            type="button"
            className="btn-secondary flex-1 border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
            onClick={() => onRegister(name, email, password).catch((e) => setError(e?.response?.data?.error ?? 'Register failed'))}
          >
            <UserPlus className="h-4 w-4" />
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
