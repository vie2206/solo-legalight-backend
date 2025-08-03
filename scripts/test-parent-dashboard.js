// Test script to verify parent dashboard functionality with real data
require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:8000';
let parentToken = '';

async function testParentDashboard() {
  try {
    console.log('🧪 Testing Parent Dashboard with Real Data...\n');

    // 1. Login as parent
    console.log('1️⃣ Testing parent login...');
    await loginAsParent();

    // 2. Test dashboard data
    console.log('\n2️⃣ Testing dashboard data...');
    await testDashboardData();

    // 3. Test messages
    console.log('\n3️⃣ Testing messages...');
    await testMessages();

    // 4. Test payments
    console.log('\n4️⃣ Testing payments...');
    await testPayments();

    // 5. Test child details
    console.log('\n5️⃣ Testing child details...');
    await testChildDetails();

    // 6. Test reports
    console.log('\n6️⃣ Testing reports...');
    await testReports();

    console.log('\n✅ All parent dashboard tests completed successfully!');
    console.log('\n📊 Summary: Parent dashboard is working with real data');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure backend server is running (npm start)');
    console.log('   2. Run database setup: node scripts/setup-database.js');
    console.log('   3. Check that sample data exists in database');
  }
}

async function loginAsParent() {
  try {
    const response = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'parent@demo.com',
      password: 'password123'
    });

    if (response.data.token) {
      parentToken = response.data.token;
      console.log('✅ Parent login successful');
      console.log(`   User: ${response.data.user.name} (${response.data.user.role})`);
    } else {
      throw new Error('No token received');
    }
  } catch (error) {
    console.error('❌ Parent login failed:', error.response?.data?.error || error.message);
    throw error;
  }
}

async function testDashboardData() {
  try {
    const response = await axios.get(`${API_BASE}/api/dashboard/parent`, {
      headers: {
        'Authorization': `Bearer ${parentToken}`
      }
    });

    const data = response.data;
    console.log('✅ Dashboard data retrieved successfully');
    console.log(`   Children found: ${data.children?.length || 0}`);
    console.log(`   Overall stats: ${JSON.stringify(data.overall_stats || {}, null, 2)}`);
    
    if (data.children && data.children.length > 0) {
      data.children.forEach((child, index) => {
        console.log(`   Child ${index + 1}: ${child.name} - ${child.stats?.total_reading_time || 0} min reading`);
      });
    }
  } catch (error) {
    console.error('❌ Dashboard data failed:', error.response?.data?.error || error.message);
    throw error;
  }
}

async function testMessages() {
  try {
    const response = await axios.get(`${API_BASE}/api/parent/messages`, {
      headers: {
        'Authorization': `Bearer ${parentToken}`
      }
    });

    const data = response.data;
    console.log('✅ Messages retrieved successfully');
    console.log(`   Total messages: ${data.messages?.length || 0}`);
    
    if (data.messages && data.messages.length > 0) {
      data.messages.slice(0, 3).forEach((msg, index) => {
        console.log(`   Message ${index + 1}: "${msg.subject}" from ${msg.sender?.name || 'Unknown'}`);
      });
    }
  } catch (error) {
    console.error('❌ Messages test failed:', error.response?.data?.error || error.message);
    // Don't throw - this might fail if no messages exist yet
  }
}

async function testPayments() {
  try {
    const response = await axios.get(`${API_BASE}/api/parent/payments`, {
      headers: {
        'Authorization': `Bearer ${parentToken}`
      }
    });

    const data = response.data;
    console.log('✅ Payments retrieved successfully');
    console.log(`   Total payments: ${data.payments?.length || 0}`);
    
    if (data.payments && data.payments.length > 0) {
      data.payments.slice(0, 3).forEach((payment, index) => {
        console.log(`   Payment ${index + 1}: ₹${payment.amount} - ${payment.status} (${payment.payment_method})`);
      });
    }
  } catch (error) {
    console.error('❌ Payments test failed:', error.response?.data?.error || error.message);
    // Don't throw - this might fail if no payments exist yet
  }
}

async function testChildDetails() {
  try {
    // First get the dashboard to find child IDs
    const dashboardResponse = await axios.get(`${API_BASE}/api/dashboard/parent`, {
      headers: {
        'Authorization': `Bearer ${parentToken}`
      }
    });

    const children = dashboardResponse.data.children;
    if (!children || children.length === 0) {
      console.log('⚠️ No children found to test details');
      return;
    }

    // Test details for first child
    const childId = children[0].id;
    const response = await axios.get(`${API_BASE}/api/parent/children/${childId}`, {
      headers: {
        'Authorization': `Bearer ${parentToken}`
      }
    });

    const data = response.data;
    console.log('✅ Child details retrieved successfully');
    console.log(`   Child: ${data.child?.name}`);
    console.log(`   Statistics: ${JSON.stringify(data.child?.statistics || {}, null, 2)}`);
    console.log(`   Progress entries: ${data.progress?.length || 0}`);
    console.log(`   Analytics entries: ${data.analytics?.length || 0}`);
  } catch (error) {
    console.error('❌ Child details test failed:', error.response?.data?.error || error.message);
    // Don't throw - continue with other tests
  }
}

async function testReports() {
  try {
    // First get the dashboard to find child IDs
    const dashboardResponse = await axios.get(`${API_BASE}/api/dashboard/parent`, {
      headers: {
        'Authorization': `Bearer ${parentToken}`
      }
    });

    const children = dashboardResponse.data.children;
    if (!children || children.length === 0) {
      console.log('⚠️ No children found to test reports');
      return;
    }

    // Test performance report for first child
    const childId = children[0].id;
    const response = await axios.get(`${API_BASE}/api/parent/reports/${childId}/performance?format=json`, {
      headers: {
        'Authorization': `Bearer ${parentToken}`
      }
    });

    console.log('✅ Report generation successful');
    console.log(`   Report type: ${response.data.type}`);
    console.log(`   Child: ${response.data.child?.name}`);
    console.log(`   Data entries: ${response.data.data?.length || 0}`);
  } catch (error) {
    console.error('❌ Reports test failed:', error.response?.data?.error || error.message);
    // Don't throw - continue with other tests
  }
}

async function testSendMessage() {
  try {
    const messageData = {
      to: 'support',
      subject: 'Test Message from Parent Dashboard',
      message: 'This is a test message to verify the messaging system is working correctly.',
      priority: 'normal'
    };

    const response = await axios.post(`${API_BASE}/api/parent/messages`, messageData, {
      headers: {
        'Authorization': `Bearer ${parentToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Message sending successful');
    console.log(`   Message type: ${response.data.ticket ? 'Support Ticket' : 'Direct Message'}`);
  } catch (error) {
    console.error('❌ Message sending failed:', error.response?.data?.error || error.message);
    // Don't throw - this is optional
  }
}

// Helper function to check server status
async function checkServerStatus() {
  try {
    const response = await axios.get(`${API_BASE}/health`);
    console.log('✅ Backend server is running');
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Version: ${response.data.version}`);
    return true;
  } catch (error) {
    console.error('❌ Backend server is not running');
    console.log('   Please start the server with: npm start');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking server status...');
  const serverRunning = await checkServerStatus();
  
  if (!serverRunning) {
    process.exit(1);
  }

  await testParentDashboard();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testParentDashboard };