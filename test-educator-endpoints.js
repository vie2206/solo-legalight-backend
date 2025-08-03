// Test script for educator endpoints
const axios = require('axios');

const API_BASE = 'http://localhost:8000/api';
let authToken = '';

// Test credentials (you'll need to use real educator credentials)
const testEducator = {
  email: 'educator@test.com',
  password: 'educator123'
};

// Helper function to log results
const log = (endpoint, status, data) => {
  console.log(`\n${status === 'success' ? '✅' : '❌'} ${endpoint}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

// Main test function
async function testEducatorEndpoints() {
  try {
    console.log('🧪 Testing Educator API Endpoints...\n');

    // 1. Login as educator
    console.log('1️⃣ Logging in as educator...');
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, testEducator);
      authToken = loginResponse.data.token;
      log('POST /api/auth/login', 'success', { token: authToken ? 'received' : 'missing' });
    } catch (error) {
      log('POST /api/auth/login', 'error', error.response?.data || error.message);
      console.log('\n❌ Cannot proceed without authentication. Please ensure educator account exists.');
      return;
    }

    // Set auth header for all subsequent requests
    const config = {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    };

    // 2. Test Assignment Creation
    console.log('\n2️⃣ Testing Assignment Creation...');
    try {
      const assignmentData = {
        title: 'Test Assignment ' + Date.now(),
        description: 'This is a test assignment',
        subject: 'Legal Reasoning',
        type: 'quiz',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        totalMarks: 100,
        timeLimit: 60
      };
      
      const response = await axios.post(`${API_BASE}/educator/assignments`, assignmentData, config);
      log('POST /api/educator/assignments', 'success', response.data);
    } catch (error) {
      log('POST /api/educator/assignments', 'error', error.response?.data || error.message);
    }

    // 3. Test Message Sending
    console.log('\n3️⃣ Testing Message System...');
    try {
      const messageData = {
        recipientId: 'student-id-here', // Replace with actual student ID
        subject: 'Test Message',
        message: 'This is a test message from educator',
        priority: 'normal'
      };
      
      const response = await axios.post(`${API_BASE}/educator/messages`, messageData, config);
      log('POST /api/educator/messages', 'success', response.data);
    } catch (error) {
      log('POST /api/educator/messages', 'error', error.response?.data || error.message);
    }

    // 4. Test Student Details Retrieval
    console.log('\n4️⃣ Testing Student Details...');
    try {
      const studentId = 'student-id-here'; // Replace with actual student ID
      const response = await axios.get(`${API_BASE}/educator/students/${studentId}`, config);
      log(`GET /api/educator/students/:id`, 'success', response.data);
    } catch (error) {
      log(`GET /api/educator/students/:id`, 'error', error.response?.data || error.message);
    }

    // 5. Test Data Export
    console.log('\n5️⃣ Testing Data Export...');
    try {
      const response = await axios.get(`${API_BASE}/educator/export/students?format=json`, config);
      log('GET /api/educator/export/students', 'success', { 
        dataCount: response.data.data?.length || 0,
        filename: response.data.filename 
      });
    } catch (error) {
      log('GET /api/educator/export/students', 'error', error.response?.data || error.message);
    }

    // 6. Test Grading System
    console.log('\n6️⃣ Testing Grading System...');
    try {
      const gradeData = {
        submissionId: 'submission-id-here', // Replace with actual submission ID
        score: 85,
        feedback: 'Good work!',
        rubricScores: {
          accuracy: 90,
          clarity: 80,
          completeness: 85
        }
      };
      
      const response = await axios.post(`${API_BASE}/educator/grades`, gradeData, config);
      log('POST /api/educator/grades', 'success', response.data);
    } catch (error) {
      log('POST /api/educator/grades', 'error', error.response?.data || error.message);
    }

    console.log('\n✅ Educator API endpoint testing complete!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run tests
testEducatorEndpoints();

// Instructions
console.log(`
📝 Instructions:
1. Make sure the backend server is running (npm start)
2. Update the test credentials with a real educator account
3. Replace placeholder IDs (student-id-here, submission-id-here) with real IDs
4. Run: node test-educator-endpoints.js
`);