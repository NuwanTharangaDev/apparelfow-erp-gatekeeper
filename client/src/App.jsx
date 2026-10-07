import { useEffect, useState } from 'react'
import Login from './pages/Login.jsx'

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

  if (checking) {
    return <p className="p-8 text-slate-600">Loading...</p>
  }

  if (!user) {
    return <Login onLogin={setUser} />
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {user.fullName}</h1>
        <p className="mt-1 text-slate-600">Role: {user.role}</p>
        <button
          onClick={handleLogout}
          className="mt-4 rounded-lg border border-slate-500 px-4 py-2 font-medium text-slate-900 hover:bg-slate-100"
        >
          Log out
        </button>
      </div>
    </div>
  )
}

export default App