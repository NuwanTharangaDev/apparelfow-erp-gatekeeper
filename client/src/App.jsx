import { useEffect, useState } from 'react'
import Login from './pages/Login.jsx'
import Navbar from './components/Navbar.jsx'
import Orders from './pages/Orders.jsx'
import { demoPassword, demoUsers } from './demoUsers.js'
import Verification from './pages/Verification.jsx'

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setChecking(false))
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  async function switchRole(role) {
    const demo = demoUsers.find((d) => d.role === role)

    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demo.email, password: demoPassword }),
      })
      setUser(res.ok ? await res.json() : null)
    } catch {
      setUser(null)
    }
  }

  if (checking) {
    return <p className="p-8 text-slate-600">Loading...</p>
  }

  if (!user) {
    return <Login onLogin={setUser} />
  }

  return (
    <div>
      <Navbar user={user} onSwitchRole={switchRole} onLogout={handleLogout} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {user.role === 'cutting_supervisor' && <Orders />}
        {user.role === 'cutting_verifier' && <Verification />}
        {user.role === 'sewing_supervisor' && (
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome, {user.fullName}</h1>
            <p className="mt-1 text-slate-600">Your workspace is coming soon.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App