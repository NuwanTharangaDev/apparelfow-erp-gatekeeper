import 'dotenv/config'
import fs from 'fs'
import pool from './db.js'

const schema = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')

try {
  await pool.query(schema)
  console.log('Schema applied')
} catch (err) {
  console.error('Schema failed:', err.message)
  process.exitCode = 1
} finally {
  await pool.end()
}