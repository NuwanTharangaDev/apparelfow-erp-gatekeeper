import 'dotenv/config'
import pool from './db.js'

const orders = await pool.query(
  `SELECT order_no, target_qty, actual_fabric_yds, expected_fabric_yds,
          wastage_cap, status, created_by
   FROM cutting_orders ORDER BY id`
)
console.table(orders.rows)

const items = await pool.query(
  `SELECT o.order_no, c.component_name, i.expected_qty, i.actual_qty, i.status
   FROM verification_items i
   JOIN cutting_orders o ON o.id = i.order_id
   JOIN recipe_components c ON c.id = i.component_id
   ORDER BY o.id, c.id`
)
console.table(items.rows)

await pool.end()