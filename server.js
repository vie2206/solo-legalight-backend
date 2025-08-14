// Enhanced Level Up Backend Server with Student Planning System
require('dotenv').config();
const express = require('express');
const session = require('express-session');        // ADD THIS
// Passport removed - using SMS auth only
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { randomUUID } = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:4000'
    ],
    credentials: true
  }
});
const PORT = process.env.PORT || 8000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://localhost:4000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.json());

// Session and Passport middleware
const sessionSecret = process.env.SESSION_SECRET || 'level-up-v2-session-secret-fallback';
if (!process.env.SESSION_SECRET) {
  console.warn('⚠️  SESSION_SECRET not found in environment variables. Using fallback.');
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware removed - using SMS auth only

// Google OAuth removed - using SMS authentication only

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data from auth.users table
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access control
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// ===============================
// AUTHENTICATION ROUTES
// ===============================

// User Registration (works with existing table structure)
app.post('/api/auth/register', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('role').isIn(['student', 'educator', 'parent', 'admin', 'operation_manager']).withMessage('Valid role is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email, password, name, role } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with essential fields only
    const { data: user, error } = await supabase
      .from('users')
      .insert([
        {
          email: email.toLowerCase(),
          encrypted_password: hashedPassword,
          name,
          role
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Failed to create user account' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ New ${role} registered:`, email);

    // Remove sensitive data from response
    const { encrypted_password, confirmation_token, recovery_token, ...userResponse } = user;

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// User Login (works with existing table structure)
app.post('/api/auth/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.encrypted_password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq('id', user.id);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ ${user.role} logged in:`, user.email);

    // Remove sensitive data from response
    const { encrypted_password, confirmation_token, recovery_token, ...userResponse } = user;

    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get Current User
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { encrypted_password, confirmation_token, recovery_token, ...userResponse } = req.user;
    res.json({ user: userResponse });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    console.log(`✅ ${req.user.role} logged out:`, req.user.email);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ===============================
// AUTHENTICATION ROUTES
// ===============================

// Demo login route for testing all user types
app.post('/api/auth/demo-login', async (req, res) => {
  try {
    const { role } = req.body;
    
    // Demo users for testing
    const demoUsers = {
      student: {
        id: 'demo-student-001',
        email: 'student@demo.com',
        name: 'Demo Student',
        role: 'student'
      },
      admin: {
        id: 'demo-admin-001',
        email: 'admin@demo.com',
        name: 'Demo Admin',
        role: 'admin'
      },
      educator: {
        id: 'demo-educator-001',
        email: 'educator@demo.com',
        name: 'Demo Educator',
        role: 'educator'
      },
      parent: {
        id: 'demo-parent-001',
        email: 'parent@demo.com',
        name: 'Demo Parent',
        role: 'parent'
      }
    };
    
    const user = demoUsers[role] || demoUsers.student;
    
    // Create or update user in database
    const { error } = await supabase
      .from('users')
      .upsert({
        ...user
      }, {
        onConflict: 'email'
      });
    
    if (error && error.code !== '23505') { // Ignore duplicate key errors
      console.error('Demo user creation error:', error);
    }
    
    // Generate token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      success: true, 
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: 'Demo login failed' });
  }
});

// ===============================
// SMS AUTHENTICATION ROUTES
// ===============================

// Initialize Twilio client
const twilio = require('twilio');
let twilioClient;

// Only initialize Twilio if credentials are provided
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Twilio client:', error.message);
    twilioClient = null;
  }
} else {
  console.warn('⚠️  Twilio credentials not found. SMS functionality will be disabled.');
  console.warn('⚠️  Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN');
  twilioClient = null;
}

// Send OTP via SMS
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone, role, name } = req.body;
    
    // Validate input
    if (!phone || !role) {
      return res.status(400).json({ error: 'Phone number and role are required' });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    
    // Save OTP to database
    const { error: dbError } = await supabase
      .from('users')
      .upsert({
        id: phone.replace(/[^0-9]/g, ''), // Use cleaned phone as ID
        phone: phone,
        email: `${phone.replace(/[^0-9]/g, '')}@sms.levelup.com`, // Generate email from phone
        role: role,
        name: name || `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
        otp_code: otp,
        otp_expires: otpExpires.toISOString(),
        phone_verified: false
      }, {
        onConflict: 'id'
      });
    
    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Failed to save OTP' });
    }
    
    // Send SMS via Twilio
    if (!twilioClient) {
      console.warn('⚠️  Twilio client not available. Using test mode.');
      console.log(`📱 TEST MODE - OTP for ${phone}: ${otp}`);
      return res.json({ 
        success: true, 
        message: 'OTP generated (SMS disabled - check server logs)',
        testMode: true 
      });
    }
    
    try {
      await twilioClient.messages.create({
        body: `Your Level Up CLAT verification code is: ${otp}. Valid for 5 minutes. Don't share this code.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      
      console.log(`📱 OTP sent to ${phone}`);
      res.json({ success: true, message: 'OTP sent successfully' });
      
    } catch (twilioError) {
      console.error('Twilio SMS error:', twilioError);
      
      // Fallback to test mode only in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🧪 FALLBACK TEST MODE: OTP for ${phone}: ${otp}`);
        res.json({ 
          success: true, 
          message: 'OTP sent (Test Mode - Check Console)',
          testOtp: otp 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Failed to send SMS. Please try again.' 
        });
      }
    }
    
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Server error while sending OTP' });
  }
});

// Verify OTP and login
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }
    
    // Find user with matching phone and OTP
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .eq('otp_code', otp)
      .gt('otp_expires', new Date().toISOString())
      .single();
    
    if (error || !user) {
      console.log('OTP verification failed:', { phone, otp, error });
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }
    
    // Update user as verified and clear OTP
    const { error: updateError } = await supabase
      .from('users')
      .update({
        phone_verified: true,
        otp_code: null,
        otp_expires: null,
        last_sign_in_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('Update user error:', updateError);
    }
    
    // Generate JWT token (same as existing system)
    const token = jwt.sign(
      { 
        id: user.id, 
        phone: user.phone, 
        role: user.role,
        email: user.email // Keep for compatibility
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log(`✅ ${user.role} logged in via SMS:`, user.phone);
    
    // Return success response (same format as demo login)
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
        phone_verified: true
      }
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Server error during OTP verification' });
  }
});

// ===============================
// GOOGLE OAUTH ROUTES
// ===============================

// Google OAuth routes removed - using SMS authentication only

// ===============================
// ANALYTICS ROUTES (USING EXISTING COLUMNS)
// ===============================

// Get user dashboard analytics (uses existing columns)
app.get('/api/analytics/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let analytics;
    
    if (userRole === 'student') {
      // Use existing columns from the user table
      analytics = {
        mockTestsTaken: req.user.total_tests || 0,
        averageScore: Math.round(req.user.average_score || 0),
        bestScore: req.user.best_score || 0,
        currentStreak: req.user.current_streak || 0,
        improvement: 0, // Will calculate from historical data later
        targetProgress: req.user.target_score ? Math.round((req.user.average_score / req.user.target_score) * 100) : 0,
        studyHours: req.user.total_study_hours || 0
      };
    } else if (userRole === 'educator') {
      analytics = {
        totalStudents: 0, // Will query assigned students
        averageClassScore: 0,
        topPerformer: null,
        weakAreas: [],
        improvementRate: 0
      };
    } else if (userRole === 'parent') {
      analytics = {
        childrenCount: req.user.children_ids ? req.user.children_ids.length : 0,
        overallProgress: 0,
        lastTestScore: 0,
        studyHoursThisWeek: 0
      };
    } else if (userRole === 'operation_manager') {
      analytics = {
        totalUsers: 0,
        activeStudents: 0,
        revenueThisMonth: 0,
        userGrowthRate: 0
      };
    } else if (userRole === 'admin') {
      analytics = {
        totalPlatformUsers: 0,
        institutesCount: 0,
        systemHealth: 100,
        dailyActiveUsers: 0
      };
    }

    console.log(`📊 ${userRole} analytics for user:`, userId);
    res.json(analytics);
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ===============================
// ADMIN DASHBOARD ROUTES
// ===============================

// Get admin statistics
app.get('/api/admin/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Get total users count
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, role, created_at, last_sign_in_at')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return res.status(500).json({ error: 'Failed to fetch user statistics' });
    }

    const totalUsers = users?.length || 0;
    const activeStudents = users?.filter(u => u.role === 'student').length || 0;
    const totalInstitutes = 15; // Static for now
    const monthlyRevenue = 125000; // Static for now
    
    // Calculate new signups today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newSignupsToday = users?.filter(u => {
      const createdAt = new Date(u.created_at);
      return createdAt >= today;
    }).length || 0;

    // Calculate daily active users (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dailyActiveUsers = users?.filter(u => {
      if (!u.last_sign_in_at) return false;
      const lastLogin = new Date(u.last_sign_in_at);
      return lastLogin >= yesterday;
    }).length || 0;

    const stats = {
      totalUsers,
      activeStudents,
      totalInstitutes,
      monthlyRevenue,
      systemHealth: 98,
      dailyActiveUsers,
      totalContent: 1580, // Static for now
      newSignupsToday
    };

    console.log(`📊 Admin stats requested by:`, req.user.email);
    res.json({ success: true, stats });
    
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

// Get all users for admin management
app.get('/api/admin/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role, created_at, last_sign_in_at, phone_verified')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    // Format users for admin table
    const formattedUsers = users?.map(user => ({
      id: user.id,
      name: user.name || 'N/A',
      email: user.email || 'N/A',
      phone: user.phone || 'N/A',
      role: user.role,
      status: user.phone_verified ? 'active' : 'inactive',
      lastLogin: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never',
      institute: 'N/A', // Will be populated when we add institute relationship
      subscription: 'premium', // Mock data
      totalSpent: Math.floor(Math.random() * 50000) + 5000,
      testsCompleted: Math.floor(Math.random() * 100) + 10,
      avgScore: Math.floor(Math.random() * 30) + 60,
      joinedDate: new Date(user.created_at).toLocaleDateString()
    })) || [];

    console.log(`👥 User list requested by admin:`, req.user.email);
    res.json({ success: true, users: formattedUsers });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get institutes for admin management
app.get('/api/admin/institutes', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Mock institute data for now
    const institutes = [
      {
        id: '1', name: 'Delhi Law Academy', location: 'New Delhi', contactPerson: 'Dr. Suresh Kumar',
        email: 'info@delhilawacademy.com', phone: '+91-11-12345678', studentsCount: 245,
        status: 'active', subscriptionType: 'Enterprise', monthlyRevenue: 125000, joinedDate: '2023-01-15'
      },
      {
        id: '2', name: 'Mumbai Legal Institute', location: 'Mumbai', contactPerson: 'Prof. Meera Joshi',
        email: 'contact@mumbailegal.edu', phone: '+91-22-87654321', studentsCount: 180,
        status: 'active', subscriptionType: 'Professional', monthlyRevenue: 95000, joinedDate: '2023-03-10'
      },
      {
        id: '3', name: 'Bangalore Law College', location: 'Bangalore', contactPerson: 'Dr. Rajesh Nair',
        email: 'admin@blawcollege.edu', phone: '+91-80-98765432', studentsCount: 320,
        status: 'active', subscriptionType: 'Enterprise', monthlyRevenue: 165000, joinedDate: '2022-11-20'
      },
      {
        id: '4', name: 'Chennai Legal Academy', location: 'Chennai', contactPerson: 'Prof. Lakshmi Iyer',
        email: 'info@clegalacademy.org', phone: '+91-44-55666777', studentsCount: 150,
        status: 'pending', subscriptionType: 'Professional', monthlyRevenue: 0, joinedDate: '2024-01-25'
      }
    ];

    console.log(`🏫 Institute list requested by admin:`, req.user.email);
    res.json({ success: true, institutes });
    
  } catch (error) {
    console.error('Error fetching institutes:', error);
    res.status(500).json({ error: 'Failed to fetch institutes' });
  }
});

// Get content for admin management
app.get('/api/admin/content', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Mock content data for now
    const content = [
      {
        id: '1', title: 'Constitutional Law Fundamentals', type: 'passage', category: 'Legal Reasoning',
        difficulty: 'medium', status: 'published', author: 'Dr. Legal Expert', createdDate: '2024-01-15',
        views: 1250, completions: 890
      },
      {
        id: '2', title: 'CLAT Mock Test 2024 - Set 1', type: 'mock_test', category: 'Full Test',
        difficulty: 'hard', status: 'published', author: 'Test Team', createdDate: '2024-01-10',
        views: 2100, completions: 456
      },
      {
        id: '3', title: 'Contract Law Basics', type: 'passage', category: 'Legal Reasoning',
        difficulty: 'easy', status: 'published', author: 'Prof. Contract Law', createdDate: '2024-01-12',
        views: 950, completions: 678
      },
      {
        id: '4', title: 'Legal Vocabulary Set A', type: 'vocabulary', category: 'Vocabulary',
        difficulty: 'medium', status: 'draft', author: 'Vocabulary Team', createdDate: '2024-01-20',
        views: 0, completions: 0
      },
      {
        id: '5', title: 'Current Affairs - January 2024', type: 'question', category: 'Current Affairs',
        difficulty: 'medium', status: 'review', author: 'Current Affairs Team', createdDate: '2024-01-18',
        views: 340, completions: 234
      }
    ];

    console.log(`📚 Content list requested by admin:`, req.user.email);
    res.json({ success: true, content });
    
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Get financial data for admin
app.get('/api/admin/financial', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Mock financial data
    const financial = {
      totalRevenue: 2450000,
      monthlyRevenue: 485000,
      yearlyRevenue: 5820000,
      pendingPayments: 125000,
      refunds: 15000,
      subscriptions: {
        free: 1200,
        premium: 850,
        elite: 380
      }
    };

    console.log(`💰 Financial data requested by admin:`, req.user.email);
    res.json({ success: true, financial });
    
  } catch (error) {
    console.error('Error fetching financial data:', error);
    res.status(500).json({ error: 'Failed to fetch financial data' });
  }
});

// Create new user (Admin function)
app.post('/api/admin/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, phone, role, password } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Name, email, and role are required' });
    }

    // Hash password
    const hashedPassword = password ? await bcrypt.hash(password, 12) : await bcrypt.hash('defaultpassword123', 12);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert([{
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        role,
        encrypted_password: hashedPassword,
        created_at: new Date().toISOString(),
        phone_verified: true // Admin created users are auto-verified
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    console.log(`✅ New ${role} created by admin:`, email);
    res.json({ success: true, message: 'User created successfully', user: { id: user.id, name, email, role } });
    
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (Admin function)
app.put('/api/admin/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, status } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email.toLowerCase();
    if (phone) updates.phone = phone;
    if (role) updates.role = role;
    if (status !== undefined) updates.phone_verified = status === 'active';

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }

    console.log(`🔄 User updated by admin:`, user.email);
    res.json({ success: true, message: 'User updated successfully', user });
    
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (Admin function)
app.delete('/api/admin/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ error: 'Failed to delete user' });
    }

    console.log(`🗑️ User deleted by admin:`, id);
    res.json({ success: true, message: 'User deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ===============================
// STUDENT PLANNING SYSTEM ROUTES
// ===============================

// Save Student Planning Data
app.post('/api/planning/save', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const {
      mockTestId,
      testName,
      testDate,
      difficultyLevel,
      strategicGoals,
      sectionStrategy,
      omrStrategy,
      attemptSequence
    } = req.body;

    const userId = req.user.id;

    // Prepare planning data with proper structure
    const planningData = {
      user_id: userId,
      mock_test_id: mockTestId,
      test_name: testName,
      test_date: testDate,
      difficulty_level: difficultyLevel,
      strategic_goals: JSON.stringify(strategicGoals),
      section_strategy: JSON.stringify(sectionStrategy),
      omr_strategy: JSON.stringify(omrStrategy),
      attempt_sequence: JSON.stringify(attemptSequence),
      created_at: new Date().toISOString(),
      is_active: true
    };

    const { data, error } = await supabase
      .from('student_planning_data')
      .insert([planningData])
      .select()
      .single();

    if (error) {
      console.error('Planning save error:', error);
      return res.status(500).json({ error: 'Failed to save planning data' });
    }

    console.log(`✅ Planning data saved for user: ${userId}, Test: ${testName}`);
    res.status(201).json({
      message: 'Planning data saved successfully',
      planningId: data.id
    });

  } catch (error) {
    console.error('Error saving planning data:', error);
    res.status(500).json({ error: 'Server error during planning save' });
  }
});

// Get User's Planning Data
app.get('/api/planning/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ensure user can only access their own data (or admin/operation_manager can access any)
    if (req.user.id !== userId && !['admin', 'operation_manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('student_planning_data')
      .select(`
        *,
        mock_test_templates!student_planning_data_mock_test_id_fkey (
          id,
          name,
          test_date,
          difficulty_level
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`📊 Planning data requested for user: ${userId}`);
    res.json(data || []);

  } catch (error) {
    console.error('Error fetching user planning data:', error);
    res.status(500).json({ error: 'Failed to fetch planning data' });
  }
});

// Get All Planning Data for Current User
app.get('/api/student-planning', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('student_planning_data')
      .select(`
        *,
        mock_test_templates!student_planning_data_mock_test_id_fkey (
          id,
          name,
          test_date,
          difficulty_level
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`📊 Planning data requested for user: ${userId}`);
    res.json(data || []);

  } catch (error) {
    console.error('Error fetching user planning data:', error);
    res.status(500).json({ error: 'Failed to fetch planning data' });
  }
});
// ===============================
// MOCK TEST MANAGEMENT ROUTES (CORRECTED - NO DUPLICATES)
// ===============================

// Get all mock test templates (admin and operation_manager only)
app.get('/api/admin/mock-tests', authenticateToken, requireRole(['admin', 'operation_manager']), async (req, res) => {
  try {
    const { data: mockTests, error } = await supabase
      .from('mock_test_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`📝 Mock test templates requested by ${req.user.role}:`, req.user.email);
    res.json({ mockTests: mockTests || [] });
  } catch (error) {
    console.error('Error fetching mock test templates:', error);
    res.status(500).json({ error: 'Failed to fetch mock tests' });
  }
});

// Create new mock test template (admin and operation_manager only)
app.post('/api/admin/mock-tests', [
  body('name').trim().notEmpty().withMessage('Test name is required'),
  body('test_date').isISO8601().withMessage('Valid test date is required'),
  body('series_provider').trim().notEmpty().withMessage('Series provider is required'),
  body('difficulty_level').trim().notEmpty().withMessage('Difficulty level is required'),
  body('total_questions').isInt({ min: 1, max: 200 }).withMessage('Total questions must be between 1 and 200'),
  body('time_limit').isInt({ min: 1, max: 300 }).withMessage('Time limit must be between 1 and 300 minutes')
], authenticateToken, requireRole(['admin', 'operation_manager']), async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const {
      name,
      test_date,
      series_provider,
      difficulty_level,
      total_questions,
      time_limit
    } = req.body;

    // Create mock test template using correct table and columns
    const { data: mockTest, error } = await supabase
      .from('mock_test_templates')
      .insert([
        {
          id: randomUUID(),
          name: name,
          test_date: test_date,
          series_provider: series_provider,
          difficulty_level: difficulty_level,
          total_questions: total_questions,
          time_limit: time_limit,
          created_by: req.user.id,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          answer_key: {},
          topic_tags: [],
          benchmarks: {}
        }
      ])
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Mock test template created by ${req.user.role}:`, req.user.email, 'Test:', name);
    res.status(201).json({
      message: 'Mock test created successfully',
      mockTest
    });

  } catch (error) {
    console.error('Error creating mock test template:', error);
    res.status(500).json({ error: 'Failed to create mock test' });
  }
});

// Delete mock test template (admin and operation_manager only)
app.delete('/api/admin/mock-tests/:id', authenticateToken, requireRole(['admin', 'operation_manager']), async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Mock test ID is required' });
    }

    // Delete from mock_test_templates table
    const { error } = await supabase
      .from('mock_test_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log(`🗑️ Mock test template deleted by ${req.user.role}:`, req.user.email, 'Test ID:', id);
    res.json({ message: 'Mock test deleted successfully' });

  } catch (error) {
    console.error('Error deleting mock test template:', error);
    res.status(500).json({ error: 'Failed to delete mock test' });
  }
});

// Update mock test template (admin and operation_manager only)
app.put('/api/admin/mock-tests/:id', [
  body('name').optional().trim().notEmpty(),
  body('test_date').optional().isISO8601(),
  body('series_provider').optional().trim().notEmpty(),
  body('difficulty_level').optional().trim().notEmpty(),
  body('total_questions').optional().isInt({ min: 1, max: 200 }),
  body('time_limit').optional().isInt({ min: 1, max: 300 })
], authenticateToken, requireRole(['admin', 'operation_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();

    const { data: mockTest, error } = await supabase
      .from('mock_test_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log(`✏️ Mock test template updated by ${req.user.role}:`, req.user.email, 'Test ID:', id);
    res.json({
      message: 'Mock test updated successfully',
      mockTest
    });

  } catch (error) {
    console.error('Error updating mock test template:', error);
    res.status(500).json({ error: 'Failed to update mock test' });
  }
});

// Get available mock test templates for students (all roles can view)
app.get('/api/mock-tests', authenticateToken, async (req, res) => {
  try {
    const { data: mockTests, error } = await supabase
      .from('mock_test_templates')
      .select('id, name, test_date, series_provider, difficulty_level, total_questions, time_limit, status')
      .eq('status', 'active')
      .order('test_date', { ascending: true });

    if (error) throw error;

    console.log(`📝 Available mock test templates requested by ${req.user.role}:`, req.user.email);
    res.json({ mockTests: mockTests || [] });
  } catch (error) {
    console.error('Error fetching available mock test templates:', error);
    res.status(500).json({ error: 'Failed to fetch mock tests' });
  }
});

// ===============================
// MOCK TEST QUESTIONS & SUBMISSIONS ROUTES
// ===============================

// Get questions for a specific mock test (authenticated users)
app.get('/api/mock-tests/:id/questions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: questions, error } = await supabase
      .from('mock_test_questions')
      .select('*')
      .eq('test_id', id)
      .order('question_number');

    if (error) throw error;

    console.log(`❓ Questions requested for test ${id} by ${req.user.role}:`, req.user.email);
    res.json({ questions: questions || [] });
  } catch (error) {
    console.error('Error fetching test questions:', error);
    res.status(500).json({ error: 'Failed to fetch test questions' });
  }
});

// Submit mock test answers (authenticated users)
app.post('/api/mock-tests/:id/submit', [
  body('answers').isArray().withMessage('Answers must be an array'),
  body('time_taken').isInt({ min: 1 }).withMessage('Time taken is required')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { answers, time_taken } = req.body;

    // Save test submission
    const { data: submission, error } = await supabase
      .from('test_submissions')
      .insert([
        {
          id: randomUUID(),
          test_id: id,
          user_id: req.user.id,
          answers: JSON.stringify(answers),
          time_taken,
          submitted_at: new Date().toISOString(),
          score: 0 // Will be calculated by grading system
        }
      ])
      .select()
      .single();

    if (error) throw error;

    console.log(`📤 Test submitted by ${req.user.role}:`, req.user.email, 'Test:', id);
    res.status(201).json({
      message: 'Test submitted successfully',
      submission_id: submission.id
    });

  } catch (error) {
    console.error('Error submitting test:', error);
    res.status(500).json({ error: 'Failed to submit test' });
  }
});

// Get user's completed test results (from mock_tests results table)
app.get('/api/user/test-results', authenticateToken, async (req, res) => {
  try {
    const { data: testResults, error } = await supabase
      .from('mock_tests') // This is your results table
      .select('*')
      .eq('user_id', req.user.id)
      .order('date_taken', { ascending: false });

    if (error) throw error;

    console.log(`📊 Test results requested by user:`, req.user.email);
    res.json({ testResults: testResults || [] });
  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({ error: 'Failed to fetch test results' });
  }
});
// ===============================
// USER MANAGEMENT ROUTES
// ===============================

// Get all users (admin and operation_manager only)
app.get('/api/users', authenticateToken, requireRole(['admin', 'operation_manager']), async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, joined_date, is_active, total_tests, average_score')
      .order('joined_date', { ascending: false });

    if (error) throw error;

    console.log(`👥 User list requested by ${req.user.role}:`, req.user.email);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user details (admin and operation_manager only)
app.put('/api/users/:id', [
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('role').optional().isIn(['student', 'educator', 'parent', 'admin', 'operation_manager']),
  body('is_active').optional().isBoolean()
], authenticateToken, requireRole(['admin', 'operation_manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, name, email, role, joined_date, is_active, total_tests, average_score')
      .single();

    if (error) throw error;

    console.log(`👤 User updated by ${req.user.role}:`, req.user.email, 'User ID:', id);
    res.json({
      message: 'User updated successfully',
      user
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log(`🗑️ User deleted by ${req.user.role}:`, req.user.email, 'User ID:', id);
    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get user profile (authenticated users can view their own profile)
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { encrypted_password, confirmation_token, recovery_token, ...userProfile } = req.user;
    
    console.log(`👤 Profile requested by user:`, req.user.email);
    res.json({ user: userProfile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile (authenticated users can update their own profile)
app.put('/api/user/profile', [
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const updates = req.body;
    const userId = req.user.id;

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, name, email, role, joined_date, is_active, total_tests, average_score')
      .single();

    if (error) throw error;

    console.log(`👤 Profile updated by user:`, req.user.email);
    res.json({
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ===============================
// ADDITIONAL UTILITY ROUTES
// ===============================

// Get platform statistics (admin and operation_manager only)
app.get('/api/admin/stats', authenticateToken, requireRole(['admin', 'operation_manager']), async (req, res) => {
  try {
    // Get total users count
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get total mock tests count
    const { count: totalMockTests, error: testsError } = await supabase
      .from('mock_test_templates')
      .select('*', { count: 'exact', head: true });

    // Get active users count (logged in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: activeUsers, error: activeError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', thirtyDaysAgo.toISOString());

    if (usersError || testsError || activeError) {
      throw new Error('Failed to fetch statistics');
    }

    const stats = {
      totalUsers: totalUsers || 0,
      totalMockTests: totalMockTests || 0,
      activeUsers: activeUsers || 0,
      platformHealth: 'Excellent',
      lastUpdated: new Date().toISOString()
    };

    console.log(`📊 Platform stats requested by ${req.user.role}:`, req.user.email);
    res.json(stats);

  } catch (error) {
    console.error('Error fetching platform stats:', error);
    res.status(500).json({ error: 'Failed to fetch platform statistics' });
  }
});

// ===============================
// ENHANCED ROUTE IMPORTS
// ===============================

// Middleware to attach supabase and io to request
app.use((req, res, next) => {
  req.supabase = supabase;
  req.io = io;
  next();
});

// Initialize doubt WebSocket handling
const { handleDoubtSocket } = require('./socket/doubtSocket');
handleDoubtSocket(io);

// Import additional route modules
const authRoutes = require('./routes/auth');
const adminCmsRoutes = require('./routes/admin-cms');
const dashboardRoutes = require('./routes/dashboards');
const adminCompleteRoutes = require('./routes/admin-complete');
const subscriptionRoutes = require('./routes/subscription');
const educatorRoutes = require('./routes/educator');
const parentRoutes = require('./routes/parent');
const doubtRoutes = require('./routes/doubts');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');
const analyticsRoutes = require('./routes/analytics');

// Apply routes with proper middleware
app.use('/api/auth', authRoutes);
app.use('/api/admin/cms', authenticateToken, requireRole(['admin', 'operation_manager', 'educator']), adminCmsRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/admin', adminCompleteRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/educator', educatorRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/doubts', doubtRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);

// ===============================
// HEALTH CHECK ROUTE
// ===============================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    supabase: 'Connected',
    version: '5.0.0',
    features: [
      'existing-auth-table', 
      'multi-role-auth', 
      'analytics', 
      'user-management', 
      'mock-test-templates', 
      'question-management',
      'student-planning-system',
      'test-submissions',
      'admin-dashboard'
    ]
  });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    res.json({ 
      status: 'Database connected successfully',
      timestamp: new Date().toISOString(),
      message: 'Users table accessible'
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.status(500).json({ 
      status: 'Database connection failed',
      error: error.message 
    });
  }
});

// ===============================
// MOCK TEST FRAMEWORK APIs
// ===============================

// Create mock test tables in Supabase (run once to initialize)
app.post('/api/init-mock-test-tables', async (req, res) => {
  try {
    // Create mock_tests table
    const mockTestsTable = await supabase.rpc('create_mock_tests_table');
    
    // Create mock_test_questions table  
    const questionsTable = await supabase.rpc('create_mock_test_questions_table');
    
    // Create student_mock_attempts table
    const attemptsTable = await supabase.rpc('create_student_mock_attempts_table');
    
    // Create mock_test_recommendations table
    const recommendationsTable = await supabase.rpc('create_mock_test_recommendations_table');
    
    res.json({ 
      message: 'Mock test database tables initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error initializing mock test tables:', error);
    res.status(500).json({ error: 'Failed to initialize mock test tables' });
  }
});

// Admin: Upload new mock test
app.post('/api/admin/mock-tests', authenticateToken, async (req, res) => {
  try {
    const {
      test_name,
      test_date,
      total_questions,
      duration_minutes,
      sections,
      questions
    } = req.body;

    // Insert mock test
    const { data: mockTest, error: testError } = await supabase
      .from('mock_tests')
      .insert({
        test_name,
        test_date,
        total_questions,
        duration_minutes,
        sections: JSON.stringify(sections),
        created_by: req.user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (testError) throw testError;

    // Insert questions
    const questionsWithTestId = questions.map(q => ({
      ...q,
      mock_test_id: mockTest.id,
      created_at: new Date().toISOString()
    }));

    const { error: questionsError } = await supabase
      .from('mock_test_questions')
      .insert(questionsWithTestId);

    if (questionsError) throw questionsError;

    res.json({ 
      message: 'Mock test uploaded successfully',
      mock_test: mockTest
    });
  } catch (error) {
    console.error('Error uploading mock test:', error);
    res.status(500).json({ error: 'Failed to upload mock test' });
  }
});

// Get all mock tests
app.get('/api/mock-tests', authenticateToken, async (req, res) => {
  try {
    const { data: mockTests, error } = await supabase
      .from('mock_tests')
      .select('id, test_name, test_series, difficulty_level, date_taken, score')
      .order('date_taken', { ascending: false });

    if (error) throw error;

    // Transform to match expected format
    const transformedTests = mockTests.map(test => ({
      id: test.id,
      name: test.test_name,
      test_date: test.date_taken,
      series_provider: test.test_series || 'Unknown',
      difficulty_level: test.difficulty_level || 'Medium',
      total_questions: 150, // Default for CLAT
      time_limit: 120 // Default 2 hours
    }));

    res.json({ mock_tests: transformedTests });
  } catch (error) {
    console.error('Error fetching mock tests:', error);
    res.status(500).json({ error: 'Failed to fetch mock tests' });
  }
});

// Get specific mock test with questions
app.get('/api/mock-tests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: mockTest, error: testError } = await supabase
      .from('mock_tests')
      .select('*')
      .eq('id', id)
      .single();

    if (testError) throw testError;

    const { data: questions, error: questionsError } = await supabase
      .from('mock_test_questions')
      .select('*')
      .eq('mock_test_id', id)
      .order('question_number');

    if (questionsError) throw questionsError;

    res.json({ 
      mock_test: mockTest,
      questions: questions
    });
  } catch (error) {
    console.error('Error fetching mock test:', error);
    res.status(500).json({ error: 'Failed to fetch mock test' });
  }
});

// Student: Submit mock test attempt (offline pen-paper results)
app.post('/api/student/mock-attempts', authenticateToken, async (req, res) => {
  try {
    const {
      mock_test_id,
      attempt_data,
      performance_summary,
      section_wise_performance,
      mistakes_analysis,
      time_management_data
    } = req.body;

    const { data: attempt, error } = await supabase
      .from('student_mock_attempts')
      .insert({
        student_id: req.user.id,
        mock_test_id,
        attempt_data: JSON.stringify(attempt_data),
        performance_summary: JSON.stringify(performance_summary),
        section_wise_performance: JSON.stringify(section_wise_performance),
        mistakes_analysis: JSON.stringify(mistakes_analysis),
        time_management_data: JSON.stringify(time_management_data),
        attempted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Generate AI recommendations
    const recommendations = await generateAIRecommendations(req.user.id, attempt);

    res.json({ 
      message: 'Mock test attempt submitted successfully',
      attempt: attempt,
      recommendations: recommendations
    });
  } catch (error) {
    console.error('Error submitting mock attempt:', error);
    res.status(500).json({ error: 'Failed to submit mock attempt' });
  }
});

// Get student's mock test attempts
app.get('/api/student/mock-attempts', authenticateToken, async (req, res) => {
  try {
    const { data: attempts, error } = await supabase
      .from('student_mock_attempts')
      .select(`
        *,
        mock_tests (
          test_name,
          test_date,
          total_questions
        )
      `)
      .eq('student_id', req.user.id)
      .order('attempted_at', { ascending: false });

    if (error) throw error;

    res.json({ attempts: attempts });
  } catch (error) {
    console.error('Error fetching student attempts:', error);
    res.status(500).json({ error: 'Failed to fetch attempts' });
  }
});

// Get AI recommendations for student
app.get('/api/student/recommendations', authenticateToken, async (req, res) => {
  try {
    const { data: recommendations, error } = await supabase
      .from('mock_test_recommendations')
      .select('*')
      .eq('student_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({ recommendations: recommendations });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// ===============================
// AI RECOMMENDATION ENGINE
// ===============================

// Initialize Claude (optional - will work with or without API key)
let anthropic;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

async function generateAIRecommendations(studentId, attemptData) {
  try {
    // Get student's previous attempts for trend analysis
    const { data: previousAttempts, error } = await supabase
      .from('student_mock_attempts')
      .select('*')
      .eq('student_id', studentId)
      .order('attempted_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    // Parse the attempt data
    const performance = JSON.parse(attemptData.performance_summary);
    const sectionPerformance = JSON.parse(attemptData.section_wise_performance);
    const mistakes = JSON.parse(attemptData.mistakes_analysis);
    const timeManagement = JSON.parse(attemptData.time_management_data);

    // Generate rule-based recommendations (works without OpenAI)
    const recommendations = generateRuleBasedRecommendations({
      performance,
      sectionPerformance,
      mistakes,
      timeManagement,
      previousAttempts
    });

    // Enhance with AI if available
    if (anthropic) {
      const aiRecommendations = await generateClaudeRecommendations({
        performance,
        sectionPerformance,
        mistakes,
        timeManagement,
        previousAttempts
      });
      recommendations.ai_insights = aiRecommendations;
    }

    // Store recommendations in database
    const { data: savedRecommendation, error: saveError } = await supabase
      .from('mock_test_recommendations')
      .insert({
        student_id: studentId,
        mock_attempt_id: attemptData.id,
        recommendations: JSON.stringify(recommendations),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return recommendations;
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    return {
      error: 'Failed to generate recommendations',
      basic_advice: 'Continue practicing and focus on weak areas identified in your test analysis.'
    };
  }
}

function generateRuleBasedRecommendations({ performance, sectionPerformance, mistakes, timeManagement, previousAttempts }) {
  const recommendations = {
    overall_strategy: [],
    section_specific: {},
    time_management: [],
    mistake_patterns: [],
    preparation_focus: [],
    next_test_strategy: []
  };

  // Overall performance analysis
  const accuracy = (performance.correct_answers / performance.total_attempted) * 100;
  const attemptRate = (performance.total_attempted / performance.total_questions) * 100;

  if (accuracy < 60) {
    recommendations.overall_strategy.push("Focus on accuracy over speed. Review fundamental concepts before attempting more questions.");
  } else if (accuracy > 80 && attemptRate < 80) {
    recommendations.overall_strategy.push("Your accuracy is excellent! Try to attempt more questions while maintaining this accuracy level.");
  }

  // Section-wise analysis
  Object.entries(sectionPerformance).forEach(([section, data]) => {
    const sectionAccuracy = (data.correct / data.attempted) * 100;
    const sectionAttemptRate = (data.attempted / data.total_questions) * 100;

    recommendations.section_specific[section] = [];

    if (sectionAccuracy < 50) {
      recommendations.section_specific[section].push(`Critical: Focus heavily on ${section} fundamentals. Consider additional coaching or study materials.`);
    } else if (sectionAccuracy < 70) {
      recommendations.section_specific[section].push(`Moderate concern: Increase practice in ${section}. Review mistake patterns.`);
    }

    if (sectionAttemptRate < 60) {
      recommendations.section_specific[section].push(`Time management issue in ${section}. Practice speed-solving techniques.`);
    }
  });

  // Time management recommendations
  if (timeManagement.time_per_question > 2.5) {
    recommendations.time_management.push("You're spending too much time per question. Practice quick elimination techniques.");
  }
  
  if (timeManagement.sections_not_completed?.length > 0) {
    recommendations.time_management.push(`Focus on completing all sections. You missed: ${timeManagement.sections_not_completed.join(', ')}`);
  }

  // Mistake pattern analysis
  if (mistakes.silly_mistakes > 3) {
    recommendations.mistake_patterns.push("High silly mistake count. Practice more carefully and double-check calculations.");
  }

  if (mistakes.conceptual_errors > 2) {
    recommendations.mistake_patterns.push("Conceptual gaps identified. Review theory for weak topics.");
  }

  // Preparation focus based on trends
  if (previousAttempts.length > 1) {
    const trend = analyzeTrend(previousAttempts);
    if (trend.declining) {
      recommendations.preparation_focus.push("Performance trend is declining. Take a break and focus on concept revision.");
    } else if (trend.improving) {
      recommendations.preparation_focus.push("Great improvement trend! Continue current preparation strategy.");
    }
  }

  return recommendations;
}

async function generateClaudeRecommendations(data) {
  try {
    const prompt = `As a CLAT exam preparation expert with 10+ years of experience, analyze this student's mock test performance and provide detailed recommendations:

Performance Summary:
- Accuracy: ${((data.performance.correct_answers / data.performance.total_attempted) * 100).toFixed(1)}%
- Questions Attempted: ${data.performance.total_attempted}/${data.performance.total_questions}
- Mistakes: ${data.mistakes.silly_mistakes} silly, ${data.mistakes.conceptual_errors} conceptual

Section Performance:
${Object.entries(data.sectionPerformance).map(([section, perf]) => 
  `${section}: ${perf.correct}/${perf.attempted} (${((perf.correct/perf.attempted)*100).toFixed(1)}%)`
).join('\n')}

Time Management:
- Average time per question: ${data.timeManagement.time_per_question} minutes
- Sections not completed: ${data.timeManagement.sections_not_completed?.join(', ') || 'None'}

Provide specific, actionable recommendations for:
1. Strategic improvements for next test
2. Study plan adjustments  
3. Time management techniques
4. Section-specific advice

Keep recommendations concise and practical.`;

    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    return message.content[0].text;
  } catch (error) {
    console.error('Claude API error:', error);
    return "AI analysis temporarily unavailable. Please refer to the detailed recommendations above.";
  }
}

function analyzeTrend(attempts) {
  if (attempts.length < 2) return { improving: false, declining: false, stable: true };

  const scores = attempts.map(attempt => {
    const perf = JSON.parse(attempt.performance_summary);
    return (perf.correct_answers / perf.total_attempted) * 100;
  });

  const recent = scores.slice(0, 2);
  const improvement = recent[0] - recent[1];

  return {
    improving: improvement > 5,
    declining: improvement < -5,
    stable: Math.abs(improvement) <= 5
  };
}

// ===============================
// ERROR HANDLING MIDDLEWARE
// ===============================

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// ===============================
// START SERVER
// ===============================

server.listen(PORT, () => {
  // SMS Authentication Configuration
  console.log(`📱 SMS Auth Configuration: {`);
  console.log(`  twilioSid: ${process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Missing'}`);
  console.log(`  twilioToken: ${process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Missing'}`);
  console.log(`  twilioPhone: ${process.env.TWILIO_PHONE_NUMBER ? 'Set' : 'Missing'}`);
  console.log(`  frontendUrl: '${process.env.FRONTEND_URL}'`);
  console.log(`}`);
  
  console.log(`🚀 Level Up Backend Server running on port ${PORT}`);
  console.log(`📊 Supabase URL: ${process.env.SUPABASE_URL}`);
  console.log(`🔐 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`👥 SMS-based authentication enabled`);
  console.log(`📝 Mock Test Management v5.0 enabled`);
  console.log(`🎯 Student Planning System enabled`);
  console.log(`✅ All Google OAuth removed`);
  console.log(`🌟 Ready to serve all user types!`);
  console.log(`\n🔗 Available endpoints:`);
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log(`   Test DB: http://localhost:${PORT}/api/test-db`);
  console.log(`   Admin Mock Tests: http://localhost:${PORT}/api/admin/mock-tests`);
  console.log(`   SMS Auth: http://localhost:${PORT}/api/auth/send-otp`);
  console.log(`\n✨ Server started successfully!`);
});
