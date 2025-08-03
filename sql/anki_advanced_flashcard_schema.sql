-- Advanced Anki-like Flashcard System Database Schema
-- This creates a comprehensive flashcard system with all advanced features
-- Run this after the main schema creation

-- 1. DECK MANAGEMENT SYSTEM (Hierarchical Organization)
CREATE TABLE IF NOT EXISTS flashcard_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES flashcard_collections(id), -- For nested collections
  created_by UUID REFERENCES users(id),
  shared BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}', -- Collection-specific settings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flashcard_decks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES flashcard_collections(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  
  -- Anki-like deck settings
  new_cards_per_day INTEGER DEFAULT 20,
  max_reviews_per_day INTEGER DEFAULT 200,
  learning_steps INTEGER[] DEFAULT '{1,10}', -- Minutes for learning steps
  graduating_interval INTEGER DEFAULT 1, -- Days
  easy_interval INTEGER DEFAULT 4, -- Days
  starting_ease DECIMAL(4,2) DEFAULT 2.50, -- Starting ease factor
  easy_bonus DECIMAL(3,2) DEFAULT 1.30, -- Easy button bonus
  interval_modifier DECIMAL(3,2) DEFAULT 1.00, -- Global interval modifier
  maximum_interval INTEGER DEFAULT 36500, -- Days (100 years)
  
  -- Advanced scheduling options
  bury_related BOOLEAN DEFAULT false,
  bury_new BOOLEAN DEFAULT false,
  order_new_cards VARCHAR(20) DEFAULT 'random', -- random, added, due
  new_card_insert_order VARCHAR(20) DEFAULT 'due', -- due, random
  
  -- Study options
  show_timer BOOLEAN DEFAULT false,
  auto_play_audio BOOLEAN DEFAULT true,
  replay_audio BOOLEAN DEFAULT true,
  
  -- Appearance
  night_mode BOOLEAN DEFAULT false,
  card_appearance JSONB DEFAULT '{}',
  
  -- Statistics
  total_cards INTEGER DEFAULT 0,
  new_cards INTEGER DEFAULT 0,
  learning_cards INTEGER DEFAULT 0,
  review_cards INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. NOTE TYPES AND CARD TEMPLATES (Like Anki's Note Types)
CREATE TABLE IF NOT EXISTS flashcard_note_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  
  -- Field definitions (JSON array of field objects)
  fields JSONB NOT NULL DEFAULT '[]', 
  -- Example: [{"name": "Front", "type": "text", "required": true}, {"name": "Back", "type": "html", "required": true}]
  
  -- Card templates (JSON array of template objects)
  templates JSONB NOT NULL DEFAULT '[]',
  -- Example: [{"name": "Card 1", "question": "{{Front}}", "answer": "{{Back}}", "css": "...", "javascript": "..."}]
  
  -- CSS styling for cards
  css TEXT DEFAULT '',
  
  -- JavaScript for interactive cards
  javascript TEXT DEFAULT '',
  
  -- Built-in note types: basic, basic_reverse, cloze, image_occlusion, etc.
  is_builtin BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. NOTES (Content Storage)
CREATE TABLE IF NOT EXISTS flashcard_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_type_id UUID REFERENCES flashcard_note_types(id),
  deck_id UUID REFERENCES flashcard_decks(id),
  created_by UUID REFERENCES users(id),
  
  -- Note data (field values)
  fields JSONB NOT NULL DEFAULT '{}',
  -- Example: {"Front": "What is the capital of France?", "Back": "Paris", "Extra": "..."}
  
  -- Tags for organization
  tags TEXT[] DEFAULT '{}',
  
  -- Source information
  source VARCHAR(255),
  source_url TEXT,
  
  -- Modification tracking
  modification_id BIGINT DEFAULT 0, -- For sync purposes
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CARDS (Individual Study Items)
CREATE TABLE IF NOT EXISTS flashcard_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES flashcard_notes(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES flashcard_decks(id),
  template_index INTEGER NOT NULL DEFAULT 0, -- Which template from note type
  
  -- Spaced Repetition State (SuperMemo SM-2 Algorithm)
  card_type INTEGER NOT NULL DEFAULT 0, -- 0=new, 1=learning, 2=review, 3=relearning
  queue INTEGER NOT NULL DEFAULT 0, -- 0=new, 1=learning, 2=review, 3=day_learn, -1=suspended
  due BIGINT NOT NULL DEFAULT 0, -- Due date (days since epoch or minutes for learning)
  interval INTEGER DEFAULT 0, -- Current interval in days
  ease_factor DECIMAL(4,2) DEFAULT 2.50, -- Ease factor (250 = 2.50)
  reps INTEGER DEFAULT 0, -- Number of reviews
  lapses INTEGER DEFAULT 0, -- Number of lapses (failed reviews)
  left INTEGER DEFAULT 0, -- Learning queue position
  
  -- Timing information
  time_taken INTEGER DEFAULT 0, -- Total time spent on this card (seconds)
  
  -- Flags and states
  flags INTEGER DEFAULT 0, -- Bit flags for various states
  data TEXT DEFAULT '', -- Extra data storage
  
  -- Scheduling information
  original_due BIGINT DEFAULT 0, -- Original due date (for filtered decks)
  original_deck_id UUID, -- Original deck (for filtered decks)
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REVIEW HISTORY (Anki's RevLog)
CREATE TABLE IF NOT EXISTS flashcard_review_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES flashcard_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  
  -- Review details
  review_time TIMESTAMPTZ DEFAULT NOW(),
  ease INTEGER NOT NULL, -- 1=again, 2=hard, 3=good, 4=easy
  interval INTEGER, -- Interval after this review
  last_interval INTEGER, -- Interval before this review
  ease_factor DECIMAL(4,2), -- Ease factor after this review
  time_taken INTEGER, -- Time taken for this review (milliseconds)
  review_type INTEGER, -- 0=learning, 1=review, 2=relearn, 3=filtered, 4=manual
  
  -- Additional data
  button_chosen INTEGER, -- Which button was pressed
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. STUDY SESSIONS
CREATE TABLE IF NOT EXISTS flashcard_study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  deck_id UUID REFERENCES flashcard_decks(id),
  
  -- Session details
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Session statistics
  cards_studied INTEGER DEFAULT 0,
  new_cards INTEGER DEFAULT 0,
  learning_cards INTEGER DEFAULT 0,
  review_cards INTEGER DEFAULT 0,
  relearning_cards INTEGER DEFAULT 0,
  
  -- Performance metrics
  correct_answers INTEGER DEFAULT 0,
  incorrect_answers INTEGER DEFAULT 0,
  average_ease DECIMAL(3,2),
  
  -- Session settings used
  settings_snapshot JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CARD STATISTICS (Advanced Analytics)
CREATE TABLE IF NOT EXISTS flashcard_card_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES flashcard_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  
  -- Performance metrics
  total_reviews INTEGER DEFAULT 0,
  correct_reviews INTEGER DEFAULT 0,
  average_time DECIMAL(8,2) DEFAULT 0, -- Average time per review
  fastest_time INTEGER DEFAULT 0,
  slowest_time INTEGER DEFAULT 0,
  
  -- Learning curve data
  learning_curve JSONB DEFAULT '[]', -- Array of {date, ease, interval} objects
  difficulty_rating DECIMAL(3,2) DEFAULT 0, -- Calculated difficulty
  
  -- Predictive analytics
  retention_rate DECIMAL(5,2) DEFAULT 0,
  predicted_retention DECIMAL(5,2) DEFAULT 0,
  stability DECIMAL(8,2) DEFAULT 0, -- Memory stability
  retrievability DECIMAL(5,2) DEFAULT 0, -- Current retrievability
  
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. FILTERED DECKS (Anki's Custom Study)
CREATE TABLE IF NOT EXISTS flashcard_filtered_decks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_deck_id UUID REFERENCES flashcard_decks(id),
  created_by UUID REFERENCES users(id),
  
  -- Filter criteria
  search_query TEXT NOT NULL, -- Search terms for filtering cards
  limit_cards INTEGER DEFAULT 100,
  order_by VARCHAR(50) DEFAULT 'due', -- due, added, random, etc.
  
  -- Study settings override
  reschedule BOOLEAN DEFAULT true,
  preview_mode BOOLEAN DEFAULT false,
  
  -- Temporary deck settings
  expires_at TIMESTAMPTZ,
  auto_delete BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. MEDIA FILES (Images, Audio, Video)
CREATE TABLE IF NOT EXISTS flashcard_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  original_filename VARCHAR(255),
  content_type VARCHAR(100),
  file_size BIGINT,
  file_path TEXT,
  file_hash VARCHAR(64), -- SHA-256 hash for deduplication
  
  -- Media metadata
  width INTEGER, -- For images
  height INTEGER, -- For images
  duration INTEGER, -- For audio/video (seconds)
  
  -- Usage tracking
  reference_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ADD-ONS AND PLUGINS SYSTEM
CREATE TABLE IF NOT EXISTS flashcard_addons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50),
  author VARCHAR(255),
  
  -- Add-on code and configuration
  javascript_code TEXT,
  css_code TEXT,
  configuration JSONB DEFAULT '{}',
  
  -- Permissions and security
  permissions TEXT[] DEFAULT '{}',
  trusted BOOLEAN DEFAULT false,
  
  -- Installation details
  installed_by UUID REFERENCES users(id),
  enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. USER PREFERENCES AND SETTINGS
CREATE TABLE IF NOT EXISTS flashcard_user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) UNIQUE,
  
  -- Study preferences
  daily_study_goal INTEGER DEFAULT 50, -- Cards per day
  study_reminder_time TIME DEFAULT '09:00:00',
  weekend_study BOOLEAN DEFAULT true,
  
  -- Interface preferences
  theme VARCHAR(20) DEFAULT 'light', -- light, dark, auto
  card_animation BOOLEAN DEFAULT true,
  sound_effects BOOLEAN DEFAULT true,
  keyboard_shortcuts JSONB DEFAULT '{}',
  
  -- Advanced settings
  timezone VARCHAR(50) DEFAULT 'UTC',
  language VARCHAR(5) DEFAULT 'en',
  date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
  
  -- Backup and sync
  auto_sync BOOLEAN DEFAULT true,
  backup_frequency INTEGER DEFAULT 7, -- Days
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. SHARED DECKS AND COLLABORATION
CREATE TABLE IF NOT EXISTS flashcard_shared_decks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID REFERENCES flashcard_decks(id),
  shared_by UUID REFERENCES users(id),
  
  -- Sharing settings
  public BOOLEAN DEFAULT false,
  download_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  
  -- Metadata
  title VARCHAR(255) NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(100),
  difficulty_level VARCHAR(20),
  
  -- Version control
  version INTEGER DEFAULT 1,
  changelog TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. LEARNING ANALYTICS (Advanced Statistics)
CREATE TABLE IF NOT EXISTS flashcard_learning_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  deck_id UUID REFERENCES flashcard_decks(id),
  date DATE NOT NULL,
  
  -- Daily statistics
  cards_studied INTEGER DEFAULT 0,
  time_studied INTEGER DEFAULT 0, -- Seconds
  new_cards_learned INTEGER DEFAULT 0,
  reviews_completed INTEGER DEFAULT 0,
  
  -- Performance metrics
  accuracy_rate DECIMAL(5,2) DEFAULT 0,
  average_ease DECIMAL(4,2) DEFAULT 0,
  retention_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Learning efficiency
  cards_per_minute DECIMAL(5,2) DEFAULT 0,
  optimal_interval_ratio DECIMAL(5,2) DEFAULT 0,
  
  -- Predictions
  predicted_workload INTEGER DEFAULT 0, -- Cards due tomorrow
  predicted_success_rate DECIMAL(5,2) DEFAULT 0,
  
  UNIQUE(user_id, deck_id, date),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. INDEXES FOR PERFORMANCE

-- Deck and collection indexes
CREATE INDEX IF NOT EXISTS idx_flashcard_collections_parent ON flashcard_collections(parent_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_collections_created_by ON flashcard_collections(created_by);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_collection ON flashcard_decks(collection_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_created_by ON flashcard_decks(created_by);

-- Note and card indexes
CREATE INDEX IF NOT EXISTS idx_flashcard_notes_deck ON flashcard_notes(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_notes_type ON flashcard_notes(note_type_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_notes_created_by ON flashcard_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_flashcard_notes_tags ON flashcard_notes USING GIN(tags);

-- Critical card scheduling indexes
CREATE INDEX IF NOT EXISTS idx_flashcard_cards_due ON flashcard_cards(due);
CREATE INDEX IF NOT EXISTS idx_flashcard_cards_queue ON flashcard_cards(queue);
CREATE INDEX IF NOT EXISTS idx_flashcard_cards_deck ON flashcard_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_cards_note ON flashcard_cards(note_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_cards_type ON flashcard_cards(card_type);

-- Composite indexes for efficient scheduling queries
CREATE INDEX IF NOT EXISTS idx_flashcard_cards_deck_queue_due ON flashcard_cards(deck_id, queue, due);
CREATE INDEX IF NOT EXISTS idx_flashcard_cards_deck_type_due ON flashcard_cards(deck_id, card_type, due);

-- Review log indexes
CREATE INDEX IF NOT EXISTS idx_flashcard_review_log_card ON flashcard_review_log(card_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_review_log_user ON flashcard_review_log(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_review_log_time ON flashcard_review_log(review_time);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_flashcard_learning_analytics_user_date ON flashcard_learning_analytics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_flashcard_learning_analytics_deck_date ON flashcard_learning_analytics(deck_id, date);

-- Media indexes
CREATE INDEX IF NOT EXISTS idx_flashcard_media_hash ON flashcard_media(file_hash);
CREATE INDEX IF NOT EXISTS idx_flashcard_media_filename ON flashcard_media(filename);

-- 15. ROW LEVEL SECURITY
ALTER TABLE flashcard_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_note_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_review_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_card_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_filtered_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_shared_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_learning_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own flashcard data" ON flashcard_collections
  FOR ALL USING (created_by = auth.uid());

CREATE POLICY "Users can manage own decks" ON flashcard_decks
  FOR ALL USING (created_by = auth.uid());

CREATE POLICY "Users can manage own notes" ON flashcard_notes
  FOR ALL USING (created_by = auth.uid());

CREATE POLICY "Users can access own cards" ON flashcard_cards
  FOR ALL USING (
    deck_id IN (SELECT id FROM flashcard_decks WHERE created_by = auth.uid())
  );

CREATE POLICY "Users can view own review history" ON flashcard_review_log
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can access own settings" ON flashcard_user_settings
  FOR ALL USING (user_id = auth.uid());

-- Shared deck policies
CREATE POLICY "Anyone can view public shared decks" ON flashcard_shared_decks
  FOR SELECT USING (public = true);

CREATE POLICY "Users can manage own shared decks" ON flashcard_shared_decks
  FOR ALL USING (shared_by = auth.uid());

-- 16. BUILT-IN NOTE TYPES
INSERT INTO flashcard_note_types (name, description, fields, templates, css, is_builtin) VALUES

-- Basic Note Type
('Basic', 'Simple front and back card', 
 '[{"name": "Front", "type": "text", "required": true}, {"name": "Back", "type": "html", "required": true}]',
 '[{"name": "Card 1", "question": "{{Front}}", "answer": "{{Back}}"}]',
 '.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }', 
 true),

-- Basic (and reversed card)
('Basic (and reversed card)', 'Two cards: Front→Back and Back→Front',
 '[{"name": "Front", "type": "text", "required": true}, {"name": "Back", "type": "html", "required": true}]',
 '[{"name": "Card 1", "question": "{{Front}}", "answer": "{{Back}}"}, {"name": "Card 2", "question": "{{Back}}", "answer": "{{Front}}"}]',
 '.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }',
 true),

-- Cloze Deletion
('Cloze', 'Fill-in-the-blank cards with cloze deletions',
 '[{"name": "Text", "type": "html", "required": true}, {"name": "Extra", "type": "html", "required": false}]',
 '[{"name": "Cloze", "question": "{{cloze:Text}}", "answer": "{{cloze:Text}}<br>{{Extra}}"}]',
 '.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; } .cloze { font-weight: bold; color: blue; }',
 true),

-- Image Occlusion
('Image Occlusion', 'Hide parts of images for visual learning',
 '[{"name": "Image", "type": "image", "required": true}, {"name": "Header", "type": "text", "required": false}, {"name": "Footer", "type": "text", "required": false}]',
 '[{"name": "Card", "question": "{{Header}}<br>{{Image}}", "answer": "{{Header}}<br>{{Image}}<br>{{Footer}}"}]',
 '.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }',
 true);

SELECT 'Advanced Anki-like flashcard system schema created successfully!' as status;

-- Performance verification query (commented out)
/*
SELECT 
  'Collections: ' || (SELECT COUNT(*) FROM flashcard_collections) ||
  ', Decks: ' || (SELECT COUNT(*) FROM flashcard_decks) ||
  ', Note Types: ' || (SELECT COUNT(*) FROM flashcard_note_types) ||
  ', Notes: ' || (SELECT COUNT(*) FROM flashcard_notes) ||
  ', Cards: ' || (SELECT COUNT(*) FROM flashcard_cards) as summary;
*/