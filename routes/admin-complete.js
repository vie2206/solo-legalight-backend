// Complete Admin API Routes - All Real CRUD Operations
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Middleware to verify admin access
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', decoded.userId)
      .single();

    if (!user || !['admin', 'operation_manager'].includes(user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// ================================
// DASHBOARD STATISTICS
// ================================

router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // Get comprehensive dashboard statistics
    const [
      usersResult,
      institutesResult,
      contentResult,
      testsResult,
      transactionsResult,
      notificationsResult
    ] = await Promise.all([
      supabase.from('users').select('id, role, status, subscription_tier, created_at'),
      supabase.from('institutes').select('id, status, monthly_revenue'),
      supabase.from('content_items').select('id, content_type, status, views, completions'),
      supabase.from('mock_tests').select('id, total_attempts, avg_score'),
      supabase.from('transactions').select('id, amount, status, created_at'),
      supabase.from('notifications').select('id, status, created_at')
    ]);

    const users = usersResult.data || [];
    const institutes = institutesResult.data || [];
    const content = contentResult.data || [];
    const tests = testsResult.data || [];
    const transactions = transactionsResult.data || [];
    const notifications = notificationsResult.data || [];

    // Calculate statistics
    const stats = {
      totalUsers: users.length,
      activeStudents: users.filter(u => u.role === 'student' && u.status === 'active').length,
      totalInstitutes: institutes.length,
      activeInstitutes: institutes.filter(i => i.status === 'active').length,
      
      // Revenue calculations
      monthlyRevenue: institutes.reduce((sum, i) => sum + (parseFloat(i.monthly_revenue) || 0), 0),
      totalRevenue: transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0),
      
      // Content statistics
      totalContent: content.length,
      publishedContent: content.filter(c => c.status === 'published').length,
      totalViews: content.reduce((sum, c) => sum + (c.views || 0), 0),
      
      // Test statistics
      totalTests: tests.length,
      totalAttempts: tests.reduce((sum, t) => sum + (t.total_attempts || 0), 0),
      avgScore: tests.length > 0 
        ? tests.reduce((sum, t) => sum + (parseFloat(t.avg_score) || 0), 0) / tests.length 
        : 0,
      
      // User distribution
      subscriptionDistribution: {
        free: users.filter(u => u.subscription_tier === 'free').length,
        premium: users.filter(u => u.subscription_tier === 'premium').length,
        elite: users.filter(u => u.subscription_tier === 'elite').length
      },
      
      // Growth metrics
      newSignupsToday: users.filter(u => {
        const today = new Date().toISOString().split('T')[0];
        return u.created_at?.startsWith(today);
      }).length,
      
      dailyActiveUsers: users.filter(u => {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return new Date(u.last_login) > oneDayAgo;
      }).length,
      
      // System health
      systemHealth: 98, // This would be calculated based on actual system metrics
      supportTickets: notifications.filter(n => n.status === 'pending').length,
      systemAlerts: 3 // This would be calculated based on actual alerts
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ================================
// USER MANAGEMENT
// ================================

// Get all users with pagination and filtering
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      role = 'all', 
      status = 'all',
      subscription = 'all'
    } = req.query;

    let query = supabase
      .from('users')
      .select(`
        id, name, email, phone, role, status, subscription_tier,
        target_nlu, target_score, current_score, study_streak,
        total_study_hours, tests_completed, avg_score, total_spent,
        last_login, phone_verified, email_verified, created_at, updated_at
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    if (role !== 'all') {
      query = query.eq('role', role);
    }
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    if (subscription !== 'all') {
      query = query.eq('subscription_tier', subscription);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: users, error, count } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new user
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { 
      name, email, phone, role = 'student', subscription_tier = 'free',
      target_nlu, target_score, status = 'active'
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const userData = {
      name,
      email,
      phone,
      role,
      subscription_tier,
      target_nlu,
      target_score: target_score ? parseInt(target_score) : null,
      status,
      email_verified: true, // Admin-created users are pre-verified
      created_at: new Date().toISOString()
    };

    const { data: user, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'User with this email already exists' });
      }
      throw error;
    }

    // Log the action
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'user_created',
      entity_type: 'user',
      entity_id: user.id,
      new_values: userData,
      description: `Created user: ${user.name} (${user.email})`
    }]);

    res.status(201).json({ success: true, user });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get current user data for audit log
    const { data: currentUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove readonly fields
    delete updates.id;
    delete updates.created_at;
    
    updates.updated_at = new Date().toISOString();

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'user_updated',
      entity_type: 'user',
      entity_id: id,
      old_values: currentUser,
      new_values: updates,
      description: `Updated user: ${user.name} (${user.email})`
    }]);

    res.json({ success: true, user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get user data before deletion for audit log
    const { data: user } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', id)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log the action
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'user_deleted',
      entity_type: 'user',
      entity_id: id,
      description: `Deleted user: ${user.name} (${user.email})`
    }]);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ================================
// CONTENT MANAGEMENT
// ================================

// Get all content items
router.get('/content', requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      type = 'all', 
      status = 'all',
      category = 'all'
    } = req.query;

    let query = supabase
      .from('content_items')
      .select(`
        id, title, content_type, category, subject, difficulty, status,
        tags, estimated_time, points, views, completions, avg_rating, rating_count,
        created_by, updated_by, created_at, updated_at, published_at,
        users!content_items_created_by_fkey(name)
      `, { count: 'exact' });

    // Apply filters
    if (type !== 'all') {
      query = query.eq('content_type', type);
    }
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    if (category !== 'all') {
      query = query.eq('category', category);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: content, error, count } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      content,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Create content item
router.post('/content', requireAdmin, upload.array('attachments', 5), async (req, res) => {
  try {
    const {
      title, content, content_type, category, subject, difficulty = 'medium',
      tags, estimated_time, points, meta_description, search_keywords
    } = req.body;

    if (!title || !content || !content_type) {
      return res.status(400).json({ error: 'Title, content, and content_type are required' });
    }

    // Handle file attachments
    let attachments = null;
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: `/uploads/${file.filename}`
      }));
    }

    const contentData = {
      title,
      content,
      content_type,
      category,
      subject,
      difficulty,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      estimated_time: estimated_time ? parseInt(estimated_time) : null,
      points: points ? parseInt(points) : 0,
      attachments,
      meta_description,
      search_keywords: search_keywords ? search_keywords.split(',').map(k => k.trim()) : [],
      created_by: req.user.id,
      status: 'draft'
    };

    const { data: contentItem, error } = await supabase
      .from('content_items')
      .insert([contentData])
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'content_created',
      entity_type: 'content_item',
      entity_id: contentItem.id,
      new_values: contentData,
      description: `Created ${content_type}: ${title}`
    }]);

    res.status(201).json({ success: true, content: contentItem });
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({ error: 'Failed to create content' });
  }
});

// Update content item
router.put('/content/:id', requireAdmin, upload.array('attachments', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get current content for audit log
    const { data: currentContent } = await supabase
      .from('content_items')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentContent) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Handle new file attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: `/uploads/${file.filename}`
      }));
      
      // Merge with existing attachments
      updates.attachments = [
        ...(currentContent.attachments || []),
        ...newAttachments
      ];
    }

    // Process tags and keywords
    if (updates.tags && typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map(t => t.trim());
    }
    if (updates.search_keywords && typeof updates.search_keywords === 'string') {
      updates.search_keywords = updates.search_keywords.split(',').map(k => k.trim());
    }

    updates.updated_by = req.user.id;
    updates.updated_at = new Date().toISOString();

    // Set published_at if status is changing to published
    if (updates.status === 'published' && currentContent.status !== 'published') {
      updates.published_at = new Date().toISOString();
    }

    const { data: content, error } = await supabase
      .from('content_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'content_updated',
      entity_type: 'content_item',
      entity_id: id,
      old_values: currentContent,
      new_values: updates,
      description: `Updated ${content.content_type}: ${content.title}`
    }]);

    res.json({ success: true, content });
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ error: 'Failed to update content' });
  }
});

// Delete content item
router.delete('/content/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get content data before deletion
    const { data: content } = await supabase
      .from('content_items')
      .select('title, content_type, attachments')
      .eq('id', id)
      .single();

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Delete associated files
    if (content.attachments) {
      for (const attachment of content.attachments) {
        try {
          await fs.unlink(path.join(__dirname, '../', attachment.path));
        } catch (fileError) {
          console.warn('Could not delete file:', attachment.path);
        }
      }
    }

    const { error } = await supabase
      .from('content_items')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log the action
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'content_deleted',
      entity_type: 'content_item',
      entity_id: id,
      description: `Deleted ${content.content_type}: ${content.title}`
    }]);

    res.json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

// ================================
// MOCK TEST MANAGEMENT
// ================================

// Get all mock tests
router.get('/mock-tests', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all' } = req.query;

    let query = supabase
      .from('mock_tests')
      .select(`
        id, title, description, total_questions, total_marks, duration_minutes,
        status, start_date, end_date, is_free, price, total_attempts, avg_score,
        highest_score, created_at, updated_at,
        users!mock_tests_created_by_fkey(name)
      `, { count: 'exact' });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: tests, error, count } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      tests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get mock tests error:', error);
    res.status(500).json({ error: 'Failed to fetch mock tests' });
  }
});

// Create mock test
router.post('/mock-tests', requireAdmin, async (req, res) => {
  try {
    const {
      title, description, instructions, total_questions, total_marks,
      duration_minutes, sections, negative_marking = true, negative_marks_ratio = 0.25,
      start_date, end_date, max_attempts = 1, is_free = true, price = 0
    } = req.body;

    if (!title || !total_questions || !total_marks || !duration_minutes) {
      return res.status(400).json({ 
        error: 'Title, total_questions, total_marks, and duration_minutes are required' 
      });
    }

    const testData = {
      title,
      description,
      instructions,
      total_questions: parseInt(total_questions),
      total_marks: parseInt(total_marks),
      duration_minutes: parseInt(duration_minutes),
      sections: sections || [],
      negative_marking,
      negative_marks_ratio: parseFloat(negative_marks_ratio),
      start_date,
      end_date,
      max_attempts: parseInt(max_attempts),
      is_free,
      price: parseFloat(price),
      created_by: req.user.id,
      status: 'draft'
    };

    const { data: test, error } = await supabase
      .from('mock_tests')
      .insert([testData])
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'mock_test_created',
      entity_type: 'mock_test',
      entity_id: test.id,
      new_values: testData,
      description: `Created mock test: ${title}`
    }]);

    res.status(201).json({ success: true, test });
  } catch (error) {
    console.error('Create mock test error:', error);
    res.status(500).json({ error: 'Failed to create mock test' });
  }
});

// ================================
// VOCABULARY MANAGEMENT
// ================================

// Get vocabulary words
router.get('/vocabulary', requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 100, 
      search = '',
      difficulty = 'all',
      sort = 'word'
    } = req.query;

    let query = supabase
      .from('vocabulary_words')
      .select(`
        id, word, definition, pronunciation, part_of_speech, example_sentence,
        synonyms, antonyms, clat_relevance_score, frequency_rank, difficulty_level,
        learned_by_count, avg_mastery_time, created_at,
        users!vocabulary_words_created_by_fkey(name)
      `, { count: 'exact' });

    if (search) {
      query = query.or(`word.ilike.%${search}%,definition.ilike.%${search}%`);
    }
    if (difficulty !== 'all') {
      query = query.eq('difficulty_level', difficulty);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Apply sorting
    const sortField = sort === 'relevance' ? 'clat_relevance_score' : 'word';
    const ascending = sort !== 'relevance';
    query = query.order(sortField, { ascending });

    const { data: words, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      words,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get vocabulary error:', error);
    res.status(500).json({ error: 'Failed to fetch vocabulary' });
  }
});

// Create vocabulary word
router.post('/vocabulary', requireAdmin, async (req, res) => {
  try {
    const {
      word, definition, pronunciation, part_of_speech, example_sentence,
      synonyms, antonyms, etymology, clat_relevance_score = 0, difficulty_level = 'medium',
      memory_tips
    } = req.body;

    if (!word || !definition) {
      return res.status(400).json({ error: 'Word and definition are required' });
    }

    const wordData = {
      word: word.toLowerCase(),
      definition,
      pronunciation,
      part_of_speech,
      example_sentence,
      synonyms: synonyms ? synonyms.split(',').map(s => s.trim()) : [],
      antonyms: antonyms ? antonyms.split(',').map(a => a.trim()) : [],
      etymology,
      clat_relevance_score: parseInt(clat_relevance_score),
      difficulty_level,
      memory_tips,
      created_by: req.user.id
    };

    const { data: vocabularyWord, error } = await supabase
      .from('vocabulary_words')
      .insert([wordData])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Word already exists' });
      }
      throw error;
    }

    // Log the action
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'vocabulary_created',
      entity_type: 'vocabulary_word',
      entity_id: vocabularyWord.id,
      new_values: wordData,
      description: `Added vocabulary word: ${word}`
    }]);

    res.status(201).json({ success: true, word: vocabularyWord });
  } catch (error) {
    console.error('Create vocabulary error:', error);
    res.status(500).json({ error: 'Failed to create vocabulary word' });
  }
});

// ================================
// INSTITUTE MANAGEMENT
// ================================

// Get all institutes
router.get('/institutes', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all', search = '' } = req.query;

    let query = supabase
      .from('institutes')
      .select(`
        id, name, code, contact_person, email, phone, address, city, state,
        subscription_type, monthly_fee, commission_rate, total_students,
        active_students, monthly_revenue, status, onboarded_at, created_at
      `, { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,contact_person.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: institutes, error, count } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      institutes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get institutes error:', error);
    res.status(500).json({ error: 'Failed to fetch institutes' });
  }
});

// Create institute
router.post('/institutes', requireAdmin, async (req, res) => {
  try {
    const {
      name, contact_person, email, phone, address, city, state,
      subscription_type = 'basic', monthly_fee = 0, commission_rate = 0
    } = req.body;

    if (!name || !contact_person || !email) {
      return res.status(400).json({ error: 'Name, contact person, and email are required' });
    }

    // Generate unique code
    const code = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase() + 
                 Math.floor(Math.random() * 1000);

    const instituteData = {
      name,
      code,
      contact_person,
      email,
      phone,
      address,
      city,
      state,
      subscription_type,
      monthly_fee: parseFloat(monthly_fee),
      commission_rate: parseFloat(commission_rate),
      status: 'pending'
    };

    const { data: institute, error } = await supabase
      .from('institutes')
      .insert([instituteData])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Institute with this email already exists' });
      }
      throw error;
    }

    // Log the action
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'institute_created',
      entity_type: 'institute',
      entity_id: institute.id,
      new_values: instituteData,
      description: `Created institute: ${name}`
    }]);

    res.status(201).json({ success: true, institute });
  } catch (error) {
    console.error('Create institute error:', error);
    res.status(500).json({ error: 'Failed to create institute' });
  }
});

// ================================
// FINANCIAL MANAGEMENT
// ================================

// Get financial summary
router.get('/financial/summary', requireAdmin, async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    // Calculate date range based on period
    let startDate = new Date();
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, status, transaction_type, created_at')
      .gte('created_at', startDate.toISOString());

    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('amount_paid, status, plan_id, start_date, end_date');

    // Calculate financial metrics
    const completedTransactions = transactions?.filter(t => t.status === 'completed') || [];
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const subscriptionRevenue = subscriptions?.filter(s => s.status === 'active')
      .reduce((sum, s) => sum + parseFloat(s.amount_paid), 0) || 0;

    const summary = {
      totalRevenue,
      subscriptionRevenue,
      transactionRevenue: totalRevenue - subscriptionRevenue,
      pendingPayments: transactions?.filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0,
      refunds: transactions?.filter(t => t.status === 'refunded')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0,
      transactionCount: completedTransactions.length,
      activeSubscriptions: subscriptions?.filter(s => s.status === 'active').length || 0,
      
      // Revenue by type
      revenueByType: {
        subscription: completedTransactions.filter(t => t.transaction_type === 'subscription')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0),
        mock_test: completedTransactions.filter(t => t.transaction_type === 'mock_test')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0),
        content: completedTransactions.filter(t => t.transaction_type === 'content')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0)
      }
    };

    res.json({ success: true, summary });
  } catch (error) {
    console.error('Financial summary error:', error);
    res.status(500).json({ error: 'Failed to fetch financial summary' });
  }
});

// Get transactions
router.get('/financial/transactions', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, status = 'all', type = 'all' } = req.query;

    let query = supabase
      .from('transactions')
      .select(`
        id, amount, currency, transaction_type, status, payment_method,
        description, created_at, completed_at,
        users!transactions_user_id_fkey(name, email),
        institutes!transactions_institute_id_fkey(name)
      `, { count: 'exact' });

    if (status !== 'all') {
      query = query.eq('status', status);
    }
    if (type !== 'all') {
      query = query.eq('transaction_type', type);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: transactions, error, count } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ================================
// NOTIFICATION MANAGEMENT
// ================================

// Send notification
router.post('/notifications/send', requireAdmin, async (req, res) => {
  try {
    const {
      title, message, type = 'push', target_segments = [], target_users = [],
      send_immediately = true, scheduled_at
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    // Create notification campaign
    const campaignData = {
      name: title,
      description: `Admin notification: ${title}`,
      target_segments,
      target_users,
      send_immediately,
      scheduled_at: scheduled_at || null,
      status: send_immediately ? 'sending' : 'scheduled',
      created_by: req.user.id
    };

    const { data: campaign, error: campaignError } = await supabase
      .from('notification_campaigns')
      .insert([campaignData])
      .select()
      .single();

    if (campaignError) throw campaignError;

    // Get target users
    let targetUserIds = [...target_users];
    
    if (target_segments.length > 0) {
      const { data: segmentMembers } = await supabase
        .from('user_segment_members')
        .select('user_id')
        .in('segment_id', target_segments);
      
      targetUserIds = [...targetUserIds, ...segmentMembers.map(m => m.user_id)];
    }

    // If no specific targeting, send to all users
    if (targetUserIds.length === 0) {
      const { data: allUsers } = await supabase
        .from('users')
        .select('id')
        .eq('status', 'active');
      
      targetUserIds = allUsers.map(u => u.id);
    }

    // Remove duplicates
    targetUserIds = [...new Set(targetUserIds)];

    // Create individual notifications
    const notifications = targetUserIds.map(userId => ({
      campaign_id: campaign.id,
      user_id: userId,
      type,
      title,
      message,
      status: send_immediately ? 'sent' : 'pending',
      sent_at: send_immediately ? new Date().toISOString() : null
    }));

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notificationError) throw notificationError;

    // Update campaign with recipient count
    await supabase
      .from('notification_campaigns')
      .update({ 
        total_recipients: targetUserIds.length,
        sent_at: send_immediately ? new Date().toISOString() : null,
        status: send_immediately ? 'sent' : 'scheduled'
      })
      .eq('id', campaign.id);

    // Log the action
    await supabase.from('audit_logs').insert([{
      user_id: req.user.id,
      action: 'notification_sent',
      entity_type: 'notification_campaign',
      entity_id: campaign.id,
      description: `Sent notification "${title}" to ${targetUserIds.length} users`
    }]);

    res.json({ 
      success: true, 
      campaign,
      recipients_count: targetUserIds.length,
      message: send_immediately ? 'Notification sent successfully' : 'Notification scheduled successfully'
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// ================================
// ANALYTICS & REPORTS
// ================================

// Get user analytics
router.get('/analytics/users', requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data: users } = await supabase
      .from('users')
      .select('created_at, role, subscription_tier, status, last_login')
      .gte('created_at', startDate.toISOString());

    const { data: analytics } = await supabase
      .from('analytics_events')
      .select('event_type, user_id, timestamp')
      .gte('timestamp', startDate.toISOString());

    // Process analytics data
    const userGrowth = {};
    const roleDistribution = {};
    const subscriptionDistribution = {};
    const activeUsers = new Set();

    users?.forEach(user => {
      const date = user.created_at.split('T')[0];
      userGrowth[date] = (userGrowth[date] || 0) + 1;
      
      roleDistribution[user.role] = (roleDistribution[user.role] || 0) + 1;
      subscriptionDistribution[user.subscription_tier] = (subscriptionDistribution[user.subscription_tier] || 0) + 1;
      
      if (user.last_login && new Date(user.last_login) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
        activeUsers.add(user.id);
      }
    });

    const engagementEvents = {};
    analytics?.forEach(event => {
      engagementEvents[event.event_type] = (engagementEvents[event.event_type] || 0) + 1;
    });

    res.json({
      success: true,
      analytics: {
        userGrowth,
        roleDistribution,
        subscriptionDistribution,
        activeUsersCount: activeUsers.size,
        engagementEvents,
        totalUsers: users?.length || 0
      }
    });
  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch user analytics' });
  }
});

// ================================
// AUDIT LOGS
// ================================

// Get audit logs
router.get('/audit-logs', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 100, action = 'all', user_id = null } = req.query;

    let query = supabase
      .from('audit_logs')
      .select(`
        id, action, entity_type, entity_id, description, severity,
        ip_address, created_at,
        users!audit_logs_user_id_fkey(name, email)
      `, { count: 'exact' });

    if (action !== 'all') {
      query = query.eq('action', action);
    }
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;