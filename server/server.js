import 'dotenv/config'
import app from './app.js'

if (!process.env.JWT_SECRET || !process.env.DATABASE_URL) {
  console.error('JWT_SECRET and DATABASE_URL must be set')
  process.exit(1)
}

const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})