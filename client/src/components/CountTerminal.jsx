import { useEffect, useState } from 'react'

const lightStyles = {
  GREEN: 'bg-green-100 text-green-900',
  YELLOW: 'bg-amber-100 text-amber-900',
  RED: 'bg-red-100 text-red-900',
}

function CountTerminal({ orderId, onBack }) {
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/verification/${orderId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Request failed')
        return res.json()
      })
      .then(setOrder)
      .catch(() => setError('Could not load this order'))
  }, [orderId])

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
              <th className="px-4 py-3">Actual</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-200 text-slate-900">
                <td className="px-4 py-3 font-semibold">{item.name}</td>
                <td className="px-4 py-3">{item.expectedQty}</td>
                <td className="px-4 py-3">{item.actualQty ?? '-'}</td>
                <td className="px-4 py-3">
                  {item.status ? (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${lightStyles[item.status]}`}
                    >
                      {item.status}
                    </span>
                  ) : (
                    <span className="text-slate-600">Not counted</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CountTerminal