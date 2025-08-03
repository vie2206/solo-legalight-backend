// Save this as: level-up-v2/backend/routes/auth.js

const express = require('express')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const jwt = require('jsonwebtoken')
const { createClient } = require('@supabase/supabase-js')

const router = express.Router()

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

console.log('🔐 OAuth Configuration:', {
  clientId: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing',
  frontendUrl: process.env.FRONTEND_URL
})

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google OAuth Profile:', profile)
    
    // Check if user exists in database
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', profile.emails[0].value)
      .single()

    if (existingUser && !fetchError) {
      // User exists, return user
      return done(null, existingUser)
    }

    // Create new user
    const userData = {
      email: profile.emails[0].value,
      name: profile.displayName,
      google_id: profile.id,
      picture: profile.photos[0]?.value,
      role: 'student', // Default role
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single()

    if (createError) {
      console.error('Error creating user:', createError)
      return done(createError, null)
    }

    console.log('New user created:', newUser)
    return done(null, newUser)

  } catch (error) {
    console.error('OAuth error:', error)
    return done(error, null)
  }
}))

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return done(error, null)
    }
    
    done(null, user)
  } catch (error) {
    done(error, null)
  }
})

// Routes
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
)

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}?error=auth_failed` }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: req.user.id, 
          email: req.user.email,
          role: req.user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      )

      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}?token=${token}`)
    } catch (error) {
      console.error('Token generation error:', error)
      res.redirect(`${process.env.FRONTEND_URL}?error=token_failed`)
    }
  }
)

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
      .select('id, email, name, role, picture, target_nlu, target_score')
      .eq('id', decoded.userId)
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
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' })
    }
    res.json({ message: 'Logged out successfully' })
  })
})

module.exports = router