import { Router } from 'express'
import pool from '../db.js'
import { requireLogin, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(requireLogin, requireRole('sewing_supervisor'))

router.get('/queue', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.id, o.order_no, o.target_qty, o.fabric_roll_id,
             o.wastage_cap::float8 AS wastage_cap,
             r.name AS recipe_name,
             l.wastage_pct::float8 AS wastage_pct, l.decided_at,
             u.full_name AS verifier_name
      FROM cutting_orders o
      JOIN recipes r ON r.id = o.recipe_id
      JOIN verification_logs l ON l.order_id = o.id AND l.decision = 'APPROVED'
      JOIN users u ON u.id = l.verifier_id
      WHERE o.status = 'VERIFIED'
      ORDER BY l.decided_at
    `)

    res.json(
      rows.map((row) => ({
        id: row.id,
        orderNo: row.order_no,
        recipeName: row.recipe_name,
        targetQty: row.target_qty,
        fabricRollId: row.fabric_roll_id,
        verifierName: row.verifier_name,
        verifiedAt: row.decided_at,
        wastagePct: row.wastage_pct,
        overCap: row.wastage_pct > row.wastage_cap,
      }))
    )
  } catch (err) {
    console.error('Could not load sewing queue:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id < 1) {
    return res.status(404).json({ message: 'Order not found' })
  }

  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.order_no, o.target_qty, o.fabric_roll_id, o.actual_fabric_yds,
              o.expected_fabric_yds::float8 AS expected_fabric_yds,
              o.wastage_cap::float8 AS wastage_cap,
              r.name AS recipe_name,
              l.wastage_pct::float8 AS wastage_pct, l.decided_at,
              l.approval_note, l.variance_snapshot,
              u.full_name AS verifier_name
       FROM cutting_orders o
       JOIN recipes r ON r.id = o.recipe_id
       JOIN verification_logs l ON l.order_id = o.id AND l.decision = 'APPROVED'
       JOIN users u ON u.id = l.verifier_id
       WHERE o.id = $1 AND o.status = 'VERIFIED'`,
      [id]
    )
    const order = rows[0]
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    res.json({
      id: order.id,
      orderNo: order.order_no,
      recipeName: order.recipe_name,
      targetQty: order.target_qty,
      fabricRollId: order.fabric_roll_id,
      actualFabricYds: order.actual_fabric_yds,
      expectedFabricYds: order.expected_fabric_yds,
      wastagePct: order.wastage_pct,
      wastageCap: order.wastage_cap,
      overCap: order.wastage_pct > order.wastage_cap,
      verifierName: order.verifier_name,
      verifiedAt: order.decided_at,
      verifierNote: order.approval_note,
      components: order.variance_snapshot,
    })
  } catch (err) {
    console.error('Could not load sewing order:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

router.post('/:id/start', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id < 1) {
    return res.status(404).json({ message: 'Order not found' })
  }

  try {
    const { rows } = await pool.query(
      `UPDATE cutting_orders
       SET status = 'SEWING_IN_PROGRESS', sewing_started_by = $2,
           sewing_started_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'VERIFIED'
       RETURNING sewing_started_at`,
      [id, req.user.id]
    )

    if (rows.length === 0) {
      const current = await pool.query('SELECT status FROM cutting_orders WHERE id = $1', [id])
      if (current.rows[0]?.status === 'SEWING_IN_PROGRESS') {
        return res.status(409).json({ message: 'Sewing has already started on this order' })
      }
      return res.status(404).json({ message: 'Order not found' })
    }

    res.json({ id, status: 'SEWING_IN_PROGRESS', startedAt: rows[0].sewing_started_at })
  } catch (err) {
    console.error('Could not start sewing:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

export default router