const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { query, validationResult } = require('express-validator');

// GET /api/analytics/doubt-overview - Get doubt system analytics overview
router.get('/doubt-overview',
  authenticateToken,
  requireRole(['admin', 'operation_manager']),
  [
    query('period').optional().isIn(['today', 'week', 'month', 'year']),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Invalid parameters', details: errors.array() });
      }

      const { period = 'week', start_date, end_date } = req.query;

      // Calculate date range
      let startDate, endDate = new Date();
      
      if (start_date && end_date) {
        startDate = new Date(start_date);
        endDate = new Date(end_date);
      } else {
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
      }

      // Run analytics queries in parallel
      const [
        totalDoubtsResult,
        resolvedDoubtsResult,
        openDoubtsResult,
        avgResponseTimeResult,
        subjectDistributionResult,
        priorityDistributionResult,
        activeEducatorsResult,
        studentParticipationResult
      ] = await Promise.all([
        // Total doubts in period
        req.supabase
          .from('doubts')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),

        // Resolved doubts
        req.supabase
          .from('doubts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'resolved')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),

        // Open doubts
        req.supabase
          .from('doubts')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'assigned', 'in_progress'])
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),

        // Average response time (using stored procedure if available)
        req.supabase
          .rpc('calculate_avg_response_time', {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
          }).catch(() => ({ data: [{ avg_time: 0 }] })), // Fallback if function doesn't exist

        // Subject distribution
        req.supabase
          .from('doubts')
          .select('subject')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),

        // Priority distribution
        req.supabase
          .from('doubts')
          .select('priority')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),

        // Active educators
        req.supabase
          .from('doubts')
          .select('assigned_educator_id')
          .not('assigned_educator_id', 'is', null)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),

        // Student participation
        req.supabase
          .from('doubts')
          .select('student_id')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ]);

      // Process results
      const totalDoubts = totalDoubtsResult.count || 0;
      const resolvedDoubts = resolvedDoubtsResult.count || 0;
      const openDoubts = openDoubtsResult.count || 0;

      // Calculate metrics
      const resolutionRate = totalDoubts > 0 ? ((resolvedDoubts / totalDoubts) * 100).toFixed(1) : 0;
      const avgResponseTime = avgResponseTimeResult.data?.[0]?.avg_time || 0;

      // Process subject distribution
      const subjectStats = {};
      subjectDistributionResult.data?.forEach(item => {
        subjectStats[item.subject] = (subjectStats[item.subject] || 0) + 1;
      });

      // Process priority distribution
      const priorityStats = {};
      priorityDistributionResult.data?.forEach(item => {
        priorityStats[item.priority] = (priorityStats[item.priority] || 0) + 1;
      });

      // Calculate unique active educators
      const uniqueEducators = new Set(
        activeEducatorsResult.data?.map(d => d.assigned_educator_id).filter(Boolean)
      ).size;

      // Calculate unique active students
      const uniqueStudents = new Set(
        studentParticipationResult.data?.map(d => d.student_id).filter(Boolean)
      ).size;

      const analytics = {
        period: {
          type: period,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        },
        overview: {
          total_doubts: totalDoubts,
          resolved_doubts: resolvedDoubts,
          open_doubts: openDoubts,
          resolution_rate: parseFloat(resolutionRate),
          average_response_time_minutes: Math.round(avgResponseTime),
          active_educators: uniqueEducators,
          active_students: uniqueStudents
        },
        subject_distribution: subjectStats,
        priority_distribution: priorityStats,
        trends: {
          // This could be expanded to show daily/weekly trends
          period_comparison: `${totalDoubts} doubts in selected period`
        }
      };

      res.json({ analytics });

    } catch (error) {
      console.error('Error fetching doubt analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }
);

// GET /api/analytics/educator-performance - Get educator performance metrics
router.get('/educator-performance',
  authenticateToken,
  requireRole(['admin', 'operation_manager']),
  [
    query('educator_id').optional().isUUID(),
    query('period').optional().isIn(['week', 'month', 'quarter', 'year']),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req, res) => {
    try {
      const { educator_id, period = 'month', limit = 10 } = req.query;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      let query = req.supabase
        .from('doubts')
        .select(`
          assigned_educator_id,
          status,
          created_at,
          resolved_at,
          priority,
          subject,
          assigned_educator:assigned_educator_id(name, email)
        `)
        .not('assigned_educator_id', 'is', null)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (educator_id) {
        query = query.eq('assigned_educator_id', educator_id);
      }

      const { data: doubts, error } = await query;

      if (error) {
        console.error('Error fetching educator performance data:', error);
        return res.status(500).json({ error: 'Failed to fetch performance data' });
      }

      // Group by educator
      const educatorStats = {};
      
      doubts?.forEach(doubt => {
        const educatorId = doubt.assigned_educator_id;
        
        if (!educatorStats[educatorId]) {
          educatorStats[educatorId] = {
            educator_id: educatorId,
            educator_name: doubt.assigned_educator?.name || 'Unknown',
            educator_email: doubt.assigned_educator?.email || 'Unknown',
            total_assigned: 0,
            resolved: 0,
            in_progress: 0,
            open: 0,
            subjects: new Set(),
            priorities: { low: 0, medium: 0, high: 0, urgent: 0 },
            total_response_time: 0,
            response_time_count: 0
          };
        }

        const stats = educatorStats[educatorId];
        stats.total_assigned++;
        
        if (doubt.status === 'resolved') {
          stats.resolved++;
          
          // Calculate response time if available
          if (doubt.resolved_at) {
            const responseTime = (new Date(doubt.resolved_at) - new Date(doubt.created_at)) / (1000 * 60); // minutes
            stats.total_response_time += responseTime;
            stats.response_time_count++;
          }
        } else if (doubt.status === 'in_progress') {
          stats.in_progress++;
        } else if (doubt.status === 'open' || doubt.status === 'assigned') {
          stats.open++;
        }

        stats.subjects.add(doubt.subject);
        stats.priorities[doubt.priority] = (stats.priorities[doubt.priority] || 0) + 1;
      });

      // Convert to array and calculate final metrics
      const performanceData = Object.values(educatorStats).map(stats => ({
        ...stats,
        subjects: Array.from(stats.subjects),
        resolution_rate: stats.total_assigned > 0 ? ((stats.resolved / stats.total_assigned) * 100).toFixed(1) : 0,
        avg_response_time_minutes: stats.response_time_count > 0 ? 
          Math.round(stats.total_response_time / stats.response_time_count) : 0,
        efficiency_score: calculateEfficiencyScore(stats)
      })).sort((a, b) => parseFloat(b.efficiency_score) - parseFloat(a.efficiency_score));

      // Limit results
      const limitedResults = performanceData.slice(0, parseInt(limit));

      res.json({
        period: {
          type: period,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        },
        total_educators: performanceData.length,
        educators: limitedResults
      });

    } catch (error) {
      console.error('Error fetching educator performance:', error);
      res.status(500).json({ error: 'Failed to fetch educator performance' });
    }
  }
);

// GET /api/analytics/student-insights - Get student doubt patterns
router.get('/student-insights',
  authenticateToken,
  async (req, res) => {
    try {
      // Students can only see their own data, others need proper roles
      const isStudent = req.user.role === 'student';
      const hasAccess = isStudent || ['admin', 'operation_manager', 'educator'].includes(req.user.role);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { student_id, period = 'month' } = req.query;
      const targetStudentId = isStudent ? req.user.id : student_id;

      if (!targetStudentId) {
        return res.status(400).json({ error: 'Student ID required for non-student users' });
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const { data: doubts, error } = await req.supabase
        .from('doubts')
        .select('*')
        .eq('student_id', targetStudentId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) {
        console.error('Error fetching student insights:', error);
        return res.status(500).json({ error: 'Failed to fetch student insights' });
      }

      // Analyze patterns
      const insights = analyzeStudentDoubtPatterns(doubts || []);

      res.json({
        student_id: targetStudentId,
        period: {
          type: period,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        },
        insights
      });

    } catch (error) {
      console.error('Error fetching student insights:', error);
      res.status(500).json({ error: 'Failed to fetch student insights' });
    }
  }
);

// Helper function to calculate educator efficiency score
function calculateEfficiencyScore(stats) {
  const resolutionRate = stats.total_assigned > 0 ? (stats.resolved / stats.total_assigned) : 0;
  const avgResponseTime = stats.response_time_count > 0 ? 
    (stats.total_response_time / stats.response_time_count) : 1440; // Default to 24 hours if no data
  
  // Score based on resolution rate (0-50 points) and response time (0-50 points)
  const resolutionScore = resolutionRate * 50; // 0-50 points
  const responseScore = Math.max(0, 50 - (avgResponseTime / 60)); // Better response time = higher score
  
  const totalScore = resolutionScore + responseScore;
  return Math.min(100, totalScore).toFixed(1);
}

// Helper function to analyze student doubt patterns
function analyzeStudentDoubtPatterns(doubts) {
  const patterns = {
    total_doubts: doubts.length,
    resolved_doubts: 0,
    pending_doubts: 0,
    subjects: {},
    difficulty_levels: {},
    time_patterns: {
      by_hour: {},
      by_day: {},
      by_week: {}
    },
    resolution_times: [],
    most_common_subjects: [],
    improvement_areas: []
  };

  doubts.forEach(doubt => {
    // Status tracking
    if (doubt.status === 'resolved') {
      patterns.resolved_doubts++;
      
      // Calculate resolution time
      if (doubt.resolved_at) {
        const resolutionTime = (new Date(doubt.resolved_at) - new Date(doubt.created_at)) / (1000 * 60 * 60); // hours
        patterns.resolution_times.push(resolutionTime);
      }
    } else {
      patterns.pending_doubts++;
    }

    // Subject tracking
    patterns.subjects[doubt.subject] = (patterns.subjects[doubt.subject] || 0) + 1;

    // Difficulty tracking
    patterns.difficulty_levels[doubt.difficulty_level] = 
      (patterns.difficulty_levels[doubt.difficulty_level] || 0) + 1;

    // Time pattern analysis
    const createdDate = new Date(doubt.created_at);
    const hour = createdDate.getHours();
    const day = createdDate.toLocaleDateString('en-US', { weekday: 'long' });
    const week = `Week ${Math.ceil(createdDate.getDate() / 7)}`;

    patterns.time_patterns.by_hour[hour] = (patterns.time_patterns.by_hour[hour] || 0) + 1;
    patterns.time_patterns.by_day[day] = (patterns.time_patterns.by_day[day] || 0) + 1;
    patterns.time_patterns.by_week[week] = (patterns.time_patterns.by_week[week] || 0) + 1;
  });

  // Calculate derived insights
  patterns.resolution_rate = patterns.total_doubts > 0 ? 
    ((patterns.resolved_doubts / patterns.total_doubts) * 100).toFixed(1) : 0;

  patterns.avg_resolution_time_hours = patterns.resolution_times.length > 0 ?
    (patterns.resolution_times.reduce((sum, time) => sum + time, 0) / patterns.resolution_times.length).toFixed(1) : 0;

  // Most common subjects
  patterns.most_common_subjects = Object.entries(patterns.subjects)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([subject, count]) => ({ subject, count }));

  // Identify improvement areas (subjects with low resolution rates)
  const subjectResolution = {};
  doubts.forEach(doubt => {
    if (!subjectResolution[doubt.subject]) {
      subjectResolution[doubt.subject] = { total: 0, resolved: 0 };
    }
    subjectResolution[doubt.subject].total++;
    if (doubt.status === 'resolved') {
      subjectResolution[doubt.subject].resolved++;
    }
  });

  patterns.improvement_areas = Object.entries(subjectResolution)
    .filter(([, stats]) => stats.total >= 2) // Only subjects with at least 2 doubts
    .map(([subject, stats]) => ({
      subject,
      total_doubts: stats.total,
      resolution_rate: ((stats.resolved / stats.total) * 100).toFixed(1)
    }))
    .sort((a, b) => parseFloat(a.resolution_rate) - parseFloat(b.resolution_rate))
    .slice(0, 3);

  return patterns;
}

module.exports = router;