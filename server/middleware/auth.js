import jwt from 'jsonwebtoken'

export function requireLogin(req, res, next) {
  const token = req.cookies.token
  if (!token) {
    return res.status(401).json({ message: 'Please log in' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = { id: payload.id, role: payload.role }
    next()
  } catch {
    res.status(401).json({ message: 'Session expired, please log in again' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do this' })
    }
    next()
  }
}