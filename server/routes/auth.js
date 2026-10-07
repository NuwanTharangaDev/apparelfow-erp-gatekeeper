import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../db.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, email, password_hash, role, full_name FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    )
    const user = rows[0]
    const passwordOk = user && (await bcrypt.compare(password, user.password_hash))

    if (!passwordOk) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '8h',
    })

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
    })

    res.json({ id: user.id, email: user.email, fullName: user.full_name, role: user.role })
  } catch (err) {
    console.error('Login failed:', err.message)
    res.status(500).json({ message: 'Something went wrong' })
  }
})

export default router