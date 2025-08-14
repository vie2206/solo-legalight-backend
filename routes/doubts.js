const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Authentication middleware
const { authenticateToken } = require('../middleware/auth');

// Helper function to send notifications
async function sendNotification(userId, doubtId, type, title, message, metadata = {}) {
  try {
    await supabase
      .from('doubt_notifications')
      .insert({
        doubt_id: doubtId,
        user_id: userId,
        notification_type: type,
        title,
        message,
        metadata
      });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

// Helper function to log activity
async function logActivity(doubtId, userId, activityType, description, oldValues = null, newValues = null, metadata = {}) {
  try {
    await supabase
      .from('doubt_activity_log')
      .insert({
        doubt_id: doubtId,
        user_id: userId,
        activity_type: activityType,
        activity_description: description,
        old_values: oldValues,
        new_values: newValues,
        metadata
      });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// GET /api/doubts - Get doubts with filtering and pagination
router.get('/', 
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['open', 'assigned', 'in_progress', 'resolved', 'closed']),
    query('subject').optional().isLength({ min: 1, max: 100 }),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    query('student_id').optional().isUUID(),
    query('educator_id').optional().isUUID(),
    query('search').optional().isLength({ min: 1, max: 255 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid parameters', details: errors.array() });
      }

      const {
        page = 1,
        limit = 20,
        status,
        subject,
        priority,
        student_id,
        educator_id,
        search
      } = req.query;

      let query = supabase
        .from('doubts')
        .select(`
          *,
          student:student_id(id, name, email),
          assigned_educator:assigned_educator_id(id, name, email),
          responses:doubt_responses(count),
          rating:doubt_ratings(rating, feedback)
        `)
        .order('created_at', { ascending: false });

      // Apply filters based on user role and access
      if (req.user.role === 'student') {
        query = query.eq('student_id', req.user.id);
      } else if (req.user.role === 'educator') {
        query = query.or(`assigned_educator_id.eq.${req.user.id},student_id.eq.${req.user.id}`);
      } else if (req.user.role === 'parent') {
        // Get children IDs for parent
        const { data: children } = await supabase
          .from('parent_student_relationships')
          .select('student_id')
          .eq('parent_id', req.user.id);
        
        const childrenIds = children?.map(c => c.student_id) || [];
        if (childrenIds.length > 0) {
          query = query.in('student_id', childrenIds);
        } else {
          return res.json({ doubts: [], total: 0, page: 1, totalPages: 0 });
        }
      }
      // Admin and operation_manager can see all doubts (no additional filter)

      // Apply optional filters
      if (status) query = query.eq('status', status);
      if (subject) query = query.eq('subject', subject);
      if (priority) query = query.eq('priority', priority);
      if (student_id && ['admin', 'operation_manager', 'educator'].includes(req.user.role)) {
        query = query.eq('student_id', student_id);
      }
      if (educator_id && ['admin', 'operation_manager'].includes(req.user.role)) {
        query = query.eq('assigned_educator_id', educator_id);
      }
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      // Get total count
      const { count: totalCount } = await supabase
        .from('doubts')
        .select('*', { count: 'exact', head: true })
        .match(query.match || {});

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: doubts, error } = await query;

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: 'Failed to fetch doubts' });
      }

      const totalPages = Math.ceil((totalCount || 0) / limit);

      res.json({
        doubts: doubts || [],
        total: totalCount || 0,
        page: parseInt(page),
        totalPages,
        limit: parseInt(limit)
      });

    } catch (error) {
      console.error('Error fetching doubts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/doubts/:id - Get specific doubt with responses
router.get('/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Get doubt with all related data
      const { data: doubt, error } = await supabase
        .from('doubts')
        .select(`
          *,
          student:student_id(id, name, email, profile_picture),
          assigned_educator:assigned_educator_id(id, name, email, profile_picture),
          responses:doubt_responses(
            *,
            author:author_id(id, name, email, profile_picture)
          ),
          ratings:doubt_ratings(*)
        `)
        .eq('id', id)
        .single();

      if (error || !doubt) {
        return res.status(404).json({ error: 'Doubt not found' });
      }

      // Check access permissions
      const hasAccess = 
        doubt.student_id === req.user.id ||
        doubt.assigned_educator_id === req.user.id ||
        ['admin', 'operation_manager'].includes(req.user.role) ||
        (req.user.role === 'parent' && await checkParentAccess(req.user.id, doubt.student_id));

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Sort responses by creation date
      if (doubt.responses) {
        doubt.responses.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      }

      res.json({ doubt });

    } catch (error) {
      console.error('Error fetching doubt:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/doubts - Create new doubt
router.post('/',
  authenticateToken,
  [
    body('title').isLength({ min: 5, max: 255 }).trim(),
    body('description').isLength({ min: 10, max: 5000 }).trim(),
    body('subject').isLength({ min: 1, max: 100 }).trim(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('type').isIn(['concept', 'problem', 'homework', 'exam_prep', 'other']),
    body('tags').optional().isArray(),
    body('attachments').optional().isArray(),
    body('difficulty_level').optional().isInt({ min: 1, max: 5 }),
    body('prefer_ai').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input', details: errors.array() });
      }

      // Only students can create doubts
      if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Only students can create doubts' });
      }

      const {
        title,
        description,
        subject,
        priority = 'medium',
        type,
        tags = [],
        attachments = [],
        difficulty_level = 3,
        prefer_ai = false
      } = req.body;

      // Create the doubt
      const { data: doubt, error: doubtError } = await supabase
        .from('doubts')
        .insert({
          title,
          description,
          subject,
          priority,
          type,
          student_id: req.user.id,
          tags,
          attachments,
          difficulty_level
        })
        .select()
        .single();

      if (doubtError) {
        console.error('Error creating doubt:', doubtError);
        return res.status(500).json({ error: 'Failed to create doubt' });
      }

      // Log activity
      await logActivity(
        doubt.id,
        req.user.id,
        'doubt_created',
        `Student created a new doubt: ${title}`,
        null,
        doubt
      );

      // Handle AI response if preferred
      if (prefer_ai) {
        try {
          const aiResponse = await generateAIResponse(doubt);
          if (aiResponse) {
            // Create AI response
            const { data: response } = await supabase
              .from('doubt_responses')
              .insert({
                doubt_id: doubt.id,
                author_id: 'system', // Use system ID for AI responses
                author_type: 'ai',
                content: aiResponse.content,
                ai_generated: true,
                ai_model: aiResponse.model,
                ai_confidence_score: aiResponse.confidence
              })
              .select()
              .single();

            // Update doubt status
            await supabase
              .from('doubts')
              .update({ ai_assisted: true })
              .eq('id', doubt.id);

            doubt.ai_response = response;
          }
        } catch (aiError) {
          console.error('AI response generation failed:', aiError);
          // Continue without AI response
        }
      } else {
        // Auto-assign to best educator
        try {
          await autoAssignEducator(doubt.id, subject);
        } catch (assignError) {
          console.error('Auto-assignment failed:', assignError);
          // Continue without assignment
        }
      }

      res.status(201).json({ 
        message: 'Doubt created successfully',
        doubt 
      });

    } catch (error) {
      console.error('Error creating doubt:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/doubts/:id - Update doubt (status, assignment, etc.)
router.put('/:id',
  authenticateToken,
  [
    body('status').optional().isIn(['open', 'assigned', 'in_progress', 'resolved', 'closed']),
    body('assigned_educator_id').optional().isUUID(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('tags').optional().isArray(),
    body('estimated_time_minutes').optional().isInt({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input', details: errors.array() });
      }

      const { id } = req.params;
      const updates = req.body;

      // Get current doubt
      const { data: currentDoubt, error: fetchError } = await supabase
        .from('doubts')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !currentDoubt) {
        return res.status(404).json({ error: 'Doubt not found' });
      }

      // Check permissions
      const canUpdate = 
        ['admin', 'operation_manager'].includes(req.user.role) ||
        (req.user.role === 'educator' && currentDoubt.assigned_educator_id === req.user.id) ||
        (req.user.role === 'student' && currentDoubt.student_id === req.user.id);

      if (!canUpdate) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Handle status changes
      if (updates.status && updates.status !== currentDoubt.status) {
        if (updates.status === 'resolved') {
          updates.resolved_at = new Date().toISOString();
        } else if (updates.status === 'closed') {
          updates.closed_at = new Date().toISOString();
        }
      }

      // Update the doubt
      const { data: updatedDoubt, error: updateError } = await supabase
        .from('doubts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating doubt:', updateError);
        return res.status(500).json({ error: 'Failed to update doubt' });
      }

      // Log activity
      await logActivity(
        id,
        req.user.id,
        'doubt_updated',
        `Doubt updated by ${req.user.role}`,
        currentDoubt,
        updatedDoubt
      );

      // Send notifications for status changes
      if (updates.status && updates.status !== currentDoubt.status) {
        const notifications = [];
        
        if (updates.status === 'resolved') {
          notifications.push({
            user_id: currentDoubt.student_id,
            type: 'doubt_resolved',
            title: 'Doubt Resolved',
            message: `Your doubt "${currentDoubt.title}" has been resolved.`
          });
        } else if (updates.status === 'in_progress') {
          notifications.push({
            user_id: currentDoubt.student_id,
            type: 'response_added',
            title: 'Educator Started Working',
            message: `An educator is now working on your doubt "${currentDoubt.title}".`
          });
        }

        // Send notifications
        for (const notification of notifications) {
          await sendNotification(
            notification.user_id,
            id,
            notification.type,
            notification.title,
            notification.message
          );
        }
      }

      res.json({
        message: 'Doubt updated successfully',
        doubt: updatedDoubt
      });

    } catch (error) {
      console.error('Error updating doubt:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/doubts/:id/responses - Add response to doubt
router.post('/:id/responses',
  authenticateToken,
  [
    body('content').isLength({ min: 1, max: 10000 }).trim(),
    body('attachments').optional().isArray(),
    body('parent_response_id').optional().isUUID()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input', details: errors.array() });
      }

      const { id: doubtId } = req.params;
      const { content, attachments = [], parent_response_id } = req.body;

      // Check if doubt exists and user has access
      const { data: doubt, error: doubtError } = await supabase
        .from('doubts')
        .select('*')
        .eq('id', doubtId)
        .single();

      if (doubtError || !doubt) {
        return res.status(404).json({ error: 'Doubt not found' });
      }

      // Check access permissions
      const hasAccess = 
        doubt.student_id === req.user.id ||
        doubt.assigned_educator_id === req.user.id ||
        ['admin', 'operation_manager', 'educator'].includes(req.user.role);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Create the response
      const { data: response, error: responseError } = await supabase
        .from('doubt_responses')
        .insert({
          doubt_id: doubtId,
          author_id: req.user.id,
          author_type: req.user.role,
          content,
          attachments,
          parent_response_id
        })
        .select(`
          *,
          author:author_id(id, name, email, profile_picture)
        `)
        .single();

      if (responseError) {
        console.error('Error creating response:', responseError);
        return res.status(500).json({ error: 'Failed to create response' });
      }

      // Update doubt status to in_progress if not already resolved
      if (doubt.status === 'assigned' || doubt.status === 'open') {
        await supabase
          .from('doubts')
          .update({ status: 'in_progress' })
          .eq('id', doubtId);
      }

      // Log activity
      await logActivity(
        doubtId,
        req.user.id,
        'response_added',
        `${req.user.role} added a response`,
        null,
        response
      );

      // Send notification to relevant parties
      const notificationRecipients = [];
      
      if (req.user.id !== doubt.student_id) {
        notificationRecipients.push(doubt.student_id);
      }
      
      if (doubt.assigned_educator_id && req.user.id !== doubt.assigned_educator_id) {
        notificationRecipients.push(doubt.assigned_educator_id);
      }

      for (const recipientId of notificationRecipients) {
        await sendNotification(
          recipientId,
          doubtId,
          'response_added',
          'New Response Added',
          `A new response has been added to your doubt "${doubt.title}".`
        );
      }

      res.status(201).json({
        message: 'Response added successfully',
        response
      });

    } catch (error) {
      console.error('Error creating response:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/doubts/:id/rate - Rate a doubt resolution
router.post('/:id/rate',
  authenticateToken,
  [
    body('rating').isInt({ min: 1, max: 5 }),
    body('feedback').optional().isLength({ max: 1000 }).trim(),
    body('response_quality_rating').optional().isInt({ min: 1, max: 5 }),
    body('response_speed_rating').optional().isInt({ min: 1, max: 5 }),
    body('educator_rating').optional().isInt({ min: 1, max: 5 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid input', details: errors.array() });
      }

      const { id: doubtId } = req.params;
      const {
        rating,
        feedback,
        response_quality_rating,
        response_speed_rating,
        educator_rating
      } = req.body;

      // Check if doubt exists and user is the student who asked it
      const { data: doubt, error: doubtError } = await supabase
        .from('doubts')
        .select('*')
        .eq('id', doubtId)
        .eq('student_id', req.user.id)
        .single();

      if (doubtError || !doubt) {
        return res.status(404).json({ error: 'Doubt not found or access denied' });
      }

      // Only allow rating resolved doubts
      if (doubt.status !== 'resolved') {
        return res.status(400).json({ error: 'Can only rate resolved doubts' });
      }

      // Create or update rating
      const { data: ratingData, error: ratingError } = await supabase
        .from('doubt_ratings')
        .upsert({
          doubt_id: doubtId,
          student_id: req.user.id,
          rating,
          feedback,
          response_quality_rating,
          response_speed_rating,
          educator_rating
        })
        .select()
        .single();

      if (ratingError) {
        console.error('Error creating rating:', ratingError);
        return res.status(500).json({ error: 'Failed to create rating' });
      }

      // Log activity
      await logActivity(
        doubtId,
        req.user.id,
        'rating_added',
        `Student rated the doubt resolution: ${rating}/5`,
        null,
        ratingData
      );

      // Send notification to educator if they exist
      if (doubt.assigned_educator_id) {
        await sendNotification(
          doubt.assigned_educator_id,
          doubtId,
          'rating_added',
          'Doubt Rated',
          `Your resolution of "${doubt.title}" received a ${rating}/5 rating.`
        );
      }

      res.status(201).json({
        message: 'Rating submitted successfully',
        rating: ratingData
      });

    } catch (error) {
      console.error('Error creating rating:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/doubts/analytics/overview - Get system analytics
router.get('/analytics/overview',
  authenticateToken,
  [
    query('period').optional().isIn(['today', 'week', 'month', 'year']),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      // Only admins and operation managers can access analytics
      if (!['admin', 'operation_manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { period = 'week' } = req.query;

      // Calculate date range
      let startDate, endDate = new Date();
      
      switch (period) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate = new Date();
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
      }

      // Get comprehensive analytics
      const [
        totalDoubtsResult,
        resolvedDoubtsResult,
        avgResponseTimeResult,
        avgRatingResult,
        subjectStatsResult,
        educatorStatsResult
      ] = await Promise.all([
        // Total doubts in period
        supabase
          .from('doubts')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        // Resolved doubts
        supabase
          .from('doubts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'resolved')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        // Average response time
        supabase
          .rpc('calculate_avg_response_time', {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
          }),
        
        // Average rating
        supabase
          .from('doubt_ratings')
          .select('rating')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        // Subject-wise stats
        supabase
          .from('doubts')
          .select('subject')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        // Active educators
        supabase
          .from('doubts')
          .select('assigned_educator_id')
          .not('assigned_educator_id', 'is', null)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ]);

      // Process results
      const analytics = {
        overview: {
          total_doubts: totalDoubtsResult.count || 0,
          resolved_doubts: resolvedDoubtsResult.count || 0,
          resolution_rate: totalDoubtsResult.count > 0 
            ? ((resolvedDoubtsResult.count / totalDoubtsResult.count) * 100).toFixed(1)
            : 0,
          average_response_time_minutes: avgResponseTimeResult.data?.[0]?.avg_time || 0,
          average_rating: avgRatingResult.data?.length > 0
            ? (avgRatingResult.data.reduce((sum, r) => sum + r.rating, 0) / avgRatingResult.data.length).toFixed(1)
            : 0
        },
        subject_distribution: {},
        active_educators: new Set(educatorStatsResult.data?.map(d => d.assigned_educator_id).filter(Boolean)).size,
        period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          period_type: period
        }
      };

      // Calculate subject distribution
      if (subjectStatsResult.data) {
        subjectStatsResult.data.forEach(item => {
          analytics.subject_distribution[item.subject] = 
            (analytics.subject_distribution[item.subject] || 0) + 1;
        });
      }

      res.json({ analytics });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Helper functions

async function checkParentAccess(parentId, studentId) {
  const { data } = await supabase
    .from('parent_student_relationships')
    .select('*')
    .eq('parent_id', parentId)
    .eq('student_id', studentId)
    .single();
  
  return !!data;
}

async function autoAssignEducator(doubtId, subject) {
  try {
    // Get best educator suggestions
    const { data: suggestions } = await supabase
      .rpc('suggest_best_educator_for_doubt', {
        doubt_subject: subject
      });

    if (suggestions && suggestions.length > 0) {
      const bestEducator = suggestions[0];
      
      // Assign the doubt
      const { data: assignment } = await supabase
        .rpc('assign_doubt_to_educator', {
          doubt_id: doubtId,
          educator_id: bestEducator.educator_id,
          assigned_by: null // Auto-assignment
        });

      if (assignment) {
        console.log(`Auto-assigned doubt ${doubtId} to educator ${bestEducator.educator_id}`);
      }
    }
  } catch (error) {
    console.error('Auto-assignment failed:', error);
    throw error;
  }
}

async function generateAIResponse(doubt) {
  try {
    const prompt = `You are a CLAT (Common Law Admission Test) tutor helping a law student. 

Student's Question:
Title: ${doubt.title}
Subject: ${doubt.subject}
Description: ${doubt.description}
Difficulty Level: ${doubt.difficulty_level}/5

Please provide a comprehensive, helpful response that:
1. Directly addresses their question
2. Provides clear explanations with examples
3. Includes relevant case laws or legal principles if applicable
4. Suggests additional study resources
5. Is encouraging and supportive

Keep the response educational, accurate, and appropriate for CLAT preparation.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    if (response.content && response.content.length > 0) {
      return {
        content: response.content[0].text,
        model: 'claude-3-sonnet',
        confidence: 0.85 // Default confidence for Claude responses
      };
    }

    return null;
  } catch (error) {
    console.error('AI response generation failed:', error);
    return null;
  }
}

module.exports = router;