-- SQL script to create tables for Parent API functionality
-- Run this in your Supabase SQL editor

-- Create parent_child_relationships table
CREATE TABLE IF NOT EXISTS parent_child_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL DEFAULT 'parent',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parent_id, child_id)
);

-- Create student_metadata table (enhanced version)
CREATE TABLE IF NOT EXISTS student_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    educator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    grade VARCHAR(50),
    school VARCHAR(255),
    age INTEGER CHECK (age >= 5 AND age <= 25),
    parent_notes TEXT,
    educator_notes TEXT,
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id)
);

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    category VARCHAR(50) DEFAULT 'general',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create payments table (enhanced version)
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    invoice_id VARCHAR(255),
    plan_type VARCHAR(50),
    billing_period VARCHAR(20) CHECK (billing_period IN ('monthly', 'quarterly', 'yearly')),
    payment_gateway VARCHAR(50),
    gateway_response JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table (enhanced version if not exists)
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    type VARCHAR(50) DEFAULT 'direct',
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived', 'deleted')),
    thread_id UUID,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Create notifications table (enhanced version if not exists)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_progress table if not exists
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    passage_id UUID REFERENCES reading_passages(id) ON DELETE SET NULL,
    reading_time INTEGER DEFAULT 0, -- in minutes
    comprehension_score INTEGER DEFAULT 0, -- percentage
    questions_attempted INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_analytics table if not exists
CREATE TABLE IF NOT EXISTS user_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reading_time INTEGER DEFAULT 0, -- in minutes
    passages_read INTEGER DEFAULT 0,
    quiz_score INTEGER DEFAULT 0, -- percentage
    questions_attempted INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    study_sessions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create reading_passages table if not exists (basic structure)
CREATE TABLE IF NOT EXISTS reading_passages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'comprehension',
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    category VARCHAR(100),
    word_count INTEGER,
    estimated_time INTEGER, -- in minutes
    tags TEXT[],
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assignment_submissions table if not exists
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_content JSONB,
    score DECIMAL(5,2),
    feedback TEXT,
    rubric_scores JSONB,
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded', 'returned')),
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    graded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assignments table if not exists
CREATE TABLE IF NOT EXISTS assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    type VARCHAR(50) DEFAULT 'homework',
    due_date TIMESTAMP WITH TIME ZONE,
    total_marks DECIMAL(5,2) DEFAULT 100,
    time_limit INTEGER, -- in minutes
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    educator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instructions TEXT,
    resources JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create classes table if not exists
CREATE TABLE IF NOT EXISTS classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(100),
    grade_level VARCHAR(50),
    educator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT,
    schedule JSONB,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create class_memberships table if not exists
CREATE TABLE IF NOT EXISTS class_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'educator', 'assistant')),
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, user_id)
);

-- Create attendance table if not exists
CREATE TABLE IF NOT EXISTS attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
    check_in_time TIME,
    check_out_time TIME,
    notes TEXT,
    marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, student_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parent_child_parent_id ON parent_child_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_child_id ON parent_child_relationships(child_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_active ON parent_child_relationships(parent_id, is_active);

CREATE INDEX IF NOT EXISTS idx_student_metadata_student_id ON student_metadata(student_id);
CREATE INDEX IF NOT EXISTS idx_student_metadata_educator_id ON student_metadata(educator_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_child_id ON messages(child_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed_at ON user_progress(completed_at);

CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_date ON user_analytics(date);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_date ON user_analytics(user_id, date);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON assignment_submissions(status);

CREATE INDEX IF NOT EXISTS idx_assignments_educator_id ON assignments(educator_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

CREATE INDEX IF NOT EXISTS idx_classes_educator_id ON classes(educator_id);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);

CREATE INDEX IF NOT EXISTS idx_class_memberships_class_id ON class_memberships(class_id);
CREATE INDEX IF NOT EXISTS idx_class_memberships_user_id ON class_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_class_memberships_role ON class_memberships(role);

CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- Create RLS policies (Row Level Security)
-- Enable RLS on all tables
ALTER TABLE parent_child_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Parent-child relationships policies
CREATE POLICY "Parents can view their own relationships" ON parent_child_relationships
    FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Parents can create relationships" ON parent_child_relationships
    FOR INSERT WITH CHECK (parent_id = auth.uid());

-- Student metadata policies
CREATE POLICY "Students can view their own metadata" ON student_metadata
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Parents can view their children's metadata" ON student_metadata
    FOR SELECT USING (
        student_id IN (
            SELECT child_id FROM parent_child_relationships 
            WHERE parent_id = auth.uid() AND is_active = true
        )
    );

-- Support tickets policies
CREATE POLICY "Users can view their own tickets" ON support_tickets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create tickets" ON support_tickets
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Payments policies
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view their own messages" ON messages
    FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

-- Add helpful comments
COMMENT ON TABLE parent_child_relationships IS 'Links parent accounts to their children accounts';
COMMENT ON TABLE student_metadata IS 'Additional information about students including grades, school, etc.';
COMMENT ON TABLE support_tickets IS 'Customer support tickets from parents and students';
COMMENT ON TABLE payments IS 'Payment history and transaction records';
COMMENT ON TABLE messages IS 'Communication between parents, educators, and admin';
COMMENT ON TABLE notifications IS 'System notifications for users';

-- Insert sample data for testing (optional)
-- Uncomment the following if you want sample data

/*
-- Sample parent-child relationship
INSERT INTO parent_child_relationships (parent_id, child_id, relationship_type)
SELECT 
    p.id as parent_id,
    s.id as child_id,
    'parent'
FROM users p, users s
WHERE p.email = 'parent@demo.com' AND s.email = 'student@demo.com'
ON CONFLICT (parent_id, child_id) DO NOTHING;

-- Sample student metadata
INSERT INTO student_metadata (student_id, grade, school, age)
SELECT 
    id,
    '11th Grade',
    'Delhi Public School',
    17
FROM users
WHERE email = 'student@demo.com'
ON CONFLICT (student_id) DO NOTHING;
*/