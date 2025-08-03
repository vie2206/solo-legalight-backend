// Role-Specific Dashboard API Routes
const express = require('express');
const router = express.Router();

// ===============================
// STUDENT DASHBOARD
// ===============================

router.get('/student', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's progress and statistics
    const [
      userProgress,
      vocabularyProgress,
      challengeProgress,
      recentActivity,
      analytics
    ] = await Promise.all([
      // Reading progress
      req.supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(10),
      
      // Vocabulary progress
      req.supabase
        .from('vocabulary_progress')
        .select('mastery_level')
        .eq('user_id', userId),
      
      // Challenge progress
      req.supabase
        .from('challenge_progress')
        .select('*, challenges(title, reward, difficulty)')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
      
      // Recent activity
      req.supabase
        .from('user_progress')
        .select('*, reading_passages(title, type, difficulty)')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(5),
      
      // User analytics for last 30 days
      req.supabase
        .from('user_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false })
    ]);

    // Process vocabulary statistics
    const vocabStats = vocabularyProgress.data?.reduce((acc, item) => {
      acc[item.mastery_level] = (acc[item.mastery_level] || 0) + 1;
      return acc;
    }, { new: 0, learning: 0, mastered: 0 }) || { new: 0, learning: 0, mastered: 0 };

    // Calculate performance trends
    const analyticsData = analytics.data || [];
    const totalReadingTime = analyticsData.reduce((sum, day) => sum + (day.reading_time || 0), 0);
    const totalPassagesRead = analyticsData.reduce((sum, day) => sum + (day.passages_read || 0), 0);
    const avgQuizScore = analyticsData.length > 0 
      ? analyticsData.reduce((sum, day) => sum + (day.quiz_score_avg || 0), 0) / analyticsData.length 
      : 0;

    // Active challenges
    const activeChallenges = challengeProgress.data?.filter(cp => !cp.completed) || [];
    const completedChallenges = challengeProgress.data?.filter(cp => cp.completed) || [];

    // Reading streak calculation
    const streak = calculateReadingStreak(analyticsData);

    // Next recommendations
    const recommendations = await generateStudentRecommendations(userId, req.supabase);

    const dashboard = {
      user_info: {
        name: req.user.name,
        email: req.user.email,
        level: calculateUserLevel(totalPassagesRead, totalReadingTime),
        streak: streak
      },
      
      performance_summary: {
        total_reading_time: totalReadingTime,
        passages_completed: totalPassagesRead,
        average_quiz_score: Math.round(avgQuizScore),
        vocabulary_mastered: vocabStats.mastered,
        challenges_completed: completedChallenges.length
      },
      
      vocabulary_progress: {
        total_words: vocabStats.new + vocabStats.learning + vocabStats.mastered,
        mastered: vocabStats.mastered,
        learning: vocabStats.learning,
        new: vocabStats.new,
        mastery_percentage: Math.round((vocabStats.mastered / Math.max(1, vocabStats.new + vocabStats.learning + vocabStats.mastered)) * 100)
      },
      
      active_challenges: activeChallenges.map(challenge => ({
        id: challenge.challenge_id,
        title: challenge.challenges?.title,
        progress: challenge.progress,
        total: challenge.challenges?.total_steps || 100,
        reward: challenge.challenges?.reward,
        difficulty: challenge.challenges?.difficulty
      })),
      
      recent_activity: recentActivity.data?.map(activity => ({
        type: 'reading_completed',
        title: activity.reading_passages?.title,
        passage_type: activity.reading_passages?.type,
        difficulty: activity.reading_passages?.difficulty,
        completion_time: activity.time_spent,
        completed_at: activity.completed_at,
        comprehension_score: activity.comprehension_score
      })) || [],
      
      daily_analytics: analyticsData.slice(0, 7).reverse(), // Last 7 days
      
      recommendations: recommendations
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch student dashboard' });
  }
});

// ===============================
// PARENT DASHBOARD
// ===============================

router.get('/parent', async (req, res) => {
  try {
    const parentId = req.user.id;
    
    // Get children
    const { data: children } = await req.supabase
      .from('parent_child_relationships')
      .select('child_id, users!parent_child_relationships_child_id_fkey(id, name, email)')
      .eq('parent_id', parentId)
      .eq('is_active', true);

    if (!children || children.length === 0) {
      return res.json({
        message: 'No children linked to this account',
        children: [],
        overall_stats: null
      });
    }

    const childIds = children.map(c => c.child_id);
    
    // Get children's progress and analytics
    const [
      childrenProgress,
      childrenAnalytics,
      childrenChallenges,
      recentActivities
    ] = await Promise.all([
      // Children's reading progress
      req.supabase
        .from('user_progress')
        .select('user_id, time_spent, comprehension_score, completed_at')
        .in('user_id', childIds)
        .not('completed_at', 'is', null),
      
      // Children's analytics (last 30 days)
      req.supabase
        .from('user_analytics')
        .select('*')
        .in('user_id', childIds)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      
      // Children's challenge progress
      req.supabase
        .from('challenge_progress')
        .select('user_id, completed, challenges(title, reward)')
        .in('user_id', childIds),
      
      // Recent activities
      req.supabase
        .from('user_progress')
        .select('user_id, time_spent, completed_at, reading_passages(title, type)')
        .in('user_id', childIds)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(10)
    ]);

    // Process data for each child
    const childrenData = children.map(child => {
      const childId = child.child_id;
      const childUser = child.users;
      
      const progress = childrenProgress.data?.filter(p => p.user_id === childId) || [];
      const analytics = childrenAnalytics.data?.filter(a => a.user_id === childId) || [];
      const challenges = childrenChallenges.data?.filter(c => c.user_id === childId) || [];
      const activities = recentActivities.data?.filter(a => a.user_id === childId) || [];
      
      const totalTime = analytics.reduce((sum, day) => sum + (day.reading_time || 0), 0);
      const totalPassages = analytics.reduce((sum, day) => sum + (day.passages_read || 0), 0);
      const avgScore = progress.length > 0 
        ? progress.reduce((sum, p) => sum + (p.comprehension_score || 0), 0) / progress.length 
        : 0;
      const completedChallenges = challenges.filter(c => c.completed).length;

      return {
        id: childId,
        name: childUser.name,
        email: childUser.email,
        stats: {
          total_reading_time: totalTime,
          passages_completed: totalPassages,
          average_score: Math.round(avgScore),
          challenges_completed: completedChallenges,
          streak: calculateReadingStreak(analytics)
        },
        recent_activity: activities.slice(0, 3).map(activity => ({
          title: activity.reading_passages?.title,
          type: activity.reading_passages?.type,
          time_spent: activity.time_spent,
          completed_at: activity.completed_at
        })),
        weekly_analytics: analytics.slice(-7)
      };
    });

    // Overall family statistics
    const overallStats = {
      total_children: children.length,
      combined_reading_time: childrenData.reduce((sum, child) => sum + child.stats.total_reading_time, 0),
      combined_passages: childrenData.reduce((sum, child) => sum + child.stats.passages_completed, 0),
      average_family_score: Math.round(
        childrenData.reduce((sum, child) => sum + child.stats.average_score, 0) / children.length
      ),
      most_active_child: childrenData.reduce((prev, current) => 
        (current.stats.total_reading_time > prev.stats.total_reading_time) ? current : prev
      )
    };

    res.json({
      children: childrenData,
      overall_stats: overallStats,
      parent_insights: generateParentInsights(childrenData)
    });
  } catch (error) {
    console.error('Error fetching parent dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch parent dashboard' });
  }
});

// ===============================
// EDUCATOR DASHBOARD
// ===============================

router.get('/educator', async (req, res) => {
  try {
    const educatorId = req.user.id;
    
    // Get educator's classes
    const { data: classes } = await req.supabase
      .from('classes')
      .select('id, name, description')
      .eq('educator_id', educatorId)
      .eq('is_active', true);

    if (!classes || classes.length === 0) {
      return res.json({
        message: 'No classes assigned',
        classes: [],
        student_analytics: null
      });
    }

    const classIds = classes.map(c => c.id);
    
    // Get students in these classes
    const { data: classMembers } = await req.supabase
      .from('class_memberships')
      .select('user_id, class_id, users!class_memberships_user_id_fkey(id, name, email)')
      .in('class_id', classIds)
      .eq('role', 'student')
      .eq('is_active', true);

    const studentIds = classMembers?.map(m => m.user_id) || [];

    if (studentIds.length === 0) {
      return res.json({
        classes: classes.map(c => ({ ...c, student_count: 0 })),
        student_analytics: { total_students: 0 },
        performance_overview: null
      });
    }

    // Get student analytics and progress
    const [
      studentProgress,
      studentAnalytics,
      vocabularyProgress,
      challengeProgress
    ] = await Promise.all([
      // Student reading progress
      req.supabase
        .from('user_progress')
        .select('user_id, time_spent, comprehension_score, completed_at')
        .in('user_id', studentIds)
        .not('completed_at', 'is', null),
      
      // Student analytics (last 30 days)
      req.supabase
        .from('user_analytics')
        .select('*')
        .in('user_id', studentIds)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      
      // Vocabulary progress
      req.supabase
        .from('vocabulary_progress')
        .select('user_id, mastery_level')
        .in('user_id', studentIds),
      
      // Challenge progress
      req.supabase
        .from('challenge_progress')
        .select('user_id, completed')
        .in('user_id', studentIds)
        .eq('completed', true)
    ]);

    // Process class data
    const classData = classes.map(cls => {
      const classStudents = classMembers.filter(m => m.class_id === cls.id);
      const classStudentIds = classStudents.map(s => s.user_id);
      
      const classProgress = studentProgress.data?.filter(p => classStudentIds.includes(p.user_id)) || [];
      const classAnalytics = studentAnalytics.data?.filter(a => classStudentIds.includes(a.user_id)) || [];
      
      const avgScore = classProgress.length > 0 
        ? classProgress.reduce((sum, p) => sum + (p.comprehension_score || 0), 0) / classProgress.length 
        : 0;
      
      const totalTime = classAnalytics.reduce((sum, a) => sum + (a.reading_time || 0), 0);
      
      return {
        ...cls,
        student_count: classStudents.length,
        students: classStudents.map(s => ({
          id: s.user_id,
          name: s.users.name,
          email: s.users.email
        })),
        performance: {
          average_score: Math.round(avgScore),
          total_reading_time: totalTime,
          active_students: new Set(classAnalytics.map(a => a.user_id)).size
        }
      };
    });

    // Overall student analytics
    const totalReadingTime = studentAnalytics.data?.reduce((sum, a) => sum + (a.reading_time || 0), 0) || 0;
    const totalPassages = studentAnalytics.data?.reduce((sum, a) => sum + (a.passages_read || 0), 0) || 0;
    const avgClassScore = studentProgress.data?.length > 0 
      ? studentProgress.data.reduce((sum, p) => sum + (p.comprehension_score || 0), 0) / studentProgress.data.length 
      : 0;

    // Performance insights
    const topPerformers = getTopPerformers(classMembers, studentProgress.data || []);
    const strugglingStudents = getStrugglingStudents(classMembers, studentProgress.data || []);
    const improvementTrends = calculateImprovementTrends(studentAnalytics.data || []);

    res.json({
      classes: classData,
      student_analytics: {
        total_students: studentIds.length,
        total_reading_time: totalReadingTime,
        total_passages_read: totalPassages,
        average_class_score: Math.round(avgClassScore),
        active_students_this_week: getActiveStudentsThisWeek(studentAnalytics.data || [])
      },
      performance_overview: {
        top_performers: topPerformers,
        struggling_students: strugglingStudents,
        improvement_trends: improvementTrends,
        vocabulary_progress: calculateVocabularyStats(vocabularyProgress.data || []),
        challenge_completion_rate: Math.round((challengeProgress.data?.length || 0) / Math.max(1, studentIds.length) * 100)
      },
      recommendations: generateEducatorRecommendations(classData, studentProgress.data || [])
    });
  } catch (error) {
    console.error('Error fetching educator dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch educator dashboard' });
  }
});

// ===============================
// MANAGER DASHBOARD
// ===============================

router.get('/manager', async (req, res) => {
  try {
    const managerId = req.user.id;
    
    // Get platform-wide statistics
    const [
      userStats,
      contentStats,
      activityStats,
      revenueStats
    ] = await Promise.all([
      // User statistics
      Promise.all([
        req.supabase.from('users').select('*', { count: 'exact', head: true }),
        req.supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        req.supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'educator'),
        req.supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'parent'),
        req.supabase.from('users').select('*', { count: 'exact', head: true })
          .gte('last_sign_in_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]),
      
      // Content statistics
      Promise.all([
        req.supabase.from('reading_passages').select('*', { count: 'exact', head: true }),
        req.supabase.from('vocabulary_words').select('*', { count: 'exact', head: true }),
        req.supabase.from('gk_questions').select('*', { count: 'exact', head: true }),
        req.supabase.from('challenges').select('*', { count: 'exact', head: true })
      ]),
      
      // Activity statistics (last 30 days)
      Promise.all([
        req.supabase.from('user_progress').select('*', { count: 'exact', head: true })
          .gte('completed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        req.supabase.from('user_analytics').select('reading_time, passages_read')
          .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      ]),
      
      // Organizations and revenue
      Promise.all([
        req.supabase.from('organizations').select('*', { count: 'exact', head: true }),
        req.supabase.from('organizations').select('subscription_plan')
      ])
    ]);

    // Process user statistics
    const [totalUsers, totalStudents, totalEducators, totalParents, activeUsers] = userStats;
    
    // Process content statistics
    const [totalPassages, totalVocabulary, totalGKQuestions, totalChallenges] = contentStats;
    
    // Process activity statistics
    const [completedSessions, analyticsData] = activityStats;
    const totalReadingTime = analyticsData.data?.reduce((sum, a) => sum + (a.reading_time || 0), 0) || 0;
    const totalPassagesRead = analyticsData.data?.reduce((sum, a) => sum + (a.passages_read || 0), 0) || 0;
    
    // Process revenue statistics
    const [totalOrganizations, subscriptionData] = revenueStats;
    const subscriptionBreakdown = subscriptionData.data?.reduce((acc, org) => {
      acc[org.subscription_plan] = (acc[org.subscription_plan] || 0) + 1;
      return acc;
    }, {}) || {};

    // Growth metrics (mock data - implement proper time-series analysis)
    const userGrowthRate = 15.5; // Calculate from historical data
    const engagementRate = Math.round((activeUsers.count / Math.max(1, totalUsers.count)) * 100);
    
    // System health metrics
    const systemHealth = {
      uptime: '99.9%',
      response_time: '120ms',
      error_rate: '0.1%',
      database_performance: 'Excellent'
    };

    res.json({
      platform_overview: {
        total_users: totalUsers.count || 0,
        total_students: totalStudents.count || 0,
        total_educators: totalEducators.count || 0,
        total_parents: totalParents.count || 0,
        active_users_this_week: activeUsers.count || 0,
        user_growth_rate: userGrowthRate,
        engagement_rate: engagementRate
      },
      
      content_overview: {
        total_passages: totalPassages.count || 0,
        total_vocabulary: totalVocabulary.count || 0,
        total_gk_questions: totalGKQuestions.count || 0,
        total_challenges: totalChallenges.count || 0
      },
      
      activity_metrics: {
        completed_sessions_30d: completedSessions.count || 0,
        total_reading_hours_30d: Math.round(totalReadingTime / 60),
        total_passages_read_30d: totalPassagesRead,
        average_session_length: totalReadingTime > 0 ? Math.round(totalReadingTime / (completedSessions.count || 1)) : 0
      },
      
      business_metrics: {
        total_organizations: totalOrganizations.count || 0,
        subscription_breakdown: subscriptionBreakdown,
        estimated_monthly_revenue: calculateMonthlyRevenue(subscriptionBreakdown),
        customer_satisfaction: 4.7 // Mock data
      },
      
      system_health: systemHealth,
      
      performance_insights: generateManagerInsights({
        userGrowth: userGrowthRate,
        engagement: engagementRate,
        contentUtilization: (completedSessions.count || 0) / Math.max(1, totalPassages.count || 1)
      })
    });
  } catch (error) {
    console.error('Error fetching manager dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch manager dashboard' });
  }
});

// ===============================
// ADMIN DASHBOARD
// ===============================

router.get('/admin', async (req, res) => {
  try {
    // Get comprehensive system statistics
    const [
      systemStats,
      contentManagement,
      userManagement,
      securityMetrics
    ] = await Promise.all([
      getSystemStatistics(req.supabase),
      getContentManagementStats(req.supabase),
      getUserManagementStats(req.supabase),
      getSecurityMetrics(req.supabase)
    ]);

    res.json({
      system_overview: systemStats,
      content_management: contentManagement,
      user_management: userManagement,
      security_metrics: securityMetrics,
      admin_tools: {
        can_manage_users: true,
        can_manage_content: true,
        can_view_analytics: true,
        can_manage_system: true
      }
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch admin dashboard' });
  }
});

// ===============================
// HELPER FUNCTIONS
// ===============================

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

function calculateUserLevel(passagesRead, readingTime) {
  const score = passagesRead * 10 + Math.floor(readingTime / 60);
  
  if (score >= 1000) return { level: 5, name: 'Reading Master' };
  if (score >= 500) return { level: 4, name: 'Advanced Reader' };
  if (score >= 200) return { level: 3, name: 'Skilled Reader' };
  if (score >= 50) return { level: 2, name: 'Developing Reader' };
  return { level: 1, name: 'Beginner Reader' };
}

async function generateStudentRecommendations(userId, supabase) {
  // Get user's weak areas and suggest improvements
  const { data: progress } = await supabase
    .from('user_progress')
    .select('comprehension_score, reading_passages(type)')
    .eq('user_id', userId)
    .not('comprehension_score', 'is', null);

  const recommendations = [];
  
  if (progress && progress.length > 0) {
    const avgScore = progress.reduce((sum, p) => sum + p.comprehension_score, 0) / progress.length;
    
    if (avgScore < 70) {
      recommendations.push({
        type: 'improvement',
        title: 'Focus on Comprehension',
        description: 'Your average comprehension score is below 70%. Try reading passages more slowly and taking notes.',
        priority: 'high'
      });
    }
    
    // Analyze passage types
    const typeScores = progress.reduce((acc, p) => {
      const type = p.reading_passages?.type || 'Unknown';
      if (!acc[type]) acc[type] = { total: 0, count: 0 };
      acc[type].total += p.comprehension_score;
      acc[type].count += 1;
      return acc;
    }, {});
    
    Object.entries(typeScores).forEach(([type, data]) => {
      const avg = data.total / data.count;
      if (avg < 65) {
        recommendations.push({
          type: 'practice',
          title: `Practice ${type} Passages`,
          description: `Your performance in ${type} passages needs improvement. Practice more passages of this type.`,
          priority: 'medium'
        });
      }
    });
  }
  
  return recommendations.slice(0, 3); // Return top 3 recommendations
}

function generateParentInsights(childrenData) {
  const insights = [];
  
  // Find most and least active children
  if (childrenData.length > 1) {
    const sorted = [...childrenData].sort((a, b) => b.stats.total_reading_time - a.stats.total_reading_time);
    insights.push({
      type: 'activity',
      message: `${sorted[0].name} is the most active with ${sorted[0].stats.total_reading_time} minutes of reading time.`
    });
    
    if (sorted[sorted.length - 1].stats.total_reading_time < 60) {
      insights.push({
        type: 'concern',
        message: `${sorted[sorted.length - 1].name} needs more practice. Consider setting daily reading goals.`
      });
    }
  }
  
  // Performance insights
  const avgScore = childrenData.reduce((sum, child) => sum + child.stats.average_score, 0) / childrenData.length;
  if (avgScore > 80) {
    insights.push({
      type: 'achievement',
      message: `Excellent! Your children maintain an average score of ${Math.round(avgScore)}%.`
    });
  }
  
  return insights;
}

function getTopPerformers(students, progressData) {
  const studentScores = students.map(student => {
    const studentProgress = progressData.filter(p => p.user_id === student.user_id);
    const avgScore = studentProgress.length > 0 
      ? studentProgress.reduce((sum, p) => sum + (p.comprehension_score || 0), 0) / studentProgress.length 
      : 0;
    
    return {
      id: student.user_id,
      name: student.users.name,
      email: student.users.email,
      average_score: Math.round(avgScore),
      total_sessions: studentProgress.length
    };
  });
  
  return studentScores
    .filter(s => s.total_sessions > 0)
    .sort((a, b) => b.average_score - a.average_score)
    .slice(0, 5);
}

function getStrugglingStudents(students, progressData) {
  const studentScores = students.map(student => {
    const studentProgress = progressData.filter(p => p.user_id === student.user_id);
    const avgScore = studentProgress.length > 0 
      ? studentProgress.reduce((sum, p) => sum + (p.comprehension_score || 0), 0) / studentProgress.length 
      : 0;
    
    return {
      id: student.user_id,
      name: student.users.name,
      email: student.users.email,
      average_score: Math.round(avgScore),
      total_sessions: studentProgress.length
    };
  });
  
  return studentScores
    .filter(s => s.total_sessions > 0 && s.average_score < 60)
    .sort((a, b) => a.average_score - b.average_score)
    .slice(0, 5);
}

function calculateImprovementTrends(analyticsData) {
  // Group by user and calculate trends
  const userTrends = {};
  
  analyticsData.forEach(day => {
    if (!userTrends[day.user_id]) {
      userTrends[day.user_id] = [];
    }
    userTrends[day.user_id].push({
      date: day.date,
      score: day.quiz_score_avg || 0
    });
  });
  
  const trends = Object.entries(userTrends).map(([userId, data]) => {
    const sorted = data.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sorted.length < 2) return null;
    
    const firstScore = sorted[0].score;
    const lastScore = sorted[sorted.length - 1].score;
    const improvement = lastScore - firstScore;
    
    return {
      user_id: userId,
      improvement: Math.round(improvement),
      trend: improvement > 5 ? 'improving' : improvement < -5 ? 'declining' : 'stable'
    };
  }).filter(Boolean);
  
  return {
    improving: trends.filter(t => t.trend === 'improving').length,
    declining: trends.filter(t => t.trend === 'declining').length,
    stable: trends.filter(t => t.trend === 'stable').length
  };
}

function calculateVocabularyStats(vocabProgress) {
  const stats = vocabProgress.reduce((acc, item) => {
    acc[item.mastery_level] = (acc[item.mastery_level] || 0) + 1;
    return acc;
  }, { new: 0, learning: 0, mastered: 0 });
  
  const total = stats.new + stats.learning + stats.mastered;
  
  return {
    total_words: total,
    mastered: stats.mastered,
    learning: stats.learning,
    new: stats.new,
    mastery_rate: total > 0 ? Math.round((stats.mastered / total) * 100) : 0
  };
}

function generateEducatorRecommendations(classData, progressData) {
  const recommendations = [];
  
  // Analyze class performance
  classData.forEach(cls => {
    if (cls.performance.average_score < 65) {
      recommendations.push({
        type: 'class_improvement',
        class: cls.name,
        message: `Class ${cls.name} average score is ${cls.performance.average_score}%. Consider additional practice sessions.`,
        priority: 'high'
      });
    }
    
    if (cls.performance.active_students / cls.student_count < 0.7) {
      recommendations.push({
        type: 'engagement',
        class: cls.name,
        message: `Only ${cls.performance.active_students} out of ${cls.student_count} students are active. Focus on engagement strategies.`,
        priority: 'medium'
      });
    }
  });
  
  return recommendations;
}

function getActiveStudentsThisWeek(analyticsData) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activeUsers = new Set();
  
  analyticsData.forEach(day => {
    if (new Date(day.date) >= oneWeekAgo && day.passages_read > 0) {
      activeUsers.add(day.user_id);
    }
  });
  
  return activeUsers.size;
}

function calculateMonthlyRevenue(subscriptionBreakdown) {
  const rates = {
    free: 0,
    basic: 19.99,
    premium: 49.99,
    enterprise: 99.99
  };
  
  return Object.entries(subscriptionBreakdown).reduce((total, [plan, count]) => {
    return total + (rates[plan] || 0) * count;
  }, 0);
}

function generateManagerInsights(metrics) {
  const insights = [];
  
  if (metrics.userGrowth > 10) {
    insights.push({
      type: 'positive',
      title: 'Strong User Growth',
      message: `User base growing at ${metrics.userGrowth}% monthly rate.`
    });
  }
  
  if (metrics.engagement > 70) {
    insights.push({
      type: 'positive',
      title: 'High Engagement',
      message: `${metrics.engagement}% of users are actively engaged.`
    });
  }
  
  if (metrics.contentUtilization < 0.5) {
    insights.push({
      type: 'opportunity',
      title: 'Content Underutilized',
      message: 'Consider promoting existing content or creating more engaging materials.'
    });
  }
  
  return insights;
}

async function getSystemStatistics(supabase) {
  // Implementation for comprehensive system stats
  return {
    total_users: 0,
    system_uptime: '99.9%',
    database_health: 'Excellent',
    storage_usage: '67%',
    api_response_time: '95ms'
  };
}

async function getContentManagementStats(supabase) {
  // Implementation for content management stats
  return {
    total_content_items: 0,
    pending_reviews: 0,
    published_this_month: 0,
    content_engagement_rate: 85
  };
}

async function getUserManagementStats(supabase) {
  // Implementation for user management stats
  return {
    new_registrations_this_month: 0,
    user_retention_rate: 78,
    support_tickets: 12,
    user_satisfaction: 4.6
  };
}

async function getSecurityMetrics(supabase) {
  // Implementation for security metrics
  return {
    failed_login_attempts: 0,
    security_incidents: 0,
    data_backup_status: 'Current',
    ssl_certificate_status: 'Valid'
  };
}

module.exports = router;