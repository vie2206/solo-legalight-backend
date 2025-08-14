const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
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

/**
 * Comprehensive notification service for the doubt resolution system
 */
class NotificationService {
  constructor(io) {
    this.io = io;
  }

  /**
   * Send notification to database and real-time socket
   */
  async sendNotification({
    userId,
    doubtId,
    type,
    title,
    message,
    metadata = {},
    priority = 'normal'
  }) {
    try {
      // Save notification to database
      const { data: notification, error } = await supabase
        .from('doubt_notifications')
        .insert({
          doubt_id: doubtId,
          user_id: userId,
          notification_type: type,
          title,
          message,
          metadata,
          priority,
          is_read: false
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save notification:', error);
        return null;
      }

      // Send real-time notification via WebSocket
      this.io.to(`user_${userId}`).emit('notification', {
        id: notification.id,
        doubt_id: doubtId,
        type,
        title,
        message,
        metadata,
        priority,
        created_at: notification.created_at
      });

      console.log(`📢 Notification sent: ${type} to user ${userId}`);
      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }

  /**
   * Send doubt-related notifications to multiple recipients
   */
  async notifyDoubtParticipants({
    doubtId,
    type,
    title,
    message,
    excludeUserId = null,
    metadata = {}
  }) {
    try {
      // Get doubt details and participants
      const { data: doubt } = await supabase
        .from('doubts')
        .select(`
          *,
          student:student_id(id, name, email),
          assigned_educator:assigned_educator_id(id, name, email)
        `)
        .eq('id', doubtId)
        .single();

      if (!doubt) return;

      const recipients = [];

      // Add student to recipients
      if (doubt.student_id && doubt.student_id !== excludeUserId) {
        recipients.push(doubt.student_id);
      }

      // Add assigned educator to recipients
      if (doubt.assigned_educator_id && doubt.assigned_educator_id !== excludeUserId) {
        recipients.push(doubt.assigned_educator_id);
      }

      // Add parents if student is involved
      if (type.includes('resolved') || type.includes('response')) {
        const { data: parents } = await supabase
          .from('parent_student_relationships')
          .select('parent_id')
          .eq('student_id', doubt.student_id);

        parents?.forEach(parent => {
          if (parent.parent_id !== excludeUserId) {
            recipients.push(parent.parent_id);
          }
        });
      }

      // Send notifications to all recipients
      const notifications = await Promise.all(
        recipients.map(userId =>
          this.sendNotification({
            userId,
            doubtId,
            type,
            title,
            message,
            metadata: {
              ...metadata,
              doubt_title: doubt.title,
              student_name: doubt.student?.name
            }
          })
        )
      );

      return notifications.filter(Boolean);
    } catch (error) {
      console.error('Error notifying doubt participants:', error);
      return [];
    }
  }

  /**
   * Notify educators about new doubt assignments
   */
  async notifyEducatorsNewDoubt(doubtId) {
    try {
      const { data: doubt } = await supabase
        .from('doubts')
        .select(`
          *,
          student:student_id(name)
        `)
        .eq('id', doubtId)
        .single();

      if (!doubt) return;

      // Get eligible educators for the subject
      const { data: educators } = await supabase
        .from('educator_specializations')
        .select(`
          educator_id,
          users:educator_id(id, name, email)
        `)
        .eq('subject', doubt.subject)
        .eq('is_active', true);

      if (!educators?.length) return;

      // Notify all eligible educators
      const notifications = await Promise.all(
        educators.map(educator =>
          this.sendNotification({
            userId: educator.educator_id,
            doubtId,
            type: 'new_doubt_available',
            title: 'New Doubt Available',
            message: `New ${doubt.subject} doubt from ${doubt.student?.name}: "${doubt.title}"`,
            priority: doubt.priority === 'urgent' ? 'high' : 'normal',
            metadata: {
              subject: doubt.subject,
              difficulty: doubt.difficulty_level,
              student_name: doubt.student?.name
            }
          })
        )
      );

      return notifications.filter(Boolean);
    } catch (error) {
      console.error('Error notifying educators:', error);
      return [];
    }
  }

  /**
   * Send bulk notifications (for system announcements)
   */
  async sendBulkNotification({
    userIds,
    type,
    title,
    message,
    metadata = {},
    priority = 'normal'
  }) {
    try {
      const notifications = await Promise.all(
        userIds.map(userId =>
          this.sendNotification({
            userId,
            doubtId: null,
            type,
            title,
            message,
            metadata,
            priority
          })
        )
      );

      return notifications.filter(Boolean);
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      return [];
    }
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds, userId) {
    try {
      const { error } = await supabase
        .from('doubt_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', notificationIds)
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to mark notifications as read:', error);
        return false;
      }

      // Emit read receipt to user's socket
      this.io.to(`user_${userId}`).emit('notifications_read', {
        notification_ids: notificationIds,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      return false;
    }
  }

  /**
   * Get unread notification count for user
   */
  async getUnreadCount(userId) {
    try {
      const { count, error } = await supabase
        .from('doubt_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Failed to get unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Get user's recent notifications
   */
  async getUserNotifications(userId, limit = 20, offset = 0) {
    try {
      const { data: notifications, error } = await supabase
        .from('doubt_notifications')
        .select(`
          *,
          doubt:doubt_id(title, status)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Failed to get user notifications:', error);
        return [];
      }

      return notifications || [];
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  /**
   * Clean up old notifications (run periodically)
   */
  async cleanupOldNotifications(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { error } = await supabase
        .from('doubt_notifications')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('Failed to cleanup old notifications:', error);
        return false;
      }

      console.log(`🧹 Cleaned up notifications older than ${daysToKeep} days`);
      return true;
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      return false;
    }
  }

  /**
   * Send email notification (if email service is configured)
   */
  async sendEmailNotification({
    userId,
    subject,
    template,
    data = {}
  }) {
    try {
      // Get user email
      const { data: user } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single();

      if (!user?.email) return false;

      // TODO: Integrate with email service (SendGrid, Mailgun, etc.)
      console.log(`📧 Email notification would be sent to: ${user.email}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Template: ${template}`);

      return true;
    } catch (error) {
      console.error('Error sending email notification:', error);
      return false;
    }
  }
}

module.exports = NotificationService;