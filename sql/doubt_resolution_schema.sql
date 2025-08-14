-- Enhanced Doubt Resolution System Schema
-- This schema supports comprehensive doubt management with AI and human educator integration

-- Create doubts table
CREATE TABLE IF NOT EXISTS doubts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('concept', 'problem', 'homework', 'exam_prep', 'other')),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_educator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ai_assisted BOOLEAN DEFAULT false,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    estimated_time_minutes INTEGER,
    tags TEXT[] DEFAULT '{}',
    attachments TEXT[] DEFAULT '{}',
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create doubt responses table
CREATE TABLE IF NOT EXISTS doubt_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doubt_id UUID NOT NULL REFERENCES doubts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_type VARCHAR(20) NOT NULL CHECK (author_type IN ('student', 'educator', 'ai')),
    content TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    is_helpful BOOLEAN,
    is_accepted_solution BOOLEAN DEFAULT false,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    ai_generated BOOLEAN DEFAULT false,
    ai_model VARCHAR(50),
    ai_confidence_score DECIMAL(3,2),
    parent_response_id UUID REFERENCES doubt_responses(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create doubt ratings table for student feedback
CREATE TABLE IF NOT EXISTS doubt_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doubt_id UUID NOT NULL REFERENCES doubts(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    response_quality_rating INTEGER CHECK (response_quality_rating >= 1 AND response_quality_rating <= 5),
    response_speed_rating INTEGER CHECK (response_speed_rating >= 1 AND response_speed_rating <= 5),
    educator_rating INTEGER CHECK (educator_rating >= 1 AND educator_rating <= 5),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(doubt_id, student_id)
);

-- Create doubt notifications table for real-time updates
CREATE TABLE IF NOT EXISTS doubt_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doubt_id UUID NOT NULL REFERENCES doubts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('new_doubt', 'assigned', 'response_added', 'doubt_resolved', 'doubt_closed', 'rating_added')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create doubt assignments table to track educator workload
CREATE TABLE IF NOT EXISTS doubt_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doubt_id UUID NOT NULL REFERENCES doubts(id) ON DELETE CASCADE,
    educator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assignment_type VARCHAR(20) DEFAULT 'manual' CHECK (assignment_type IN ('manual', 'auto', 'ai_suggested')),
    assignment_reason TEXT,
    accepted_at TIMESTAMP,
    declined_at TIMESTAMP,
    decline_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(doubt_id, educator_id)
);

-- Create doubt activity log for audit trail
CREATE TABLE IF NOT EXISTS doubt_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doubt_id UUID NOT NULL REFERENCES doubts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create educator specializations table
CREATE TABLE IF NOT EXISTS educator_specializations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    educator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    proficiency_level INTEGER DEFAULT 3 CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
    years_of_experience INTEGER DEFAULT 0,
    certifications TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(educator_id, subject)
);

-- Create educator performance metrics table
CREATE TABLE IF NOT EXISTS educator_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    educator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    doubts_assigned INTEGER DEFAULT 0,
    doubts_resolved INTEGER DEFAULT 0,
    average_response_time_minutes INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_upvotes INTEGER DEFAULT 0,
    total_downvotes INTEGER DEFAULT 0,
    subjects_covered TEXT[] DEFAULT '{}',
    student_satisfaction_score DECIMAL(3,2) DEFAULT 0.00,
    ai_collaboration_score DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(educator_id, period_start, period_end)
);

-- Create system analytics table
CREATE TABLE IF NOT EXISTS doubt_system_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,
    total_doubts INTEGER DEFAULT 0,
    resolved_doubts INTEGER DEFAULT 0,
    open_doubts INTEGER DEFAULT 0,
    ai_resolved_doubts INTEGER DEFAULT 0,
    human_resolved_doubts INTEGER DEFAULT 0,
    average_response_time_minutes INTEGER DEFAULT 0,
    average_resolution_time_minutes INTEGER DEFAULT 0,
    user_satisfaction_score DECIMAL(3,2) DEFAULT 0.00,
    peak_hour INTEGER, -- 0-23 representing hour of day
    most_asked_subject VARCHAR(100),
    active_educators INTEGER DEFAULT 0,
    new_students INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(metric_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_doubts_student_id ON doubts(student_id);
CREATE INDEX IF NOT EXISTS idx_doubts_educator_id ON doubts(assigned_educator_id);
CREATE INDEX IF NOT EXISTS idx_doubts_status ON doubts(status);
CREATE INDEX IF NOT EXISTS idx_doubts_subject ON doubts(subject);
CREATE INDEX IF NOT EXISTS idx_doubts_priority ON doubts(priority);
CREATE INDEX IF NOT EXISTS idx_doubts_created_at ON doubts(created_at);
CREATE INDEX IF NOT EXISTS idx_doubts_updated_at ON doubts(updated_at);

CREATE INDEX IF NOT EXISTS idx_doubt_responses_doubt_id ON doubt_responses(doubt_id);
CREATE INDEX IF NOT EXISTS idx_doubt_responses_author_id ON doubt_responses(author_id);
CREATE INDEX IF NOT EXISTS idx_doubt_responses_created_at ON doubt_responses(created_at);
CREATE INDEX IF NOT EXISTS idx_doubt_responses_author_type ON doubt_responses(author_type);

CREATE INDEX IF NOT EXISTS idx_doubt_notifications_user_id ON doubt_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_doubt_notifications_doubt_id ON doubt_notifications(doubt_id);
CREATE INDEX IF NOT EXISTS idx_doubt_notifications_is_read ON doubt_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_doubt_notifications_created_at ON doubt_notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_doubt_assignments_educator_id ON doubt_assignments(educator_id);
CREATE INDEX IF NOT EXISTS idx_doubt_assignments_doubt_id ON doubt_assignments(doubt_id);

CREATE INDEX IF NOT EXISTS idx_educator_specializations_educator_id ON educator_specializations(educator_id);
CREATE INDEX IF NOT EXISTS idx_educator_specializations_subject ON educator_specializations(subject);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_doubts_updated_at ON doubts;
CREATE TRIGGER update_doubts_updated_at 
    BEFORE UPDATE ON doubts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_doubt_responses_updated_at ON doubt_responses;
CREATE TRIGGER update_doubt_responses_updated_at 
    BEFORE UPDATE ON doubt_responses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_educator_specializations_updated_at ON educator_specializations;
CREATE TRIGGER update_educator_specializations_updated_at 
    BEFORE UPDATE ON educator_specializations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_educator_performance_metrics_updated_at ON educator_performance_metrics;
CREATE TRIGGER update_educator_performance_metrics_updated_at 
    BEFORE UPDATE ON educator_performance_metrics 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS (Row Level Security) policies for secure access
ALTER TABLE doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubt_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubt_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubt_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for doubts table
DROP POLICY IF EXISTS "Users can view their own doubts" ON doubts;
CREATE POLICY "Users can view their own doubts" ON doubts
    FOR SELECT USING (
        auth.uid() = student_id OR 
        auth.uid() = assigned_educator_id OR
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'operation_manager')
    );

DROP POLICY IF EXISTS "Students can create doubts" ON doubts;
CREATE POLICY "Students can create doubts" ON doubts
    FOR INSERT WITH CHECK (
        auth.uid() = student_id AND
        (SELECT role FROM users WHERE id = auth.uid()) = 'student'
    );

DROP POLICY IF EXISTS "Educators and admins can update doubts" ON doubts;
CREATE POLICY "Educators and admins can update doubts" ON doubts
    FOR UPDATE USING (
        auth.uid() = assigned_educator_id OR
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'operation_manager', 'educator')
    );

-- Policies for doubt_responses table
DROP POLICY IF EXISTS "Users can view responses to their doubts" ON doubt_responses;
CREATE POLICY "Users can view responses to their doubts" ON doubt_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM doubts 
            WHERE doubts.id = doubt_responses.doubt_id 
            AND (doubts.student_id = auth.uid() OR doubts.assigned_educator_id = auth.uid())
        ) OR
        author_id = auth.uid() OR
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'operation_manager')
    );

DROP POLICY IF EXISTS "Users can create responses" ON doubt_responses;
CREATE POLICY "Users can create responses" ON doubt_responses
    FOR INSERT WITH CHECK (
        author_id = auth.uid() AND
        (SELECT role FROM users WHERE id = auth.uid()) IN ('student', 'educator', 'admin')
    );

-- Sample data for testing (remove in production)
-- Insert sample educator specializations
INSERT INTO educator_specializations (educator_id, subject, proficiency_level, years_of_experience) 
VALUES 
    ((SELECT id FROM users WHERE email = 'educator@demo.com' LIMIT 1), 'Constitutional Law', 5, 8),
    ((SELECT id FROM users WHERE email = 'educator@demo.com' LIMIT 1), 'Legal Reasoning', 4, 6),
    ((SELECT id FROM users WHERE email = 'educator@demo.com' LIMIT 1), 'Current Affairs', 3, 4)
ON CONFLICT DO NOTHING;

-- Create functions for doubt management
CREATE OR REPLACE FUNCTION assign_doubt_to_educator(
    doubt_id UUID,
    educator_id UUID,
    assigned_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    assignment_created BOOLEAN := false;
BEGIN
    -- Check if doubt exists and is not already assigned
    IF EXISTS (
        SELECT 1 FROM doubts 
        WHERE id = doubt_id AND assigned_educator_id IS NULL
    ) THEN
        -- Update doubt assignment
        UPDATE doubts 
        SET assigned_educator_id = educator_id, 
            status = 'assigned', 
            updated_at = NOW()
        WHERE id = doubt_id;
        
        -- Create assignment record
        INSERT INTO doubt_assignments (doubt_id, educator_id, assigned_by, assignment_type)
        VALUES (doubt_id, educator_id, assigned_by, 'manual');
        
        -- Create notification
        INSERT INTO doubt_notifications (doubt_id, user_id, notification_type, title, message)
        VALUES (
            doubt_id, 
            educator_id, 
            'assigned', 
            'New Doubt Assigned',
            'A new doubt has been assigned to you.'
        );
        
        assignment_created := true;
    END IF;
    
    RETURN assignment_created;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-suggest best educator for a doubt
CREATE OR REPLACE FUNCTION suggest_best_educator_for_doubt(
    doubt_subject VARCHAR(100),
    exclude_educator_ids UUID[] DEFAULT '{}'
)
RETURNS TABLE(
    educator_id UUID,
    educator_name VARCHAR(255),
    educator_email VARCHAR(255),
    proficiency_level INTEGER,
    years_of_experience INTEGER,
    current_workload INTEGER,
    match_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as educator_id,
        u.name as educator_name,
        u.email as educator_email,
        es.proficiency_level,
        es.years_of_experience,
        COALESCE(workload.current_doubts, 0) as current_workload,
        (es.proficiency_level * 20 + LEAST(es.years_of_experience * 2, 20) - COALESCE(workload.current_doubts, 0) * 5) as match_score
    FROM users u
    JOIN educator_specializations es ON u.id = es.educator_id
    LEFT JOIN (
        SELECT assigned_educator_id, COUNT(*) as current_doubts
        FROM doubts 
        WHERE status IN ('assigned', 'in_progress') AND assigned_educator_id IS NOT NULL
        GROUP BY assigned_educator_id
    ) workload ON u.id = workload.assigned_educator_id
    WHERE u.role = 'educator' 
        AND es.subject = doubt_subject 
        AND es.is_active = true
        AND NOT (u.id = ANY(exclude_educator_ids))
    ORDER BY match_score DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate educator performance metrics
CREATE OR REPLACE FUNCTION calculate_educator_performance(
    educator_id UUID,
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_doubts_assigned INTEGER,
    total_doubts_resolved INTEGER,
    average_response_time_minutes INTEGER,
    average_rating DECIMAL(3,2),
    resolution_rate DECIMAL(5,2),
    student_satisfaction DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT d.id)::INTEGER as total_doubts_assigned,
        COUNT(DISTINCT CASE WHEN d.status = 'resolved' THEN d.id END)::INTEGER as total_doubts_resolved,
        COALESCE(AVG(EXTRACT(EPOCH FROM (dr.created_at - d.created_at))/60)::INTEGER, 0) as average_response_time_minutes,
        COALESCE(AVG(drt.rating)::DECIMAL(3,2), 0.00) as average_rating,
        CASE 
            WHEN COUNT(DISTINCT d.id) > 0 
            THEN (COUNT(DISTINCT CASE WHEN d.status = 'resolved' THEN d.id END)::DECIMAL / COUNT(DISTINCT d.id) * 100)::DECIMAL(5,2)
            ELSE 0.00 
        END as resolution_rate,
        COALESCE(AVG(drt.educator_rating)::DECIMAL(3,2), 0.00) as student_satisfaction
    FROM doubts d
    LEFT JOIN doubt_responses dr ON d.id = dr.doubt_id AND dr.author_id = educator_id
    LEFT JOIN doubt_ratings drt ON d.id = drt.doubt_id
    WHERE d.assigned_educator_id = educator_id
        AND d.created_at >= start_date
        AND d.created_at <= end_date;
END;
$$ LANGUAGE plpgsql;