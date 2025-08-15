// SMS-only Authentication Routes
// No Google OAuth - SMS authentication only

const express = require('express')
const jwt = require('jsonwebtoken')
const { createClient } = require('@supabase/supabase-js')

const router = express.Router()

// Initialize Supabase with fallback
let supabase
try {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
  console.log('✅ Supabase client initialized in auth.js')
} catch (error) {
  console.error('❌ Failed to initialize Supabase in auth.js:', error.message)
}

console.log('📱 SMS Auth Configuration:', {
  supabaseUrl: process.env.SUPABASE_URL ? 'Set' : 'Missing',
  supabaseKey: process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Missing',
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

// SMS Authentication Routes
// Store OTPs temporarily (in production, use Redis)
const otpStore = new Map()

// Generate random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send OTP via SMS (Demo Mode)
router.post('/send-otp', async (req, res) => {
  try {
    const { phone, role, name } = req.body

    if (!phone || !role || !name) {
      return res.status(400).json({ 
        error: 'Phone number, role, and name are required' 
      })
    }

    // Generate OTP
    const otp = generateOTP()
    
    // Store OTP temporarily (expires in 5 minutes)
    otpStore.set(phone, {
      otp,
      role,
      name,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    })

    // For demo mode, return the OTP in response
    const isDemoMode = process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true'
    
    console.log(`📱 Demo OTP for ${phone}: ${otp}`)
    
    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      testOtp: otp // Always return for demo
    })

  } catch (error) {
    console.error('Send OTP error:', error)
    res.status(500).json({ 
      error: 'Failed to send OTP',
      details: error.message 
    })
  }
})

// Verify OTP and register/login user
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body

    if (!phone || !otp) {
      return res.status(400).json({ 
        error: 'Phone number and OTP are required' 
      })
    }

    // Check OTP
    const storedData = otpStore.get(phone)
    
    if (!storedData) {
      return res.status(400).json({ 
        error: 'OTP not found or expired' 
      })
    }

    if (storedData.expires < Date.now()) {
      otpStore.delete(phone)
      return res.status(400).json({ 
        error: 'OTP expired' 
      })
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ 
        error: 'Invalid OTP' 
      })
    }

    // OTP verified, clear it
    otpStore.delete(phone)

    // Check if user exists
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase query error:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        supabaseUrl: process.env.SUPABASE_URL ? 'Set' : 'Missing',
        supabaseKey: process.env.SUPABASE_SERVICE_KEY ? 'Set (length: ' + process.env.SUPABASE_SERVICE_KEY.length + ')' : 'Missing'
      })
      return res.status(500).json({ 
        error: 'Database connection error',
        details: error.message,
        code: error.code
      })
    }

    // Create new user if doesn't exist
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            phone: phone,
            name: storedData.name,
            role: storedData.role,
            phone_verified: true,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (createError) {
        console.error('User creation error:', {
          error: createError.message,
          code: createError.code,
          details: createError.details,
          hint: createError.hint
        })
        return res.status(500).json({ 
          error: 'Failed to create user',
          details: createError.message,
          code: createError.code
        })
      }

      user = newUser
    } else {
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ 
          phone_verified: true,
          name: storedData.name,
          role: storedData.role
        })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('User update error:', {
          error: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint
        })
        return res.status(500).json({ 
          error: 'Failed to update user',
          details: updateError.message,
          code: updateError.code
        })
      }

      user = updatedUser
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        phone: user.phone, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        phone_verified: user.phone_verified
      }
    })

  } catch (error) {
    console.error('Verify OTP error:', error)
    res.status(500).json({ 
      error: 'Failed to verify OTP',
      details: error.message 
    })
  }
})

module.exports = router