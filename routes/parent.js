// Parent-specific API Routes
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Ensure user is a parent
const requireParent = (req, res, next) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ error: 'Access denied. Parent role required.' });
  }
  next();
};

// Apply authentication and parent role check to all routes
router.use(authenticateToken);
router.use(requireParent);

// ===============================
// PARENT DASHBOARD DATA
// ===============================

// Get comprehensive parent dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const parentId = req.user.id;
    
    // Get all children linked to this parent
    const { data: children, error: childrenError } = await req.supabase
      .from('parent_child_relationships')
      .select(`
        child_id,
        users!parent_child_relationships_child_id_fkey(
          id, name, email, created_at,
          user_progress(
            completed_at, comprehension_score, reading_time
          ),
          user_analytics(
            date, reading_time, passages_read, quiz_score
          )
        )
      `)
      .eq('parent_id', parentId)
      .eq('is_active', true);

    if (childrenError) {
      console.error('Error fetching children:', childrenError);
      return res.status(500).json({ error: 'Failed to fetch children data' });
    }

    // Process children data with enhanced analytics
    const processedChildren = await Promise.all(
      (children || []).map(async (relationship) => {
        const child = relationship.users;
        
        // Calculate comprehensive stats
        const totalReadingTime = child.user_analytics?.reduce((sum, day) => 
          sum + (day.reading_time || 0), 0) || 0;
        
        const averageScore = child.user_progress?.length > 0
          ? child.user_progress.reduce((sum, p) => sum + (p.comprehension_score || 0), 0) / child.user_progress.length
          : 0;

        const streak = calculateStreak(child.user_analytics || []);
        
        // Get recent activity
        const recentActivity = child.user_progress?.slice(-5).map(progress => ({
          type: 'reading',
          subject: 'Reading Comprehension',
          score: progress.comprehension_score || 0,
          date: progress.completed_at
        })) || [];

        return {
          id: child.id,
          name: child.name,
          email: child.email,
          created_at: child.created_at,
          stats: {
            total_reading_time: totalReadingTime,
            average_score: Math.round(averageScore),
            passages_completed: child.user_progress?.length || 0,
            streak: streak
          },
          recent_activity: recentActivity
        };
      })
    );

    // Calculate overall family stats
    const overallStats = {
      combined_reading_time: processedChildren.reduce((sum, child) => 
        sum + child.stats.total_reading_time, 0),
      average_family_score: processedChildren.length > 0
        ? Math.round(processedChildren.reduce((sum, child) => 
            sum + child.stats.average_score, 0) / processedChildren.length)
        : 0,
      total_passages: processedChildren.reduce((sum, child) => 
        sum + child.stats.passages_completed, 0)
    };

    res.json({
      children: processedChildren,
      overall_stats: overallStats,
      family_size: processedChildren.length
    });

  } catch (error) {
    console.error('Error fetching parent dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===============================
// CHILD MANAGEMENT
// ===============================

// Add/Link a child to parent account
router.post('/children', async (req, res) => {
  try {
    const parentId = req.user.id;
    const { email, name, grade, school, age } = req.body;

    // Validate required fields
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    // Check if child user exists
    const { data: existingUser } = await req.supabase
      .from('users')
      .select('id, role')
      .eq('email', email)
      .single();

    let childId;

    if (existingUser) {
      // User exists, check if they're a student
      if (existingUser.role !== 'student') {
        return res.status(400).json({ error: 'User exists but is not a student' });
      }
      childId = existingUser.id;
    } else {
      // Create new student user
      const { data: newUser, error: userError } = await req.supabase
        .from('users')
        .insert({
          email,
          name,
          role: 'student',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) {
        console.error('Error creating user:', userError);
        return res.status(500).json({ error: 'Failed to create student account' });
      }
      childId = newUser.id;
    }

    // Check if relationship already exists
    const { data: existingRelation } = await req.supabase
      .from('parent_child_relationships')
      .select('id')
      .eq('parent_id', parentId)
      .eq('child_id', childId)
      .single();

    if (existingRelation) {
      return res.status(400).json({ error: 'Child is already linked to your account' });
    }

    // Create parent-child relationship
    const { data: relationship, error: relationError } = await req.supabase
      .from('parent_child_relationships')
      .insert({
        parent_id: parentId,
        child_id: childId,
        relationship_type: 'parent',
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (relationError) {
      console.error('Error creating relationship:', relationError);
      return res.status(500).json({ error: 'Failed to link child to account' });
    }

    // Store additional child metadata if provided
    if (grade || school || age) {
      await req.supabase
        .from('student_metadata')
        .upsert({
          student_id: childId,
          grade,
          school,
          age,
          updated_at: new Date().toISOString()
        });
    }

    // Send notification to child (if they have an account)
    await req.supabase
      .from('notifications')
      .insert({
        user_id: childId,
        type: 'parent_link',
        title: 'Parent Account Linked',
        message: `Your account has been linked to ${req.user.name}'s parent account`,
        data: { parent_id: parentId },
        created_at: new Date().toISOString()
      });

    res.json({
      success: true,
      relationship: relationship,
      message: 'Child successfully linked to your account'
    });

  } catch (error) {
    console.error('Error adding child:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get detailed child information
router.get('/children/:childId', async (req, res) => {
  try {
    const parentId = req.user.id;
    const childId = req.params.childId;

    // Verify parent has access to this child
    const { data: relationship } = await req.supabase
      .from('parent_child_relationships')
      .select('id')
      .eq('parent_id', parentId)
      .eq('child_id', childId)
      .eq('is_active', true)
      .single();

    if (!relationship) {
      return res.status(403).json({ error: 'Access denied to this child' });
    }

    // Get comprehensive child data
    const [
      childInfo,
      progress,
      analytics,
      assignments,
      attendance,
      metadata
    ] = await Promise.all([
      // Basic child info
      req.supabase
        .from('users')
        .select('id, name, email, created_at, last_sign_in_at')
        .eq('id', childId)
        .single(),
      
      // Progress data
      req.supabase
        .from('user_progress')
        .select('*, reading_passages(title, type, difficulty)')
        .eq('user_id', childId)
        .order('completed_at', { ascending: false })
        .limit(50),
      
      // Analytics
      req.supabase
        .from('user_analytics')
        .select('*')
        .eq('user_id', childId)
        .order('date', { ascending: false })
        .limit(90),
      
      // Assignment submissions
      req.supabase
        .from('assignment_submissions')
        .select('*, assignments(title, subject, total_marks)')
        .eq('student_id', childId)
        .order('submitted_at', { ascending: false })
        .limit(20),
      
      // Attendance records
      req.supabase
        .from('attendance')
        .select('*, classes(name, subject)')
        .eq('student_id', childId)
        .order('date', { ascending: false })
        .limit(60),

      // Student metadata
      req.supabase
        .from('student_metadata')
        .select('*')
        .eq('student_id', childId)
        .single()
    ]);

    if (childInfo.error || !childInfo.data) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Calculate detailed statistics
    const totalStudyTime = analytics.data?.reduce((sum, day) => sum + (day.reading_time || 0), 0) || 0;
    const avgQuizScore = progress.data?.length > 0
      ? progress.data.reduce((sum, p) => sum + (p.comprehension_score || 0), 0) / progress.data.length
      : 0;
    const attendanceRate = attendance.data?.length > 0
      ? (attendance.data.filter(a => a.status === 'present').length / attendance.data.length) * 100
      : 0;
    const streak = calculateStreak(analytics.data || []);

    res.json({
      child: {
        ...childInfo.data,
        metadata: metadata.data,
        statistics: {
          totalStudyTime,
          averageScore: Math.round(avgQuizScore),
          attendanceRate: Math.round(attendanceRate),
          completedAssignments: assignments.data?.filter(a => a.status === 'submitted').length || 0,
          totalProgress: progress.data?.length || 0,
          streak
        }
      },
      progress: progress.data || [],
      analytics: analytics.data || [],
      assignments: assignments.data || [],
      attendance: attendance.data || []
    });

  } catch (error) {
    console.error('Error fetching child details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update child metadata
router.put('/children/:childId', async (req, res) => {
  try {
    const parentId = req.user.id;
    const childId = req.params.childId;
    const { grade, school, age, parentNotes } = req.body;

    // Verify parent has access to this child
    const { data: relationship } = await req.supabase
      .from('parent_child_relationships')
      .select('id')
      .eq('parent_id', parentId)
      .eq('child_id', childId)
      .eq('is_active', true)
      .single();

    if (!relationship) {
      return res.status(403).json({ error: 'Access denied to this child' });
    }

    // Update student metadata
    const { data: metadata, error } = await req.supabase
      .from('student_metadata')
      .upsert({
        student_id: childId,
        grade,
        school,
        age,
        parent_notes: parentNotes,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating child metadata:', error);
      return res.status(500).json({ error: 'Failed to update child information' });
    }

    res.json({
      success: true,
      metadata: metadata,
      message: 'Child information updated successfully'
    });

  } catch (error) {
    console.error('Error updating child:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===============================
// MESSAGING SYSTEM
// ===============================

// Send message to educator/admin
router.post('/messages', async (req, res) => {
  try {
    const parentId = req.user.id;
    const { to, childId, subject, message, priority = 'normal' } = req.body;

    // Validate required fields
    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let recipientId;

    // Determine recipient based on 'to' field
    if (to === 'educator' && childId) {
      // Find child's educator
      const { data: childClasses } = await req.supabase
        .from('class_memberships')
        .select('class_id, classes(educator_id)')
        .eq('user_id', childId)
        .eq('role', 'student')
        .eq('is_active', true);

      if (!childClasses || childClasses.length === 0) {
        return res.status(404).json({ error: 'No educator found for this child' });
      }

      recipientId = childClasses[0].classes.educator_id;
    } else if (to === 'admin') {
      // Find admin user
      const { data: admin } = await req.supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (!admin) {
        return res.status(404).json({ error: 'No admin found' });
      }

      recipientId = admin.id;
    } else if (to === 'support') {
      // Create support ticket instead of direct message
      const { data: ticket, error: ticketError } = await req.supabase
        .from('support_tickets')
        .insert({
          user_id: parentId,
          subject,
          message,
          priority,
          status: 'open',
          category: 'parent_inquiry',
          child_id: childId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (ticketError) {
        return res.status(500).json({ error: 'Failed to create support ticket' });
      }

      return res.json({
        success: true,
        ticket: ticket,
        message: 'Support ticket created successfully'
      });
    } else {
      return res.status(400).json({ error: 'Invalid recipient' });
    }

    // Create message
    const { data: sentMessage, error } = await req.supabase
      .from('messages')
      .insert({
        sender_id: parentId,
        recipient_id: recipientId,
        subject,
        message,
        priority,
        type: 'parent_inquiry',
        child_id: childId,
        status: 'unread',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    // Create notification
    await req.supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        type: 'message',
        title: 'New Message from Parent',
        message: `New message from ${req.user.name}: ${subject}`,
        data: { message_id: sentMessage.id, from_parent: true },
        created_at: new Date().toISOString()
      });

    res.json({
      success: true,
      message: sentMessage,
      message_sent: 'Message sent successfully'
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get parent messages
router.get('/messages', async (req, res) => {
  try {
    const parentId = req.user.id;
    const { type = 'all', status, limit = 50, offset = 0 } = req.query;

    let query = req.supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, name, email, role),
        recipient:users!messages_recipient_id_fkey(id, name, email, role),
        child:users!messages_child_id_fkey(id, name)
      `);

    // Filter by type
    if (type === 'inbox') {
      query = query.eq('recipient_id', parentId);
    } else if (type === 'outbox') {
      query = query.eq('sender_id', parentId);
    } else {
      query = query.or(`sender_id.eq.${parentId},recipient_id.eq.${parentId}`);
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: messages, error, count } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    res.json({
      messages: messages || [],
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===============================
// REPORTS & ANALYTICS
// ===============================

// Generate and export child reports
router.get('/reports/:childId/:reportType', async (req, res) => {
  try {
    const parentId = req.user.id;
    const { childId, reportType } = req.params;
    const { format = 'pdf', dateFrom, dateTo } = req.query;

    // Verify parent has access to this child
    const { data: relationship } = await req.supabase
      .from('parent_child_relationships')
      .select('id')
      .eq('parent_id', parentId)
      .eq('child_id', childId)
      .eq('is_active', true)
      .single();

    if (!relationship) {
      return res.status(403).json({ error: 'Access denied to this child' });
    }

    // Get child information
    const { data: child } = await req.supabase
      .from('users')
      .select('name, email')
      .eq('id', childId)
      .single();

    let reportData;
    let filename;

    // Generate different types of reports
    switch (reportType) {
      case 'performance':
        const { data: progressData } = await req.supabase
          .from('user_progress')
          .select('*, reading_passages(title, type, difficulty)')
          .eq('user_id', childId)
          .order('completed_at', { ascending: false });

        reportData = {
          child: child,
          type: 'Performance Report',
          data: progressData || [],
          generated_at: new Date().toISOString()
        };
        filename = `${child.name}-performance-report`;
        break;

      case 'analytics':
        const { data: analyticsData } = await req.supabase
          .from('user_analytics')
          .select('*')
          .eq('user_id', childId)
          .order('date', { ascending: false });

        reportData = {
          child: child,
          type: 'Analytics Report',
          data: analyticsData || [],
          generated_at: new Date().toISOString()
        };
        filename = `${child.name}-analytics-report`;
        break;

      case 'monthly':
        // Comprehensive monthly report
        const [progress, analytics, assignments] = await Promise.all([
          req.supabase
            .from('user_progress')
            .select('*, reading_passages(title, type)')
            .eq('user_id', childId)
            .gte('completed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
          
          req.supabase
            .from('user_analytics')
            .select('*')
            .eq('user_id', childId)
            .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
          
          req.supabase
            .from('assignment_submissions')
            .select('*, assignments(title, subject)')
            .eq('student_id', childId)
            .gte('submitted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        ]);

        reportData = {
          child: child,
          type: 'Monthly Report',
          period: 'Last 30 days',
          progress: progress.data || [],
          analytics: analytics.data || [],
          assignments: assignments.data || [],
          generated_at: new Date().toISOString()
        };
        filename = `${child.name}-monthly-report`;
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Apply date filters if provided
    if (dateFrom || dateTo) {
      if (reportData.data) {
        reportData.data = reportData.data.filter(item => {
          const itemDate = new Date(item.completed_at || item.date || item.submitted_at);
          if (dateFrom && itemDate < new Date(dateFrom)) return false;
          if (dateTo && itemDate > new Date(dateTo)) return false;
          return true;
        });
      }
    }

    // Generate report based on format
    if (format === 'pdf') {
      // In a real implementation, you would generate a PDF here
      // For now, return JSON with instructions
      res.json({
        message: 'PDF generation would be implemented here',
        reportData,
        filename: `${filename}.pdf`
      });
    } else if (format === 'xlsx') {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report');
      
      // Convert data to Excel format
      let worksheetData;
      if (reportData.data) {
        worksheetData = reportData.data.map(item => ({
          'Date': new Date(item.completed_at || item.date || item.submitted_at).toLocaleDateString(),
          'Activity': item.reading_passages?.title || item.assignments?.title || 'Study Session',
          'Score': item.comprehension_score || item.quiz_score || item.score || 'N/A',
          'Time Spent': item.reading_time ? `${item.reading_time} minutes` : 'N/A'
        }));
      } else {
        worksheetData = [{ 'Report': 'No data available for selected period' }];
      }

      // Add headers
      if (worksheetData.length > 0) {
        const headers = Object.keys(worksheetData[0]);
        worksheet.addRow(headers);
        
        // Add data rows
        worksheetData.forEach(row => {
          worksheet.addRow(Object.values(row));
        });
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.send(buffer);
    } else {
      res.json(reportData);
    }

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===============================
// PAYMENT & SUBSCRIPTION
// ===============================

// Get payment history
router.get('/payments', async (req, res) => {
  try {
    const parentId = req.user.id;
    
    const { data: payments, error } = await req.supabase
      .from('payments')
      .select('*')
      .eq('user_id', parentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
      return res.status(500).json({ error: 'Failed to fetch payment history' });
    }

    res.json({
      payments: payments || [],
      total: payments?.length || 0
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===============================
// HELPER FUNCTIONS
// ===============================

// Calculate reading streak
function calculateStreak(analytics) {
  if (!analytics || analytics.length === 0) return 0;
  
  const sortedDays = analytics.sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  
  for (const day of sortedDays) {
    if (day.passages_read > 0 || day.reading_time > 0) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

module.exports = router;