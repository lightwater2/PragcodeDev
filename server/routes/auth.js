import express from 'express'
import { generateToken, verifyToken } from '../middleware/auth.js'
import { findUserByUsername, createUser, verifyPassword } from '../db/users.js'

const router = express.Router()

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }
    
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' })
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    
    // Create user (default role is 'user')
    const user = await createUser(username, password)
    
    // Generate token
    const token = generateToken(user)
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    })
  } catch (error) {
    if (error.message === 'Username already exists') {
      return res.status(400).json({ error: error.message })
    }
    console.error('Signup error:', error)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }
    
    // Find user
    const user = await findUserByUsername(username)
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    
    // Generate token
    const token = generateToken(user)
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Verify token route
router.get('/verify', verifyToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  })
})

export default router