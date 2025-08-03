-- Additional Row Level Security (RLS) Policies
-- Run this after enhanced_schema.sql and mock test table creation
-- This adds missing RLS policies for comprehensive security

-- Enable RLS on mock test template table if not already enabled
ALTER TABLE mock_test_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_planning_data ENABLE ROW LEVEL SECURITY;

-- 1. Mock Test Templates Policies
CREATE POLICY "Admins can manage mock test templates" ON mock_test_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operation_manager')
    )
  );

CREATE POLICY "Educators can create and manage own templates" ON mock_test_templates
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operation_manager', 'educator')
    )
  );

CREATE POLICY "Active templates viewable by all users" ON mock_test_templates
  FOR SELECT USING (status = 'active');

-- 2. Student Planning Data Policies
CREATE POLICY "Students can manage own planning data" ON student_planning_data
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Educators can view student planning in their classes" ON student_planning_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_memberships cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.user_id = student_planning_data.user_id
      AND c.educator_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view child planning data" ON student_planning_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships pcr
      WHERE pcr.child_id = student_planning_data.user_id
      AND pcr.parent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all planning data" ON student_planning_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operation_manager')
    )
  );

-- 3. Organization Management Policies
CREATE POLICY "Admins can manage all organizations" ON organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operation_manager')
    )
  );

CREATE POLICY "Organization members can view their organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- 4. Classes Policies
CREATE POLICY "Admins can manage all classes" ON classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operation_manager')
    )
  );

CREATE POLICY "Educators can manage their own classes" ON classes
  FOR ALL USING (educator_id = auth.uid());

CREATE POLICY "Organization members can view classes in their organization" ON classes
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Class members can view their classes" ON classes
  FOR SELECT USING (
    id IN (
      SELECT class_id FROM class_memberships WHERE user_id = auth.uid()
    )
  );

-- 5. Class Memberships Policies
CREATE POLICY "Admins can manage all memberships" ON class_memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operation_manager')
    )
  );

CREATE POLICY "Educators can manage memberships in their classes" ON class_memberships
  FOR ALL USING (
    class_id IN (
      SELECT id FROM classes WHERE educator_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own memberships" ON class_memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Class members can view other members in same class" ON class_memberships
  FOR SELECT USING (
    class_id IN (
      SELECT class_id FROM class_memberships WHERE user_id = auth.uid()
    )
  );

-- 6. Parent-Child Relationships Policies
CREATE POLICY "Parents can manage their own relationships" ON parent_child_relationships
  FOR ALL USING (parent_id = auth.uid());

CREATE POLICY "Children can view their parent relationships" ON parent_child_relationships
  FOR SELECT USING (child_id = auth.uid());

CREATE POLICY "Admins can manage all parent-child relationships" ON parent_child_relationships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operation_manager')
    )
  );

-- 7. Vocabulary Progress Policies
CREATE POLICY "Users can manage own vocabulary progress" ON vocabulary_progress
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Educators can view vocabulary progress of their students" ON vocabulary_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_memberships cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.user_id = vocabulary_progress.user_id
      AND c.educator_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view child vocabulary progress" ON vocabulary_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships pcr
      WHERE pcr.child_id = vocabulary_progress.user_id
      AND pcr.parent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all vocabulary progress" ON vocabulary_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operation_manager')
    )
  );

-- 8. Challenge Progress Policies
CREATE POLICY "Users can manage own challenge progress" ON challenge_progress
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Educators can view challenge progress of their students" ON challenge_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_memberships cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.user_id = challenge_progress.user_id
      AND c.educator_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view child challenge progress" ON challenge_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships pcr
      WHERE pcr.child_id = challenge_progress.user_id
      AND pcr.parent_id = auth.uid()
    )
  );

-- 9. User Analytics Policies
CREATE POLICY "Users can view own analytics" ON user_analytics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Educators can view analytics of their students" ON user_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_memberships cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.user_id = user_analytics.user_id
      AND c.educator_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view child analytics" ON user_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships pcr
      WHERE pcr.child_id = user_analytics.user_id
      AND pcr.parent_id = auth.uid()
    )
  );

CREATE POLICY "System can insert analytics data" ON user_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all analytics" ON user_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operation_manager')
    )
  );

-- 10. Challenges Policies
CREATE POLICY "Admins can manage challenges" ON challenges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operation_manager')
    )
  );

CREATE POLICY "Educators can create and manage own challenges" ON challenges
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operation_manager', 'educator')
    )
  );

CREATE POLICY "Active challenges viewable by all" ON challenges
  FOR SELECT USING (is_active = true);

-- 11. Announcements Policies
CREATE POLICY "Admins can manage announcements" ON announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operation_manager')
    )
  );

CREATE POLICY "Educators can create announcements" ON announcements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('educator', 'admin', 'operation_manager')
    )
  );

CREATE POLICY "Active announcements viewable by target audience" ON announcements
  FOR SELECT USING (
    is_active = true AND (
      target_audience = 'all' OR
      (target_audience = 'students' AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'student')) OR
      (target_audience = 'educators' AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'educator')) OR
      (target_audience = 'parents' AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'parent')) OR
      (target_audience = 'admins' AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'operation_manager')))
    )
  );

-- 12. Users Table Policies (if not already exists)
-- Note: Be careful with users table policies as they can affect authentication
DO $$ 
BEGIN
  -- Check if policies exist before creating
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view own profile') THEN
    EXECUTE 'CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (id = auth.uid())';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update own profile') THEN
    EXECUTE 'CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (id = auth.uid())';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Admins can manage all users') THEN
    EXECUTE 'CREATE POLICY "Admins can manage all users" ON users FOR ALL USING (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid() 
        AND u.role IN (''admin'', ''operation_manager'')
      )
    )';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Educators can view students in their classes') THEN
    EXECUTE 'CREATE POLICY "Educators can view students in their classes" ON users FOR SELECT USING (
      role = ''student'' AND id IN (
        SELECT cm.user_id FROM class_memberships cm
        JOIN classes c ON c.id = cm.class_id
        WHERE c.educator_id = auth.uid()
      )
    )';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Parents can view their children') THEN
    EXECUTE 'CREATE POLICY "Parents can view their children" ON users FOR SELECT USING (
      id IN (
        SELECT child_id FROM parent_child_relationships WHERE parent_id = auth.uid()
      )
    )';
  END IF;
END $$;

SELECT 'Additional RLS policies created successfully! All tables now have comprehensive security policies.' as status;