import { useState } from 'react'

const demoPassword = 'Demo@1234'

const demoUsers = [
  {
    role: 'Cutting Supervisor',
    email: 'supervisor@apparelflow.com',
    note: 'Creates cutting orders',
  },
  {
    role: 'Cutting Verifier',
    email: 'verifier@apparelflow.com',
    note: 'Counts pieces, approves or rejects',
  },
  {
    role: 'Sewing Supervisor',
    email: 'sewing@apparelflow.com',
    note: 'Receives verified batches',
  },
]

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function signIn(emailValue, passwordValue) {
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue, password: passwordValue }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message)
        return
      }
      onLogin(data)
    } catch {
      setError('Could not reach the server')
    } finally {
      setSubmitting(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (!email.trim() || !password) {
      setError('Enter your email and password')
      return
    }
    signIn(email, password)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-slate-900">ApparelFlow ERP</h1>
        <p className="mt-1 text-slate-600">Sign in to the cutting terminal</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@apparelflow.com"
              className="mt-1 w-full rounded-lg border border-slate-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-700">
              ⚠ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-700 py-2 font-semibold text-white hover:bg-blue-800 disabled:bg-slate-500"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-300 pt-6">
          <h2 className="text-sm font-semibold text-slate-900">Demo accounts</h2>
          <p className="mt-1 text-sm text-slate-600">
            Click a role to sign in. Password for all: <code>{demoPassword}</code>
          </p>

          <div className="mt-3 space-y-2">
            {demoUsers.map((demo) => (
              <button
                key={demo.email}
                type="button"
                disabled={submitting}
                onClick={() => signIn(demo.email, demoPassword)}
                className="w-full rounded-lg border border-slate-500 bg-white px-4 py-3 text-left hover:bg-slate-100 disabled:opacity-60"
              >
                <span className="block font-semibold text-slate-900">{demo.role}</span>
                <span className="block text-sm text-slate-600">{demo.note}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login