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

export default router