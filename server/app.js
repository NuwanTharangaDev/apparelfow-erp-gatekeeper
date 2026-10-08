import express from 'express'
import pool from './db.js'
import authRoutes from './routes/auth.js'
import cookieParser from 'cookie-parser'
import recipeRoutes from './routes/recipes.js'
import { fileURLToPath } from 'url'
import orderRoutes from './routes/orders.js'

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use('/api/auth', authRoutes)
app.use('/api/recipes', recipeRoutes)
app.use('/api/orders', orderRoutes)

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
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found' })
})

if (process.env.NODE_ENV === 'production') {
  const clientDist = fileURLToPath(new URL('../client/dist', import.meta.url))

  app.use(express.static(clientDist))
  app.use((req, res) => {
    res.sendFile('index.html', { root: clientDist })
  })
}

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON' })
  }
  console.error('Unhandled error:', err.message)
  res.status(500).json({ message: 'Something went wrong' })
})



export default app