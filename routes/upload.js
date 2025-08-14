const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create subdirectories based on file type and user
    const userId = req.user.id;
    const fileType = file.mimetype.startsWith('image/') ? 'images' : 'documents';
    const userDir = path.join(uploadsDir, fileType, userId);
    
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    cb(null, userDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    cb(null, `${baseName}-${uniqueSuffix}${extension}`);
  }
});

// File filter to restrict file types
const fileFilter = (req, file, cb) => {
  // Allowed file types for doubt attachments
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Supported types: images, PDF, Word documents, and text files.'), false);
  }
};

// Configure multer with size limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  }
});

// POST /api/upload/doubt-attachments - Upload files for doubt system
router.post('/doubt-attachments', authenticateToken, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Process uploaded files
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      url: `/api/upload/files/${path.basename(path.dirname(file.path))}/${req.user.id}/${file.filename}`
    }));

    // Log upload activity
    console.log(`📎 Files uploaded by ${req.user.email}:`, uploadedFiles.map(f => f.originalName));

    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });

  } catch (error) {
    console.error('File upload error:', error);
    
    // Clean up any uploaded files if there was an error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({ 
      error: 'File upload failed',
      details: error.message 
    });
  }
});

// GET /api/upload/files/:type/:userId/:filename - Serve uploaded files
router.get('/files/:type/:userId/:filename', authenticateToken, async (req, res) => {
  try {
    const { type, userId, filename } = req.params;
    
    // Security check - users can only access their own files, or admins/educators can access any
    const canAccess = 
      req.user.id === userId ||
      ['admin', 'operation_manager', 'educator'].includes(req.user.role);

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = path.join(uploadsDir, type, userId, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileExtension = path.extname(filename).toLowerCase();

    // Set appropriate content type
    let contentType = 'application/octet-stream';
    if (fileExtension === '.pdf') {
      contentType = 'application/pdf';
    } else if (['.jpg', '.jpeg'].includes(fileExtension)) {
      contentType = 'image/jpeg';
    } else if (fileExtension === '.png') {
      contentType = 'image/png';
    } else if (fileExtension === '.gif') {
      contentType = 'image/gif';
    } else if (fileExtension === '.webp') {
      contentType = 'image/webp';
    } else if (fileExtension === '.txt') {
      contentType = 'text/plain';
    } else if (fileExtension === '.md') {
      contentType = 'text/markdown';
    }

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('File serving error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// DELETE /api/upload/files/:type/:userId/:filename - Delete uploaded file
router.delete('/files/:type/:userId/:filename', authenticateToken, async (req, res) => {
  try {
    const { type, userId, filename } = req.params;
    
    // Security check - users can only delete their own files, or admins can delete any
    const canDelete = 
      req.user.id === userId ||
      ['admin', 'operation_manager'].includes(req.user.role);

    if (!canDelete) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = path.join(uploadsDir, type, userId, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    console.log(`🗑️ File deleted by ${req.user.email}: ${filename}`);
    res.json({ message: 'File deleted successfully' });

  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// GET /api/upload/user-files - Get user's uploaded files
router.get('/user-files', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const files = [];

    // Check both images and documents directories
    const fileTypes = ['images', 'documents'];
    
    for (const type of fileTypes) {
      const userDir = path.join(uploadsDir, type, userId);
      
      if (fs.existsSync(userDir)) {
        const fileList = fs.readdirSync(userDir);
        
        for (const filename of fileList) {
          const filePath = path.join(userDir, filename);
          const stats = fs.statSync(filePath);
          
          files.push({
            filename,
            type,
            size: stats.size,
            uploadedAt: stats.birthtime,
            url: `/api/upload/files/${type}/${userId}/${filename}`
          });
        }
      }
    }

    // Sort by upload date (newest first)
    files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({ files });

  } catch (error) {
    console.error('Error fetching user files:', error);
    res.status(500).json({ error: 'Failed to fetch user files' });
  }
});

// GET /api/upload/storage-info - Get storage usage info
router.get('/storage-info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    let totalSize = 0;
    let fileCount = 0;

    // Calculate storage usage
    const fileTypes = ['images', 'documents'];
    
    for (const type of fileTypes) {
      const userDir = path.join(uploadsDir, type, userId);
      
      if (fs.existsSync(userDir)) {
        const fileList = fs.readdirSync(userDir);
        
        for (const filename of fileList) {
          const filePath = path.join(userDir, filename);
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
          fileCount++;
        }
      }
    }

    const storageLimit = 100 * 1024 * 1024; // 100MB per user
    const usagePercentage = (totalSize / storageLimit) * 100;

    res.json({
      totalSize,
      totalSizeFormatted: `${(totalSize / (1024 * 1024)).toFixed(2)} MB`,
      fileCount,
      storageLimit,
      storageLimitFormatted: `${storageLimit / (1024 * 1024)} MB`,
      usagePercentage: Math.round(usagePercentage),
      remainingSpace: storageLimit - totalSize,
      remainingSpaceFormatted: `${((storageLimit - totalSize) / (1024 * 1024)).toFixed(2)} MB`
    });

  } catch (error) {
    console.error('Error fetching storage info:', error);
    res.status(500).json({ error: 'Failed to fetch storage info' });
  }
});

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large',
        message: 'Maximum file size is 10MB' 
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Too many files',
        message: 'Maximum 5 files per upload' 
      });
    }
  }
  
  res.status(400).json({ 
    error: 'Upload error',
    message: error.message 
  });
});

module.exports = router;