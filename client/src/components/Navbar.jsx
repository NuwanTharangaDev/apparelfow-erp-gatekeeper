import { demoUsers } from '../demoUsers.js'

function Navbar({ user, onSwitchRole, onLogout }) {
  return (
    <header className="border-b border-slate-300 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <span className="text-lg font-bold text-slate-900">ApparelFlow ERP</span>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-700">{user.fullName}</span>

          <label htmlFor="switch-role" className="sr-only">
            Switch role
          </label>
          <select
            id="switch-role"
            value={user.role}
            onChange={(e) => onSwitchRole(e.target.value)}
            className="rounded-lg border border-slate-500 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
          >
            {demoUsers.map((demo) => (
              <option key={demo.role} value={demo.role}>
                {demo.label}
              </option>
            ))}
          </select>

          <button
            onClick={onLogout}
            className="rounded-lg border border-slate-500 px-3 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  )
}

export default Navbar