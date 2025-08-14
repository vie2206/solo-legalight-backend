const jwt = require('jsonwebtoken');
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

// WebSocket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user data
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return next(new Error('Invalid token'));
    }

    socket.userId = user.id;
    socket.userRole = user.role;
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
};

// Handle socket connections for doubt system
const handleDoubtSocket = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`🔌 User connected to doubt system: ${socket.user.email} (${socket.userRole})`);

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);
    
    // Join educators to educator room
    if (socket.userRole === 'educator') {
      socket.join('educators');
    }
    
    // Join admins to admin room
    if (['admin', 'operation_manager'].includes(socket.userRole)) {
      socket.join('admins');
    }

    // Handle joining doubt-specific rooms
    socket.on('join_doubt', async (doubtId) => {
      try {
        // Verify user has access to this doubt
        const { data: doubt, error } = await supabase
          .from('doubts')
          .select('*')
          .eq('id', doubtId)
          .single();

        if (error || !doubt) {
          socket.emit('error', { message: 'Doubt not found' });
          return;
        }

        // Check access permissions
        const hasAccess = 
          doubt.student_id === socket.userId ||
          doubt.assigned_educator_id === socket.userId ||
          ['admin', 'operation_manager'].includes(socket.userRole) ||
          (socket.userRole === 'parent' && await checkParentAccess(socket.userId, doubt.student_id));

        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied to this doubt' });
          return;
        }

        socket.join(`doubt_${doubtId}`);
        console.log(`👥 User ${socket.user.email} joined doubt room: ${doubtId}`);
        
        socket.emit('joined_doubt', { doubtId });
      } catch (error) {
        console.error('Error joining doubt room:', error);
        socket.emit('error', { message: 'Failed to join doubt room' });
      }
    });

    // Handle leaving doubt-specific rooms
    socket.on('leave_doubt', (doubtId) => {
      socket.leave(`doubt_${doubtId}`);
      console.log(`👋 User ${socket.user.email} left doubt room: ${doubtId}`);
    });

    // Handle real-time doubt updates
    socket.on('doubt_typing', (data) => {
      socket.to(`doubt_${data.doubtId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.user.name,
        typing: data.typing
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected from doubt system: ${socket.user.email}`);
    });
  });
};

// Helper function to check parent access
async function checkParentAccess(parentId, studentId) {
  const { data } = await supabase
    .from('parent_student_relationships')
    .select('*')
    .eq('parent_id', parentId)
    .eq('student_id', studentId)
    .single();
  
  return !!data;
}

// Emit doubt notifications to relevant users
const emitDoubtNotification = async (io, notification) => {
  try {
    const { doubt_id, user_id, notification_type, title, message, metadata } = notification;

    // Get doubt details to determine who should receive notifications
    const { data: doubt } = await supabase
      .from('doubts')
      .select('*')
      .eq('id', doubt_id)
      .single();

    if (!doubt) return;

    // Emit to specific user
    io.to(`user_${user_id}`).emit('doubt_notification', {
      id: notification.id,
      doubt_id,
      type: notification_type,
      title,
      message,
      metadata,
      created_at: notification.created_at
    });

    // Emit to doubt room for real-time updates
    io.to(`doubt_${doubt_id}`).emit('doubt_update', {
      doubt_id,
      type: notification_type,
      message,
      timestamp: new Date().toISOString()
    });

    // Special handling for new doubts - notify available educators
    if (notification_type === 'new_doubt') {
      io.to('educators').emit('new_doubt_available', {
        doubt_id,
        title: doubt.title,
        subject: doubt.subject,
        priority: doubt.priority,
        student_name: metadata.student_name || 'Student'
      });
    }

    // Notify admins of system events
    if (['doubt_resolved', 'doubt_closed'].includes(notification_type)) {
      io.to('admins').emit('doubt_statistics_update', {
        type: notification_type,
        doubt_id,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`📢 Doubt notification emitted: ${notification_type} for doubt ${doubt_id}`);
  } catch (error) {
    console.error('Error emitting doubt notification:', error);
  }
};

// Emit response notifications
const emitResponseNotification = async (io, responseData) => {
  try {
    const { doubt_id, author_id, content, author_type } = responseData;

    // Get doubt and author details
    const [{ data: doubt }, { data: author }] = await Promise.all([
      supabase.from('doubts').select('*').eq('id', doubt_id).single(),
      supabase.from('users').select('name, role').eq('id', author_id).single()
    ]);

    if (!doubt || !author) return;

    // Notify doubt room participants
    io.to(`doubt_${doubt_id}`).emit('new_response', {
      doubt_id,
      response_id: responseData.id,
      author_name: author.name,
      author_type,
      content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      created_at: responseData.created_at
    });

    // Notify student if response is from educator/admin
    if (author_id !== doubt.student_id) {
      io.to(`user_${doubt.student_id}`).emit('doubt_notification', {
        type: 'response_added',
        title: 'New Response',
        message: `${author.name} responded to your doubt: "${doubt.title}"`,
        doubt_id,
        response_id: responseData.id
      });
    }

    // Notify assigned educator if response is from student/another educator
    if (doubt.assigned_educator_id && author_id !== doubt.assigned_educator_id) {
      io.to(`user_${doubt.assigned_educator_id}`).emit('doubt_notification', {
        type: 'response_added',
        title: 'New Response',
        message: `New response added to doubt: "${doubt.title}"`,
        doubt_id,
        response_id: responseData.id
      });
    }

    console.log(`💬 Response notification emitted for doubt ${doubt_id}`);
  } catch (error) {
    console.error('Error emitting response notification:', error);
  }
};

module.exports = {
  handleDoubtSocket,
  emitDoubtNotification,
  emitResponseNotification
};