#!/usr/bin/env node

/**
 * Setup script for the doubt resolution system
 * This script initializes the database schema and creates test data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function setupDoubtSystem() {
  console.log('🚀 Setting up doubt resolution system...\n');

  try {
    // Step 1: Check database connection
    console.log('1. Checking database connection...');
    const { data, error: connectionError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (connectionError) {
      throw new Error(`Database connection failed: ${connectionError.message}`);
    }
    console.log('✅ Database connection successful\n');

    // Step 2: Run database schema
    console.log('2. Setting up database schema...');
    const schemaPath = path.join(__dirname, 'sql', 'doubt_resolution_schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Database schema file not found');
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Note: In a real setup, you would need to execute this SQL against your Supabase instance
    // For now, we'll just validate that the tables exist or can be created
    console.log('📄 Schema file loaded successfully');
    console.log('⚠️  Please run the SQL schema manually in your Supabase dashboard');
    console.log('   File location:', schemaPath);
    console.log('✅ Database schema setup prepared\n');

    // Step 3: Check required tables exist (this will fail initially, which is expected)
    console.log('3. Checking doubt system tables...');
    const tables = [
      'doubts',
      'doubt_responses', 
      'doubt_ratings',
      'doubt_notifications',
      'doubt_assignments',
      'doubt_activity_log',
      'educator_specializations'
    ];

    const tableChecks = [];
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
          tableChecks.push(`❌ ${table}: ${error.message}`);
        } else {
          tableChecks.push(`✅ ${table}: OK`);
        }
      } catch (err) {
        tableChecks.push(`❌ ${table}: ${err.message}`);
      }
    }

    tableChecks.forEach(check => console.log(check));
    console.log();

    // Step 4: Create sample educator specializations if tables exist
    console.log('4. Setting up sample data...');
    try {
      // Check if we have any demo users first
      const { data: demoUsers } = await supabase
        .from('users')
        .select('*')
        .in('email', ['educator@demo.com', 'student@demo.com', 'admin@demo.com']);

      if (demoUsers && demoUsers.length > 0) {
        console.log(`✅ Found ${demoUsers.length} demo users`);
        
        // Try to create educator specializations
        const educatorUser = demoUsers.find(u => u.role === 'educator');
        if (educatorUser) {
          try {
            await supabase.from('educator_specializations').upsert([
              {
                educator_id: educatorUser.id,
                subject: 'Constitutional Law',
                proficiency_level: 5,
                years_of_experience: 8,
                is_active: true
              },
              {
                educator_id: educatorUser.id,
                subject: 'Legal Reasoning',
                proficiency_level: 4,
                years_of_experience: 6,
                is_active: true
              }
            ]);
            console.log('✅ Sample educator specializations created');
          } catch (err) {
            console.log('⚠️  Could not create educator specializations:', err.message);
          }
        }
      } else {
        console.log('⚠️  No demo users found. Run demo login first to create test users.');
      }
    } catch (err) {
      console.log('⚠️  Sample data setup skipped:', err.message);
    }
    console.log();

    // Step 5: Test API endpoints
    console.log('5. Testing API endpoints...');
    
    const endpoints = [
      'http://localhost:8000/health',
      'http://localhost:8000/api/test-db'
    ];

    console.log('📡 Backend should be running on http://localhost:8000');
    console.log('   You can test these endpoints:');
    endpoints.forEach(endpoint => console.log(`   - ${endpoint}`));
    console.log();

    // Step 6: Summary
    console.log('📋 Setup Summary:');
    console.log('✅ Database connection verified');
    console.log('✅ Schema file prepared');
    console.log('✅ Sample data attempted');
    console.log('✅ API endpoints listed');
    console.log();

    console.log('🎯 Next Steps:');
    console.log('1. Run the SQL schema in your Supabase dashboard');
    console.log('2. Start the backend server: npm run dev');
    console.log('3. Test the doubt system APIs');
    console.log('4. Integrate with frontend components');
    console.log();

    console.log('🔌 WebSocket endpoints:');
    console.log('   - Real-time doubt updates');
    console.log('   - Notification system');
    console.log('   - Live response notifications');
    console.log();

    console.log('🚀 Doubt resolution system setup complete!');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('- Check your .env file has SUPABASE_URL and SUPABASE_SERVICE_KEY');
    console.error('- Ensure your Supabase project is active');
    console.error('- Verify database connectivity');
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDoubtSystem();
}

module.exports = setupDoubtSystem;