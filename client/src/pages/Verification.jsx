import { useEffect, useState } from 'react'
import CountTerminal from '../components/CountTerminal.jsx'

function Verification() {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    fetch('/api/verification/queue')
      .then((res) => {
        if (!res.ok) throw new Error('Request failed')
        return res.json()
      })
      .then(setQueue)
      .catch(() => setError('Could not load the verification queue'))
      .finally(() => setLoading(false))
  }, [reloadKey])

  function handleBack() {
    setSelectedId(null)
    setReloadKey((key) => key + 1)
  }

  if (loading) {
    return <p className="text-slate-600">Loading queue...</p>
  }

  if (error) {
    return (
      <p role="alert" className="font-medium text-red-700">
        ⚠ {error}
      </p>
    )
  }

  if (selectedId) {
    return <CountTerminal orderId={selectedId} onBack={handleBack} />
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Verification queue</h1>

      {queue.length === 0 ? (
        <p className="mt-4 text-slate-600">No batches are waiting for verification.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-300 text-slate-700">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Recipe</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Fabric roll</th>
                <th className="px-4 py-3">Counted</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((order) => (
                <tr key={order.id} className="border-b border-slate-200 text-slate-900">
                  <td className="px-4 py-3 font-semibold">{order.orderNo}</td>
                  <td className="px-4 py-3">{order.recipeName}</td>
                  <td className="px-4 py-3">{order.targetQty}</td>
                  <td className="px-4 py-3">{order.fabricRollId}</td>
                  <td className="px-4 py-3">
                    {order.counted} / {order.total} components
                  </td>
                  <td className="px-4 py-3">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedId(order.id)}
                      className="rounded-lg border border-blue-700 px-3 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Verification