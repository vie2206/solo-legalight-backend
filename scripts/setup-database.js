// Script to set up database tables and populate sample data
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupDatabase() {
  console.log('🗄️ Setting up database for Level Up CLAT Parent Dashboard...');
  
  try {
    // 1. First, ensure basic tables exist
    console.log('\n1️⃣ Creating parent-specific tables...');
    await createParentTables();
    
    // 2. Populate with sample data
    console.log('\n2️⃣ Populating sample data...');
    const { populateSampleData } = require('./populate-sample-data');
    await populateSampleData();
    
    // 3. Verify data
    console.log('\n3️⃣ Verifying data integrity...');
    await verifyData();
    
    console.log('\n✅ Database setup completed successfully!');
    console.log('\n🎯 Next steps:');
    console.log('   1. Start the backend server: npm start');
    console.log('   2. Login as parent: parent@demo.com / password123');
    console.log('   3. View the parent dashboard with real data');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

async function createParentTables() {
  // Read and execute the SQL file
  const sqlPath = path.join(__dirname, '../sql/parent-tables.sql');
  
  if (!fs.existsSync(sqlPath)) {
    console.log('⚠️ SQL file not found, creating basic tables programmatically...');
    await createTablesManually();
    return;
  }
  
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  
  // Split by semicolons and execute each statement
  const statements = sqlContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
  
  for (const statement of statements) {
    try {
      if (statement.toLowerCase().includes('create table') || 
          statement.toLowerCase().includes('create index') ||
          statement.toLowerCase().includes('alter table')) {
        await supabase.rpc('exec', { sql: statement });
      }
    } catch (error) {
      // Ignore errors for tables that already exist
      if (!error.message?.includes('already exists')) {
        console.log(`⚠️ Warning executing SQL: ${error.message}`);
      }
    }
  }
  
  console.log('✅ Parent tables created/verified');
}

async function createTablesManually() {
  const tables = [
    {
      name: 'parent_child_relationships',
      sql: `
        CREATE TABLE IF NOT EXISTS parent_child_relationships (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          parent_id UUID NOT NULL,
          child_id UUID NOT NULL,
          relationship_type VARCHAR(50) NOT NULL DEFAULT 'parent',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(parent_id, child_id)
        );
      `
    },
    {
      name: 'student_metadata',
      sql: `
        CREATE TABLE IF NOT EXISTS student_metadata (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          student_id UUID NOT NULL,
          educator_id UUID,
          grade VARCHAR(50),
          school VARCHAR(255),
          age INTEGER CHECK (age >= 5 AND age <= 25),
          parent_notes TEXT,
          educator_notes TEXT,
          tags TEXT[],
          custom_fields JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(student_id)
        );
      `
    },
    {
      name: 'messages',
      sql: `
        CREATE TABLE IF NOT EXISTS messages (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          sender_id UUID NOT NULL,
          recipient_id UUID NOT NULL,
          child_id UUID,
          subject VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          priority VARCHAR(20) DEFAULT 'normal',
          type VARCHAR(50) DEFAULT 'direct',
          status VARCHAR(20) DEFAULT 'unread',
          thread_id UUID,
          attachments JSONB DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          read_at TIMESTAMP WITH TIME ZONE
        );
      `
    },
    {
      name: 'payments',
      sql: `
        CREATE TABLE IF NOT EXISTS payments (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'INR',
          status VARCHAR(20) DEFAULT 'pending',
          payment_method VARCHAR(50),
          transaction_id VARCHAR(255),
          plan_type VARCHAR(50),
          billing_period VARCHAR(20),
          payment_gateway VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'user_progress',
      sql: `
        CREATE TABLE IF NOT EXISTS user_progress (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL,
          passage_id UUID,
          reading_time INTEGER DEFAULT 0,
          comprehension_score INTEGER DEFAULT 0,
          questions_attempted INTEGER DEFAULT 0,
          questions_correct INTEGER DEFAULT 0,
          completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'user_analytics',
      sql: `
        CREATE TABLE IF NOT EXISTS user_analytics (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL,
          date DATE NOT NULL DEFAULT CURRENT_DATE,
          reading_time INTEGER DEFAULT 0,
          passages_read INTEGER DEFAULT 0,
          quiz_score INTEGER DEFAULT 0,
          questions_attempted INTEGER DEFAULT 0,
          questions_correct INTEGER DEFAULT 0,
          study_sessions INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, date)
        );
      `
    },
    {
      name: 'reading_passages',
      sql: `
        CREATE TABLE IF NOT EXISTS reading_passages (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'comprehension',
          difficulty VARCHAR(20) DEFAULT 'medium',
          category VARCHAR(100),
          word_count INTEGER,
          estimated_time INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'notifications',
      sql: `
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          data JSONB DEFAULT '{}',
          read BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }
  ];
  
  for (const table of tables) {
    try {
      const { error } = await supabase.rpc('exec', { sql: table.sql });
      if (error) {
        console.log(`⚠️ Warning creating ${table.name}: ${error.message}`);
      } else {
        console.log(`✅ Created table: ${table.name}`);
      }
    } catch (error) {
      console.log(`⚠️ Error creating ${table.name}: ${error.message}`);
    }
  }
}

async function verifyData() {
  try {
    // Check if sample data exists
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('email, role')
      .in('email', ['parent@demo.com', 'ananya@demo.com', 'arjun@demo.com']);
    
    if (usersError) {
      console.log('⚠️ Warning checking users:', usersError.message);
    } else {
      console.log(`✅ Found ${users?.length || 0} sample users`);
    }
    
    const { data: relationships, error: relError } = await supabase
      .from('parent_child_relationships')
      .select('*')
      .eq('parent_id', 'parent-001');
    
    if (!relError && relationships) {
      console.log(`✅ Found ${relationships.length} parent-child relationships`);
    }
    
    const { data: progress, error: progError } = await supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .in('user_id', ['student-001', 'student-002']);
    
    if (!progError) {
      console.log(`✅ Found ${progress?.length || 0} progress entries`);
    }
    
    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', 'parent-001');
    
    if (!payError) {
      console.log(`✅ Found ${payments?.length || 0} payment records`);
    }
    
  } catch (error) {
    console.log('⚠️ Warning during verification:', error.message);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { setupDatabase };