-- Comprehensive Admin Database Schema for Level Up CLAT
-- This schema supports all admin features with real data operations

-- ================================
-- USER MANAGEMENT TABLES
-- ================================

-- Enhanced users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'admin', 'educator', 'parent', 'operation_manager')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
  profile_picture TEXT,
  date_of_birth DATE,
  gender VARCHAR(10),
  
  -- Academic info
  target_nlu VARCHAR(255),
  target_score INTEGER DEFAULT 0,
  current_score DECIMAL(5,2) DEFAULT 0,
  
  -- Subscription info
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'elite')),
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,
  total_spent DECIMAL(10,2) DEFAULT 0,
  
  -- Analytics
  study_streak INTEGER DEFAULT 0,
  total_study_hours INTEGER DEFAULT 0,
  tests_completed INTEGER DEFAULT 0,
  avg_score DECIMAL(5,2) DEFAULT 0,
  last_login TIMESTAMP,
  login_count INTEGER DEFAULT 0,
  
  -- Verification
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  otp_code VARCHAR(6),
  otp_expires TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User segments for targeted features
CREATE TABLE IF NOT EXISTS user_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL, -- Dynamic filtering criteria
  color VARCHAR(20) DEFAULT 'blue',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User segment membership
CREATE TABLE IF NOT EXISTS user_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID REFERENCES user_segments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(segment_id, user_id)
);

-- ================================
-- CONTENT MANAGEMENT TABLES
-- ================================

-- Content items (passages, questions, etc.)
CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('passage', 'question', 'vocabulary', 'mock_test', 'flashcard')),
  category VARCHAR(100),
  subject VARCHAR(100),
  difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  
  -- Metadata
  tags TEXT[], -- Array of tags
  estimated_time INTEGER, -- in minutes
  points INTEGER DEFAULT 0,
  
  -- Analytics
  views INTEGER DEFAULT 0,
  completions INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  
  -- Author info
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  
  -- File attachments
  attachments JSONB, -- Store file URLs and metadata
  
  -- SEO and search
  meta_description TEXT,
  search_keywords TEXT[],
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP
);

-- Questions with detailed structure
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'true_false', 'fill_blank', 'essay', 'numeric')),
  
  -- MCQ options
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  option_e TEXT,
  correct_answer VARCHAR(10),
  
  -- Explanations
  explanation TEXT,
  hint TEXT,
  
  -- Difficulty and analytics
  difficulty_score DECIMAL(3,2), -- 0-5 scale
  time_limit INTEGER, -- seconds
  points INTEGER DEFAULT 1,
  
  -- Performance analytics
  attempt_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  avg_time_taken INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vocabulary management
CREATE TABLE IF NOT EXISTS vocabulary_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word VARCHAR(255) UNIQUE NOT NULL,
  definition TEXT NOT NULL,
  pronunciation VARCHAR(255),
  part_of_speech VARCHAR(50),
  
  -- Context and usage
  example_sentence TEXT,
  synonyms TEXT[],
  antonyms TEXT[],
  etymology TEXT,
  
  -- CLAT specific
  clat_relevance_score INTEGER DEFAULT 0 CHECK (clat_relevance_score >= 0 AND clat_relevance_score <= 10),
  frequency_rank INTEGER,
  difficulty_level VARCHAR(20) DEFAULT 'medium',
  
  -- Learning aids
  memory_tips TEXT,
  visual_aids JSONB,
  
  -- Analytics
  learned_by_count INTEGER DEFAULT 0,
  avg_mastery_time INTEGER DEFAULT 0, -- in hours
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- MOCK TEST MANAGEMENT
-- ================================

-- Mock tests
CREATE TABLE IF NOT EXISTS mock_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  instructions TEXT,
  
  -- Test configuration
  total_questions INTEGER NOT NULL,
  total_marks INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  negative_marking BOOLEAN DEFAULT TRUE,
  negative_marks_ratio DECIMAL(3,2) DEFAULT 0.25,
  
  -- Sections
  sections JSONB, -- Array of section configurations
  
  -- Availability
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  max_attempts INTEGER DEFAULT 1,
  
  -- Pricing
  is_free BOOLEAN DEFAULT TRUE,
  price DECIMAL(10,2) DEFAULT 0,
  
  -- Analytics
  total_attempts INTEGER DEFAULT 0,
  avg_score DECIMAL(5,2) DEFAULT 0,
  highest_score DECIMAL(5,2) DEFAULT 0,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mock test questions mapping
CREATE TABLE IF NOT EXISTS mock_test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_test_id UUID REFERENCES mock_tests(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  section_name VARCHAR(100),
  question_order INTEGER,
  marks INTEGER DEFAULT 1,
  negative_marks DECIMAL(3,2) DEFAULT 0,
  
  UNIQUE(mock_test_id, question_id)
);

-- Mock test attempts
CREATE TABLE IF NOT EXISTS mock_test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mock_test_id UUID REFERENCES mock_tests(id) ON DELETE CASCADE,
  
  -- Attempt info
  attempt_number INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  
  -- Scores
  total_score DECIMAL(5,2) DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0,
  rank INTEGER,
  percentile DECIMAL(5,2),
  
  -- Timing
  time_taken INTEGER, -- in seconds
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Answers
  answers JSONB, -- Store all answers with timing
  
  -- Analytics
  section_scores JSONB,
  accuracy_stats JSONB,
  time_stats JSONB
);

-- ================================
-- FLASHCARD SYSTEM
-- ================================

-- Flashcard decks
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  difficulty VARCHAR(20) DEFAULT 'medium',
  
  -- Deck settings
  cards_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT FALSE,
  price DECIMAL(10,2) DEFAULT 0,
  
  -- Analytics
  total_users INTEGER DEFAULT 0,
  avg_completion_rate DECIMAL(5,2) DEFAULT 0,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Flashcards
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  
  -- Rich content
  front_image TEXT,
  back_image TEXT,
  audio_url TEXT,
  
  -- Learning metadata
  difficulty_score DECIMAL(3,2) DEFAULT 2.5,
  tags TEXT[],
  
  -- Spaced repetition
  ease_factor DECIMAL(3,2) DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  
  card_order INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- INSTITUTE MANAGEMENT
-- ================================

-- Partner institutes
CREATE TABLE IF NOT EXISTS institutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(500) NOT NULL,
  code VARCHAR(50) UNIQUE,
  
  -- Contact information
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  
  -- Address
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',
  
  -- Business info
  license_number VARCHAR(100),
  gst_number VARCHAR(20),
  pan_number VARCHAR(20),
  
  -- Subscription
  subscription_type VARCHAR(50) DEFAULT 'basic',
  monthly_fee DECIMAL(10,2) DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Analytics
  total_students INTEGER DEFAULT 0,
  active_students INTEGER DEFAULT 0,
  monthly_revenue DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
  onboarded_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Institute-student mapping
CREATE TABLE IF NOT EXISTS institute_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID REFERENCES institutes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  
  UNIQUE(institute_id, user_id)
);

-- ================================
-- FINANCIAL MANAGEMENT
-- ================================

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  institute_id UUID REFERENCES institutes(id),
  
  -- Transaction details
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('subscription', 'mock_test', 'content', 'refund', 'commission')),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  
  -- Payment info
  payment_method VARCHAR(50),
  payment_id VARCHAR(255), -- External payment gateway ID
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- Metadata
  description TEXT,
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  refunded_at TIMESTAMP
);

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  
  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
  
  -- Features
  features JSONB NOT NULL,
  limits JSONB,
  
  -- Availability
  is_active BOOLEAN DEFAULT TRUE,
  is_popular BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  
  -- Subscription period
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'paused')),
  
  -- Payment
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_frequency VARCHAR(20),
  next_billing_date TIMESTAMP,
  
  -- Metadata
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- NOTIFICATIONS & COMMUNICATIONS
-- ================================

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push', 'in_app')),
  
  -- Content
  subject VARCHAR(500),
  content TEXT NOT NULL,
  html_content TEXT,
  
  -- Targeting
  target_audience JSONB, -- Criteria for auto-targeting
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification campaigns
CREATE TABLE IF NOT EXISTS notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES notification_templates(id),
  
  -- Campaign details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Scheduling
  send_immediately BOOLEAN DEFAULT TRUE,
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  
  -- Targeting
  target_segments UUID[], -- Array of segment IDs
  target_users UUID[], -- Array of specific user IDs
  
  -- Analytics
  total_recipients INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES notification_campaigns(id),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content
  type VARCHAR(50) NOT NULL,
  title VARCHAR(500),
  message TEXT NOT NULL,
  
  -- Delivery
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB,
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- ANALYTICS & REPORTING
-- ================================

-- System analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  
  -- Event details
  event_type VARCHAR(100) NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  
  -- Context
  session_id VARCHAR(255),
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address INET,
  
  -- Custom properties
  properties JSONB,
  
  -- Timing
  duration INTEGER, -- in seconds
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Goals and achievements
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  
  -- Goal configuration
  goal_type VARCHAR(50) NOT NULL CHECK (goal_type IN ('streak', 'score', 'time', 'completion', 'rank')),
  target_value INTEGER NOT NULL,
  unit VARCHAR(50),
  
  -- Rewards
  points_reward INTEGER DEFAULT 0,
  badge_icon VARCHAR(255),
  badge_color VARCHAR(20),
  
  -- Availability
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User goal progress
CREATE TABLE IF NOT EXISTS user_goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  
  -- Progress tracking
  current_value INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  
  -- Metadata
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, goal_id)
);

-- ================================
-- SYSTEM SETTINGS & CONFIGURATION
-- ================================

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL,
  key VARCHAR(255) NOT NULL,
  value TEXT,
  value_type VARCHAR(50) DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
  
  -- Metadata
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  is_required BOOLEAN DEFAULT FALSE,
  
  -- Validation
  validation_rules JSONB,
  
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(category, key)
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  
  -- Action details
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  
  -- Metadata
  description TEXT,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Content indexes
CREATE INDEX IF NOT EXISTS idx_content_items_type ON content_items(content_type);
CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status);
CREATE INDEX IF NOT EXISTS idx_content_items_category ON content_items(category);
CREATE INDEX IF NOT EXISTS idx_content_items_created_by ON content_items(created_by);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);

-- Mock test indexes
CREATE INDEX IF NOT EXISTS idx_mock_test_attempts_user_id ON mock_test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_test_attempts_test_id ON mock_test_attempts(mock_test_id);
CREATE INDEX IF NOT EXISTS idx_mock_test_attempts_status ON mock_test_attempts(status);

-- Financial indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- ================================
-- FUNCTIONS AND TRIGGERS
-- ================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
DO $$
DECLARE
  tables_with_updated_at TEXT[] := ARRAY[
    'users', 'content_items', 'questions', 'vocabulary_words', 
    'mock_tests', 'flashcard_decks', 'flashcards', 'institutes',
    'subscription_plans', 'user_subscriptions', 'notification_templates',
    'system_settings'
  ];
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY tables_with_updated_at
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END $$;

-- ================================
-- SAMPLE DATA FOR TESTING
-- ================================

-- Insert sample subscription plans
INSERT INTO subscription_plans (name, code, description, price, features, limits) VALUES
('Free Plan', 'free', 'Basic access to Level Up CLAT', 0, 
 '{"mock_tests": 2, "flashcards": true, "vocabulary": 100, "analytics": "basic"}',
 '{"mock_tests_per_month": 2, "vocabulary_words": 100}'
),
('Premium Plan', 'premium', 'Enhanced features for serious CLAT preparation', 999, 
 '{"mock_tests": "unlimited", "flashcards": true, "vocabulary": "unlimited", "analytics": "advanced", "doubt_clearing": true}',
 '{"mock_tests_per_month": -1, "vocabulary_words": -1}'
),
('Elite Plan', 'elite', 'Complete CLAT preparation with personal mentoring', 2499, 
 '{"mock_tests": "unlimited", "flashcards": true, "vocabulary": "unlimited", "analytics": "premium", "doubt_clearing": true, "personal_mentor": true, "live_classes": true}',
 '{"mock_tests_per_month": -1, "vocabulary_words": -1, "mentor_sessions": 4}'
) ON CONFLICT (code) DO NOTHING;

-- Insert sample system settings
INSERT INTO system_settings (category, key, value, value_type, description) VALUES
('general', 'site_name', 'Level Up CLAT', 'string', 'Application name'),
('general', 'max_login_attempts', '5', 'number', 'Maximum login attempts before lockout'),
('subscription', 'trial_period_days', '7', 'number', 'Free trial period in days'),
('mock_tests', 'default_duration_minutes', '120', 'number', 'Default mock test duration'),
('notifications', 'enable_email_notifications', 'true', 'boolean', 'Enable email notifications'),
('analytics', 'session_timeout_minutes', '30', 'number', 'User session timeout')
ON CONFLICT (category, key) DO NOTHING;

-- Create sample goals
INSERT INTO goals (name, description, category, goal_type, target_value, unit, points_reward, badge_icon, badge_color) VALUES
('First Steps', 'Complete your first mock test', 'beginner', 'completion', 1, 'tests', 100, '🎯', 'blue'),
('Study Streak', 'Study for 7 consecutive days', 'consistency', 'streak', 7, 'days', 200, '🔥', 'orange'),
('Score Master', 'Achieve 80% or higher in a mock test', 'performance', 'score', 80, 'percentage', 300, '⭐', 'gold'),
('Vocabulary Expert', 'Learn 100 new words', 'knowledge', 'completion', 100, 'words', 250, '📚', 'green'),
('Speed Reader', 'Complete reading passages in under 10 minutes average', 'efficiency', 'time', 10, 'minutes', 150, '⚡', 'yellow')
ON CONFLICT DO NOTHING;

COMMIT;