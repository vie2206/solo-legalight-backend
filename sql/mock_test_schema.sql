-- SQL Schema for Mock Test Framework
-- Run these commands in Supabase SQL Editor to create the tables

-- 1. Mock Tests Table
CREATE TABLE IF NOT EXISTS mock_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name VARCHAR(255) NOT NULL,
  test_date DATE NOT NULL,
  total_questions INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  sections JSONB NOT NULL, -- Stores section breakdown like {"English": 35, "Math": 20, "GK": 35, "LR": 35, "LA": 35}
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Mock Test Questions Table
CREATE TABLE IF NOT EXISTS mock_test_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mock_test_id UUID REFERENCES mock_tests(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  section VARCHAR(50) NOT NULL, -- English, Math, GK, LR, LA
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- ["Option A", "Option B", "Option C", "Option D"]
  correct_answer VARCHAR(1) NOT NULL, -- A, B, C, D
  difficulty_level VARCHAR(20) DEFAULT 'Medium', -- Easy, Medium, Hard
  explanation TEXT, -- Detailed explanation for the answer
  elimination_criteria JSONB, -- Step-by-step elimination process
  topic VARCHAR(100), -- Specific topic within section
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Student Mock Attempts Table (for offline pen-paper results)
CREATE TABLE IF NOT EXISTS student_mock_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES users(id),
  mock_test_id UUID REFERENCES mock_tests(id),
  
  -- Performance Data (JSON format)
  attempt_data JSONB NOT NULL, -- Raw attempt data with answers
  performance_summary JSONB NOT NULL, -- {total_questions, total_attempted, correct_answers, incorrect_answers, marks}
  section_wise_performance JSONB NOT NULL, -- Section breakdown of performance
  mistakes_analysis JSONB NOT NULL, -- {silly_mistakes, conceptual_errors, calculation_errors, elimination_errors}
  time_management_data JSONB NOT NULL, -- {time_per_question, section_wise_time, sections_not_completed}
  
  -- Attempt metadata
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  analysis_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Mock Test Recommendations Table (AI Generated)
CREATE TABLE IF NOT EXISTS mock_test_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES users(id),
  mock_attempt_id UUID REFERENCES student_mock_attempts(id),
  
  -- AI Recommendations (JSON format)
  recommendations JSONB NOT NULL, -- Full recommendation structure
  recommendation_type VARCHAR(50) DEFAULT 'performance_analysis', -- performance_analysis, strategy_planning, etc.
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mock_tests_date ON mock_tests(test_date);
CREATE INDEX IF NOT EXISTS idx_mock_questions_test_id ON mock_test_questions(mock_test_id);
CREATE INDEX IF NOT EXISTS idx_mock_questions_section ON mock_test_questions(section);
CREATE INDEX IF NOT EXISTS idx_student_attempts_student_id ON student_mock_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_test_id ON student_mock_attempts(mock_test_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_date ON student_mock_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_student_id ON mock_test_recommendations(student_id);

-- 6. Create RPC functions for table creation (used by the API)
CREATE OR REPLACE FUNCTION create_mock_tests_table()
RETURNS void AS $$
BEGIN
  -- This function is called by the API to ensure tables exist
  -- The actual table creation is handled by the schema above
  RAISE NOTICE 'Mock test tables are ready';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_mock_test_questions_table()
RETURNS void AS $$
BEGIN
  RAISE NOTICE 'Mock test questions table is ready';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_student_mock_attempts_table()
RETURNS void AS $$
BEGIN
  RAISE NOTICE 'Student mock attempts table is ready';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_mock_test_recommendations_table()
RETURNS void AS $$
BEGIN
  RAISE NOTICE 'Mock test recommendations table is ready';
END;
$$ LANGUAGE plpgsql;

-- 7. Enable Row Level Security (RLS) for data protection
ALTER TABLE mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_mock_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_test_recommendations ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS Policies

-- Mock Tests: All authenticated users can read, only admins can create/update
CREATE POLICY "Allow read access to mock tests" ON mock_tests
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin to manage mock tests" ON mock_tests
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'role' = 'educator'
  );

-- Mock Test Questions: All authenticated users can read
CREATE POLICY "Allow read access to questions" ON mock_test_questions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin to manage questions" ON mock_test_questions
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'role' = 'educator'
  );

-- Student Attempts: Users can only see their own attempts
CREATE POLICY "Students can view own attempts" ON student_mock_attempts
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can insert own attempts" ON student_mock_attempts
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can view all attempts" ON student_mock_attempts
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'role' = 'educator'
  );

-- Recommendations: Users can only see their own recommendations
CREATE POLICY "Students can view own recommendations" ON mock_test_recommendations
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can insert own recommendations" ON mock_test_recommendations
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can view all recommendations" ON mock_test_recommendations
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'role' = 'educator'
  );