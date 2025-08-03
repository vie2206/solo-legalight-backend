// File Management API Routes for SOLO by Legalight
// CloudFlare R2 integration for massive scale content storage

const express = require('express');
const { CloudFlareR2Service, createMulterConfig } = require('../services/cloudflareR2');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Initialize CloudFlare R2 service
const r2Service = new CloudFlareR2Service();

// Multer configurations for different upload types
const standardUpload = createMulterConfig(50 * 1024 * 1024); // 50MB
const largeUpload = createMulterConfig(500 * 1024 * 1024); // 500MB for videos
const documentUpload = createMulterConfig(20 * 1024 * 1024); // 20MB for documents

// Get signed upload URL for direct frontend uploads
router.post('/upload-url', authenticateToken, async (req, res) => {
  try {
    const { fileName, fileType, folder, isLarge = false } = req.body;
    const userId = req.user.userId;

    if (!fileName || !fileType) {
      return res.status(400).json({ 
        error: 'fileName and fileType are required' 
      });
    }

    // Validate file size based on user role
    const maxSizes = {
      student: 50 * 1024 * 1024, // 50MB
      parent: 30 * 1024 * 1024,  // 30MB
      educator: 200 * 1024 * 1024, // 200MB
      admin: 1024 * 1024 * 1024   // 1GB
    };

    const userRole = req.user.role || 'student';
    const maxSize = maxSizes[userRole];

    // Create user-specific folder structure
    const userFolder = folder || `users/${userId}/${userRole}`;

    const uploadData = await r2Service.generateSignedUploadUrl(
      fileName, 
      fileType, 
      userFolder
    );

    // Store upload metadata in database
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    await supabase.from('file_uploads').insert({
      user_id: userId,
      file_key: uploadData.fileKey,
      file_name: fileName,
      file_type: fileType,
      folder: userFolder,
      status: 'pending',
      max_size: maxSize,
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      uploadData,
      maxSize,
      userRole
    });

  } catch (error) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate upload URL',
      details: error.message 
    });
  }
});

// Direct file upload via backend
router.post('/upload', authenticateToken, standardUpload.array('files', 10), async (req, res) => {
  try {
    const files = req.files;
    const { folder, category = 'general' } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role || 'student';

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    // Create user-specific folder
    const userFolder = folder || `users/${userId}/${category}`;

    // Process uploads with progress tracking
    const uploadResults = await r2Service.uploadMultipleFiles(
      files,
      userFolder,
      (completed, total) => {
        console.log(`Upload progress: ${completed}/${total}`);
      }
    );

    // Store file metadata in database
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const fileRecords = uploadResults
      .filter(result => !result.error)
      .map(result => ({
        user_id: userId,
        file_key: result.fileKey,
        file_name: result.metadata.originalName,
        file_type: files.find(f => f.originalname === result.metadata.originalName)?.mimetype,
        folder: userFolder,
        category,
        public_url: result.publicUrl,
        file_size: files.find(f => f.originalname === result.metadata.originalName)?.size,
        status: 'completed',
        ai_processing_status: 'queued',
        created_at: new Date().toISOString()
      }));

    if (fileRecords.length > 0) {
      await supabase.from('file_uploads').insert(fileRecords);
    }

    // Queue AI processing for supported file types
    const aiProcessingQueue = uploadResults
      .filter(result => !result.error && shouldProcessWithAI(result.metadata.originalName))
      .map(result => r2Service.processAIContent(result.fileKey));

    const aiResults = await Promise.allSettled(aiProcessingQueue);

    res.json({
      success: true,
      uploaded: uploadResults.filter(r => !r.error).length,
      failed: uploadResults.filter(r => r.error).length,
      results: uploadResults,
      aiProcessing: aiResults.length,
      folder: userFolder
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ 
      error: 'Failed to upload files',
      details: error.message 
    });
  }
});

// Large file upload for videos/courses
router.post('/upload-large', authenticateToken, largeUpload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { title, description, category = 'course-content' } = req.body;
    const userId = req.user.userId;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Only educators and admins can upload large files
    if (!['educator', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for large file upload' });
    }

    const folder = `content/${category}`;
    const uploadResult = await r2Service.uploadFile(file, folder, {
      title,
      description,
      uploadedBy: userId,
      category
    });

    // Store in database with enhanced metadata
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    await supabase.from('content_library').insert({
      user_id: userId,
      file_key: uploadResult.fileKey,
      title,
      description,
      category,
      file_type: file.mimetype,
      file_size: file.size,
      public_url: uploadResult.publicUrl,
      status: 'published',
      ai_processing_status: 'queued',
      created_at: new Date().toISOString()
    });

    // Queue for AI processing (transcription, analysis, etc.)
    const aiProcessing = await r2Service.processAIContent(uploadResult.fileKey, 'video');

    res.json({
      success: true,
      file: uploadResult,
      aiProcessing,
      metadata: { title, description, category }
    });

  } catch (error) {
    console.error('Error uploading large file:', error);
    res.status(500).json({ 
      error: 'Failed to upload large file',
      details: error.message 
    });
  }
});

// Get user's files
router.get('/files', authenticateToken, async (req, res) => {
  try {
    const { folder, category, page = 1, limit = 20 } = req.query;
    const userId = req.user.userId;

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    let query = supabase
      .from('file_uploads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (folder) query = query.ilike('folder', `%${folder}%`);
    if (category) query = query.eq('category', category);

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: files, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      files,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        hasMore: offset + limit < count
      }
    });

  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ 
      error: 'Failed to fetch files',
      details: error.message 
    });
  }
});

// Delete file
router.delete('/files/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.userId;

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Get file info
    const { data: file, error: fetchError } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from CloudFlare R2
    await r2Service.deleteFile(file.file_key);

    // Delete from database
    await supabase
      .from('file_uploads')
      .delete()
      .eq('id', fileId);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ 
      error: 'Failed to delete file',
      details: error.message 
    });
  }
});

// Get storage analytics for admin users
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'operation_manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const analytics = await r2Service.getStorageAnalytics();

    // Get database analytics
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: dbAnalytics } = await supabase
      .from('file_uploads')
      .select('file_size, file_type, category, created_at');

    const dbStats = {
      totalFiles: dbAnalytics?.length || 0,
      totalSize: dbAnalytics?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0,
      byCategory: {},
      byFileType: {}
    };

    dbAnalytics?.forEach(file => {
      dbStats.byCategory[file.category] = (dbStats.byCategory[file.category] || 0) + (file.file_size || 0);
      dbStats.byFileType[file.file_type] = (dbStats.byFileType[file.file_type] || 0) + (file.file_size || 0);
    });

    res.json({
      success: true,
      cloudStorage: analytics,
      database: dbStats,
      combined: {
        totalFiles: analytics.totalFiles + dbStats.totalFiles,
        totalSize: analytics.totalSize + dbStats.totalSize
      }
    });

  } catch (error) {
    console.error('Error getting storage analytics:', error);
    res.status(500).json({ 
      error: 'Failed to get storage analytics',
      details: error.message 
    });
  }
});

// Cleanup old files (admin only)
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    if (!['admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { olderThanDays = 365, dryRun = true } = req.body;

    const result = await r2Service.cleanupOldFiles(olderThanDays, dryRun);

    res.json({
      success: true,
      cleanup: result
    });

  } catch (error) {
    console.error('Error cleaning up files:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup files',
      details: error.message 
    });
  }
});

// Helper function to determine if file should be processed with AI
function shouldProcessWithAI(fileName) {
  const aiSupportedExtensions = ['.pdf', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.mp4', '.webm', '.mp3', '.wav'];
  const extension = require('path').extname(fileName).toLowerCase();
  return aiSupportedExtensions.includes(extension);
}

module.exports = router;