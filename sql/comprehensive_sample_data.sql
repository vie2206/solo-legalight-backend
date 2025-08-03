-- Comprehensive Sample Data for CLAT Level-Up Platform
-- Run this after creating all tables in enhanced_schema.sql and mock test tables
-- This provides realistic sample data for all features

-- 1. Organizations Sample Data
INSERT INTO organizations (name, type, address, contact_email, contact_phone, subscription_plan, subscription_expires, is_active) VALUES
('Elite CLAT Academy', 'coaching_institute', '123 Education Street, Delhi 110001', 'admin@eliteclat.com', '+91-9876543210', 'premium', '2025-12-31', true),
('LegalMinds Coaching Center', 'coaching_institute', '456 Law Avenue, Mumbai 400001', 'info@legalminds.com', '+91-9876543211', 'standard', '2025-06-30', true),
('Delhi Public School', 'school', '789 School Road, Delhi 110002', 'principal@dpsdelhi.edu.in', '+91-9876543212', 'basic', '2025-03-31', true),
('Self Study Group - Chandigarh', 'self_study_group', 'Sector 17, Chandigarh 160017', 'group@selfstudyclat.com', '+91-9876543213', 'free', NULL, true),
('Lawsikho Online Institute', 'coaching_institute', 'Online Platform', 'support@lawsikho.com', '+91-9876543214', 'premium', '2025-12-31', true)
ON CONFLICT DO NOTHING;

-- 2. Users Sample Data (Students, Educators, Parents, Admins)
INSERT INTO users (id, phone, name, email, role, organization_id, subscription_type, subscription_expires, preferences, settings, created_at) VALUES
-- Admins
('550e8400-e29b-41d4-a716-446655440001', '+91-9999999901', 'Super Admin', 'admin@levelup.com', 'admin', NULL, 'premium', '2025-12-31', '{"notifications": true, "email_updates": true}', '{"theme": "light", "language": "en"}', NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'Alice Johnson', '+91-9999999902', 'alice@eliteclat.com', 'operation_manager', (SELECT id FROM organizations WHERE name = 'Elite CLAT Academy' LIMIT 1), 'premium', '2025-12-31', '{}', '{}', NOW()),

-- Educators
('550e8400-e29b-41d4-a716-446655440003', '+91-9999999903', 'Dr. Rajesh Kumar', 'rajesh@eliteclat.com', 'educator', (SELECT id FROM organizations WHERE name = 'Elite CLAT Academy' LIMIT 1), 'premium', '2025-12-31', '{}', '{}', NOW()),
('550e8400-e29b-41d4-a716-446655440004', '+91-9999999904', 'Prof. Priya Sharma', 'priya@legalminds.com', 'educator', (SELECT id FROM organizations WHERE name = 'LegalMinds Coaching Center' LIMIT 1), 'standard', '2025-06-30', '{}', '{}', NOW()),
('550e8400-e29b-41d4-a716-446655440005', '+91-9999999905', 'Ms. Anita Verma', 'anita@dpsdelhi.edu.in', 'educator', (SELECT id FROM organizations WHERE name = 'Delhi Public School' LIMIT 1), 'basic', '2025-03-31', '{}', '{}', NOW()),

-- Parents
('550e8400-e29b-41d4-a716-446655440006', '+91-9999999906', 'Mr. Suresh Gupta', 'suresh.gupta@email.com', 'parent', NULL, 'free', NULL, '{}', '{}', NOW()),
('550e8400-e29b-41d4-a716-446655440007', '+91-9999999907', 'Mrs. Sunita Agarwal', 'sunita.agarwal@email.com', 'parent', NULL, 'basic', '2025-06-30', '{}', '{}', NOW()),
('550e8400-e29b-41d4-a716-446655440008', '+91-9999999908', 'Mr. Vikram Singh', 'vikram.singh@email.com', 'parent', NULL, 'premium', '2025-12-31', '{}', '{}', NOW()),

-- Students
('550e8400-e29b-41d4-a716-446655440009', '+91-9999999909', 'Rahul Gupta', 'rahul.gupta@student.com', 'student', (SELECT id FROM organizations WHERE name = 'Elite CLAT Academy' LIMIT 1), 'premium', '2025-12-31', '{"study_reminders": true, "performance_alerts": true}', '{"theme": "dark", "study_mode": "focused"}', NOW()),
('550e8400-e29b-41d4-a716-446655440010', '+91-9999999910', 'Sneha Agarwal', 'sneha.agarwal@student.com', 'student', (SELECT id FROM organizations WHERE name = 'LegalMinds Coaching Center' LIMIT 1), 'standard', '2025-06-30', '{}', '{}', NOW()),
('550e8400-e29b-41d4-a716-446655440011', '+91-9999999911', 'Arjun Singh', 'arjun.singh@student.com', 'student', (SELECT id FROM organizations WHERE name = 'Delhi Public School' LIMIT 1), 'basic', '2025-03-31', '{}', '{}', NOW()),
('550e8400-e29b-41d4-a716-446655440012', '+91-9999999912', 'Kavya Sharma', 'kavya.sharma@student.com', 'student', (SELECT id FROM organizations WHERE name = 'Self Study Group - Chandigarh' LIMIT 1), 'free', NULL, '{}', '{}', NOW()),
('550e8400-e29b-41d4-a716-446655440013', '+91-9999999913', 'Aditya Patel', 'aditya.patel@student.com', 'student', (SELECT id FROM organizations WHERE name = 'Lawsikho Online Institute' LIMIT 1), 'premium', '2025-12-31', '{}', '{}', NOW()),
('550e8400-e29b-41d4-a716-446655440014', '+91-9999999914', 'Riya Jain', 'riya.jain@student.com', 'student', (SELECT id FROM organizations WHERE name = 'Elite CLAT Academy' LIMIT 1), 'premium', '2025-12-31', '{}', '{}', NOW()),
('550e8400-e29b-41d4-a716-446655440015', '+91-9999999915', 'Karan Malhotra', 'karan.malhotra@student.com', 'student', (SELECT id FROM organizations WHERE name = 'LegalMinds Coaching Center' LIMIT 1), 'standard', '2025-06-30', '{}', '{}', NOW())
ON CONFLICT DO NOTHING;

-- 3. Classes Sample Data
INSERT INTO classes (organization_id, name, description, educator_id, start_date, end_date, is_active) VALUES
((SELECT id FROM organizations WHERE name = 'Elite CLAT Academy' LIMIT 1), 'CLAT 2025 Batch A', 'Comprehensive CLAT preparation for 2025 exam', (SELECT id FROM users WHERE name = 'Dr. Rajesh Kumar' LIMIT 1), '2024-06-01', '2025-05-31', true),
((SELECT id FROM organizations WHERE name = 'LegalMinds Coaching Center' LIMIT 1), 'Legal Reasoning Mastery', 'Specialized course for Legal Reasoning section', (SELECT id FROM users WHERE name = 'Prof. Priya Sharma' LIMIT 1), '2024-07-01', '2025-04-30', true),
((SELECT id FROM organizations WHERE name = 'Delhi Public School' LIMIT 1), 'Class 12 Law Studies', 'Introduction to law for Class 12 students', (SELECT id FROM users WHERE name = 'Ms. Anita Verma' LIMIT 1), '2024-04-01', '2025-03-31', true),
((SELECT id FROM organizations WHERE name = 'Elite CLAT Academy' LIMIT 1), 'English Comprehension Advanced', 'Advanced English for CLAT aspirants', (SELECT id FROM users WHERE name = 'Dr. Rajesh Kumar' LIMIT 1), '2024-08-01', '2025-03-31', true),
((SELECT id FROM organizations WHERE name = 'Lawsikho Online Institute' LIMIT 1), 'Current Affairs Weekly', 'Weekly current affairs sessions', (SELECT id FROM users WHERE name = 'Prof. Priya Sharma' LIMIT 1), '2024-01-01', '2024-12-31', true)
ON CONFLICT DO NOTHING;

-- 4. Class Memberships Sample Data
INSERT INTO class_memberships (class_id, user_id, role, joined_at, is_active) VALUES
-- CLAT 2025 Batch A memberships
((SELECT id FROM classes WHERE name = 'CLAT 2025 Batch A' LIMIT 1), (SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), 'student', NOW(), true),
((SELECT id FROM classes WHERE name = 'CLAT 2025 Batch A' LIMIT 1), (SELECT id FROM users WHERE name = 'Riya Jain' LIMIT 1), 'student', NOW(), true),

-- Legal Reasoning Mastery memberships
((SELECT id FROM classes WHERE name = 'Legal Reasoning Mastery' LIMIT 1), (SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), 'student', NOW(), true),
((SELECT id FROM classes WHERE name = 'Legal Reasoning Mastery' LIMIT 1), (SELECT id FROM users WHERE name = 'Karan Malhotra' LIMIT 1), 'student', NOW(), true),

-- Class 12 Law Studies memberships
((SELECT id FROM classes WHERE name = 'Class 12 Law Studies' LIMIT 1), (SELECT id FROM users WHERE name = 'Arjun Singh' LIMIT 1), 'student', NOW(), true),

-- English Comprehension Advanced memberships
((SELECT id FROM classes WHERE name = 'English Comprehension Advanced' LIMIT 1), (SELECT id FROM users WHERE name = 'Aditya Patel' LIMIT 1), 'student', NOW(), true),
((SELECT id FROM classes WHERE name = 'English Comprehension Advanced' LIMIT 1), (SELECT id FROM users WHERE name = 'Kavya Sharma' LIMIT 1), 'student', NOW(), true)
ON CONFLICT DO NOTHING;

-- 5. Parent-Child Relationships Sample Data
INSERT INTO parent_child_relationships (parent_id, child_id, relationship_type, is_active) VALUES
((SELECT id FROM users WHERE name = 'Mr. Suresh Gupta' LIMIT 1), (SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), 'parent', true),
((SELECT id FROM users WHERE name = 'Mrs. Sunita Agarwal' LIMIT 1), (SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), 'parent', true),
((SELECT id FROM users WHERE name = 'Mr. Vikram Singh' LIMIT 1), (SELECT id FROM users WHERE name = 'Arjun Singh' LIMIT 1), 'parent', true)
ON CONFLICT DO NOTHING;

-- 6. Reading Passages Sample Data
INSERT INTO reading_passages (title, type, source, difficulty, estimated_time, word_count, tags, ai_complexity, content, vocabulary, questions, reading_tips, difficulty_factors, created_by, status) VALUES
('The Evolution of Constitutional Law in India', 'Legal', 'Constitutional Studies Quarterly', 'Intermediate', '15 minutes', 800, '{"constitutional law", "legal reasoning", "indian constitution"}', 7.5, 
'The Indian Constitution, adopted on 26th January 1950, has undergone significant evolution through amendments and judicial interpretations. The Constitution originally contained 395 articles and 8 schedules, but through various amendments, it has grown to include more provisions addressing contemporary challenges...', 
'{"evolution": "gradual development", "constitutional": "relating to constitution", "judicial": "relating to judges", "contemporary": "modern, current"}',
'[{"question": "What is the significance of 26th January 1950?", "options": ["Independence Day", "Constitution Day", "Republic Day", "Democracy Day"], "correct": 2, "explanation": "26th January 1950 is when the Indian Constitution came into effect."}]',
'{"Focus on dates and key events", "Understand the structure of Constitution", "Note the difference between original and current Constitution"}',
'{"Complex legal terminology", "Historical context required", "Multiple interconnected concepts"}',
(SELECT id FROM users WHERE name = 'Dr. Rajesh Kumar' LIMIT 1), 'published'),

('Recent Developments in Space Technology', 'Current Affairs', 'Space Research Today', 'Advanced', '12 minutes', 650, '{"space technology", "current affairs", "ISRO", "science"}', 8.2,
'The Indian Space Research Organisation (ISRO) has achieved remarkable milestones in recent years, including the successful Chandrayaan-3 mission that made India the fourth country to land on the moon and the first to land near the lunar south pole...', 
'{"milestones": "significant achievements", "lunar": "relating to moon", "orbit": "path around celestial body", "payload": "cargo carried by spacecraft"}',
'[{"question": "Which mission made India the first to land near lunar south pole?", "options": ["Chandrayaan-1", "Chandrayaan-2", "Chandrayaan-3", "Mangalyaan"], "correct": 2, "explanation": "Chandrayaan-3 successfully landed near the lunar south pole in 2023."}]',
'{"Stay updated with recent space missions", "Focus on India-specific achievements", "Understand technical terms"}',
'{"Technical terminology", "Recent developments need current knowledge", "International comparisons"}',
(SELECT id FROM users WHERE name = 'Prof. Priya Sharma' LIMIT 1), 'published'),

('Climate Change and Environmental Law', 'Legal', 'Environmental Law Review', 'Advanced', '18 minutes', 950, '{"environmental law", "climate change", "legal reasoning", "environmental protection"}', 8.5,
'Environmental law in India has evolved significantly with the growing awareness of climate change impacts. The National Green Tribunal, established in 2010, has played a crucial role in environmental justice...', 
'{"tribunal": "court or forum", "jurisdiction": "legal authority", "sustainable": "able to continue long-term", "mitigation": "reduction of harmful effects"}',
'[{"question": "When was the National Green Tribunal established?", "options": ["2008", "2009", "2010", "2011"], "correct": 2, "explanation": "The National Green Tribunal was established in 2010 under the National Green Tribunal Act."}]',
'{"Focus on environmental institutions", "Understand legal frameworks", "Connect with current environmental issues"}',
'{"Complex legal framework", "Technical environmental terms", "Multiple acts and regulations"}',
(SELECT id FROM users WHERE name = 'Ms. Anita Verma' LIMIT 1), 'published')
ON CONFLICT DO NOTHING;

-- 7. Vocabulary Words Sample Data
INSERT INTO vocabulary_words (word, definition, context, etymology, difficulty, category, synonyms, antonyms, usage_example, mnemonics, frequency, clat_relevance, examples, created_by, status) VALUES
('Jurisprudence', 'The theory or philosophy of law', 'Legal studies and law school curricula', 'From Latin: juris (law) + prudentia (knowledge)', 'Advanced', 'Legal Terms', '{"legal theory", "law philosophy"}', '{"lawlessness", "anarchy"}', 'Students of jurisprudence study the fundamental principles of law.', 'Juris (jury) + prudence (wise thinking about law)', 'High', 10, '{"Constitutional jurisprudence has evolved significantly", "Her expertise in jurisprudence is well-known"}', (SELECT id FROM users WHERE name = 'Dr. Rajesh Kumar' LIMIT 1), 'active'),

('Precedent', 'A legal decision that serves as an authoritative rule in future cases', 'Court judgments and legal reasoning', 'From Latin: praecedere (to go before)', 'Intermediate', 'Legal Terms', '{"authority", "example", "standard"}', '{"innovation", "departure"}', 'The Supreme Court set an important precedent in this landmark case.', 'Pre-cedent: something that comes before to guide future decisions', 'High', 9, '{"Following legal precedent is crucial", "This case will set a new precedent"}', (SELECT id FROM users WHERE name = 'Prof. Priya Sharma' LIMIT 1), 'active'),

('Ubiquitous', 'Present, appearing, or found everywhere', 'General English and comprehension passages', 'From Latin: ubique (everywhere)', 'Intermediate', 'General English', '{"omnipresent", "pervasive", "universal"}', '{"rare", "scarce", "limited"}', 'Smartphones have become ubiquitous in modern society.', 'Ubi-quitous: you-be-everywhere (sounds like "you be quit us" - present everywhere)', 'Medium', 7, '{"Social media is ubiquitous among teenagers", "The ubiquitous nature of technology"}', (SELECT id FROM users WHERE name = 'Ms. Anita Verma' LIMIT 1), 'active'),

('Cognizant', 'Having knowledge or awareness', 'Formal writing and comprehension', 'From Latin: cognoscere (to get to know)', 'Intermediate', 'General English', '{"aware", "conscious", "mindful"}', '{"unaware", "oblivious", "ignorant"}', 'The judge was cognizant of the complexities involved in the case.', 'Cogni-zant: brain-ant (an ant with brain knowledge)', 'Medium', 6, '{"Be cognizant of your rights", "The court was cognizant of precedent"}', (SELECT id FROM users WHERE name = 'Dr. Rajesh Kumar' LIMIT 1), 'active'),

('Vicarious', 'Experienced in the imagination through the feelings or actions of another person', 'Legal contexts and general English', 'From Latin: vicarius (substitute)', 'Advanced', 'Legal Terms', '{"indirect", "substitute", "delegated"}', '{"direct", "personal", "firsthand"}', 'The company faced vicarious liability for its employee actions.', 'Vice-arious: like a vice-president (substitute) experiencing things', 'Low', 8, '{"Vicarious liability in tort law", "She lived vicariously through her children"}', (SELECT id FROM users WHERE name = 'Prof. Priya Sharma' LIMIT 1), 'active')
ON CONFLICT DO NOTHING;

-- 8. GK Questions Sample Data
INSERT INTO gk_questions (question, options, correct_answer, category, difficulty, points, explanation, source, tags, created_by, status) VALUES
('Who is the current Chief Justice of India (as of 2024)?', '["D.Y. Chandrachud", "N.V. Ramana", "Ranjan Gogoi", "Sharad Arvind Bobde"]', 0, 'Judiciary', 'Easy', 10, 'Justice D.Y. Chandrachud became the Chief Justice of India in November 2022.', 'Current Affairs 2024', '{"judiciary", "current affairs", "CJI"}', (SELECT id FROM users WHERE name = 'Dr. Rajesh Kumar' LIMIT 1), 'active'),

('Which Article of the Indian Constitution deals with the Right to Constitutional Remedies?', '["Article 32", "Article 21", "Article 19", "Article 14"]', 0, 'Constitution', 'Intermediate', 15, 'Article 32 is known as the heart and soul of the Constitution as it guarantees the right to constitutional remedies.', 'Constitutional Law', '{"constitution", "fundamental rights", "article 32"}', (SELECT id FROM users WHERE name = 'Prof. Priya Sharma' LIMIT 1), 'active'),

('The Chandrayaan-3 mission successfully landed on which part of the Moon?', '["North Pole", "South Pole", "Equator", "Mare Imbrium"]', 1, 'Science & Technology', 'Easy', 10, 'Chandrayaan-3 made India the first country to successfully land near the lunar south pole in August 2023.', 'Space Science 2023', '{"space", "ISRO", "moon mission", "chandrayaan"}', (SELECT id FROM users WHERE name = 'Ms. Anita Verma' LIMIT 1), 'active'),

('Which of the following is a Fundamental Duty under the Indian Constitution?', '["Right to Education", "To protect environment", "Right to Information", "Right to Privacy"]', 1, 'Constitution', 'Intermediate', 15, 'Article 51A(g) makes it a fundamental duty of every citizen to protect and improve the natural environment.', 'Constitutional Law', '{"fundamental duties", "constitution", "environment"}', (SELECT id FROM users WHERE name = 'Dr. Rajesh Kumar' LIMIT 1), 'active'),

('The G20 Summit 2023 was hosted by India in which city?', '["Mumbai", "New Delhi", "Bengaluru", "Hyderabad"]', 1, 'Current Affairs', 'Easy', 10, 'India hosted the G20 Summit in New Delhi in September 2023 under its G20 Presidency.', 'International Affairs 2023', '{"G20", "summit", "India", "international relations"}', (SELECT id FROM users WHERE name = 'Prof. Priya Sharma' LIMIT 1), 'active')
ON CONFLICT DO NOTHING;

-- 9. User Progress Sample Data
INSERT INTO user_progress (user_id, passage_id, started_at, completed_at, time_spent, reading_speed, comprehension_score, questions_answered, questions_correct) VALUES
-- Rahul Gupta's progress
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), (SELECT id FROM reading_passages WHERE title = 'The Evolution of Constitutional Law in India' LIMIT 1), NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '12 minutes', 720, 67, 85, 5, 4),
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), (SELECT id FROM reading_passages WHERE title = 'Recent Developments in Space Technology' LIMIT 1), NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '15 minutes', 900, 43, 75, 4, 3),

-- Sneha Agarwal's progress
((SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), (SELECT id FROM reading_passages WHERE title = 'The Evolution of Constitutional Law in India' LIMIT 1), NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '18 minutes', 1080, 44, 90, 5, 5),
((SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), (SELECT id FROM reading_passages WHERE title = 'Climate Change and Environmental Law' LIMIT 1), NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '22 minutes', 1320, 43, 80, 6, 5),

-- Arjun Singh's progress
((SELECT id FROM users WHERE name = 'Arjun Singh' LIMIT 1), (SELECT id FROM reading_passages WHERE title = 'Recent Developments in Space Technology' LIMIT 1), NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '14 minutes', 840, 46, 70, 4, 3)
ON CONFLICT DO NOTHING;

-- 10. Vocabulary Progress Sample Data
INSERT INTO vocabulary_progress (user_id, word_id, mastery_level, last_reviewed, next_review, ease_factor, review_count) VALUES
-- Rahul Gupta's vocabulary progress
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), (SELECT id FROM vocabulary_words WHERE word = 'Jurisprudence' LIMIT 1), 'learning', NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days', 2.3, 3),
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), (SELECT id FROM vocabulary_words WHERE word = 'Precedent' LIMIT 1), 'mastered', NOW() - INTERVAL '5 days', NOW() + INTERVAL '7 days', 2.8, 5),
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), (SELECT id FROM vocabulary_words WHERE word = 'Ubiquitous' LIMIT 1), 'new', NOW(), NOW() + INTERVAL '1 day', 2.5, 1),

-- Sneha Agarwal's vocabulary progress
((SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), (SELECT id FROM vocabulary_words WHERE word = 'Precedent' LIMIT 1), 'learning', NOW() - INTERVAL '2 days', NOW() + INTERVAL '3 days', 2.4, 2),
((SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), (SELECT id FROM vocabulary_words WHERE word = 'Vicarious' LIMIT 1), 'new', NOW(), NOW() + INTERVAL '1 day', 2.5, 1),
((SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), (SELECT id FROM vocabulary_words WHERE word = 'Cognizant' LIMIT 1), 'mastered', NOW() - INTERVAL '7 days', NOW() + INTERVAL '10 days', 3.0, 6)
ON CONFLICT DO NOTHING;

-- 11. Challenge Progress Sample Data
INSERT INTO challenge_progress (user_id, challenge_id, progress, completed, claimed, completed_at) VALUES
-- Progress for existing challenges
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), (SELECT id FROM challenges WHERE title = 'Speed Reading Sprint' LIMIT 1), 3, false, false, NULL),
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), (SELECT id FROM challenges WHERE title = 'Vocabulary Master' LIMIT 1), 15, false, false, NULL),

((SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), (SELECT id FROM challenges WHERE title = 'Vocabulary Master' LIMIT 1), 25, true, true, NOW() - INTERVAL '2 days'),
((SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), (SELECT id FROM challenges WHERE title = 'Comprehension Champion' LIMIT 1), 7, false, false, NULL),

((SELECT id FROM users WHERE name = 'Arjun Singh' LIMIT 1), (SELECT id FROM challenges WHERE title = 'Speed Reading Sprint' LIMIT 1), 2, false, false, NULL)
ON CONFLICT DO NOTHING;

-- 12. User Analytics Sample Data
INSERT INTO user_analytics (user_id, date, reading_time, passages_read, words_learned, challenges_completed, quiz_score_avg) VALUES
-- Rahul Gupta's analytics for last 7 days
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), CURRENT_DATE - INTERVAL '6 days', 45, 2, 3, 0, 78.5),
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), CURRENT_DATE - INTERVAL '5 days', 30, 1, 2, 0, 82.0),
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), CURRENT_DATE - INTERVAL '4 days', 0, 0, 0, 0, NULL),
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), CURRENT_DATE - INTERVAL '3 days', 52, 2, 4, 0, 75.0),
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), CURRENT_DATE - INTERVAL '2 days', 38, 1, 1, 0, 85.0),
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), CURRENT_DATE - INTERVAL '1 day', 25, 1, 2, 0, 80.0),
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), CURRENT_DATE, 40, 2, 3, 0, 77.5),

-- Sneha Agarwal's analytics for last 7 days
((SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), CURRENT_DATE - INTERVAL '6 days', 60, 3, 5, 0, 88.0),
((SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), CURRENT_DATE - INTERVAL '5 days', 35, 1, 2, 0, 85.5),
((SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), CURRENT_DATE - INTERVAL '4 days', 45, 2, 3, 0, 90.0),
((SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), CURRENT_DATE - INTERVAL '3 days', 55, 2, 4, 1, 87.5),
((SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), CURRENT_DATE - INTERVAL '2 days', 48, 2, 3, 0, 92.0),
((SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), CURRENT_DATE - INTERVAL '1 day', 42, 2, 2, 0, 89.0),
((SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), CURRENT_DATE, 38, 1, 2, 0, 86.5)
ON CONFLICT DO NOTHING;

-- 13. Notifications Sample Data
INSERT INTO notifications (user_id, title, message, type, data, is_read) VALUES
-- Notifications for Rahul Gupta
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), 'Daily Study Reminder', 'Time for your daily reading practice! You have 2 pending passages.', 'reminder', '{"passages": ["Climate Change and Environmental Law"], "target_time": 20}', false),
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), 'Vocabulary Review Due', 'You have 3 vocabulary words ready for review.', 'reminder', '{"words": ["Jurisprudence", "Ubiquitous", "Precedent"], "due_count": 3}', false),
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), 'Performance Alert', 'Your reading speed has improved by 15% this week! Keep it up!', 'achievement', '{"improvement": 15, "metric": "reading_speed", "timeframe": "week"}', true),

-- Notifications for Sneha Agarwal
((SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), 'Challenge Completed!', 'Congratulations! You have completed the "Vocabulary Master" challenge and earned 150 points!', 'achievement', '{"challenge": "Vocabulary Master", "points": 150, "completed_at": "2024-01-28"}', false),
((SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), 'Weekly Progress Report', 'Your weekly study summary is ready. You spent 5.5 hours studying this week!', 'system', '{"study_time": 330, "passages_completed": 12, "accuracy": 89.2}', true),

-- System announcements
((SELECT id FROM users WHERE name = 'Rahul Gupta' LIMIT 1), 'New Mock Test Available', 'CLAT 2024 Mock Test 4 is now available. Attempt it before the deadline!', 'announcement', '{"test_name": "CLAT 2024 Mock Test 4", "deadline": "2024-02-15", "difficulty": "Advanced"}', false),
((SELECT id FROM users WHERE name = 'Sneha Agarwal' LIMIT 1), 'New Mock Test Available', 'CLAT 2024 Mock Test 4 is now available. Attempt it before the deadline!', 'announcement', '{"test_name": "CLAT 2024 Mock Test 4", "deadline": "2024-02-15", "difficulty": "Advanced"}', false)
ON CONFLICT DO NOTHING;

-- 14. System Announcements Sample Data
INSERT INTO announcements (title, content, target_audience, priority, start_date, end_date, is_active, created_by) VALUES
('Platform Maintenance Schedule', 'The platform will undergo scheduled maintenance on February 10th from 2:00 AM to 4:00 AM IST. During this time, services may be temporarily unavailable.', 'all', 'high', NOW(), NOW() + INTERVAL '15 days', true, (SELECT id FROM users WHERE name = 'Super Admin' LIMIT 1)),
('New Feature: AI-Powered Study Plans', 'We are excited to announce our new AI-powered personalized study plans feature. This will help you optimize your CLAT preparation based on your performance patterns.', 'students', 'normal', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', true, (SELECT id FROM users WHERE name = 'Super Admin' LIMIT 1)),
('Educator Training Workshop', 'Join us for a comprehensive training workshop on the new analytics dashboard features. Register now for the session on February 20th.', 'educators', 'normal', NOW() + INTERVAL '5 days', NOW() + INTERVAL '20 days', true, (SELECT id FROM users WHERE name = 'Alice Johnson' LIMIT 1)),
('Parent Dashboard Updates', 'The parent dashboard now includes detailed progress reports and study time analytics for better monitoring of your child''s preparation.', 'parents', 'low', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', true, (SELECT id FROM users WHERE name = 'Super Admin' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Comprehensive sample data inserted successfully! All features now have realistic sample data.' as status;

-- Verification queries (commented out - uncomment to run verification)
/*
SELECT 'Organizations: ' || COUNT(*) FROM organizations;
SELECT 'Users: ' || COUNT(*) FROM users;
SELECT 'Classes: ' || COUNT(*) FROM classes;
SELECT 'Reading Passages: ' || COUNT(*) FROM reading_passages;
SELECT 'Vocabulary Words: ' || COUNT(*) FROM vocabulary_words;
SELECT 'GK Questions: ' || COUNT(*) FROM gk_questions;
SELECT 'User Progress Records: ' || COUNT(*) FROM user_progress;
SELECT 'Notifications: ' || COUNT(*) FROM notifications;
SELECT 'Announcements: ' || COUNT(*) FROM announcements;
*/