import { useEffect, useState } from 'react'

const lightStyles = {
  GREEN: 'bg-green-100 text-green-900',
  YELLOW: 'bg-amber-100 text-amber-900',
  RED: 'bg-red-100 text-red-900',
}

function getLight(actual, expected) {
  if (actual === expected) return 'GREEN'
  return actual > expected ? 'YELLOW' : 'RED'
}

function lightLabel(light, actual, expected) {
  if (light === 'GREEN') return 'GREEN · Match'
  if (light === 'YELLOW') return `YELLOW · Excess +${actual - expected}`
  return `RED · Shortage -${expected - actual}`
}

function CountTerminal({ orderId, onBack }) {
  const [order, setOrder] = useState(null)
  const [counts, setCounts] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/verification/${orderId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Request failed')
        return res.json()
      })
      .then((data) => {
        setOrder(data)
        setCounts(
          Object.fromEntries(
            data.items.map((item) => [item.id, item.actualQty === null ? '' : String(item.actualQty)])
          )
        )
      })
      .catch(() => setError('Could not load this order'))
  }, [orderId])

  function handleCountChange(itemId, value) {
    setCounts((current) => ({ ...current, [itemId]: value }))
  }

  if (error) {
    return (
      <div>
        <p role="alert" className="font-medium text-red-700">
          ⚠ {error}
        </p>
        <button onClick={onBack} className="mt-3 text-sm font-semibold text-blue-800 underline">
          Back to queue
        </button>
      </div>
    )
  }

  if (!order) {
    return <p className="text-slate-600">Loading order...</p>
  }

  return (
    <div>
      <button onClick={onBack} className="text-sm font-semibold text-blue-800 underline">
        ← Back to queue
      </button>

      <h1 className="mt-3 text-2xl font-bold text-slate-900">
        {order.orderNo} · {order.recipeName}
      </h1>
      <p className="mt-1 text-slate-700">
        {order.targetQty} garments · Roll {order.fabricRollId} · Fabric {order.actualFabricYds} /{' '}
        {order.expectedFabricYds} yds ({order.wastagePct}%)
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-300 text-slate-700">
            <tr>
              <th className="px-4 py-3">Component</th>
              <th className="px-4 py-3">Expected</th>
              <th className="px-4 py-3">Actual count</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const typed = counts[item.id] ?? ''
              const valid = /^\d+$/.test(typed) && Number(typed) <= 100000
              const light = valid ? getLight(Number(typed), item.expectedQty) : null
              const invalid = typed !== '' && !valid

              return (
                <tr key={item.id} className="border-b border-slate-200 align-top text-slate-900">
                  <td className="px-4 py-3 font-semibold">{item.name}</td>
                  <td className="px-4 py-3">{item.expectedQty}</td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label={`Actual count for ${item.name}`}
                      aria-invalid={invalid}
                      aria-describedby={invalid ? `error-${item.id}` : undefined}
                      value={typed}
                      onChange={(e) => handleCountChange(item.id, e.target.value)}
                      className="w-28 rounded-lg border border-slate-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                    {invalid && (
                      <p id={`error-${item.id}`} role="alert" className="mt-1 text-xs font-medium text-red-700">
                        ⚠ Whole number from 0 to 100000
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {light ? (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${lightStyles[light]}`}
                      >
                        {lightLabel(light, Number(typed), item.expectedQty)}
                      </span>
                    ) : (
                      <span className="text-slate-600">Not counted</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CountTerminal