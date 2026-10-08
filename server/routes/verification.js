import { Router } from 'express'
import pool from '../db.js'
import { requireLogin, requireRole } from '../middleware/auth.js'
import { getWastagePct } from '../domain.js'

const router = Router()

router.use(requireLogin, requireRole('cutting_verifier'))

router.get('/queue', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.id, o.order_no, o.target_qty, o.fabric_roll_id, o.created_at,
             r.recipe_code, r.name AS recipe_name,
             COUNT(i.actual_qty)::int AS counted,
             COUNT(i.id)::int AS total
      FROM cutting_orders o
      JOIN recipes r ON r.id = o.recipe_id
      JOIN verification_items i ON i.order_id = o.id
      WHERE o.status = 'PENDING_VERIFICATION'
      GROUP BY o.id, r.id
      ORDER BY o.id
    `)

    res.json(
      rows.map((row) => ({
        id: row.id,
        orderNo: row.order_no,
        recipeCode: row.recipe_code,
        recipeName: row.recipe_name,
        targetQty: row.target_qty,
        fabricRollId: row.fabric_roll_id,
        counted: row.counted,
        total: row.total,
        createdAt: row.created_at,
      }))
    )
  } catch (err) {
    console.error('Could not load verification queue:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id < 1) {
    return res.status(404).json({ message: 'Order not found' })
  }

  try {
    const orderResult = await pool.query(
      `SELECT o.id, o.order_no, o.target_qty, o.fabric_roll_id, o.actual_fabric_yds,
              o.expected_fabric_yds::float8 AS expected_fabric_yds,
              o.wastage_cap::float8 AS wastage_cap,
              r.recipe_code, r.name AS recipe_name
       FROM cutting_orders o
       JOIN recipes r ON r.id = o.recipe_id
       WHERE o.id = $1 AND o.status = 'PENDING_VERIFICATION'`,
      [id]
    )
    const order = orderResult.rows[0]
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    const itemResult = await pool.query(
      `SELECT i.id, c.component_name, i.expected_qty, i.actual_qty, i.status
       FROM verification_items i
       JOIN recipe_components c ON c.id = i.component_id
       WHERE i.order_id = $1
       ORDER BY c.id`,
      [id]
    )

    const wastagePct = getWastagePct(order.actual_fabric_yds, order.expected_fabric_yds)

    res.json({
      id: order.id,
      orderNo: order.order_no,
      recipeCode: order.recipe_code,
      recipeName: order.recipe_name,
      targetQty: order.target_qty,
      fabricRollId: order.fabric_roll_id,
      actualFabricYds: order.actual_fabric_yds,
      expectedFabricYds: order.expected_fabric_yds,
      wastagePct,
      wastageCap: order.wastage_cap,
      overCap: wastagePct > order.wastage_cap,
      items: itemResult.rows.map((row) => ({
        id: row.id,
        name: row.component_name,
        expectedQty: row.expected_qty,
        actualQty: row.actual_qty,
        status: row.status,
      })),
    })
  } catch (err) {
    console.error('Could not load order for verification:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

export default router