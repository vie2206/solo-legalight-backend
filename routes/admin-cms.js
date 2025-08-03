// Admin Content Management System API Routes
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// ===============================
// CONTENT MANAGEMENT ROUTES
// ===============================

// Reading Passages Management
router.get('/passages', async (req, res) => {
  try {
    const { status = 'all', type, difficulty, limit = 50, offset = 0 } = req.query;
    
    let query = req.supabase
      .from('reading_passages')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== 'all') {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    const { data: passages, error } = await query;
    if (error) throw error;

    // Get total count
    const { count } = await req.supabase
      .from('reading_passages')
      .select('*', { count: 'exact', head: true });

    res.json({
      passages: passages || [],
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching passages:', error);
    res.status(500).json({ error: 'Failed to fetch passages' });
  }
});

router.post('/passages', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('type').trim().notEmpty().withMessage('Type is required'),
  body('difficulty').isIn(['Beginner', 'Intermediate', 'Advanced']).withMessage('Valid difficulty is required'),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('word_count').isInt({ min: 1 }).withMessage('Word count must be a positive integer'),
  body('tags').isArray().withMessage('Tags must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const {
      title, type, source, difficulty, estimated_time, word_count,
      tags, ai_complexity, content, vocabulary, questions,
      reading_tips, difficulty_factors, status = 'draft'
    } = req.body;

    const { data: passage, error } = await req.supabase
      .from('reading_passages')
      .insert([{
        title, type, source, difficulty, estimated_time, word_count,
        tags, ai_complexity, content, vocabulary, questions,
        reading_tips, difficulty_factors, status,
        created_by: req.user.id
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Passage created successfully',
      passage
    });
  } catch (error) {
    console.error('Error creating passage:', error);
    res.status(500).json({ error: 'Failed to create passage' });
  }
});

router.put('/passages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    const { data: passage, error } = await req.supabase
      .from('reading_passages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Passage updated successfully',
      passage
    });
  } catch (error) {
    console.error('Error updating passage:', error);
    res.status(500).json({ error: 'Failed to update passage' });
  }
});

router.delete('/passages/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await req.supabase
      .from('reading_passages')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Passage deleted successfully' });
  } catch (error) {
    console.error('Error deleting passage:', error);
    res.status(500).json({ error: 'Failed to delete passage' });
  }
});

// Vocabulary Management
router.get('/vocabulary', async (req, res) => {
  try {
    const { category, difficulty, status = 'active', limit = 50, offset = 0 } = req.query;
    
    let query = req.supabase
      .from('vocabulary_words')
      .select('*')
      .order('word')
      .range(offset, offset + limit - 1);

    if (category) query = query.eq('category', category);
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (status !== 'all') query = query.eq('status', status);

    const { data: words, error } = await query;
    if (error) throw error;

    const { count } = await req.supabase
      .from('vocabulary_words')
      .select('*', { count: 'exact', head: true });

    res.json({
      words: words || [],
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching vocabulary:', error);
    res.status(500).json({ error: 'Failed to fetch vocabulary' });
  }
});

router.post('/vocabulary', [
  body('word').trim().notEmpty().withMessage('Word is required'),
  body('definition').trim().notEmpty().withMessage('Definition is required'),
  body('difficulty').isIn(['beginner', 'intermediate', 'advanced']).withMessage('Valid difficulty is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('clat_relevance').isInt({ min: 1, max: 10 }).withMessage('CLAT relevance must be between 1 and 10')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const {
      word, definition, context, etymology, difficulty, category,
      synonyms, antonyms, usage_example, mnemonics, frequency,
      clat_relevance, examples, status = 'active'
    } = req.body;

    const { data: vocabularyWord, error } = await req.supabase
      .from('vocabulary_words')
      .insert([{
        word: word.toLowerCase(),
        definition, context, etymology, difficulty, category,
        synonyms, antonyms, usage_example, mnemonics, frequency,
        clat_relevance, examples, status,
        created_by: req.user.id
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Vocabulary word created successfully',
      word: vocabularyWord
    });
  } catch (error) {
    console.error('Error creating vocabulary word:', error);
    res.status(500).json({ error: 'Failed to create vocabulary word' });
  }
});

router.put('/vocabulary/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    const { data: word, error } = await req.supabase
      .from('vocabulary_words')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Vocabulary word updated successfully',
      word
    });
  } catch (error) {
    console.error('Error updating vocabulary word:', error);
    res.status(500).json({ error: 'Failed to update vocabulary word' });
  }
});

// GK Questions Management
router.get('/gk-questions', async (req, res) => {
  try {
    const { category, difficulty, status = 'active', limit = 50, offset = 0 } = req.query;
    
    let query = req.supabase
      .from('gk_questions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) query = query.eq('category', category);
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (status !== 'all') query = query.eq('status', status);

    const { data: questions, error } = await query;
    if (error) throw error;

    const { count } = await req.supabase
      .from('gk_questions')
      .select('*', { count: 'exact', head: true });

    res.json({
      questions: questions || [],
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching GK questions:', error);
    res.status(500).json({ error: 'Failed to fetch GK questions' });
  }
});

router.post('/gk-questions', [
  body('question').trim().notEmpty().withMessage('Question is required'),
  body('options').isArray({ min: 2, max: 6 }).withMessage('Options must be an array with 2-6 items'),
  body('correct_answer').isInt({ min: 0 }).withMessage('Correct answer must be a valid index'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('difficulty').isIn(['beginner', 'intermediate', 'advanced']).withMessage('Valid difficulty is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const {
      question, options, correct_answer, category, difficulty,
      points = 10, explanation, source, tags, status = 'active'
    } = req.body;

    // Validate correct_answer index
    if (correct_answer >= options.length) {
      return res.status(400).json({ error: 'Correct answer index is out of range' });
    }

    const { data: gkQuestion, error } = await req.supabase
      .from('gk_questions')
      .insert([{
        question, options, correct_answer, category, difficulty,
        points, explanation, source, tags, status,
        created_by: req.user.id
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'GK question created successfully',
      question: gkQuestion
    });
  } catch (error) {
    console.error('Error creating GK question:', error);
    res.status(500).json({ error: 'Failed to create GK question' });
  }
});

router.put('/gk-questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    const { data: question, error } = await req.supabase
      .from('gk_questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'GK question updated successfully',
      question
    });
  } catch (error) {
    console.error('Error updating GK question:', error);
    res.status(500).json({ error: 'Failed to update GK question' });
  }
});

// Challenges Management
router.get('/challenges', async (req, res) => {
  try {
    const { type, difficulty, is_active = true, limit = 50, offset = 0 } = req.query;
    
    let query = req.supabase
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) query = query.eq('challenge_type', type);
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (is_active !== 'all') query = query.eq('is_active', is_active === 'true');

    const { data: challenges, error } = await query;
    if (error) throw error;

    const { count } = await req.supabase
      .from('challenges')
      .select('*', { count: 'exact', head: true });

    res.json({
      challenges: challenges || [],
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

router.post('/challenges', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('difficulty').isIn(['Beginner', 'Intermediate', 'Advanced', 'Expert']).withMessage('Valid difficulty is required'),
  body('reward').isInt({ min: 1 }).withMessage('Reward must be a positive integer'),
  body('total_steps').isInt({ min: 1 }).withMessage('Total steps must be a positive integer'),
  body('challenge_type').trim().notEmpty().withMessage('Challenge type is required'),
  body('requirements').isObject().withMessage('Requirements must be an object'),
  body('completion_criteria').trim().notEmpty().withMessage('Completion criteria is required'),
  body('category').trim().notEmpty().withMessage('Category is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const {
      title, description, difficulty, reward, total_steps, challenge_type,
      time_limit, requirements, completion_criteria, icon, category,
      start_date, end_date, is_active = true
    } = req.body;

    const { data: challenge, error } = await req.supabase
      .from('challenges')
      .insert([{
        title, description, difficulty, reward, total_steps, challenge_type,
        time_limit, requirements, completion_criteria, icon, category,
        start_date, end_date, is_active,
        created_by: req.user.id
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Challenge created successfully',
      challenge
    });
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// ===============================
// BULK OPERATIONS
// ===============================

router.post('/bulk-import/vocabulary', async (req, res) => {
  try {
    const { words } = req.body;
    
    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: 'Words array is required' });
    }

    const wordsWithCreator = words.map(word => ({
      ...word,
      created_by: req.user.id,
      word: word.word.toLowerCase(),
      status: word.status || 'active'
    }));

    const { data: importedWords, error } = await req.supabase
      .from('vocabulary_words')
      .insert(wordsWithCreator)
      .select();

    if (error) throw error;

    res.json({
      message: `Successfully imported ${importedWords.length} vocabulary words`,
      imported: importedWords.length,
      words: importedWords
    });
  } catch (error) {
    console.error('Error bulk importing vocabulary:', error);
    res.status(500).json({ error: 'Failed to bulk import vocabulary' });
  }
});

router.post('/bulk-import/gk-questions', async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions array is required' });
    }

    const questionsWithCreator = questions.map(question => ({
      ...question,
      created_by: req.user.id,
      status: question.status || 'active'
    }));

    const { data: importedQuestions, error } = await req.supabase
      .from('gk_questions')
      .insert(questionsWithCreator)
      .select();

    if (error) throw error;

    res.json({
      message: `Successfully imported ${importedQuestions.length} GK questions`,
      imported: importedQuestions.length,
      questions: importedQuestions
    });
  } catch (error) {
    console.error('Error bulk importing GK questions:', error);
    res.status(500).json({ error: 'Failed to bulk import GK questions' });
  }
});

// ===============================
// ANALYTICS FOR CONTENT
// ===============================

router.get('/analytics/content-stats', async (req, res) => {
  try {
    // Get content counts
    const [passagesCount, vocabularyCount, gkQuestionsCount, challengesCount] = await Promise.all([
      req.supabase.from('reading_passages').select('*', { count: 'exact', head: true }),
      req.supabase.from('vocabulary_words').select('*', { count: 'exact', head: true }),
      req.supabase.from('gk_questions').select('*', { count: 'exact', head: true }),
      req.supabase.from('challenges').select('*', { count: 'exact', head: true })
    ]);

    // Get usage statistics
    const { data: popularPassages } = await req.supabase
      .from('user_progress')
      .select('passage_id, reading_passages(title)')
      .not('reading_passages', 'is', null)
      .limit(5);

    const { data: vocabularyProgress } = await req.supabase
      .from('vocabulary_progress')
      .select('mastery_level')
      .eq('mastery_level', 'mastered');

    res.json({
      content_stats: {
        total_passages: passagesCount.count || 0,
        total_vocabulary: vocabularyCount.count || 0,
        total_gk_questions: gkQuestionsCount.count || 0,
        total_challenges: challengesCount.count || 0
      },
      usage_stats: {
        popular_passages: popularPassages || [],
        mastered_vocabulary: vocabularyProgress?.length || 0
      }
    });
  } catch (error) {
    console.error('Error fetching content analytics:', error);
    res.status(500).json({ error: 'Failed to fetch content analytics' });
  }
});

// ===============================
// CONTENT EXPORT
// ===============================

router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json' } = req.query;

    let data;
    let filename;

    switch (type) {
      case 'passages':
        const { data: passages } = await req.supabase
          .from('reading_passages')
          .select('*')
          .order('created_at');
        data = passages;
        filename = 'reading_passages';
        break;

      case 'vocabulary':
        const { data: vocabulary } = await req.supabase
          .from('vocabulary_words')
          .select('*')
          .order('word');
        data = vocabulary;
        filename = 'vocabulary_words';
        break;

      case 'gk-questions':
        const { data: questions } = await req.supabase
          .from('gk_questions')
          .select('*')
          .order('created_at');
        data = questions;
        filename = 'gk_questions';
        break;

      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json(data);
    }
  } catch (error) {
    console.error('Error exporting content:', error);
    res.status(500).json({ error: 'Failed to export content' });
  }
});

// Helper function to convert JSON to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

module.exports = router;