-- Enhanced CLAT Reading Mastery Database Schema
-- Run these commands in Supabase SQL Editor

-- 1. Content Management Tables for Admin CMS

-- Reading Passages Content Management
CREATE TABLE IF NOT EXISTS reading_passages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL, -- Current Affairs, Legal, etc.
  source VARCHAR(255),
  difficulty VARCHAR(50) NOT NULL, -- Beginner, Intermediate, Advanced
  estimated_time VARCHAR(50),
  word_count INTEGER,
  tags TEXT[], -- Array of tags
  ai_complexity DECIMAL(3,1),
  content TEXT NOT NULL, -- Full passage text
  vocabulary JSONB, -- Vocabulary items with definitions
  questions JSONB, -- AI-generated questions
  reading_tips TEXT[],
  difficulty_factors TEXT[],
  created_by UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vocabulary Database Management
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
  created_by UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GK Questions Management
CREATE TABLE IF NOT EXISTS gk_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of options
  correct_answer INTEGER NOT NULL, -- Index of correct option
  category VARCHAR(100) NOT NULL,
  difficulty VARCHAR(50) NOT NULL,
  points INTEGER DEFAULT 10,
  explanation TEXT,
  source VARCHAR(255),
  tags TEXT[],
  created_by UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenges Management
CREATE TABLE IF NOT EXISTS challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  difficulty VARCHAR(50) NOT NULL,
  reward INTEGER NOT NULL,
  total_steps INTEGER NOT NULL,
  challenge_type VARCHAR(100) NOT NULL, -- speed, vocabulary, comprehension, etc.
  time_limit INTEGER, -- in minutes
  requirements JSONB NOT NULL,
  completion_criteria TEXT NOT NULL,
  icon VARCHAR(10),
  category VARCHAR(100) NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Progress and Analytics Tables

-- User Progress Tracking
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  passage_id UUID REFERENCES reading_passages(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_spent INTEGER, -- in seconds
  reading_speed INTEGER, -- words per minute
  comprehension_score INTEGER, -- percentage
  questions_answered INTEGER,
  questions_correct INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vocabulary Progress
CREATE TABLE IF NOT EXISTS vocabulary_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  word_id UUID REFERENCES vocabulary_words(id),
  mastery_level VARCHAR(50) NOT NULL, -- new, learning, mastered
  last_reviewed TIMESTAMPTZ,
  next_review TIMESTAMPTZ,
  ease_factor DECIMAL(3,2) DEFAULT 2.5,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, word_id)
);

-- Challenge Progress
CREATE TABLE IF NOT EXISTS challenge_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  challenge_id UUID REFERENCES challenges(id),
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  claimed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- User Analytics
CREATE TABLE IF NOT EXISTS user_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  reading_time INTEGER DEFAULT 0, -- minutes
  passages_read INTEGER DEFAULT 0,
  words_learned INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  quiz_score_avg DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 3. Organization and Class Management

-- Organizations/Institutes
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL, -- coaching_institute, school, self_study_group
  address TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  subscription_plan VARCHAR(100),
  subscription_expires DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes/Groups
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  educator_id UUID REFERENCES users(id),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class Memberships
CREATE TABLE IF NOT EXISTS class_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(50) NOT NULL, -- student, educator, assistant
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(class_id, user_id)
);

-- Parent-Child Relationships
CREATE TABLE IF NOT EXISTS parent_child_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES users(id),
  child_id UUID REFERENCES users(id),
  relationship_type VARCHAR(50) DEFAULT 'parent', -- parent, guardian
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, child_id)
);

-- 4. Notifications and Communications

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(100) NOT NULL, -- achievement, reminder, announcement, system
  data JSONB, -- Additional data for the notification
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  target_audience VARCHAR(100) NOT NULL, -- all, students, educators, parents, admins
  priority VARCHAR(50) DEFAULT 'normal', -- low, normal, high, urgent
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Indexes for Performance

-- Reading passages indexes
CREATE INDEX IF NOT EXISTS idx_reading_passages_type ON reading_passages(type);
CREATE INDEX IF NOT EXISTS idx_reading_passages_difficulty ON reading_passages(difficulty);
CREATE INDEX IF NOT EXISTS idx_reading_passages_status ON reading_passages(status);
CREATE INDEX IF NOT EXISTS idx_reading_passages_tags ON reading_passages USING GIN(tags);

-- Vocabulary indexes
CREATE INDEX IF NOT EXISTS idx_vocabulary_words_difficulty ON vocabulary_words(difficulty);
CREATE INDEX IF NOT EXISTS idx_vocabulary_words_category ON vocabulary_words(category);
CREATE INDEX IF NOT EXISTS idx_vocabulary_words_status ON vocabulary_words(status);

-- GK questions indexes
CREATE INDEX IF NOT EXISTS idx_gk_questions_category ON gk_questions(category);
CREATE INDEX IF NOT EXISTS idx_gk_questions_difficulty ON gk_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_gk_questions_status ON gk_questions(status);

-- Progress indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed_at ON user_progress(completed_at);
CREATE INDEX IF NOT EXISTS idx_vocabulary_progress_user_id ON vocabulary_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_user_id ON challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_date ON user_analytics(user_id, date);

-- Organization indexes
CREATE INDEX IF NOT EXISTS idx_class_memberships_user_id ON class_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_class_memberships_class_id ON class_memberships(class_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_parent_id ON parent_child_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_child_id ON parent_child_relationships(child_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- 6. Enhanced User Roles and Permissions

-- Update users table with additional columns (if not exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(100) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- 7. Row Level Security Policies

-- Enable RLS on all new tables
ALTER TABLE reading_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE gk_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_child_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Content Management Policies (Admin/Educator access)
CREATE POLICY "Admin can manage all content" ON reading_passages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operation_manager')
    )
  );

CREATE POLICY "Educators can manage own content" ON reading_passages
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operation_manager', 'educator')
    )
  );

CREATE POLICY "Published content viewable by all" ON reading_passages
  FOR SELECT USING (status = 'published');

-- Similar policies for vocabulary and GK questions
CREATE POLICY "Admin can manage vocabulary" ON vocabulary_words
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operation_manager', 'educator')
    )
  );

CREATE POLICY "Active vocabulary viewable by all" ON vocabulary_words
  FOR SELECT USING (status = 'active');

CREATE POLICY "Admin can manage GK questions" ON gk_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operation_manager', 'educator')
    )
  );

CREATE POLICY "Active GK questions viewable by all" ON gk_questions
  FOR SELECT USING (status = 'active');

-- User Progress Policies
CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own progress" ON user_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Educators can view class progress" ON user_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_memberships cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.user_id = user_progress.user_id
      AND c.educator_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view child progress" ON user_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships pcr
      WHERE pcr.child_id = user_progress.user_id
      AND pcr.parent_id = auth.uid()
    )
  );

-- Notification Policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- 8. Functions for Data Management

-- Function to update user analytics
CREATE OR REPLACE FUNCTION update_user_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_analytics (user_id, date, reading_time, passages_read)
  VALUES (NEW.user_id, CURRENT_DATE, 
          COALESCE(NEW.time_spent, 0) / 60, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    reading_time = user_analytics.reading_time + EXCLUDED.reading_time,
    passages_read = user_analytics.passages_read + EXCLUDED.passages_read,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update analytics on progress completion
CREATE TRIGGER update_analytics_trigger
  AFTER INSERT ON user_progress
  FOR EACH ROW
  WHEN (NEW.completed_at IS NOT NULL)
  EXECUTE FUNCTION update_user_analytics();

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  target_user_id UUID,
  notification_title VARCHAR(255),
  notification_message TEXT,
  notification_type VARCHAR(100),
  notification_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (target_user_id, notification_title, notification_message, notification_type, notification_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Sample Data Insertion (Optional - for testing)

-- Insert sample organization
INSERT INTO organizations (name, type, contact_email) 
VALUES ('Demo Coaching Institute', 'coaching_institute', 'admin@demo-institute.com')
ON CONFLICT DO NOTHING;

-- Insert sample challenges based on existing data
INSERT INTO challenges (title, description, difficulty, reward, total_steps, challenge_type, requirements, completion_criteria, icon, category)
VALUES 
  ('Speed Reading Sprint', 'Read 5 passages in under 30 minutes with 80%+ accuracy', 'Intermediate', 100, 5, 'speed', 
   '{"minAccuracy": 80, "timeLimit": 1800, "passageCount": 5}', 'Complete 5 passages within time limit while maintaining accuracy', '⚡', 'Reading Speed'),
  ('Vocabulary Master', 'Learn and master 25 new legal terms this week', 'Beginner', 150, 25, 'vocabulary',
   '{"newWords": 25, "masteryLevel": "learning", "timeframe": 604800000}', 'Learn 25 new words with at least learning mastery level', '📚', 'Vocabulary Building'),
  ('Comprehension Champion', 'Score 90%+ accuracy on 10 different reading passages', 'Advanced', 200, 10, 'comprehension',
   '{"minAccuracy": 90, "passageCount": 10, "uniquePassages": true}', 'Achieve 90%+ accuracy on 10 unique passages', '🎯', 'Reading Comprehension')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE reading_passages IS 'Stores all reading passages with their content and metadata';
COMMENT ON TABLE vocabulary_words IS 'Master vocabulary database with definitions and learning data';
COMMENT ON TABLE gk_questions IS 'General Knowledge questions database for CLAT preparation';
COMMENT ON TABLE challenges IS 'Gamification challenges for user engagement';
COMMENT ON TABLE user_progress IS 'Tracks user progress through reading passages';
COMMENT ON TABLE user_analytics IS 'Daily analytics and performance metrics for users';
COMMENT ON TABLE organizations IS 'Educational institutions and coaching centers';
COMMENT ON TABLE classes IS 'Classes/groups within organizations';
COMMENT ON TABLE notifications IS 'System notifications for users';