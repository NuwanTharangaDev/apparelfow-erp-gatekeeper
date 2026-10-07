import express from 'express'
import cors from 'cors'
import pool from './db.js'
import authRoutes from './routes/auth.js'
import cookieParser from 'cookie-parser'
import recipeRoutes from './routes/recipes.js'

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use('/api/auth', authRoutes)
app.use('/api/recipes', recipeRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS time')
    res.json({ status: 'ok', time: result.rows[0].time })
  } catch (err) {
    console.error('Database check failed:', err.message)
    res.status(500).json({ status: 'error' })
  }
})

export default app