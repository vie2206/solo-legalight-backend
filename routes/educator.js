// Educator-specific API Routes
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Ensure user is an educator
const requireEducator = (req, res, next) => {
  if (req.user.role !== 'educator') {
    return res.status(403).json({ error: 'Access denied. Educator role required.' });
  }
  next();
};

// Apply authentication and educator role check to all routes
router.use(authenticateToken);
router.use(requireEducator);

// ===============================
// ASSIGNMENT MANAGEMENT
// ===============================

// Create new assignment
router.post('/assignments', async (req, res) => {
  try {
    const educatorId = req.user.id;
    const {
      title,
      description,
      subject,
      type,
      dueDate,
      totalMarks,
      timeLimit,
      classId,
      instructions,
      resources
    } = req.body;

    // Validate required fields
    if (!title || !subject || !type || !dueDate || !totalMarks) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create assignment
    const { data: assignment, error } = await req.supabase
      .from('assignments')
      .insert({
        title,
        description,
        subject,
        type,
        due_date: dueDate,
        total_marks: totalMarks,
        time_limit: timeLimit,
        class_id: classId,
        educator_id: educatorId,
        instructions,
        resources: resources || [],
        status: 'published',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating assignment:', error);
      return res.status(500).json({ error: 'Failed to create assignment' });
    }

    // If classId provided, notify students in that class
    if (classId) {
      const { data: classMembers } = await req.supabase
        .from('class_memberships')
        .select('user_id')
        .eq('class_id', classId)
        .eq('role', 'student')
        .eq('is_active', true);

      if (classMembers && classMembers.length > 0) {
        // Create notifications for students
        const notifications = classMembers.map(member => ({
          user_id: member.user_id,
          type: 'assignment',
          title: 'New Assignment',
          message: `New assignment: ${title}`,
          data: { assignment_id: assignment.id },
          created_at: new Date().toISOString()
        }));

        await req.supabase
          .from('notifications')
          .insert(notifications);
      }
    }

    res.json({
      success: true,
      assignment: assignment,
      message: 'Assignment created successfully'
    });
  } catch (error) {
    console.error('Error in assignment creation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update assignment
router.put('/assignments/:id', async (req, res) => {
  try {
    const educatorId = req.user.id;
    const assignmentId = req.params.id;
    const updates = req.body;

    // Verify educator owns this assignment
    const { data: existing } = await req.supabase
      .from('assignments')
      .select('educator_id')
      .eq('id', assignmentId)
      .single();

    if (!existing || existing.educator_id !== educatorId) {
      return res.status(403).json({ error: 'Unauthorized to update this assignment' });
    }

    // Update assignment
    const { data: assignment, error } = await req.supabase
      .from('assignments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating assignment:', error);
      return res.status(500).json({ error: 'Failed to update assignment' });
    }

    res.json({
      success: true,
      assignment: assignment,
      message: 'Assignment updated successfully'
    });
  } catch (error) {
    console.error('Error in assignment update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete assignment
router.delete('/assignments/:id', async (req, res) => {
  try {
    const educatorId = req.user.id;
    const assignmentId = req.params.id;

    // Verify educator owns this assignment
    const { data: existing } = await req.supabase
      .from('assignments')
      .select('educator_id')
      .eq('id', assignmentId)
      .single();

    if (!existing || existing.educator_id !== educatorId) {
      return res.status(403).json({ error: 'Unauthorized to delete this assignment' });
    }

    // Delete assignment
    const { error } = await req.supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('Error deleting assignment:', error);
      return res.status(500).json({ error: 'Failed to delete assignment' });
    }

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error('Error in assignment deletion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===============================
// MESSAGING SYSTEM
// ===============================

// Send message to student(s)
router.post('/messages', async (req, res) => {
  try {
    const educatorId = req.user.id;
    const {
      recipientId,
      recipientIds, // For bulk messages
      subject,
      message,
      priority = 'normal',
      type = 'direct'
    } = req.body;

    // Validate required fields
    if (!subject || !message || (!recipientId && !recipientIds)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Determine recipients
    const recipients = recipientIds || [recipientId];

    // Verify educator has access to these students
    const { data: validStudents } = await req.supabase
      .from('class_memberships')
      .select('user_id')
      .in('user_id', recipients)
      .eq('role', 'student')
      .in('class_id', 
        req.supabase
          .from('classes')
          .select('id')
          .eq('educator_id', educatorId)
      );

    if (!validStudents || validStudents.length === 0) {
      return res.status(403).json({ error: 'No valid recipients found' });
    }

    // Create messages
    const messages = validStudents.map(student => ({
      sender_id: educatorId,
      recipient_id: student.user_id,
      subject,
      message,
      priority,
      type,
      status: 'unread',
      created_at: new Date().toISOString()
    }));

    const { data: sentMessages, error } = await req.supabase
      .from('messages')
      .insert(messages)
      .select();

    if (error) {
      console.error('Error sending messages:', error);
      return res.status(500).json({ error: 'Failed to send messages' });
    }

    // Create notifications
    const notifications = validStudents.map(student => ({
      user_id: student.user_id,
      type: 'message',
      title: 'New Message',
      message: `New message from educator: ${subject}`,
      data: { message_id: sentMessages[0].id },
      created_at: new Date().toISOString()
    }));

    await req.supabase
      .from('notifications')
      .insert(notifications);

    res.json({
      success: true,
      messagesSent: sentMessages.length,
      message: 'Messages sent successfully'
    });
  } catch (error) {
    console.error('Error in message sending:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages (inbox/outbox)
router.get('/messages', async (req, res) => {
  try {
    const educatorId = req.user.id;
    const { type = 'all', status, limit = 50, offset = 0 } = req.query;

    let query = req.supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, name, email),
        recipient:users!messages_recipient_id_fkey(id, name, email)
      `);

    // Filter by type
    if (type === 'inbox') {
      query = query.eq('recipient_id', educatorId);
    } else if (type === 'outbox') {
      query = query.eq('sender_id', educatorId);
    } else {
      query = query.or(`sender_id.eq.${educatorId},recipient_id.eq.${educatorId}`);
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
      limit,
      offset
    });
  } catch (error) {
    console.error('Error in message fetching:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===============================
// STUDENT MANAGEMENT
// ===============================

// Get individual student details
router.get('/students/:id', async (req, res) => {
  try {
    const educatorId = req.user.id;
    const studentId = req.params.id;

    // Verify educator has access to this student
    const { data: hasAccess } = await req.supabase
      .from('class_memberships')
      .select('class_id')
      .eq('user_id', studentId)
      .eq('role', 'student')
      .in('class_id',
        req.supabase
          .from('classes')
          .select('id')
          .eq('educator_id', educatorId)
      )
      .single();

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this student' });
    }

    // Get comprehensive student data
    const [
      studentInfo,
      progress,
      analytics,
      assignments,
      attendance
    ] = await Promise.all([
      // Basic student info
      req.supabase
        .from('users')
        .select('id, name, email, phone, created_at, last_sign_in_at')
        .eq('id', studentId)
        .single(),
      
      // Reading progress
      req.supabase
        .from('user_progress')
        .select('*, reading_passages(title, type, difficulty)')
        .eq('user_id', studentId)
        .order('completed_at', { ascending: false })
        .limit(20),
      
      // Analytics (last 30 days)
      req.supabase
        .from('user_analytics')
        .select('*')
        .eq('user_id', studentId)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false }),
      
      // Assignment submissions
      req.supabase
        .from('assignment_submissions')
        .select('*, assignments(title, subject, total_marks)')
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false })
        .limit(10),
      
      // Attendance records
      req.supabase
        .from('attendance')
        .select('*, classes(name, subject)')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
        .limit(30)
    ]);

    if (studentInfo.error || !studentInfo.data) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Calculate statistics
    const totalStudyTime = analytics.data?.reduce((sum, day) => sum + (day.reading_time || 0), 0) || 0;
    const avgQuizScore = progress.data?.length > 0
      ? progress.data.reduce((sum, p) => sum + (p.comprehension_score || 0), 0) / progress.data.length
      : 0;
    const attendanceRate = attendance.data?.length > 0
      ? (attendance.data.filter(a => a.status === 'present').length / attendance.data.length) * 100
      : 0;

    res.json({
      student: {
        ...studentInfo.data,
        statistics: {
          totalStudyTime,
          averageScore: Math.round(avgQuizScore),
          attendanceRate: Math.round(attendanceRate),
          completedAssignments: assignments.data?.filter(a => a.status === 'submitted').length || 0,
          totalProgress: progress.data?.length || 0
        }
      },
      progress: progress.data || [],
      analytics: analytics.data || [],
      assignments: assignments.data || [],
      attendance: attendance.data || []
    });
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update student information (limited fields)
router.put('/students/:id', async (req, res) => {
  try {
    const educatorId = req.user.id;
    const studentId = req.params.id;
    const { notes, tags, customFields } = req.body;

    // Verify educator has access to this student
    const { data: hasAccess } = await req.supabase
      .from('class_memberships')
      .select('class_id')
      .eq('user_id', studentId)
      .eq('role', 'student')
      .in('class_id',
        req.supabase
          .from('classes')
          .select('id')
          .eq('educator_id', educatorId)
      )
      .single();

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this student' });
    }

    // Update student metadata (educator can only update certain fields)
    const { data: studentMeta, error } = await req.supabase
      .from('student_metadata')
      .upsert({
        student_id: studentId,
        educator_id: educatorId,
        notes,
        tags,
        custom_fields: customFields,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating student metadata:', error);
      return res.status(500).json({ error: 'Failed to update student information' });
    }

    res.json({
      success: true,
      studentMetadata: studentMeta,
      message: 'Student information updated successfully'
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===============================
// DATA EXPORT
// ===============================

// Export data in various formats
router.get('/export/:type', async (req, res) => {
  try {
    const educatorId = req.user.id;
    const exportType = req.params.type;
    const { format = 'xlsx', classId, dateFrom, dateTo } = req.query;

    let data;
    let filename;

    switch (exportType) {
      case 'students':
        // Get all students under this educator
        const { data: students } = await req.supabase
          .from('class_memberships')
          .select(`
            user_id,
            users!class_memberships_user_id_fkey(id, name, email, phone, created_at),
            classes!class_memberships_class_id_fkey(id, name)
          `)
          .eq('role', 'student')
          .in('class_id',
            req.supabase
              .from('classes')
              .select('id')
              .eq('educator_id', educatorId)
          );
        
        data = students?.map(s => ({
          'Student ID': s.user_id,
          'Name': s.users.name,
          'Email': s.users.email,
          'Phone': s.users.phone || 'N/A',
          'Class': s.classes.name,
          'Joined Date': new Date(s.users.created_at).toLocaleDateString()
        })) || [];
        
        filename = `students-export-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'grades':
        // Get grades/scores
        const { data: grades } = await req.supabase
          .from('assignment_submissions')
          .select(`
            *,
            assignments(title, subject, total_marks),
            users!assignment_submissions_student_id_fkey(name, email)
          `)
          .in('assignment_id',
            req.supabase
              .from('assignments')
              .select('id')
              .eq('educator_id', educatorId)
          );
        
        data = grades?.map(g => ({
          'Student': g.users.name,
          'Email': g.users.email,
          'Assignment': g.assignments.title,
          'Subject': g.assignments.subject,
          'Score': g.score || 'Not graded',
          'Total Marks': g.assignments.total_marks,
          'Percentage': g.score ? `${Math.round((g.score / g.assignments.total_marks) * 100)}%` : 'N/A',
          'Submitted': new Date(g.submitted_at).toLocaleDateString(),
          'Status': g.status
        })) || [];
        
        filename = `grades-export-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'attendance':
        // Get attendance records
        const { data: attendance } = await req.supabase
          .from('attendance')
          .select(`
            *,
            users!attendance_student_id_fkey(name, email),
            classes(name, subject)
          `)
          .in('class_id',
            req.supabase
              .from('classes')
              .select('id')
              .eq('educator_id', educatorId)
          );
        
        data = attendance?.map(a => ({
          'Student': a.users.name,
          'Email': a.users.email,
          'Class': a.classes.name,
          'Date': new Date(a.date).toLocaleDateString(),
          'Status': a.status.charAt(0).toUpperCase() + a.status.slice(1),
          'Check-in Time': a.check_in_time || 'N/A',
          'Notes': a.notes || ''
        })) || [];
        
        filename = `attendance-export-${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    // Apply date filters if provided
    if (dateFrom || dateTo) {
      data = data.filter(item => {
        const itemDate = new Date(item['Date'] || item['Submitted'] || item['Joined Date']);
        if (dateFrom && itemDate < new Date(dateFrom)) return false;
        if (dateTo && itemDate > new Date(dateTo)) return false;
        return true;
      });
    }

    // Generate export based on format
    if (format === 'xlsx') {
      const XLSX = require('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.send(buffer);
    } else if (format === 'csv') {
      const csv = require('csv-stringify/sync');
      const output = csv.stringify(data, { header: true });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(output);
    } else {
      res.json({ data, filename });
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===============================
// GRADING SYSTEM
// ===============================

// Submit grades for assignment
router.post('/grades', async (req, res) => {
  try {
    const educatorId = req.user.id;
    const { submissionId, score, feedback, rubricScores } = req.body;

    // Validate required fields
    if (!submissionId || score === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify educator owns the assignment
    const { data: submission } = await req.supabase
      .from('assignment_submissions')
      .select(`
        *,
        assignments!assignment_submissions_assignment_id_fkey(educator_id, total_marks)
      `)
      .eq('id', submissionId)
      .single();

    if (!submission || submission.assignments.educator_id !== educatorId) {
      return res.status(403).json({ error: 'Unauthorized to grade this submission' });
    }

    // Validate score
    if (score < 0 || score > submission.assignments.total_marks) {
      return res.status(400).json({ error: 'Invalid score value' });
    }

    // Update submission with grade
    const { data: graded, error } = await req.supabase
      .from('assignment_submissions')
      .update({
        score,
        feedback,
        rubric_scores: rubricScores,
        graded_by: educatorId,
        graded_at: new Date().toISOString(),
        status: 'graded'
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (error) {
      console.error('Error submitting grade:', error);
      return res.status(500).json({ error: 'Failed to submit grade' });
    }

    // Notify student
    await req.supabase
      .from('notifications')
      .insert({
        user_id: submission.student_id,
        type: 'grade',
        title: 'Assignment Graded',
        message: `Your assignment has been graded: ${score}/${submission.assignments.total_marks}`,
        data: { submission_id: submissionId },
        created_at: new Date().toISOString()
      });

    res.json({
      success: true,
      submission: graded,
      message: 'Grade submitted successfully'
    });
  } catch (error) {
    console.error('Error in grade submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to calculate reading streak
function calculateReadingStreak(analytics) {
  if (!analytics || analytics.length === 0) return 0;
  
  const sortedDays = analytics.sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  
  for (const day of sortedDays) {
    if (day.passages_read > 0) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

module.exports = router;