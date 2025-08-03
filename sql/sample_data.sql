-- Sample Mock Test Data for Testing
-- Run this after creating the main tables

-- Insert a sample mock test
INSERT INTO mock_tests (test_name, test_date, total_questions, duration_minutes, sections, created_at) VALUES
('CLAT Mock Test 1 - 2024', '2024-01-15', 150, 120, 
 '{"English": 35, "Current Affairs": 25, "Legal Reasoning": 35, "Logical Reasoning": 30, "Quantitative": 25}',
 NOW());

-- Insert a few sample questions (optional - for demo purposes)
-- Note: This assumes we have the mock test ID from above
-- In practice, you'd get the ID from the first insert

-- You can skip this section if you just want to test the upload interface