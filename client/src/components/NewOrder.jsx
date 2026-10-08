import { useEffect, useRef, useState } from 'react'

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-700'

function validate(values) {
  const errors = {}

  if (!values.recipeId) {
    errors.recipeId = 'Choose a recipe'
  }

  const qty = Number(values.targetQty)
  if (!/^\d+$/.test(values.targetQty) || qty < 1 || qty > 10000) {
    errors.targetQty = 'Enter a whole number from 1 to 10000'
  }

  const roll = values.fabricRollId.trim()
  if (!roll || roll.length > 40) {
    errors.fabricRollId = 'Enter the fabric roll ID (up to 40 characters)'
  }

  const yards = Number(values.actualFabricYds)
  if (!/^\d+$/.test(values.actualFabricYds) || yards < 1 || yards > 100000) {
    errors.actualFabricYds = 'Enter whole yards from 1 to 100000'
  }

  return errors
}

function Field({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-sm font-medium text-red-700">
          ⚠ {error}
        </p>
      )}
    </div>
  )
}

function NewOrderModal({ onClose, onCreated }) {
  const dialogRef = useRef(null)
  const [recipes, setRecipes] = useState([])
  const [loadError, setLoadError] = useState('')
  const [values, setValues] = useState({
    recipeId: '',
    targetQty: '',
    fabricRollId: '',
    actualFabricYds: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [serverErrors, setServerErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dialogRef.current.showModal()

    fetch('/api/recipes')
      .then((res) => {
        if (!res.ok) throw new Error('Request failed')
        return res.json()
      })
      .then(setRecipes)
      .catch(() => setLoadError('Could not load recipes'))
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setValues((current) => ({ ...current, [name]: value }))
    setServerErrors({})
  }

  const errors = validate(values)
  const shown = {}
  for (const name of Object.keys(values)) {
    if (serverErrors[name]) {
      shown[name] = serverErrors[name]
    } else if (submitted || values[name] !== '') {
      shown[name] = errors[name]
    }
  }

  const recipe = recipes.find((r) => r.id === Number(values.recipeId))

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    setFormError('')

    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId: Number(values.recipeId),
          targetQty: Number(values.targetQty),
          fabricRollId: values.fabricRollId.trim(),
          actualFabricYds: Number(values.actualFabricYds),
        }),
      })
      const data = await res.json()

      if (res.status === 422) {
        setServerErrors(data.errors ?? {})
        return
      }
      if (!res.ok) {
        setFormError(data.message)
        return
      }
      onCreated()
    } catch {
      setFormError('Could not reach the server')
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/60"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4 p-6">
        <h2 className="text-xl font-bold">New cutting order</h2>

        {loadError && (
          <p role="alert" className="text-sm font-medium text-red-700">
            ⚠ {loadError}
          </p>
        )}

        <Field id="recipeId" label="Recipe" error={shown.recipeId}>
          <select
            id="recipeId"
            name="recipeId"
            value={values.recipeId}
            onChange={handleChange}
            aria-invalid={Boolean(shown.recipeId)}
            className={inputClass}
          >
            <option value="">Select a recipe</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} - {r.name}
              </option>
            ))}
          </select>
        </Field>

        <Field id="targetQty" label="Target quantity (garments)" error={shown.targetQty}>
          <input
            id="targetQty"
            name="targetQty"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={values.targetQty}
            onChange={handleChange}
            aria-invalid={Boolean(shown.targetQty)}
            className={inputClass}
          />
        </Field>

        <Field id="fabricRollId" label="Fabric roll ID" error={shown.fabricRollId}>
          <input
            id="fabricRollId"
            name="fabricRollId"
            type="text"
            autoComplete="off"
            placeholder="FAB-ROLL-882"
            value={values.fabricRollId}
            onChange={handleChange}
            aria-invalid={Boolean(shown.fabricRollId)}
            className={inputClass}
          />
        </Field>

        <Field id="actualFabricYds" label="Actual fabric used (yards)" error={shown.actualFabricYds}>
          <input
            id="actualFabricYds"
            name="actualFabricYds"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={values.actualFabricYds}
            onChange={handleChange}
            aria-invalid={Boolean(shown.actualFabricYds)}
            className={inputClass}
          />
        </Field>

        {recipe && !errors.targetQty && (
          <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-900">
            <p className="font-semibold">Expected cut parts</p>
            <ul className="mt-2 space-y-1">
              {recipe.components.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span>{c.name}</span>
                  <span className="font-medium">
                    {Number(values.targetQty) * c.piecesPerGarment} pcs
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              Expected fabric:{' '}
              <span className="font-medium">
                {(Number(values.targetQty) * recipe.stdFabricYards).toFixed(2)} yds
              </span>
            </p>
          </div>
        )}

        {formError && (
          <p role="alert" className="text-sm font-medium text-red-700">
            ⚠ {formError}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-500 px-4 py-2 font-medium text-slate-900 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:bg-slate-600"
          >
            {saving ? 'Creating...' : 'Create order'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default NewOrderModal