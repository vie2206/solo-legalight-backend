-- Updated subscription schema for Level Up CLAT
-- This schema supports the new subscription tiers: free, mini, pro, ultra

-- Update users table to support new subscription tiers
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_tier_check;
ALTER TABLE users ADD CONSTRAINT users_subscription_tier_check 
  CHECK (subscription_tier IN ('free', 'mini', 'pro', 'ultra'));

-- Update existing users to use new tier names
UPDATE users SET subscription_tier = 'mini' WHERE subscription_tier = 'premium';
UPDATE users SET subscription_tier = 'ultra' WHERE subscription_tier = 'elite';

-- Add new subscription-related columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP;

-- Create subscription history table
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  from_tier VARCHAR(20) NOT NULL,
  to_tier VARCHAR(20) NOT NULL,
  billing_cycle VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create daily login rewards table
CREATE TABLE IF NOT EXISTS daily_login_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  login_date DATE NOT NULL,
  streak_count INTEGER NOT NULL DEFAULT 1,
  reward_type VARCHAR(50) NOT NULL, -- 'analysis_credits', 'mock_unlock', 'feature_access'
  reward_value INTEGER NOT NULL DEFAULT 1,
  claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, login_date)
);

-- Create user feature access table
CREATE TABLE IF NOT EXISTS user_feature_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  feature_name VARCHAR(100) NOT NULL,
  access_level VARCHAR(20) NOT NULL DEFAULT 'basic' CHECK (access_level IN ('none', 'basic', 'advanced', 'premium')),
  expires_at TIMESTAMP,
  granted_by VARCHAR(50) DEFAULT 'subscription', -- 'subscription', 'reward', 'admin', 'trial'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, feature_name)
);

-- Insert default feature access based on subscription tiers
INSERT INTO user_feature_access (user_id, feature_name, access_level, granted_by)
SELECT 
  u.id,
  f.feature_name,
  CASE 
    WHEN u.subscription_tier = 'free' THEN f.free_access
    WHEN u.subscription_tier = 'mini' THEN f.mini_access
    WHEN u.subscription_tier = 'pro' THEN f.pro_access
    WHEN u.subscription_tier = 'ultra' THEN f.ultra_access
    ELSE 'none'
  END as access_level,
  'subscription'
FROM users u
CROSS JOIN (
  VALUES 
    ('mock_tests', 'basic', 'basic', 'advanced', 'advanced'),
    ('mock_analysis', 'basic', 'basic', 'advanced', 'advanced'),
    ('rank_prediction', 'basic', 'basic', 'advanced', 'advanced'),
    ('study_plans', 'none', 'basic', 'advanced', 'advanced'),
    ('sectional_tests', 'basic', 'basic', 'advanced', 'advanced'),
    ('daily_challenges', 'none', 'basic', 'advanced', 'advanced'),
    ('performance_analytics', 'basic', 'basic', 'advanced', 'advanced'),
    ('ai_mock_analysis', 'none', 'none', 'advanced', 'advanced'),
    ('weekly_insights', 'none', 'none', 'advanced', 'advanced'),
    ('daily_reading_practice', 'none', 'none', 'advanced', 'advanced'),
    ('vocabulary_quizzes', 'none', 'none', 'advanced', 'advanced'),
    ('advanced_study_reminders', 'none', 'none', 'advanced', 'advanced'),
    ('ai_smart_notifications', 'none', 'none', 'none', 'premium'),
    ('personalized_ai_coaching', 'none', 'none', 'none', 'premium'),
    ('mood_tracking', 'none', 'none', 'none', 'premium'),
    ('parents_dashboard', 'none', 'none', 'none', 'premium'),
    ('social_features', 'none', 'none', 'none', 'premium'),
    ('gk_quizzes', 'basic', 'basic', 'advanced', 'premium'),
    ('monthly_counseling', 'none', 'none', 'none', 'premium'),
    ('priority_support', 'none', 'none', 'none', 'premium'),
    ('daily_login_rewards', 'none', 'basic', 'advanced', 'premium'),
    ('progress_tracking', 'basic', 'advanced', 'advanced', 'premium'),
    ('achievement_badges', 'none', 'none', 'advanced', 'premium'),
    ('study_streak', 'basic', 'advanced', 'advanced', 'premium')
) AS f(feature_name, free_access, mini_access, pro_access, ultra_access)
ON CONFLICT (user_id, feature_name) DO UPDATE SET
  access_level = EXCLUDED.access_level,
  updated_at = CURRENT_TIMESTAMP;

-- Create subscription plan templates table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  tagline VARCHAR(255),
  monthly_price DECIMAL(10,2) NOT NULL,
  quarterly_price DECIMAL(10,2) NOT NULL,
  daily_cost VARCHAR(20),
  comparison VARCHAR(100),
  features JSONB NOT NULL,
  limitations JSONB,
  is_popular BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default subscription plans
INSERT INTO subscription_plans (tier, name, tagline, monthly_price, quarterly_price, daily_cost, comparison, features, is_popular, is_active)
VALUES 
  ('free', 'CLAT FREE', 'Start Your Journey', 0, 0, '₹0/day', 'Free forever', 
   '["1 mock test per month", "Basic analysis", "View leaderboards", "Study streak tracking"]'::jsonb, 
   false, true),
  ('mini', 'CLAT MINI', 'Start Your Journey', 299, 799, '₹10/day', 'Less than a samosa',
   '["4 Physical Mock Tests delivered monthly", "Mock Test Analysis (DECODE)", "CLAT Rank Prediction", "Study Plans & Basic Sectional Tests", "Daily Challenges", "Basic Performance Analytics", "Daily check-in rewards"]'::jsonb,
   false, true),
  ('pro', 'CLAT PRO', 'Smart Work Begins Here', 499, 1299, '₹17/day', 'Less than a coffee',
   '["Everything in MINI, plus:", "Advanced AI Mock Analysis (DECODE-TRACK-REFLECT)", "Advanced CLAT Rank Predictor with trends", "Weekly Insights Reports (Spotify-style)", "Complete Sectional Tests", "Daily Reading Practice + Dictionary", "Academic Vocabulary Quizzes", "Advanced Study Reminders", "Progress tracking dashboard"]'::jsonb,
   true, true),
  ('ultra', 'CLAT ULTRA', 'Where Toppers Are Made', 799, 1999, '₹27/day', 'Your investment in success',
   '["Everything in PRO, plus:", "AI Smart Notifications (Active Recall)", "Personalized AI Coaching (Full ADAPT cycle)", "Parents Dashboard", "Social Features & Study Groups", "Premium GK Question Bank", "Monthly 1-on-1 Counseling", "Mood & Psychological Tracking", "Priority Support", "Exclusive study group access"]'::jsonb,
   false, true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_login_rewards_user_id ON daily_login_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_login_rewards_login_date ON daily_login_rewards(login_date);
CREATE INDEX IF NOT EXISTS idx_user_feature_access_user_id ON user_feature_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feature_access_feature_name ON user_feature_access(feature_name);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_feature_access_updated_at ON user_feature_access;
CREATE TRIGGER update_user_feature_access_updated_at BEFORE UPDATE ON user_feature_access FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();