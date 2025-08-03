// MINIMAL SERVER.JS FOR DEBUGGING
// Save this as server-debug.js and test it first

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

// Basic middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Test route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  });
});

// Test the specific route that might be causing issues
app.get('/api/admin/mock-tests', (req, res) => {
  res.json({ message: 'Mock tests route working' });
});

// Simple parameter route
app.get('/api/admin/mock-tests/:id', (req, res) => {
  res.json({ message: 'Single mock test route working', id: req.params.id });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DEBUG Server running on port ${PORT}`);
  console.log(`✅ Test: http://localhost:${PORT}/health`);
  console.log(`✅ Test: http://localhost:${PORT}/api/admin/mock-tests`);
});
