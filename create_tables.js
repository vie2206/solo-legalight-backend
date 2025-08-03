const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createTables() {
  console.log('🚀 Creating database tables...');
  
  // Create reading_passages table
  try {
    console.log('⏳ Creating reading_passages table...');
    const { error: passagesError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS reading_passages (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          type VARCHAR(100) NOT NULL,
          source VARCHAR(255),
          difficulty VARCHAR(50) NOT NULL,
          estimated_time VARCHAR(50),
          word_count INTEGER,
          tags TEXT[],
          ai_complexity DECIMAL(3,1),
          content TEXT NOT NULL,
          vocabulary JSONB,
          questions JSONB,
          reading_tips TEXT[],
          difficulty_factors TEXT[],
          created_by UUID,
          status VARCHAR(50) DEFAULT 'draft',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    
    if (passagesError && !passagesError.message.includes('already exists')) {
      console.log('❌ Error creating reading_passages:', passagesError.message);
    } else {
      console.log('✅ reading_passages table created');
    }
  } catch (err) {
    console.log('⚠️  reading_passages creation result:', err.message);
  }

  // Create vocabulary_words table
  try {
    console.log('⏳ Creating vocabulary_words table...');
    const { error: vocabError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS vocabulary_words (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          word VARCHAR(255) NOT NULL UNIQUE,
          definition TEXT NOT NULL,
          context TEXT,
          etymology TEXT,
          difficulty VARCHAR(50) NOT NULL,
          category VARCHAR(100) NOT NULL,
          synonyms TEXT[],
          antonyms TEXT[],
          usage_example TEXT,
          mnemonics TEXT,
          frequency VARCHAR(50),
          clat_relevance INTEGER CHECK (clat_relevance BETWEEN 1 AND 10),
          examples TEXT[],
          created_by UUID,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    
    if (vocabError && !vocabError.message.includes('already exists')) {
      console.log('❌ Error creating vocabulary_words:', vocabError.message);
    } else {
      console.log('✅ vocabulary_words table created');
    }
  } catch (err) {
    console.log('⚠️  vocabulary_words creation result:', err.message);
  }

  // Create gk_questions table
  try {
    console.log('⏳ Creating gk_questions table...');
    const { error: gkError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS gk_questions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          question TEXT NOT NULL,
          options JSONB NOT NULL,
          correct_answer INTEGER NOT NULL,
          category VARCHAR(100) NOT NULL,
          difficulty VARCHAR(50) NOT NULL,
          points INTEGER DEFAULT 10,
          explanation TEXT,
          source VARCHAR(255),
          tags TEXT[],
          created_by UUID,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    
    if (gkError && !gkError.message.includes('already exists')) {
      console.log('❌ Error creating gk_questions:', gkError.message);
    } else {
      console.log('✅ gk_questions table created');
    }
  } catch (err) {
    console.log('⚠️  gk_questions creation result:', err.message);
  }

  // Create challenges table
  try {
    console.log('⏳ Creating challenges table...');
    const { error: challengesError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS challenges (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          difficulty VARCHAR(50) NOT NULL,
          reward INTEGER NOT NULL,
          total_steps INTEGER NOT NULL,
          challenge_type VARCHAR(100) NOT NULL,
          time_limit INTEGER,
          requirements JSONB NOT NULL,
          completion_criteria TEXT NOT NULL,
          icon VARCHAR(10),
          category VARCHAR(100) NOT NULL,
          start_date DATE,
          end_date DATE,
          is_active BOOLEAN DEFAULT true,
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    
    if (challengesError && !challengesError.message.includes('already exists')) {
      console.log('❌ Error creating challenges:', challengesError.message);
    } else {
      console.log('✅ challenges table created');
    }
  } catch (err) {
    console.log('⚠️  challenges creation result:', err.message);
  }

  console.log('✅ Table creation completed');
  console.log('🎯 Verifying table creation...');
  
  // Verify tables exist
  const tables = ['reading_passages', 'vocabulary_words', 'gk_questions', 'challenges'];
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

createTables().catch(console.error);