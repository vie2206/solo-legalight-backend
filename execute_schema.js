const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function executeSchema() {
  console.log('🚀 Executing database schema...');
  
  try {
    // Execute the schema directly using raw SQL
    const schema = fs.readFileSync('./sql/enhanced_schema.sql', 'utf8');
    
    // Split into major sections and execute
    const sections = schema.split('-- ').filter(section => section.trim());
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (section) {
        console.log(`⏳ Executing section ${i + 1}/${sections.length}`);
        
        // Split into individual statements
        const statements = section.split(';').filter(stmt => stmt.trim() && !stmt.startsWith('COMMENT'));
        
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              const { error } = await supabase.rpc('exec', { sql: statement.trim() + ';' });
              if (error && !error.message.includes('already exists')) {
                console.log('⚠️  Statement result:', error.message);
              }
            } catch (err) {
              // Continue on errors as many are expected (table exists, etc.)
              console.log('⚠️  Expected error (continuing):', err.message);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Schema execution error:', error);
  }
  
  console.log('✅ Schema execution completed');
  console.log('🎯 Verifying table creation...');
  
  // Verify tables exist
  const tables = ['reading_passages', 'vocabulary_words', 'gk_questions', 'challenges', 'user_progress'];
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ Table ${table}:`, error.message);
      } else {
        console.log(`✅ Table ${table} is accessible`);
      }
    } catch (err) {
      console.log(`❌ Error checking table ${table}:`, err.message);
    }
  }
}

executeSchema().catch(console.error);