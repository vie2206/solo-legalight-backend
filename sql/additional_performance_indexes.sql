-- Additional Performance Indexes for CLAT Level-Up Platform
-- Run this after all tables have been created
-- These indexes optimize common query patterns and improve performance

-- 1. Users table additional indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_type ON users(subscription_type);
CREATE INDEX IF NOT EXISTS idx_users_subscription_expires ON users(subscription_expires);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone); -- For login lookups

-- 2. Organizations table indexes
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_plan ON organizations(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_expires ON organizations(subscription_expires);

-- 3. Classes table indexes
CREATE INDEX IF NOT EXISTS idx_classes_organization_id ON classes(organization_id);
CREATE INDEX IF NOT EXISTS idx_classes_educator_id ON classes(educator_id);
CREATE INDEX IF NOT EXISTS idx_classes_active ON classes(is_active);
CREATE INDEX IF NOT EXISTS idx_classes_dates ON classes(start_date, end_date);

-- 4. Class memberships additional indexes
CREATE INDEX IF NOT EXISTS idx_class_memberships_role ON class_memberships(role);
CREATE INDEX IF NOT EXISTS idx_class_memberships_active ON class_memberships(is_active);
CREATE INDEX IF NOT EXISTS idx_class_memberships_joined_at ON class_memberships(joined_at);

-- 5. Reading passages additional indexes
CREATE INDEX IF NOT EXISTS idx_reading_passages_created_by ON reading_passages(created_by);
CREATE INDEX IF NOT EXISTS idx_reading_passages_created_at ON reading_passages(created_at);
CREATE INDEX IF NOT EXISTS idx_reading_passages_word_count ON reading_passages(word_count);
CREATE INDEX IF NOT EXISTS idx_reading_passages_ai_complexity ON reading_passages(ai_complexity);

-- 6. Vocabulary words additional indexes
CREATE INDEX IF NOT EXISTS idx_vocabulary_words_word ON vocabulary_words(word); -- For word lookups
CREATE INDEX IF NOT EXISTS idx_vocabulary_words_clat_relevance ON vocabulary_words(clat_relevance);
CREATE INDEX IF NOT EXISTS idx_vocabulary_words_frequency ON vocabulary_words(frequency);
CREATE INDEX IF NOT EXISTS idx_vocabulary_words_created_by ON vocabulary_words(created_by);

-- 7. GK questions additional indexes
CREATE INDEX IF NOT EXISTS idx_gk_questions_points ON gk_questions(points);
CREATE INDEX IF NOT EXISTS idx_gk_questions_created_by ON gk_questions(created_by);
CREATE INDEX IF NOT EXISTS idx_gk_questions_tags ON gk_questions USING GIN(tags);

-- 8. User progress additional indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_passage_id ON user_progress(passage_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_started_at ON user_progress(started_at);
CREATE INDEX IF NOT EXISTS idx_user_progress_comprehension_score ON user_progress(comprehension_score);
CREATE INDEX IF NOT EXISTS idx_user_progress_reading_speed ON user_progress(reading_speed);

-- 9. Vocabulary progress additional indexes
CREATE INDEX IF NOT EXISTS idx_vocabulary_progress_word_id ON vocabulary_progress(word_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_progress_mastery_level ON vocabulary_progress(mastery_level);
CREATE INDEX IF NOT EXISTS idx_vocabulary_progress_next_review ON vocabulary_progress(next_review);
CREATE INDEX IF NOT EXISTS idx_vocabulary_progress_last_reviewed ON vocabulary_progress(last_reviewed);

-- 10. Challenge progress additional indexes
CREATE INDEX IF NOT EXISTS idx_challenge_progress_challenge_id ON challenge_progress(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_completed ON challenge_progress(completed);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_completed_at ON challenge_progress(completed_at);

-- 11. Challenges additional indexes
CREATE INDEX IF NOT EXISTS idx_challenges_created_by ON challenges(created_by);
CREATE INDEX IF NOT EXISTS idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active);
CREATE INDEX IF NOT EXISTS idx_challenges_dates ON challenges(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_challenges_category ON challenges(category);

-- 12. Mock test templates additional indexes
CREATE INDEX IF NOT EXISTS idx_mock_test_templates_series_provider ON mock_test_templates(series_provider);
CREATE INDEX IF NOT EXISTS idx_mock_test_templates_created_by ON mock_test_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_mock_test_templates_status ON mock_test_templates(status);
CREATE INDEX IF NOT EXISTS idx_mock_test_templates_total_questions ON mock_test_templates(total_questions);

-- 13. Mock test questions additional indexes
CREATE INDEX IF NOT EXISTS idx_mock_test_questions_difficulty ON mock_test_questions(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_mock_test_questions_topic ON mock_test_questions(topic);
CREATE INDEX IF NOT EXISTS idx_mock_test_questions_question_number ON mock_test_questions(question_number);

-- 14. Mock tests (results) additional indexes
CREATE INDEX IF NOT EXISTS idx_mock_tests_template_id ON mock_tests(template_id);
CREATE INDEX IF NOT EXISTS idx_mock_tests_difficulty ON mock_tests(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_mock_tests_accuracy ON mock_tests(accuracy);
CREATE INDEX IF NOT EXISTS idx_mock_tests_percentile ON mock_tests(percentile);
CREATE INDEX IF NOT EXISTS idx_mock_tests_time_taken ON mock_tests(time_taken);

-- 15. Student mock attempts additional indexes
CREATE INDEX IF NOT EXISTS idx_student_mock_attempts_template_id ON student_mock_attempts(template_id);
CREATE INDEX IF NOT EXISTS idx_student_mock_attempts_analysis_completed ON student_mock_attempts(analysis_completed);

-- 16. Mock test recommendations additional indexes
CREATE INDEX IF NOT EXISTS idx_mock_test_recommendations_type ON mock_test_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_mock_test_recommendations_priority ON mock_test_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_mock_test_recommendations_is_read ON mock_test_recommendations(is_read);

-- 17. Student planning data additional indexes
CREATE INDEX IF NOT EXISTS idx_student_planning_data_mock_test_id ON student_planning_data(mock_test_id);
CREATE INDEX IF NOT EXISTS idx_student_planning_data_test_date ON student_planning_data(test_date);
CREATE INDEX IF NOT EXISTS idx_student_planning_data_active ON student_planning_data(is_active);

-- 18. Parent-child relationships additional indexes
CREATE INDEX IF NOT EXISTS idx_parent_child_relationship_type ON parent_child_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_parent_child_active ON parent_child_relationships(is_active);

-- 19. Notifications additional indexes
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- 20. Announcements additional indexes
CREATE INDEX IF NOT EXISTS idx_announcements_target_audience ON announcements(target_audience);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_dates ON announcements(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);

-- 21. Composite indexes for common query patterns
-- User progress with date range queries
CREATE INDEX IF NOT EXISTS idx_user_progress_user_completed_date ON user_progress(user_id, completed_at) WHERE completed_at IS NOT NULL;

-- Vocabulary progress for spaced repetition
CREATE INDEX IF NOT EXISTS idx_vocabulary_progress_user_next_review ON vocabulary_progress(user_id, next_review) WHERE mastery_level != 'mastered';

-- Challenge progress for leaderboards
CREATE INDEX IF NOT EXISTS idx_challenge_progress_challenge_completed ON challenge_progress(challenge_id, completed_at) WHERE completed = true;

-- Mock test performance analytics
CREATE INDEX IF NOT EXISTS idx_mock_tests_user_date_score ON mock_tests(user_id, date_taken, score);

-- Class membership for educators
CREATE INDEX IF NOT EXISTS idx_class_memberships_class_role ON class_memberships(class_id, role) WHERE is_active = true;

-- Reading passages for content management
CREATE INDEX IF NOT EXISTS idx_reading_passages_status_created ON reading_passages(status, created_at);

-- Notifications for unread count
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at) WHERE is_read = false;

-- Mock test questions for section-wise retrieval
CREATE INDEX IF NOT EXISTS idx_mock_test_questions_test_section_number ON mock_test_questions(test_id, section, question_number);

-- 22. Full-text search indexes (PostgreSQL specific)
-- For searching within question text
CREATE INDEX IF NOT EXISTS idx_gk_questions_search ON gk_questions USING GIN(to_tsvector('english', question || ' ' || COALESCE(explanation, '')));

-- For searching within reading passage content
CREATE INDEX IF NOT EXISTS idx_reading_passages_search ON reading_passages USING GIN(to_tsvector('english', title || ' ' || content));

-- For searching vocabulary words and definitions
CREATE INDEX IF NOT EXISTS idx_vocabulary_words_search ON vocabulary_words USING GIN(to_tsvector('english', word || ' ' || definition || ' ' || COALESCE(context, '')));

-- 23. JSONB indexes for structured data queries
-- For section-wise performance queries in mock tests
CREATE INDEX IF NOT EXISTS idx_mock_test_templates_section_breakdown ON mock_test_templates USING GIN(section_breakdown);

-- For user preferences and settings
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING GIN(preferences);
CREATE INDEX IF NOT EXISTS idx_users_settings ON users USING GIN(settings);

-- For mock test attempt data analysis
CREATE INDEX IF NOT EXISTS idx_student_mock_attempts_performance_summary ON student_mock_attempts USING GIN(performance_summary);
CREATE INDEX IF NOT EXISTS idx_student_mock_attempts_section_performance ON student_mock_attempts USING GIN(section_wise_performance);

-- Success message
SELECT 'Additional performance indexes created successfully! Database is now optimized for common query patterns.' as status;

-- Performance analysis query (commented out - uncomment to run)
/*
-- Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_tup_read DESC;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
*/