import { useEffect, useState } from 'react'
import SewingDetail from '../components/SewingDetail.jsx'

function loadJson(url) {
  return fetch(url).then((res) => {
    if (!res.ok) throw new Error('Request failed')
    return res.json()
  })
}

function Sewing() {
  const [queue, setQueue] = useState([])
  const [inProgress, setInProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    Promise.all([loadJson('/api/sewing/queue'), loadJson('/api/sewing/in-progress')])
      .then(([queueData, inProgressData]) => {
        setQueue(queueData)
        setInProgress(inProgressData)
      })
      .catch(() => setError('Could not load the sewing floor'))
      .finally(() => setLoading(false))
  }, [reloadKey])

  function handleBack() {
    setSelectedId(null)
    setReloadKey((key) => key + 1)
  }

  if (loading) {
    return <p className="text-slate-600">Loading sewing floor...</p>
  }

  if (error) {
    return (
      <p role="alert" className="font-medium text-red-700">
        ⚠ {error}
      </p>
    )
  }

  if (selectedId) {
    return <SewingDetail orderId={selectedId} onBack={handleBack} />
  }

  return (
    <div className="space-y-10">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Ready for sewing</h1>
          <button
            onClick={() => setReloadKey((key) => key + 1)}
            className="rounded-lg border border-slate-500 px-3 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            Refresh
          </button>
        </div>

        {queue.length === 0 ? (
          <p className="mt-4 text-slate-600">No verified batches are waiting.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-300 text-slate-700">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Recipe</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Fabric roll</th>
                  <th className="px-4 py-3">Verified by</th>
                  <th className="px-4 py-3">Verified at</th>
                  <th className="px-4 py-3">Wastage</th>
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
                    <td className="px-4 py-3">{order.verifierName}</td>
                    <td className="px-4 py-3">{new Date(order.verifiedAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {order.wastagePct}%
                      {order.overCap && (
                        <span className="ml-2 font-semibold text-amber-900">⚠ Over cap</span>
                      )}
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
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-900">Sewing in progress</h2>

        {inProgress.length === 0 ? (
          <p className="mt-4 text-slate-600">Nothing is being sewn right now.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-300 text-slate-700">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Recipe</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Fabric roll</th>
                  <th className="px-4 py-3">Started by</th>
                  <th className="px-4 py-3">Started at</th>
                </tr>
              </thead>
              <tbody>
                {inProgress.map((order) => (
                  <tr key={order.id} className="border-b border-slate-200 text-slate-900">
                    <td className="px-4 py-3 font-semibold">{order.orderNo}</td>
                    <td className="px-4 py-3">{order.recipeName}</td>
                    <td className="px-4 py-3">{order.targetQty}</td>
                    <td className="px-4 py-3">{order.fabricRollId}</td>
                    <td className="px-4 py-3">{order.startedByName}</td>
                    <td className="px-4 py-3">{new Date(order.startedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default Sewing