// Test script for verifying multi-role system endpoints
const axios = require('axios');

const API_BASE = 'http://localhost:8000';

// Test configuration
const testConfig = {
  // Test credentials (these would be real users in production)
  testUsers: {
    admin: { email: 'admin@test.com', password: 'admin123', role: 'admin' },
    student: { email: 'student@test.com', password: 'student123', role: 'student' },
    educator: { email: 'educator@test.com', password: 'educator123', role: 'educator' },
    parent: { email: 'parent@test.com', password: 'parent123', role: 'parent' },
    manager: { email: 'manager@test.com', password: 'manager123', role: 'operation_manager' }
  }
};

let authTokens = {};

// Helper function to make authenticated requests
const apiCall = async (endpoint, options = {}, token = null) => {
  try {
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await axios(`${API_BASE}${endpoint}`, config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message,
      status: error.response?.status || 500
    };
  }
};

// Test authentication for all user types
const testAuthentication = async () => {
  console.log('\n🔐 Testing Authentication...\n');
  
  for (const [role, credentials] of Object.entries(testConfig.testUsers)) {
    console.log(`Testing ${role} authentication...`);
    
    // Try to register user (might fail if already exists)
    const registerResult = await apiCall('/api/auth/register', {
      method: 'POST',
      data: credentials
    });
    
    if (registerResult.success) {
      console.log(`✅ ${role} registered successfully`);
    } else if (registerResult.error.includes('already exists')) {
      console.log(`ℹ️  ${role} already exists, proceeding to login`);
    } else {
      console.log(`❌ ${role} registration failed: ${registerResult.error}`);
    }
    
    // Login
    const loginResult = await apiCall('/api/auth/login', {
      method: 'POST',
      data: { email: credentials.email, password: credentials.password }
    });
    
    if (loginResult.success) {
      authTokens[role] = loginResult.data.token;
      console.log(`✅ ${role} login successful`);
    } else {
      console.log(`❌ ${role} login failed: ${loginResult.error}`);
    }
  }
};

// Test dashboard endpoints
const testDashboards = async () => {
  console.log('\n📊 Testing Dashboard Endpoints...\n');
  
  const dashboardTests = [
    { role: 'student', endpoint: '/api/dashboard/student' },
    { role: 'parent', endpoint: '/api/dashboard/parent' },
    { role: 'educator', endpoint: '/api/dashboard/educator' },
    { role: 'manager', endpoint: '/api/dashboard/manager' },
    { role: 'admin', endpoint: '/api/dashboard/admin' }
  ];
  
  for (const test of dashboardTests) {
    if (!authTokens[test.role]) {
      console.log(`⏭️  Skipping ${test.role} dashboard (no auth token)`);
      continue;
    }
    
    const result = await apiCall(test.endpoint, { method: 'GET' }, authTokens[test.role]);
    
    if (result.success) {
      console.log(`✅ ${test.role} dashboard: ${result.status}`);
    } else {
      console.log(`❌ ${test.role} dashboard failed: ${result.error}`);
    }
  }
};

// Test admin CMS endpoints
const testAdminCMS = async () => {
  console.log('\n📝 Testing Admin CMS Endpoints...\n');
  
  if (!authTokens.admin) {
    console.log('⏭️  Skipping Admin CMS tests (no admin token)');
    return;
  }
  
  const cmsTests = [
    { name: 'Reading Passages', endpoint: '/api/admin/cms/passages' },
    { name: 'Vocabulary Words', endpoint: '/api/admin/cms/vocabulary' },
    { name: 'GK Questions', endpoint: '/api/admin/cms/gk-questions' },
    { name: 'Challenges', endpoint: '/api/admin/cms/challenges' },
    { name: 'Content Analytics', endpoint: '/api/admin/cms/analytics/content-stats' }
  ];
  
  for (const test of cmsTests) {
    const result = await apiCall(test.endpoint, { method: 'GET' }, authTokens.admin);
    
    if (result.success) {
      console.log(`✅ ${test.name}: ${result.status}`);
    } else {
      console.log(`❌ ${test.name} failed: ${result.error}`);
    }
  }
};

// Test role-based access control
const testRBAC = async () => {
  console.log('\n🛡️  Testing Role-Based Access Control...\n');
  
  // Test: Student trying to access admin CMS (should fail)
  if (authTokens.student) {
    const result = await apiCall('/api/admin/cms/passages', { method: 'GET' }, authTokens.student);
    
    if (!result.success && result.status === 403) {
      console.log('✅ RBAC: Student correctly denied admin access');
    } else {
      console.log('❌ RBAC: Student should not have admin access');
    }
  }
  
  // Test: Educator accessing CMS (should succeed)
  if (authTokens.educator) {
    const result = await apiCall('/api/admin/cms/passages', { method: 'GET' }, authTokens.educator);
    
    if (result.success) {
      console.log('✅ RBAC: Educator correctly granted CMS access');
    } else {
      console.log('❌ RBAC: Educator should have CMS access');
    }
  }
  
  // Test: Unauthenticated access (should fail)
  const result = await apiCall('/api/dashboard/student', { method: 'GET' });
  
  if (!result.success && result.status === 401) {
    console.log('✅ RBAC: Unauthenticated request correctly denied');
  } else {
    console.log('❌ RBAC: Unauthenticated request should be denied');
  }
};

// Test content creation (Admin CMS)
const testContentCreation = async () => {
  console.log('\n📚 Testing Content Creation...\n');
  
  if (!authTokens.admin) {
    console.log('⏭️  Skipping content creation tests (no admin token)');
    return;
  }
  
  // Test creating a vocabulary word
  const vocabularyData = {
    word: 'jurisdiction',
    definition: 'The official power to make legal decisions and judgments',
    difficulty: 'intermediate',
    category: 'legal',
    clat_relevance: 9,
    synonyms: ['authority', 'power', 'control'],
    antonyms: ['powerlessness'],
    status: 'active'
  };
  
  const vocabResult = await apiCall('/api/admin/cms/vocabulary', {
    method: 'POST',
    data: vocabularyData
  }, authTokens.admin);
  
  if (vocabResult.success) {
    console.log('✅ Vocabulary word created successfully');
  } else {
    console.log(`❌ Vocabulary word creation failed: ${vocabResult.error}`);
  }
  
  // Test creating a GK question
  const gkData = {
    question: 'Which article of the Indian Constitution deals with the Right to Equality?',
    options: ['Article 14', 'Article 19', 'Article 21', 'Article 32'],
    correct_answer: 0,
    category: 'Constitutional Law',
    difficulty: 'intermediate',
    explanation: 'Article 14 of the Indian Constitution guarantees equality before law and equal protection of laws.',
    points: 10,
    status: 'active'
  };
  
  const gkResult = await apiCall('/api/admin/cms/gk-questions', {
    method: 'POST',
    data: gkData
  }, authTokens.admin);
  
  if (gkResult.success) {
    console.log('✅ GK question created successfully');
  } else {
    console.log(`❌ GK question creation failed: ${gkResult.error}`);
  }
};

// Test system health
const testSystemHealth = async () => {
  console.log('\n💓 Testing System Health...\n');
  
  const healthResult = await apiCall('/health');
  
  if (healthResult.success) {
    console.log('✅ System health check passed');
    console.log(`   Status: ${healthResult.data.status}`);
    console.log(`   Version: ${healthResult.data.version}`);
    console.log(`   Features: ${healthResult.data.features.length} enabled`);
  } else {
    console.log(`❌ System health check failed: ${healthResult.error}`);
  }
  
  const dbResult = await apiCall('/api/test-db');
  
  if (dbResult.success) {
    console.log('✅ Database connection test passed');
  } else {
    console.log(`❌ Database connection test failed: ${dbResult.error}`);
  }
};

// Main test runner
const runTests = async () => {
  console.log('🧪 Starting Multi-Role System Tests');
  console.log('=====================================');
  
  try {
    await testSystemHealth();
    await testAuthentication();
    await testDashboards();
    await testAdminCMS();
    await testRBAC();
    await testContentCreation();
    
    console.log('\n🎉 Test Suite Completed!');
    console.log('=====================================');
    
    // Summary
    const successfulLogins = Object.keys(authTokens).length;
    console.log(`\n📊 Test Summary:`);
    console.log(`   Successful Logins: ${successfulLogins}/5`);
    console.log(`   Auth Tokens Generated: ${Object.keys(authTokens).join(', ')}`);
    
  } catch (error) {
    console.error('\n💥 Test Suite Failed:', error.message);
  }
  
  process.exit(0);
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testConfig };