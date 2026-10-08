import { useEffect, useState } from 'react'

const lightStyles = {
  GREEN: 'bg-green-100 text-green-900',
  YELLOW: 'bg-amber-100 text-amber-900',
  RED: 'bg-red-100 text-red-900',
}

function lightLabel(part) {
  if (part.light === 'GREEN') return 'GREEN · Match'
  if (part.light === 'YELLOW') return `YELLOW · Excess +${part.variance}`
  return `RED · Shortage ${part.variance}`
}

function SewingDetail({ orderId, onBack, onStarted }) {
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')

  useEffect(() => {
    fetch(`/api/sewing/${orderId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Request failed')
        return res.json()
      })
      .then(setOrder)
      .catch(() => setError('Could not load this order'))
  }, [orderId])

  async function handleStart() {
    setStartError('')
    setStarting(true)

    try {
      const res = await fetch(`/api/sewing/${orderId}/start`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setStartError(data.message)
        return
      }
      onStarted(order.orderNo)
    } catch {
      setStartError('Could not reach the server')
    } finally {
      setStarting(false)
    }
  }

  const backButton = (
    <button
      onClick={onBack}
      className="rounded-lg border border-slate-500 px-3 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100"
    >
      ← Back to sewing floor
    </button>
  )

  if (error) {
    return (
      <div className="space-y-4">
        {backButton}
        <p role="alert" className="font-medium text-red-700">
          ⚠ {error}
        </p>
      </div>
    )
  }

  if (!order) {
    return <p className="text-slate-600">Loading order...</p>
  }

  return (
    <div className="space-y-6">
      {backButton}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{order.orderNo}</h1>
        <p className="text-slate-700">{order.recipeName}</p>
      </div>

      <dl className="grid gap-4 rounded-xl bg-white p-5 shadow sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-sm text-slate-700">Quantity</dt>
          <dd className="font-semibold text-slate-900">{order.targetQty} garments</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-700">Fabric roll</dt>
          <dd className="font-semibold text-slate-900">{order.fabricRollId}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-700">Fabric used / expected</dt>
          <dd className="font-semibold text-slate-900">
            {order.actualFabricYds} / {order.expectedFabricYds} yds
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-700">Wastage (cap {order.wastageCap}%)</dt>
          <dd className="font-semibold text-slate-900">
            {order.wastagePct}%
            {order.overCap && <span className="ml-2 text-amber-900">⚠ Over cap</span>}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-700">Verified by</dt>
          <dd className="font-semibold text-slate-900">{order.verifierName}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-700">Verified at</dt>
          <dd className="font-semibold text-slate-900">
            {new Date(order.verifiedAt).toLocaleString()}
          </dd>
        </div>
      </dl>

      <div className="rounded-xl bg-white p-5 shadow">
        <h2 className="text-sm font-semibold text-slate-900">Verifier note</h2>
        <p className="mt-1 text-slate-900">{order.verifierNote || 'No note was left.'}</p>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-300 text-slate-700">
            <tr>
              <th className="px-4 py-3">Component</th>
              <th className="px-4 py-3">Expected</th>
              <th className="px-4 py-3">Counted</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {order.components.map((part) => (
              <tr key={part.name} className="border-b border-slate-200 text-slate-900">
                <td className="px-4 py-3 font-semibold">{part.name}</td>
                <td className="px-4 py-3">{part.expected}</td>
                <td className="px-4 py-3">{part.actual}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${lightStyles[part.light]}`}
                  >
                    {lightLabel(part)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={handleStart}
          disabled={starting}
          className="rounded-lg bg-blue-700 px-5 py-2 font-semibold text-white hover:bg-blue-800 disabled:bg-slate-500"
        >
          {starting ? 'Starting...' : 'Start Sewing Assembly'}
        </button>
        {startError && (
          <p role="alert" className="text-sm font-medium text-red-700">
            ⚠ {startError}
          </p>
        )}
      </div>
    </div>
  )
}

export default SewingDetail