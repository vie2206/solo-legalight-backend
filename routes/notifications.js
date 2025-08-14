const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');

// GET /api/notifications - Get user's notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const notificationService = new NotificationService(req.io);

    const notifications = await notificationService.getUserNotifications(
      req.user.id,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      notifications,
      total: notifications.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const notificationService = new NotificationService(req.io);
    const count = await notificationService.getUnreadCount(req.user.id);
    
    res.json({ unread_count: count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// PUT /api/notifications/mark-read - Mark notifications as read
router.put('/mark-read', authenticateToken, async (req, res) => {
  try {
    const { notification_ids } = req.body;

    if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
      return res.status(400).json({ error: 'notification_ids array is required' });
    }

    const notificationService = new NotificationService(req.io);
    const success = await notificationService.markAsRead(notification_ids, req.user.id);

    if (success) {
      res.json({ message: 'Notifications marked as read' });
    } else {
      res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await req.supabase
      .from('doubt_notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      console.error('Error deleting notification:', error);
      return res.status(500).json({ error: 'Failed to delete notification' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// POST /api/notifications/test - Test notification (admin only)
router.post('/test', authenticateToken, async (req, res) => {
  try {
    // Only admins can send test notifications
    if (!['admin', 'operation_manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { user_id, title, message, type = 'system_message' } = req.body;

    const notificationService = new NotificationService(req.io);
    const notification = await notificationService.sendNotification({
      userId: user_id || req.user.id,
      doubtId: null,
      type,
      title: title || 'Test Notification',
      message: message || 'This is a test notification from the system.',
      priority: 'normal'
    });

    if (notification) {
      res.json({ 
        message: 'Test notification sent successfully',
        notification 
      });
    } else {
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

module.exports = router;