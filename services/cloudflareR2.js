// CloudFlare R2 Storage Service for SOLO by Legalight
// Enterprise-scale file storage and AI content management

const AWS = require('aws-sdk');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

class CloudFlareR2Service {
  constructor() {
    // CloudFlare R2 is S3-compatible
    this.s3 = new AWS.S3({
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT, // e.g., 'https://account-id.r2.cloudflarestorage.com'
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
      region: 'auto', // CloudFlare R2 uses 'auto'
      signatureVersion: 'v4'
    });
    
    this.bucketName = process.env.CLOUDFLARE_R2_BUCKET || 'solo-legalight-content';
    this.cdnDomain = process.env.CLOUDFLARE_R2_CDN_DOMAIN; // Optional CDN domain
  }

  // Generate secure upload URL for direct frontend uploads
  async generateSignedUploadUrl(fileName, fileType, folder = 'uploads') {
    const key = `${folder}/${Date.now()}-${crypto.randomUUID()}-${fileName}`;
    
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Expires: 900, // 15 minutes
      ContentType: fileType,
      ACL: 'public-read'
    };

    try {
      const signedUrl = await this.s3.getSignedUrlPromise('putObject', params);
      
      return {
        uploadUrl: signedUrl,
        fileKey: key,
        publicUrl: this.getPublicUrl(key),
        expiresIn: 900
      };
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  // Get public URL for accessing files
  getPublicUrl(fileKey) {
    if (this.cdnDomain) {
      return `https://${this.cdnDomain}/${fileKey}`;
    }
    return `https://${this.bucketName}.${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${fileKey}`;
  }

  // Upload file directly from backend
  async uploadFile(file, folder = 'uploads', metadata = {}) {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${crypto.randomUUID()}${fileExtension}`;
    const key = `${folder}/${fileName}`;

    const params = {
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
      Metadata: {
        ...metadata,
        originalName: file.originalname,
        uploadedAt: new Date().toISOString()
      }
    };

    try {
      const result = await this.s3.upload(params).promise();
      
      return {
        fileKey: key,
        location: result.Location,
        publicUrl: this.getPublicUrl(key),
        etag: result.ETag,
        metadata: params.Metadata
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }

  // Upload multiple files with progress tracking
  async uploadMultipleFiles(files, folder = 'uploads', onProgress = null) {
    const uploadPromises = files.map(async (file, index) => {
      try {
        const result = await this.uploadFile(file, folder, {
          batchId: crypto.randomUUID(),
          fileIndex: index.toString()
        });
        
        if (onProgress) {
          onProgress(index + 1, files.length);
        }
        
        return result;
      } catch (error) {
        return { error: error.message, file: file.originalname };
      }
    });

    return await Promise.all(uploadPromises);
  }

  // Delete file
  async deleteFile(fileKey) {
    const params = {
      Bucket: this.bucketName,
      Key: fileKey
    };

    try {
      await this.s3.deleteObject(params).promise();
      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  // Get file metadata
  async getFileMetadata(fileKey) {
    const params = {
      Bucket: this.bucketName,
      Key: fileKey
    };

    try {
      const result = await this.s3.headObject(params).promise();
      return {
        contentType: result.ContentType,
        contentLength: result.ContentLength,
        lastModified: result.LastModified,
        etag: result.ETag,
        metadata: result.Metadata
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error('File not found');
    }
  }

  // List files in folder
  async listFiles(folder = '', maxKeys = 100) {
    const params = {
      Bucket: this.bucketName,
      Prefix: folder,
      MaxKeys: maxKeys
    };

    try {
      const result = await this.s3.listObjectsV2(params).promise();
      
      return {
        files: result.Contents.map(obj => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
          publicUrl: this.getPublicUrl(obj.Key)
        })),
        hasMore: result.IsTruncated,
        nextToken: result.NextContinuationToken
      };
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error('Failed to list files');
    }
  }

  // Copy file to different location
  async copyFile(sourceKey, destinationKey) {
    const params = {
      Bucket: this.bucketName,
      CopySource: `${this.bucketName}/${sourceKey}`,
      Key: destinationKey,
      ACL: 'public-read'
    };

    try {
      const result = await this.s3.copyObject(params).promise();
      return {
        newKey: destinationKey,
        publicUrl: this.getPublicUrl(destinationKey),
        etag: result.ETag
      };
    } catch (error) {
      console.error('Error copying file:', error);
      throw new Error('Failed to copy file');
    }
  }

  // Create folder structure for organized content
  async createFolderStructure(userId, userType) {
    const folders = {
      student: ['notes', 'mock-tests', 'progress', 'uploads'],
      parent: ['reports', 'communications', 'payments'],
      educator: ['course-materials', 'assessments', 'feedback', 'resources'],
      admin: ['content', 'analytics', 'backups', 'system']
    };

    const userFolders = folders[userType] || folders.student;
    const basePath = `users/${userId}`;

    // Create empty objects to establish folder structure
    const createPromises = userFolders.map(folder => {
      const params = {
        Bucket: this.bucketName,
        Key: `${basePath}/${folder}/.keep`,
        Body: '',
        ContentType: 'text/plain'
      };
      return this.s3.upload(params).promise();
    });

    try {
      await Promise.all(createPromises);
      return {
        success: true,
        basePath,
        folders: userFolders.map(f => `${basePath}/${f}`)
      };
    } catch (error) {
      console.error('Error creating folder structure:', error);
      throw new Error('Failed to create folder structure');
    }
  }

  // AI Content Processing Integration
  async processAIContent(fileKey, contentType = 'auto') {
    try {
      const metadata = await this.getFileMetadata(fileKey);
      const publicUrl = this.getPublicUrl(fileKey);

      // Determine processing type based on content
      const processingPipeline = {
        document: this.processDocument,
        image: this.processImage,
        video: this.processVideo,
        audio: this.processAudio
      };

      let pipeline = 'document'; // default
      if (metadata.contentType.startsWith('image/')) pipeline = 'image';
      if (metadata.contentType.startsWith('video/')) pipeline = 'video';
      if (metadata.contentType.startsWith('audio/')) pipeline = 'audio';

      return {
        fileKey,
        publicUrl,
        contentType: metadata.contentType,
        processingPipeline: pipeline,
        aiProcessingQueued: true,
        metadata
      };
    } catch (error) {
      console.error('Error processing AI content:', error);
      throw new Error('Failed to process content for AI');
    }
  }

  // Storage analytics and optimization
  async getStorageAnalytics() {
    try {
      const allFiles = await this.listFiles('', 1000);
      
      const analytics = {
        totalFiles: allFiles.files.length,
        totalSize: allFiles.files.reduce((sum, file) => sum + file.size, 0),
        byFolder: {},
        byFileType: {},
        oldestFile: null,
        newestFile: null
      };

      // Analyze by folder and file type
      allFiles.files.forEach(file => {
        const folder = file.key.split('/')[0];
        const extension = path.extname(file.key).toLowerCase();

        analytics.byFolder[folder] = (analytics.byFolder[folder] || 0) + file.size;
        analytics.byFileType[extension] = (analytics.byFileType[extension] || 0) + file.size;

        if (!analytics.oldestFile || file.lastModified < analytics.oldestFile.lastModified) {
          analytics.oldestFile = file;
        }
        if (!analytics.newestFile || file.lastModified > analytics.newestFile.lastModified) {
          analytics.newestFile = file;
        }
      });

      return analytics;
    } catch (error) {
      console.error('Error getting storage analytics:', error);
      throw new Error('Failed to get storage analytics');
    }
  }

  // Cleanup old files (data lifecycle management)
  async cleanupOldFiles(olderThanDays = 365, dryRun = true) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      const allFiles = await this.listFiles('', 1000);
      const oldFiles = allFiles.files.filter(file => 
        new Date(file.lastModified) < cutoffDate
      );

      if (dryRun) {
        return {
          dryRun: true,
          filesToDelete: oldFiles.length,
          spaceToReclaim: oldFiles.reduce((sum, file) => sum + file.size, 0),
          files: oldFiles
        };
      }

      // Actually delete files
      const deletePromises = oldFiles.map(file => this.deleteFile(file.key));
      const results = await Promise.allSettled(deletePromises);

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        dryRun: false,
        deleted: successful,
        failed,
        spaceReclaimed: oldFiles.reduce((sum, file) => sum + file.size, 0)
      };
    } catch (error) {
      console.error('Error cleaning up old files:', error);
      throw new Error('Failed to cleanup old files');
    }
  }
}

// Multer configuration for file uploads
const createMulterConfig = (maxSize = 100 * 1024 * 1024) => { // 100MB default
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxSize,
      files: 10 // Max 10 files per upload
    },
    fileFilter: (req, file, cb) => {
      // Add file type validation
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'video/mp4', 'video/webm', 'video/quicktime',
        'audio/mp3', 'audio/wav', 'audio/mpeg',
        'text/plain', 'application/json'
      ];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} not allowed`), false);
      }
    }
  });
};

module.exports = {
  CloudFlareR2Service,
  createMulterConfig
};