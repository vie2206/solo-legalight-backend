// SMS-only Authentication Routes
// No Google OAuth - SMS authentication only

const express = require('express')
const jwt = require('jsonwebtoken')
const { createClient } = require('@supabase/supabase-js')

const router = express.Router()

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

console.log('📱 SMS Auth Configuration:', {
  twilioSid: process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Missing',
  twilioToken: process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Missing',
  frontendUrl: process.env.FRONTEND_URL
})

// Check authentication status
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, phone, target_nlu, target_score, phone_verified')
      .eq('id', decoded.id)
      .single()

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    res.json({ user })
  } catch (error) {
    console.error('Auth check error:', error)
    res.status(401).json({ error: 'Invalid token' })
  }
})

// Logout
router.post('/logout', (req, res) => {
  // For JWT-based auth, logout is handled client-side by removing the token
  res.json({ message: 'Logged out successfully' })
})

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Generate new token
    const newToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ token: newToken })
  } catch (error) {
    console.error('Token refresh error:', error)
    res.status(401).json({ error: 'Invalid token' })
  }
})

module.exports = router