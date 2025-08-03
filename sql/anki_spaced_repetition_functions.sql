-- Advanced Spaced Repetition Algorithm Functions
-- Implements SuperMemo SM-2 algorithm with Anki's enhancements
-- Run this after the flashcard schema creation

-- 1. CORE SPACED REPETITION ALGORITHM
CREATE OR REPLACE FUNCTION calculate_next_interval_sm2(
  current_interval INTEGER,
  ease_factor DECIMAL(4,2),
  answer_quality INTEGER, -- 1=again, 2=hard, 3=good, 4=easy
  card_type INTEGER, -- 0=new, 1=learning, 2=review, 3=relearning
  learning_steps INTEGER[] DEFAULT '{1,10}'::INTEGER[]
)
RETURNS TABLE(
  new_interval INTEGER,
  new_ease_factor DECIMAL(4,2),
  new_card_type INTEGER,
  new_queue INTEGER
) AS $$
DECLARE
  min_ease DECIMAL(4,2) := 1.30;
  max_ease DECIMAL(4,2) := 4.00;
  ease_bonus DECIMAL(3,2) := 1.30;
  interval_modifier DECIMAL(3,2) := 1.00;
  graduating_interval INTEGER := 1;
  easy_interval INTEGER := 4;
  hard_factor DECIMAL(3,2) := 1.20;
  new_factor DECIMAL(3,2) := 0.00;
BEGIN
  -- Initialize return values
  new_ease_factor := ease_factor;
  new_card_type := card_type;
  new_queue := 2; -- Default to review queue
  
  CASE
    -- NEW CARDS
    WHEN card_type = 0 THEN
      CASE answer_quality
        WHEN 1 THEN -- Again
          new_interval := learning_steps[1];
          new_card_type := 1; -- Learning
          new_queue := 1; -- Learning queue
        WHEN 2 THEN -- Hard  
          new_interval := learning_steps[1];
          new_card_type := 1; -- Learning
          new_queue := 1; -- Learning queue
        WHEN 3 THEN -- Good
          new_interval := graduating_interval;
          new_card_type := 2; -- Review
          new_queue := 2; -- Review queue
        WHEN 4 THEN -- Easy
          new_interval := easy_interval;
          new_card_type := 2; -- Review
          new_queue := 2; -- Review queue
          new_ease_factor := LEAST(max_ease, ease_factor + 0.15);
      END CASE;
    
    -- LEARNING CARDS
    WHEN card_type = 1 THEN
      CASE answer_quality
        WHEN 1 THEN -- Again (back to first learning step)
          new_interval := learning_steps[1];
          new_card_type := 1; -- Still learning
          new_queue := 1; -- Learning queue
        WHEN 2 THEN -- Hard (repeat current step)
          new_interval := COALESCE(current_interval, learning_steps[1]);
          new_card_type := 1; -- Still learning
          new_queue := 1; -- Learning queue
        WHEN 3 THEN -- Good (graduate or next step)
          IF current_interval >= learning_steps[array_length(learning_steps, 1)] THEN
            -- Graduate to review
            new_interval := graduating_interval;
            new_card_type := 2; -- Review
            new_queue := 2; -- Review queue
          ELSE
            -- Move to next learning step
            FOR i IN 1..array_length(learning_steps, 1) LOOP
              IF current_interval < learning_steps[i] THEN
                new_interval := learning_steps[i];
                EXIT;
              END IF;
            END LOOP;
            new_card_type := 1; -- Still learning
            new_queue := 1; -- Learning queue
          END IF;
        WHEN 4 THEN -- Easy (graduate immediately)
          new_interval := easy_interval;
          new_card_type := 2; -- Review
          new_queue := 2; -- Review queue
          new_ease_factor := LEAST(max_ease, ease_factor + 0.15);
      END CASE;
    
    -- REVIEW CARDS (SuperMemo SM-2 algorithm)
    WHEN card_type = 2 THEN
      CASE answer_quality
        WHEN 1 THEN -- Again (back to learning)
          new_interval := learning_steps[1];
          new_card_type := 3; -- Relearning
          new_queue := 1; -- Learning queue
          new_ease_factor := GREATEST(min_ease, ease_factor - 0.20);
        WHEN 2 THEN -- Hard
          new_interval := GREATEST(1, ROUND(current_interval * hard_factor * interval_modifier));
          new_ease_factor := GREATEST(min_ease, ease_factor - 0.15);
        WHEN 3 THEN -- Good
          new_interval := ROUND(current_interval * ease_factor * interval_modifier);
        WHEN 4 THEN -- Easy
          new_interval := ROUND(current_interval * ease_factor * ease_bonus * interval_modifier);
          new_ease_factor := LEAST(max_ease, ease_factor + 0.15);
      END CASE;
    
    -- RELEARNING CARDS
    WHEN card_type = 3 THEN
      CASE answer_quality
        WHEN 1 THEN -- Again
          new_interval := learning_steps[1];
          new_card_type := 3; -- Still relearning
          new_queue := 1; -- Learning queue
        WHEN 2 THEN -- Hard
          new_interval := COALESCE(current_interval, learning_steps[1]);
          new_card_type := 3; -- Still relearning
          new_queue := 1; -- Learning queue
        WHEN 3 THEN -- Good (back to review)
          new_interval := GREATEST(1, current_interval); -- Original interval or 1 day
          new_card_type := 2; -- Review
          new_queue := 2; -- Review queue
        WHEN 4 THEN -- Easy (back to review with bonus)
          new_interval := GREATEST(easy_interval, current_interval);
          new_card_type := 2; -- Review
          new_queue := 2; -- Review queue
          new_ease_factor := LEAST(max_ease, ease_factor + 0.15);
      END CASE;
  END CASE;
  
  -- Cap the maximum interval
  new_interval := LEAST(new_interval, 36500); -- 100 years max
  
  RETURN QUERY SELECT new_interval, new_ease_factor, new_card_type, new_queue;
END;
$$ LANGUAGE plpgsql;

-- 2. CALCULATE DUE DATE
CREATE OR REPLACE FUNCTION calculate_due_date(
  interval_days INTEGER,
  card_type INTEGER,
  current_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BIGINT AS $$
DECLARE
  base_epoch CONSTANT DATE := '1970-01-01';
  due_timestamp TIMESTAMPTZ;
  days_since_epoch BIGINT;
BEGIN
  IF card_type = 1 OR card_type = 3 THEN
    -- Learning/relearning cards: due in minutes from now
    due_timestamp := current_time + (interval_days || ' minutes')::INTERVAL;
    RETURN EXTRACT(EPOCH FROM due_timestamp)::BIGINT;
  ELSE
    -- Review cards: due in days (stored as days since epoch)
    days_since_epoch := (DATE(current_time) - base_epoch)::INTEGER + interval_days;
    RETURN days_since_epoch;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. GET CARDS DUE FOR STUDY
CREATE OR REPLACE FUNCTION get_due_cards(
  p_deck_id UUID,
  p_user_id UUID,
  p_current_time TIMESTAMPTZ DEFAULT NOW(),
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  card_id UUID,
  note_id UUID,
  card_type INTEGER,
  queue INTEGER,
  due BIGINT,
  interval INTEGER,
  ease_factor DECIMAL(4,2),
  priority INTEGER
) AS $$
DECLARE
  base_epoch CONSTANT DATE := '1970-01-01';
  current_days BIGINT;
  current_minutes BIGINT;
BEGIN
  current_days := (DATE(p_current_time) - base_epoch)::INTEGER;
  current_minutes := EXTRACT(EPOCH FROM p_current_time)::BIGINT;
  
  RETURN QUERY
  WITH prioritized_cards AS (
    SELECT 
      c.id as card_id,
      c.note_id,
      c.card_type,
      c.queue,
      c.due,
      c.interval,
      c.ease_factor,
      CASE 
        -- Priority order: learning > relearning > new > review
        WHEN c.queue = 1 AND c.card_type = 1 THEN 1 -- Learning
        WHEN c.queue = 1 AND c.card_type = 3 THEN 2 -- Relearning  
        WHEN c.queue = 0 THEN 3 -- New
        WHEN c.queue = 2 THEN 4 -- Review
        ELSE 5 -- Other
      END as priority,
      CASE
        -- For learning/relearning cards, check if due time has passed
        WHEN c.queue = 1 THEN (c.due <= current_minutes)
        -- For new cards, always available (limited by deck settings)
        WHEN c.queue = 0 THEN true
        -- For review cards, check if due date has passed
        WHEN c.queue = 2 THEN (c.due <= current_days)
        ELSE false
      END as is_due
    FROM flashcard_cards c
    WHERE c.deck_id = p_deck_id
      AND c.queue >= 0 -- Exclude suspended cards (-1)
  )
  SELECT 
    pc.card_id,
    pc.note_id,
    pc.card_type,
    pc.queue,
    pc.due,
    pc.interval,
    pc.ease_factor,
    pc.priority
  FROM prioritized_cards pc
  WHERE pc.is_due = true
  ORDER BY pc.priority, pc.due
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 4. ANSWER CARD AND UPDATE SCHEDULING
CREATE OR REPLACE FUNCTION answer_card(
  p_card_id UUID,
  p_user_id UUID,
  p_answer_quality INTEGER, -- 1=again, 2=hard, 3=good, 4=easy
  p_time_taken INTEGER DEFAULT 0, -- milliseconds
  p_current_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
  card_record RECORD;
  deck_settings RECORD;
  scheduling_result RECORD;
  new_due BIGINT;
BEGIN
  -- Get current card state
  SELECT c.*, d.learning_steps, d.graduating_interval, d.easy_interval, d.starting_ease
  INTO card_record
  FROM flashcard_cards c
  JOIN flashcard_decks d ON c.deck_id = d.id
  WHERE c.id = p_card_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Calculate new scheduling parameters
  SELECT * INTO scheduling_result
  FROM calculate_next_interval_sm2(
    card_record.interval,
    card_record.ease_factor,
    p_answer_quality,
    card_record.card_type,
    card_record.learning_steps
  );
  
  -- Calculate new due date
  new_due := calculate_due_date(
    scheduling_result.new_interval,
    scheduling_result.new_card_type,
    p_current_time
  );
  
  -- Update card
  UPDATE flashcard_cards
  SET 
    card_type = scheduling_result.new_card_type,
    queue = scheduling_result.new_queue,
    due = new_due,
    interval = scheduling_result.new_interval,
    ease_factor = scheduling_result.new_ease_factor,
    reps = reps + 1,
    lapses = CASE WHEN p_answer_quality = 1 THEN lapses + 1 ELSE lapses END,
    time_taken = time_taken + COALESCE(p_time_taken, 0),
    updated_at = p_current_time
  WHERE id = p_card_id;
  
  -- Log the review
  INSERT INTO flashcard_review_log (
    card_id,
    user_id,
    review_time,
    ease,
    interval,
    last_interval,
    ease_factor,
    time_taken,
    review_type,
    button_chosen
  ) VALUES (
    p_card_id,
    p_user_id,
    p_current_time,
    p_answer_quality,
    scheduling_result.new_interval,
    card_record.interval,
    scheduling_result.new_ease_factor,
    p_time_taken,
    CASE 
      WHEN card_record.card_type = 0 THEN 0 -- Learning (new)
      WHEN card_record.card_type = 1 THEN 0 -- Learning
      WHEN card_record.card_type = 2 THEN 1 -- Review
      WHEN card_record.card_type = 3 THEN 2 -- Relearning
    END,
    p_answer_quality
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 5. DECK STATISTICS CALCULATOR
CREATE OR REPLACE FUNCTION calculate_deck_statistics(p_deck_id UUID)
RETURNS TABLE(
  total_cards INTEGER,
  new_cards INTEGER,
  learning_cards INTEGER,
  review_cards INTEGER,
  due_cards INTEGER,
  suspended_cards INTEGER
) AS $$
DECLARE
  base_epoch CONSTANT DATE := '1970-01-01';
  current_days BIGINT;
  current_minutes BIGINT;
BEGIN
  current_days := (DATE(NOW()) - base_epoch)::INTEGER;
  current_minutes := EXTRACT(EPOCH FROM NOW())::BIGINT;
  
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_cards,
    COUNT(CASE WHEN c.card_type = 0 THEN 1 END)::INTEGER as new_cards,
    COUNT(CASE WHEN c.card_type = 1 OR c.card_type = 3 THEN 1 END)::INTEGER as learning_cards,
    COUNT(CASE WHEN c.card_type = 2 THEN 1 END)::INTEGER as review_cards,
    COUNT(CASE 
      WHEN c.queue = 0 THEN 1 -- New cards (always available)
      WHEN c.queue = 1 AND c.due <= current_minutes THEN 1 -- Learning cards due
      WHEN c.queue = 2 AND c.due <= current_days THEN 1 -- Review cards due
    END)::INTEGER as due_cards,
    COUNT(CASE WHEN c.queue = -1 THEN 1 END)::INTEGER as suspended_cards
  FROM flashcard_cards c
  WHERE c.deck_id = p_deck_id;
END;
$$ LANGUAGE plpgsql;

-- 6. RETENTION RATE CALCULATOR
CREATE OR REPLACE FUNCTION calculate_retention_rate(
  p_deck_id UUID,
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  period_days INTEGER,
  total_reviews INTEGER,
  successful_reviews INTEGER,
  retention_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_days_back as period_days,
    COUNT(*)::INTEGER as total_reviews,
    COUNT(CASE WHEN rl.ease >= 3 THEN 1 END)::INTEGER as successful_reviews,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(CASE WHEN rl.ease >= 3 THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2)
      ELSE 0.00
    END as retention_rate
  FROM flashcard_review_log rl
  JOIN flashcard_cards c ON rl.card_id = c.id
  WHERE c.deck_id = p_deck_id
    AND rl.user_id = p_user_id
    AND rl.review_time >= NOW() - INTERVAL '1 day' * p_days_back
    AND rl.review_type IN (1, 2); -- Only count review and relearning, not initial learning
END;
$$ LANGUAGE plpgsql;

-- 7. PREDICTIVE WORKLOAD CALCULATOR
CREATE OR REPLACE FUNCTION predict_future_workload(
  p_deck_id UUID,
  p_days_ahead INTEGER DEFAULT 7
)
RETURNS TABLE(
  date DATE,
  predicted_reviews INTEGER,
  predicted_new_cards INTEGER,
  total_workload INTEGER
) AS $$
DECLARE
  base_epoch CONSTANT DATE := '1970-01-01';
  current_date DATE := CURRENT_DATE;
  target_date DATE;
  i INTEGER;
BEGIN
  FOR i IN 0..p_days_ahead-1 LOOP
    target_date := current_date + i;
    
    RETURN QUERY
    SELECT 
      target_date,
      COUNT(CASE 
        WHEN c.card_type = 2 AND c.due = (target_date - base_epoch)::INTEGER THEN 1 
      END)::INTEGER as predicted_reviews,
      -- Estimate new cards based on deck settings (simplified)
      (SELECT COALESCE(d.new_cards_per_day, 20) FROM flashcard_decks d WHERE d.id = p_deck_id)::INTEGER as predicted_new_cards,
      (COUNT(CASE 
        WHEN c.card_type = 2 AND c.due = (target_date - base_epoch)::INTEGER THEN 1 
      END) + COALESCE((SELECT d.new_cards_per_day FROM flashcard_decks d WHERE d.id = p_deck_id), 20))::INTEGER as total_workload
    FROM flashcard_cards c
    WHERE c.deck_id = p_deck_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 8. OPTIMAL EASE FACTOR ANALYZER
CREATE OR REPLACE FUNCTION analyze_optimal_ease_factors(
  p_user_id UUID,
  p_deck_id UUID DEFAULT NULL
)
RETURNS TABLE(
  current_ease_range VARCHAR(20),
  card_count INTEGER,
  average_retention DECIMAL(5,2),
  recommended_adjustment DECIMAL(3,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH ease_analysis AS (
    SELECT 
      c.id,
      c.ease_factor,
      CASE 
        WHEN c.ease_factor < 2.0 THEN '< 2.0'
        WHEN c.ease_factor < 2.3 THEN '2.0 - 2.3'
        WHEN c.ease_factor < 2.6 THEN '2.3 - 2.6'
        WHEN c.ease_factor < 3.0 THEN '2.6 - 3.0'
        ELSE '> 3.0'
      END as ease_range,
      COALESCE(retention_stats.retention, 0) as retention
    FROM flashcard_cards c
    LEFT JOIN (
      SELECT 
        rl.card_id,
        CASE 
          WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN rl.ease >= 3 THEN 1 END)::DECIMAL / COUNT(*)) * 100
          ELSE 0
        END as retention
      FROM flashcard_review_log rl
      WHERE rl.user_id = p_user_id
        AND rl.review_time >= NOW() - INTERVAL '30 days'
      GROUP BY rl.card_id
    ) retention_stats ON c.id = retention_stats.card_id
    WHERE (p_deck_id IS NULL OR c.deck_id = p_deck_id)
      AND c.card_type = 2 -- Only review cards
  )
  SELECT 
    ea.ease_range as current_ease_range,
    COUNT(*)::INTEGER as card_count,
    AVG(ea.retention)::DECIMAL(5,2) as average_retention,
    CASE 
      WHEN AVG(ea.retention) > 90 THEN 0.15  -- Increase ease
      WHEN AVG(ea.retention) > 85 THEN 0.05  -- Slight increase
      WHEN AVG(ea.retention) < 75 THEN -0.15 -- Decrease ease
      WHEN AVG(ea.retention) < 80 THEN -0.05 -- Slight decrease
      ELSE 0.00 -- No change
    END::DECIMAL(3,2) as recommended_adjustment
  FROM ease_analysis ea
  GROUP BY ea.ease_range
  ORDER BY 
    CASE ea.ease_range
      WHEN '< 2.0' THEN 1
      WHEN '2.0 - 2.3' THEN 2
      WHEN '2.3 - 2.6' THEN 3
      WHEN '2.6 - 3.0' THEN 4
      WHEN '> 3.0' THEN 5
    END;
END;
$$ LANGUAGE plpgsql;

-- 9. AUTOMATED DECK MAINTENANCE
CREATE OR REPLACE FUNCTION maintain_deck_statistics(p_deck_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  stats_record RECORD;
BEGIN
  -- Calculate current statistics
  SELECT * INTO stats_record
  FROM calculate_deck_statistics(p_deck_id);
  
  -- Update deck statistics
  UPDATE flashcard_decks
  SET 
    total_cards = stats_record.total_cards,
    new_cards = stats_record.new_cards,
    learning_cards = stats_record.learning_cards,
    review_cards = stats_record.review_cards,
    updated_at = NOW()
  WHERE id = p_deck_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 10. TRIGGER TO AUTOMATICALLY UPDATE DECK STATS
CREATE OR REPLACE FUNCTION trigger_update_deck_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update statistics for the affected deck
  PERFORM maintain_deck_statistics(COALESCE(NEW.deck_id, OLD.deck_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_deck_stats_on_card_change ON flashcard_cards;
CREATE TRIGGER update_deck_stats_on_card_change
  AFTER INSERT OR UPDATE OR DELETE ON flashcard_cards
  FOR EACH ROW EXECUTE FUNCTION trigger_update_deck_stats();

SELECT 'Advanced spaced repetition algorithm functions created successfully!' as status;