// Simple Level Up Backend Server - No OAuth
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());

// Demo users data
const demoUsers = {
  'demo-student-001': {
    id: 'demo-student-001',
    name: 'Demo Student',
    email: 'student@demo.com',
    role: 'student'
  },
  'demo-admin-001': {
    id: 'demo-admin-001',
    name: 'Demo Admin',
    email: 'admin@demo.com',
    role: 'admin'
  },
  'demo-educator-001': {
    id: 'demo-educator-001',
    name: 'Demo Educator',
    email: 'educator@demo.com',
    role: 'educator'
  },
  'demo-parent-001': {
    id: 'demo-parent-001',
    name: 'Demo Parent',
    email: 'parent@demo.com',
    role: 'parent'
  },
  'demo-manager-001': {
    id: 'demo-manager-001',
    name: 'Demo Manager',
    email: 'manager@demo.com',
    role: 'operation_manager'
  }
};

// Sample mock tests data
const sampleMockTests = [
  {
    id: 'mock-test-04',
    name: 'CLAT Mock Test 04',
    test_series: 'Legalight Series',
    difficulty_level: 'Medium-Hard',
    total_questions: 120,
    duration_minutes: 120,
    status: 'active',
    created_at: new Date().toISOString()
  }
];

// Sample dashboard stats
const sampleDashboardStats = {
  mockTestsTaken: 5,
  averageScore: 72,
  bestScore: 87,
  currentStreak: 3,
  improvement: 15,
  targetProgress: 68,
  studyHours: 45
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '6.0.0 - Demo Mode',
    features: [
      'demo-authentication',
      'mock-test-management',
      'analytics',
      'user-management',
      'student-planning'
    ]
  });
});

// Demo authentication endpoint
app.post('/api/auth/demo-login', (req, res) => {
  const { role = 'student' } = req.body;
  
  const roleToUserId = {
    student: 'demo-student-001',
    admin: 'demo-admin-001',
    educator: 'demo-educator-001',
    parent: 'demo-parent-001',
    operation_manager: 'demo-manager-001'
  };
  
  const userId = roleToUserId[role];
  const user = demoUsers[userId];
  
  if (!user) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid role' 
    });
  }
  
  res.json({
    success: true,
    user: user,
    message: `Logged in as ${user.name}`
  });
});

// Get dashboard stats
app.get('/api/analytics/dashboard/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!demoUsers[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    success: true,
    stats: sampleDashboardStats,
    user: demoUsers[userId]
  });
});

// Mock test management
app.get('/api/admin/mock-tests', (req, res) => {
  res.json({
    success: true,
    mockTests: sampleMockTests
  });
});

app.post('/api/admin/mock-tests', (req, res) => {
  const { test_name, test_series, difficulty_level, total_questions, duration_minutes } = req.body;
  
  const newMockTest = {
    id: `mock-test-${Date.now()}`,
    name: test_name || 'New Mock Test',
    test_series: test_series || 'Default Series',
    difficulty_level: difficulty_level || 'Medium',
    total_questions: total_questions || 120,
    duration_minutes: duration_minutes || 120,
    status: 'active',
    created_at: new Date().toISOString()
  };
  
  sampleMockTests.push(newMockTest);
  
  res.json({
    success: true,
    message: 'Mock test created successfully',
    mockTest: newMockTest
  });
});

// Planning system endpoints
app.post('/api/planning/save', (req, res) => {
  const { userId, planningData } = req.body;
  
  if (!demoUsers[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    success: true,
    message: 'Planning data saved successfully',
    data: planningData
  });
});

app.get('/api/planning/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!demoUsers[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Return sample planning data
  res.json({
    success: true,
    planningData: {
      testInfo: {
        name: 'CLAT Mock Test 04',
        date: new Date().toISOString().split('T')[0],
        targetScore: 90
      },
      strategies: {
        timeManagement: 'Balanced approach',
        sectionPriority: ['Legal Reasoning', 'English Language', 'Logical Reasoning']
      }
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Level Up Backend Server (Simple Mode) running on port ${PORT}
📊 Features: Demo authentication, Mock test management, Analytics
🔐 Frontend URL: http://localhost:3001
🌟 No external dependencies - fully self-contained!

🔗 Available endpoints:
   Health Check: http://localhost:${PORT}/health
   Demo Login: http://localhost:${PORT}/api/auth/demo-login
   Dashboard: http://localhost:${PORT}/api/analytics/dashboard/:userId
   Mock Tests: http://localhost:${PORT}/api/admin/mock-tests

✨ Server started successfully in demo mode!
  `);
});