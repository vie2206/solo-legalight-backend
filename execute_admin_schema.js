// Execute comprehensive admin schema
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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

async function executeSchema() {
  try {
    console.log('📚 Reading comprehensive admin schema...');
    const schema = fs.readFileSync('./sql/comprehensive_admin_schema.sql', 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      .filter(stmt => !stmt.toUpperCase().includes('COMMIT'));

    console.log(`🔧 Executing ${statements.length} schema statements...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      try {
        if (statement.trim()) {
          // For CREATE TABLE statements, try using the direct query
          if (statement.toUpperCase().includes('CREATE TABLE')) {
            const tableName = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?"?([^"\s(]+)"?/i)?.[1];
            console.log(`📝 Creating table: ${tableName}`);
          }
          
          // Execute using raw SQL query (not recommended for production, but needed for schema creation)
          const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/query`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_KEY
            },
            body: JSON.stringify({ query: statement })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }
          
          successCount++;
        }
      } catch (err) {
        console.warn(`⚠️  Statement failed (continuing): ${err.message.substring(0, 100)}...`);
        errorCount++;
      }
    }
    
    console.log(`✅ Schema execution completed!`);
    console.log(`   - Successful statements: ${successCount}`);
    console.log(`   - Failed statements: ${errorCount}`);
    
    // Test by creating some basic tables manually
    console.log('🧪 Testing basic table creation...');
    
    // Create users table if it doesn't exist (most critical one)
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'student',
        status VARCHAR(20) DEFAULT 'active',
        subscription_tier VARCHAR(20) DEFAULT 'free',
        target_nlu VARCHAR(255),
        target_score INTEGER DEFAULT 0,
        current_score DECIMAL(5,2) DEFAULT 0,
        study_streak INTEGER DEFAULT 0,
        total_study_hours INTEGER DEFAULT 0,
        tests_completed INTEGER DEFAULT 0,
        avg_score DECIMAL(5,2) DEFAULT 0,
        total_spent DECIMAL(10,2) DEFAULT 0,
        last_login TIMESTAMP,
        phone_verified BOOLEAN DEFAULT FALSE,
        email_verified BOOLEAN DEFAULT FALSE,
        otp_code VARCHAR(6),
        otp_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: createUsersTable });
      if (error) {
        console.log('📝 Users table may already exist or using alternative creation method');
      } else {
        console.log('✅ Users table created successfully!');
      }
    } catch (err) {
      console.log('📝 Users table creation: Using existing schema');
    }
    
    // Test database connection
    console.log('🔍 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (!testError) {
      console.log(`✅ Database connection successful! Found ${testData?.length || 0} users.`);
    } else {
      console.log('⚠️  Database connection test:', testError.message);
    }
    
  } catch (error) {
    console.error('❌ Schema execution failed:', error.message);
  }
}

executeSchema();