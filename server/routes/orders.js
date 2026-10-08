import { Router } from 'express'
import pool from '../db.js'
import { requireLogin, requireRole } from '../middleware/auth.js'
import { getExpectedFabric } from '../domain.js'

const router = Router()

router.use(requireLogin)

router.post('/', requireRole('cutting_supervisor'), async (req, res) => {
  const { recipeId, targetQty, fabricRollId, actualFabricYds } = req.body ?? {}
  const errors = {}

router.get('/', requireRole('cutting_supervisor'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.id, o.order_no, o.status, o.target_qty, o.fabric_roll_id,
             o.actual_fabric_yds, o.expected_fabric_yds::float8 AS expected_fabric_yds,
             o.created_at, r.recipe_code, r.name AS recipe_name,
             (SELECT l.rejection_note FROM verification_logs l
              WHERE l.order_id = o.id AND l.decision = 'REJECTED'
              ORDER BY l.decided_at DESC LIMIT 1) AS rejection_note
      FROM cutting_orders o
      JOIN recipes r ON r.id = o.recipe_id
      ORDER BY o.id DESC
    `)

    res.json(
      rows.map((row) => ({
        id: row.id,
        orderNo: row.order_no,
        status: row.status,
        recipeCode: row.recipe_code,
        recipeName: row.recipe_name,
        targetQty: row.target_qty,
        fabricRollId: row.fabric_roll_id,
        actualFabricYds: row.actual_fabric_yds,
        expectedFabricYds: row.expected_fabric_yds,
        rejectionNote: row.rejection_note,
        createdAt: row.created_at,
      }))
    )
  } catch (err) {
    console.error('Could not load orders:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})


  if (!Number.isInteger(recipeId) || recipeId < 1) {
    errors.recipeId = 'Choose a recipe'
  }
  if (!Number.isInteger(targetQty) || targetQty < 1 || targetQty > 10000) {
    errors.targetQty = 'Enter a whole number from 1 to 10000'
  }
  if (typeof fabricRollId !== 'string' || !fabricRollId.trim() || fabricRollId.trim().length > 40) {
    errors.fabricRollId = 'Enter the fabric roll ID (up to 40 characters)'
  }
  if (!Number.isInteger(actualFabricYds) || actualFabricYds < 1 || actualFabricYds > 100000) {
    errors.actualFabricYds = 'Enter whole yards from 1 to 100000'
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ message: 'Please fix the highlighted fields', errors })
  }

  const client = await pool.connect()
  try {
    const recipeResult = await client.query(
      'SELECT id, std_fabric_yards, wastage_cap FROM recipes WHERE id = $1',
      [recipeId]
    )
    const recipe = recipeResult.rows[0]
    if (!recipe) {
      return res.status(422).json({
        message: 'Please fix the highlighted fields',
        errors: { recipeId: 'Recipe not found' },
      })
    }

    const expectedFabric = getExpectedFabric(targetQty, recipe.std_fabric_yards)

    await client.query('BEGIN')

    const orderResult = await client.query(
      `INSERT INTO cutting_orders
         (recipe_id, target_qty, fabric_roll_id, actual_fabric_yds,
          expected_fabric_yds, wastage_cap, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, order_no, status`,
      [recipe.id, targetQty, fabricRollId.trim(), actualFabricYds,
        expectedFabric, recipe.wastage_cap, req.user.id]
    )
    const order = orderResult.rows[0]

    await client.query(
      `INSERT INTO verification_items (order_id, component_id, expected_qty)
       SELECT $1::int, id, pieces_per_garment * $2::int
       FROM recipe_components WHERE recipe_id = $3::int`,
      [order.id, targetQty, recipe.id]
    )

    await client.query('COMMIT')
    res.status(201).json({ id: order.id, orderNo: order.order_no, status: order.status })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Could not create order:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  } finally {
    client.release()
  }
})

export default router