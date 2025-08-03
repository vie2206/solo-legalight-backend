// Subscription management routes
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // For now, we'll use a simple validation
  // In production, use proper JWT verification
  next();
};

// Get subscription plans
router.get('/plans', async (req, res) => {
  try {
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('monthly_price', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's current subscription
router.get('/current/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, 
        subscription_tier, 
        billing_cycle, 
        subscription_start_date, 
        subscription_end_date,
        auto_renewal,
        payment_method,
        next_billing_date
      `)
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

    // Get user's feature access
    const { data: features, error: featuresError } = await supabase
      .from('user_feature_access')
      .select('feature_name, access_level, expires_at')
      .eq('user_id', userId);

    if (featuresError) {
      throw featuresError;
    }

    res.json({ 
      success: true, 
      data: {
        subscription: user,
        features: features
      }
    });
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user subscription
router.post('/update', authenticateToken, async (req, res) => {
  try {
    const { userId, tier, billingCycle, paymentMethod } = req.body;

    if (!userId || !tier || !billingCycle) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: userId, tier, billingCycle' 
      });
    }

    // Get current subscription
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('subscription_tier, subscription_start_date')
      .eq('id', userId)
      .single();

    if (userError) {
      throw userError;
    }

    // Calculate subscription dates
    const now = new Date();
    const subscriptionStartDate = currentUser.subscription_start_date || now;
    
    let subscriptionEndDate;
    let nextBillingDate;
    
    if (billingCycle === 'quarterly') {
      subscriptionEndDate = new Date(subscriptionStartDate);
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 3);
      nextBillingDate = subscriptionEndDate;
    } else {
      subscriptionEndDate = new Date(subscriptionStartDate);
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
      nextBillingDate = subscriptionEndDate;
    }

    // Update user subscription
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        subscription_tier: tier,
        billing_cycle: billingCycle,
        subscription_start_date: subscriptionStartDate,
        subscription_end_date: subscriptionEndDate,
        next_billing_date: nextBillingDate,
        payment_method: paymentMethod,
        auto_renewal: true,
        updated_at: now
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Record subscription history
    await supabase
      .from('subscription_history')
      .insert({
        user_id: userId,
        from_tier: currentUser.subscription_tier,
        to_tier: tier,
        billing_cycle: billingCycle,
        amount: billingCycle === 'quarterly' ? 
          (tier === 'mini' ? 799 : tier === 'pro' ? 1299 : tier === 'ultra' ? 1999 : 0) :
          (tier === 'mini' ? 299 : tier === 'pro' ? 499 : tier === 'ultra' ? 799 : 0),
        payment_method: paymentMethod,
        payment_status: 'completed', // In real implementation, this would be 'pending' until payment confirmation
        notes: `Subscription updated from ${currentUser.subscription_tier} to ${tier}`
      });

    // Update user feature access based on new tier
    await updateUserFeatureAccess(userId, tier);

    res.json({ 
      success: true, 
      data: updatedUser,
      message: `Successfully upgraded to ${tier.toUpperCase()} plan`
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Record daily login and check for rewards
router.post('/daily-login', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Check if user already logged in today
    const { data: existingLogin, error: checkError } = await supabase
      .from('daily_login_rewards')
      .select('*')
      .eq('user_id', userId)
      .eq('login_date', today)
      .single();

    if (existingLogin && !checkError) {
      return res.json({ 
        success: true, 
        alreadyLogged: true,
        streak: existingLogin.streak_count,
        reward: null
      });
    }

    // Get yesterday's login to calculate streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { data: yesterdayLogin, error: yesterdayError } = await supabase
      .from('daily_login_rewards')
      .select('streak_count')
      .eq('user_id', userId)
      .eq('login_date', yesterdayStr)
      .single();

    const streakCount = yesterdayLogin && !yesterdayError ? yesterdayLogin.streak_count + 1 : 1;

    // Determine reward based on streak
    let rewardType = 'analysis_credits';
    let rewardValue = 1;

    if (streakCount >= 7) {
      rewardType = 'mock_unlock';
      rewardValue = 1;
    } else if (streakCount >= 3) {
      rewardType = 'analysis_credits';
      rewardValue = 2;
    }

    // Record today's login
    const { data: loginReward, error: loginError } = await supabase
      .from('daily_login_rewards')
      .insert({
        user_id: userId,
        login_date: today,
        streak_count: streakCount,
        reward_type: rewardType,
        reward_value: rewardValue,
        claimed: false
      })
      .select()
      .single();

    if (loginError) {
      throw loginError;
    }

    // Update user's study streak
    await supabase
      .from('users')
      .update({ 
        study_streak: streakCount,
        last_login: new Date(),
        login_count: supabase.rpc('increment_login_count', { user_id: userId })
      })
      .eq('id', userId);

    res.json({ 
      success: true, 
      alreadyLogged: false,
      streak: streakCount,
      reward: {
        type: rewardType,
        value: rewardValue,
        message: `🎉 Day ${streakCount} streak! You earned ${rewardValue} ${rewardType.replace('_', ' ')}`
      }
    });

  } catch (error) {
    console.error('Error recording daily login:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get subscription history
router.get('/history/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: history, error } = await supabase
      .from('subscription_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching subscription history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to update user feature access
async function updateUserFeatureAccess(userId, tier) {
  const featureAccess = {
    free: {
      mock_tests: 'basic',
      mock_analysis: 'basic',
      rank_prediction: 'basic',
      study_plans: 'none',
      sectional_tests: 'basic',
      daily_challenges: 'none',
      performance_analytics: 'basic',
      progress_tracking: 'basic',
      study_streak: 'basic'
    },
    mini: {
      mock_tests: 'basic',
      mock_analysis: 'basic',
      rank_prediction: 'basic',
      study_plans: 'basic',
      sectional_tests: 'basic',
      daily_challenges: 'basic',
      performance_analytics: 'basic',
      daily_login_rewards: 'basic',
      progress_tracking: 'advanced',
      study_streak: 'advanced'
    },
    pro: {
      mock_tests: 'advanced',
      mock_analysis: 'advanced',
      rank_prediction: 'advanced',
      study_plans: 'advanced',
      sectional_tests: 'advanced',
      daily_challenges: 'advanced',
      performance_analytics: 'advanced',
      ai_mock_analysis: 'advanced',
      weekly_insights: 'advanced',
      daily_reading_practice: 'advanced',
      vocabulary_quizzes: 'advanced',
      advanced_study_reminders: 'advanced',
      daily_login_rewards: 'advanced',
      progress_tracking: 'advanced',
      achievement_badges: 'advanced',
      study_streak: 'advanced',
      gk_quizzes: 'advanced'
    },
    ultra: {
      mock_tests: 'advanced',
      mock_analysis: 'advanced',
      rank_prediction: 'advanced',
      study_plans: 'advanced',
      sectional_tests: 'advanced',
      daily_challenges: 'advanced',
      performance_analytics: 'advanced',
      ai_mock_analysis: 'advanced',
      weekly_insights: 'advanced',
      daily_reading_practice: 'advanced',
      vocabulary_quizzes: 'advanced',
      advanced_study_reminders: 'advanced',
      ai_smart_notifications: 'premium',
      personalized_ai_coaching: 'premium',
      mood_tracking: 'premium',
      parents_dashboard: 'premium',
      social_features: 'premium',
      gk_quizzes: 'premium',
      monthly_counseling: 'premium',
      priority_support: 'premium',
      daily_login_rewards: 'premium',
      progress_tracking: 'premium',
      achievement_badges: 'premium',
      study_streak: 'premium'
    }
  };

  const userFeatures = featureAccess[tier] || featureAccess.free;

  // Update each feature access
  for (const [featureName, accessLevel] of Object.entries(userFeatures)) {
    await supabase
      .from('user_feature_access')
      .upsert({
        user_id: userId,
        feature_name: featureName,
        access_level: accessLevel,
        granted_by: 'subscription',
        updated_at: new Date()
      });
  }
}

module.exports = router;