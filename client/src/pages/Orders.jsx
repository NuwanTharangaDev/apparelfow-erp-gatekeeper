import { useEffect, useState } from 'react'
import NewOrderModal from '../components/NewOrder.jsx'

const statusStyles = {
  CUTTING_IN_PROGRESS: 'bg-amber-100 text-amber-900',
  PENDING_VERIFICATION: 'bg-blue-100 text-blue-900',
  REJECTED: 'bg-red-100 text-red-900',
  VERIFIED: 'bg-green-100 text-green-900',
  SEWING_IN_PROGRESS: 'bg-slate-200 text-slate-900',
}

function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [submittingId, setSubmittingId] = useState(null)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    fetch('/api/orders')
      .then((res) => {
        if (!res.ok) throw new Error('Request failed')
        return res.json()
      })
      .then(setOrders)
      .catch(() => setError('Could not load orders'))
      .finally(() => setLoading(false))
  }, [reloadKey])

  function handleCreated() {
    setShowForm(false)
    setReloadKey((key) => key + 1)
  }

  async function handleSubmit(order) {
    setActionError(null)
    setSubmittingId(order.id)

    try {
      const res = await fetch(`/api/orders/${order.id}/submit`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setActionError({ orderId: order.id, message: data.message })
      }
      setReloadKey((key) => key + 1)
    } catch {
      setActionError({ orderId: order.id, message: 'Could not reach the server' })
    } finally {
      setSubmittingId(null)
    }
  }

  if (loading) {
    return <p className="text-slate-600">Loading orders...</p>
  }

  if (error) {
    return (
      <p role="alert" className="font-medium text-red-700">
        ⚠ {error}
      </p>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Cutting orders</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800"
        >
          New order
        </button>
      </div>

      {orders.length === 0 ? (
        <p className="mt-4 text-slate-600">No orders yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-300 text-slate-700">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Recipe</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Fabric roll</th>
                <th className="px-4 py-3">Fabric used / expected</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-slate-200 text-slate-900">
                  <td className="px-4 py-3 font-semibold">{order.orderNo}</td>
                  <td className="px-4 py-3">{order.recipeName}</td>
                  <td className="px-4 py-3">{order.targetQty}</td>
                  <td className="px-4 py-3">{order.fabricRollId}</td>
                  <td className="px-4 py-3">
                    {order.actualFabricYds} / {order.expectedFabricYds} yds
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[order.status]}`}
                    >
                      {order.status.replaceAll('_', ' ')}
                    </span>
                    {order.rejectionNote && (
                      <p className="mt-1 text-red-800">Reason: {order.rejectionNote}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {order.status === 'CUTTING_IN_PROGRESS' ? (
                      <button
                        onClick={() => handleSubmit(order)}
                        disabled={submittingId === order.id}
                        className="rounded-lg border border-blue-700 px-3 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50 disabled:border-slate-400 disabled:bg-slate-100 disabled:text-slate-700"
                      >
                        {submittingId === order.id ? 'Submitting...' : 'Submit for verification'}
                      </button>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                    {actionError?.orderId === order.id && (
                      <p role="alert" className="mt-1 text-xs font-medium text-red-700">
                        ⚠ {actionError.message}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <NewOrderModal onClose={() => setShowForm(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}

export default Orders