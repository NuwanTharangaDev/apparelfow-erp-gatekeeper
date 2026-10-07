import { Router } from 'express'
import pool from '../db.js'
import { requireLogin, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(requireLogin, requireRole('cutting_supervisor', 'cutting_verifier'))

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.id, r.recipe_code, r.name, r.category,
             r.std_fabric_yards::float8 AS std_fabric_yards,
             r.wastage_cap::float8 AS wastage_cap,
             json_agg(
               json_build_object(
                 'id', c.id,
                 'name', c.component_name,
                 'piecesPerGarment', c.pieces_per_garment
               ) ORDER BY c.id
             ) AS components
      FROM recipes r
      JOIN recipe_components c ON c.recipe_id = r.id
      GROUP BY r.id
      ORDER BY r.id
    `)

    res.json(
      rows.map((row) => ({
        id: row.id,
        code: row.recipe_code,
        name: row.name,
        category: row.category,
        stdFabricYards: row.std_fabric_yards,
        wastageCap: row.wastage_cap,
        components: row.components,
      }))
    )
  } catch (err) {
    console.error('Could not load recipes:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

export default router