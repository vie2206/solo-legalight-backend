// Script to populate sample data for testing parent dashboard with real data
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function populateSampleData() {
  try {
    console.log('🚀 Starting sample data population...');

    // 1. Create sample users (parent and children)
    console.log('\n1️⃣ Creating sample users...');
    await createSampleUsers();

    // 2. Create parent-child relationships
    console.log('\n2️⃣ Creating parent-child relationships...');
    await createParentChildRelationships();

    // 3. Add student metadata
    console.log('\n3️⃣ Adding student metadata...');
    await createStudentMetadata();

    // 4. Create sample reading passages
    console.log('\n4️⃣ Creating sample reading passages...');
    await createReadingPassages();

    // 5. Add user progress data
    console.log('\n5️⃣ Adding user progress data...');
    await createUserProgress();

    // 6. Add user analytics
    console.log('\n6️⃣ Adding user analytics...');
    await createUserAnalytics();

    // 7. Create sample messages
    console.log('\n7️⃣ Creating sample messages...');
    await createSampleMessages();

    // 8. Create sample payments
    console.log('\n8️⃣ Creating sample payments...');
    await createSamplePayments();

    // 9. Create sample classes and assignments
    console.log('\n9️⃣ Creating sample classes and assignments...');
    await createClassesAndAssignments();

    // 10. Create sample notifications
    console.log('\n🔟 Creating sample notifications...');
    await createSampleNotifications();

    console.log('\n✅ Sample data population completed successfully!');
    console.log('\n📊 You can now test the parent dashboard with real data.');
    
  } catch (error) {
    console.error('❌ Error populating sample data:', error);
  }
}

async function createSampleUsers() {
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const users = [
    {
      id: 'parent-001',
      email: 'parent@demo.com',
      name: 'Rajesh Kumar',
      role: 'parent',
      encrypted_password: hashedPassword,
      phone: '+91-9876543210',
      phone_verified: true
    },
    {
      id: 'student-001', 
      email: 'ananya@demo.com',
      name: 'Ananya Kumar',
      role: 'student',
      encrypted_password: hashedPassword,
      phone: '+91-9876543211',
      phone_verified: true
    },
    {
      id: 'student-002',
      email: 'arjun@demo.com', 
      name: 'Arjun Kumar',
      role: 'student',
      encrypted_password: hashedPassword,
      phone: '+91-9876543212',
      phone_verified: true
    },
    {
      id: 'educator-001',
      email: 'educator@demo.com',
      name: 'Dr. Priya Sharma',
      role: 'educator', 
      encrypted_password: hashedPassword,
      phone: '+91-9876543213',
      phone_verified: true
    }
  ];

  for (const user of users) {
    const { error } = await supabase
      .from('users')
      .upsert(user, { onConflict: 'id' });
    
    if (error && error.code !== '23505') {
      console.error('Error creating user:', user.email, error);
    } else {
      console.log(`✅ Created user: ${user.email}`);
    }
  }
}

async function createParentChildRelationships() {
  const relationships = [
    {
      parent_id: 'parent-001',
      child_id: 'student-001',
      relationship_type: 'parent',
      is_active: true
    },
    {
      parent_id: 'parent-001', 
      child_id: 'student-002',
      relationship_type: 'parent',
      is_active: true
    }
  ];

  for (const relationship of relationships) {
    const { error } = await supabase
      .from('parent_child_relationships')
      .upsert(relationship, { onConflict: 'parent_id,child_id' });
    
    if (error) {
      console.error('Error creating relationship:', error);
    } else {
      console.log(`✅ Created parent-child relationship: ${relationship.parent_id} -> ${relationship.child_id}`);
    }
  }
}

async function createStudentMetadata() {
  const metadata = [
    {
      student_id: 'student-001',
      grade: '11th Grade',
      school: 'Delhi Public School, R.K. Puram',
      age: 16,
      parent_notes: 'Ananya is very dedicated to her studies and shows great improvement in Legal Reasoning.',
      educator_notes: 'Excellent analytical skills, needs to work on time management during tests.'
    },
    {
      student_id: 'student-002', 
      grade: '12th Grade',
      school: 'St. Columba\'s School, Delhi',
      age: 17,
      parent_notes: 'Arjun has been consistently performing well. Preparing seriously for CLAT 2024.',
      educator_notes: 'Strong in Current Affairs and English, needs improvement in Quantitative Techniques.'
    }
  ];

  for (const meta of metadata) {
    const { error } = await supabase
      .from('student_metadata')
      .upsert(meta, { onConflict: 'student_id' });
    
    if (error) {
      console.error('Error creating metadata:', error);
    } else {
      console.log(`✅ Created metadata for student: ${meta.student_id}`);
    }
  }
}

async function createReadingPassages() {
  const passages = [
    {
      id: 'passage-001',
      title: 'Constitutional Law: Fundamental Rights',
      content: 'The Constitution of India guarantees certain fundamental rights to all citizens...',
      type: 'legal_reasoning',
      difficulty: 'medium',
      category: 'Constitutional Law',
      word_count: 450,
      estimated_time: 8
    },
    {
      id: 'passage-002',
      title: 'Contract Law: Consideration and Promise',
      content: 'In contract law, consideration is something of value that is exchanged...',
      type: 'legal_reasoning', 
      difficulty: 'hard',
      category: 'Contract Law',
      word_count: 520,
      estimated_time: 10
    },
    {
      id: 'passage-003',
      title: 'English Comprehension: Modern Literature',
      content: 'The evolution of modern literature has been marked by significant changes...',
      type: 'english',
      difficulty: 'easy',
      category: 'Literature',
      word_count: 380,
      estimated_time: 6
    }
  ];

  for (const passage of passages) {
    const { error } = await supabase
      .from('reading_passages')
      .upsert(passage, { onConflict: 'id' });
    
    if (error) {
      console.error('Error creating passage:', error);
    } else {
      console.log(`✅ Created passage: ${passage.title}`);
    }
  }
}

async function createUserProgress() {
  const now = new Date();
  const progress = [];

  // Generate progress for last 30 days for both students
  for (let i = 0; i < 30; i++) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    
    // Ananya's progress (more consistent)
    if (Math.random() > 0.2) { // 80% chance of study
      progress.push({
        user_id: 'student-001',
        passage_id: ['passage-001', 'passage-002', 'passage-003'][Math.floor(Math.random() * 3)],
        reading_time: Math.floor(Math.random() * 20) + 10, // 10-30 minutes
        comprehension_score: Math.floor(Math.random() * 20) + 75, // 75-95%
        questions_attempted: Math.floor(Math.random() * 5) + 5, // 5-10 questions
        questions_correct: Math.floor(Math.random() * 3) + 4, // 4-7 correct
        completed_at: date.toISOString()
      });
    }

    // Arjun's progress (slightly less consistent)
    if (Math.random() > 0.3) { // 70% chance of study
      progress.push({
        user_id: 'student-002',
        passage_id: ['passage-001', 'passage-002', 'passage-003'][Math.floor(Math.random() * 3)],
        reading_time: Math.floor(Math.random() * 25) + 8, // 8-33 minutes
        comprehension_score: Math.floor(Math.random() * 25) + 65, // 65-90%
        questions_attempted: Math.floor(Math.random() * 6) + 4, // 4-10 questions
        questions_correct: Math.floor(Math.random() * 4) + 3, // 3-7 correct
        completed_at: date.toISOString()
      });
    }
  }

  // Insert progress in batches
  const batchSize = 50;
  for (let i = 0; i < progress.length; i += batchSize) {
    const batch = progress.slice(i, i + batchSize);
    const { error } = await supabase
      .from('user_progress')
      .upsert(batch);
    
    if (error) {
      console.error('Error creating progress batch:', error);
    }
  }
  
  console.log(`✅ Created ${progress.length} progress entries`);
}

async function createUserAnalytics() {
  const analytics = [];
  const now = new Date();

  // Generate analytics for last 90 days
  for (let i = 0; i < 90; i++) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];

    // Ananya's analytics
    if (Math.random() > 0.15) { // 85% chance of activity
      analytics.push({
        user_id: 'student-001',
        date: dateStr,
        reading_time: Math.floor(Math.random() * 90) + 30, // 30-120 minutes
        passages_read: Math.floor(Math.random() * 4) + 1, // 1-5 passages
        quiz_score: Math.floor(Math.random() * 20) + 75, // 75-95%
        questions_attempted: Math.floor(Math.random() * 20) + 10, // 10-30 questions
        questions_correct: Math.floor(Math.random() * 15) + 8, // 8-23 correct
        study_sessions: Math.floor(Math.random() * 3) + 1 // 1-4 sessions
      });
    }

    // Arjun's analytics  
    if (Math.random() > 0.25) { // 75% chance of activity
      analytics.push({
        user_id: 'student-002',
        date: dateStr,
        reading_time: Math.floor(Math.random() * 80) + 25, // 25-105 minutes
        passages_read: Math.floor(Math.random() * 3) + 1, // 1-4 passages
        quiz_score: Math.floor(Math.random() * 25) + 65, // 65-90%
        questions_attempted: Math.floor(Math.random() * 18) + 8, // 8-26 questions
        questions_correct: Math.floor(Math.random() * 12) + 6, // 6-18 correct
        study_sessions: Math.floor(Math.random() * 2) + 1 // 1-3 sessions
      });
    }
  }

  // Insert analytics in batches
  const batchSize = 50;
  for (let i = 0; i < analytics.length; i += batchSize) {
    const batch = analytics.slice(i, i + batchSize);
    const { error } = await supabase
      .from('user_analytics')
      .upsert(batch, { onConflict: 'user_id,date' });
    
    if (error) {
      console.error('Error creating analytics batch:', error);
    }
  }
  
  console.log(`✅ Created ${analytics.length} analytics entries`);
}

async function createSampleMessages() {
  const messages = [
    {
      sender_id: 'parent-001',
      recipient_id: 'educator-001',
      child_id: 'student-001',
      subject: 'Question about Ananya\'s Progress',
      message: 'Hello Dr. Sharma, I wanted to discuss Ananya\'s recent performance in Legal Reasoning. She seems to be struggling with constitutional law concepts. Could we schedule a call?',
      priority: 'normal',
      type: 'parent_inquiry',
      status: 'read',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      sender_id: 'educator-001',
      recipient_id: 'parent-001',
      child_id: 'student-001',
      subject: 'Re: Question about Ananya\'s Progress',
      message: 'Dear Mr. Kumar, Thank you for reaching out. Ananya is actually doing quite well overall. The constitutional law area needs some focused practice. I\'ve prepared additional materials for her. Let\'s schedule a call this Friday at 4 PM.',
      priority: 'normal',
      type: 'educator_response',
      status: 'unread',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      sender_id: 'parent-001',
      recipient_id: 'educator-001',
      child_id: 'student-002',
      subject: 'Arjun\'s Mock Test Performance',
      message: 'Hi Dr. Sharma, I noticed Arjun scored 78% in the recent mock test. While this is good, I was wondering what areas he should focus on to reach 85%+ consistently.',
      priority: 'normal',
      type: 'parent_inquiry',
      status: 'unread',
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    }
  ];

  for (const message of messages) {
    const { error } = await supabase
      .from('messages')
      .insert(message);
    
    if (error) {
      console.error('Error creating message:', error);
    } else {
      console.log(`✅ Created message: ${message.subject}`);
    }
  }
}

async function createSamplePayments() {
  const payments = [
    {
      user_id: 'parent-001',
      amount: 999.00,
      currency: 'INR',
      status: 'success',
      payment_method: 'Credit Card',
      transaction_id: 'TXN_2024_001',
      plan_type: 'PRO Family',
      billing_period: 'monthly',
      payment_gateway: 'Razorpay',
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: 'parent-001',
      amount: 999.00,
      currency: 'INR',
      status: 'success',
      payment_method: 'UPI',
      transaction_id: 'TXN_2024_002',
      plan_type: 'PRO Family',
      billing_period: 'monthly',
      payment_gateway: 'Razorpay',
      created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: 'parent-001',
      amount: 2847.00, // Quarterly with discount
      currency: 'INR',
      status: 'success',
      payment_method: 'Net Banking',
      transaction_id: 'TXN_2024_003',
      plan_type: 'PRO Family',
      billing_period: 'quarterly',
      payment_gateway: 'Razorpay',
      created_at: new Date(Date.now() - 105 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  for (const payment of payments) {
    const { error } = await supabase
      .from('payments')
      .insert(payment);
    
    if (error) {
      console.error('Error creating payment:', error);
    } else {
      console.log(`✅ Created payment: ₹${payment.amount} - ${payment.status}`);
    }
  }
}

async function createClassesAndAssignments() {
  // Create a class
  const classData = {
    id: 'class-001',
    name: 'CLAT 2024 Batch A',
    subject: 'CLAT Preparation',
    grade_level: '11th-12th',
    educator_id: 'educator-001',
    description: 'Comprehensive CLAT preparation focusing on all sections',
    status: 'active'
  };

  const { error: classError } = await supabase
    .from('classes')
    .upsert(classData, { onConflict: 'id' });

  if (classError) {
    console.error('Error creating class:', classError);
  } else {
    console.log('✅ Created class: CLAT 2024 Batch A');
  }

  // Add students to class
  const memberships = [
    {
      class_id: 'class-001',
      user_id: 'student-001',
      role: 'student',
      is_active: true
    },
    {
      class_id: 'class-001', 
      user_id: 'student-002',
      role: 'student',
      is_active: true
    }
  ];

  for (const membership of memberships) {
    const { error } = await supabase
      .from('class_memberships')
      .upsert(membership, { onConflict: 'class_id,user_id' });
    
    if (error) {
      console.error('Error creating membership:', error);
    }
  }

  // Create assignments
  const assignments = [
    {
      id: 'assignment-001',
      title: 'Legal Reasoning Practice Set 1',
      description: 'Complete 25 questions on Constitutional Law and Contract Law',
      subject: 'Legal Reasoning',
      type: 'practice',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      total_marks: 50,
      time_limit: 45,
      class_id: 'class-001',
      educator_id: 'educator-001',
      status: 'published'
    },
    {
      id: 'assignment-002',
      title: 'Current Affairs Weekly Quiz',
      description: 'Quiz covering current affairs from the past month',
      subject: 'Current Affairs',
      type: 'quiz',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      total_marks: 25,
      time_limit: 30,
      class_id: 'class-001',
      educator_id: 'educator-001',
      status: 'published'
    }
  ];

  for (const assignment of assignments) {
    const { error } = await supabase
      .from('assignments')
      .upsert(assignment, { onConflict: 'id' });
    
    if (error) {
      console.error('Error creating assignment:', error);
    } else {
      console.log(`✅ Created assignment: ${assignment.title}`);
    }
  }

  // Create assignment submissions
  const submissions = [
    {
      assignment_id: 'assignment-001',
      student_id: 'student-001',
      score: 42.5,
      feedback: 'Good understanding of constitutional principles. Work on contract law concepts.',
      status: 'graded',
      graded_by: 'educator-001',
      submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      graded_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      assignment_id: 'assignment-001',
      student_id: 'student-002',
      score: 38.0,
      feedback: 'Need to focus more on constitutional law. Contract law understanding is good.',
      status: 'graded',
      graded_by: 'educator-001',
      submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      graded_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  for (const submission of submissions) {
    const { error } = await supabase
      .from('assignment_submissions')
      .insert(submission);
    
    if (error) {
      console.error('Error creating submission:', error);
    } else {
      console.log(`✅ Created submission: ${submission.student_id} - ${submission.score}/50`);
    }
  }
}

async function createSampleNotifications() {
  const notifications = [
    {
      user_id: 'parent-001',
      type: 'test_completed',
      title: 'Ananya completed Mock Test #15',
      message: 'Your daughter Ananya has completed Mock Test #15 with a score of 82%. View detailed results.',
      data: { child_id: 'student-001', test_id: 'mock-015', score: 82 },
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: 'parent-001',
      type: 'assignment_graded', 
      title: 'Assignment graded for Arjun',
      message: 'Legal Reasoning Practice Set 1 has been graded. Arjun scored 38/50.',
      data: { child_id: 'student-002', assignment_id: 'assignment-001', score: 38 },
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: 'parent-001',
      type: 'message',
      title: 'New message from Dr. Priya Sharma',
      message: 'You have received a new message regarding Ananya\'s progress.',
      data: { sender_id: 'educator-001', child_id: 'student-001' },
      read: false,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: 'parent-001',
      type: 'achievement',
      title: 'Ananya earned a new achievement!',
      message: 'Congratulations! Ananya has earned the "21-Day Study Streak" achievement.',
      data: { child_id: 'student-001', achievement: '21_day_streak' },
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    }
  ];

  for (const notification of notifications) {
    const { error } = await supabase
      .from('notifications')
      .insert(notification);
    
    if (error) {
      console.error('Error creating notification:', error);
    } else {
      console.log(`✅ Created notification: ${notification.title}`);
    }
  }
}

// Run the script
if (require.main === module) {
  populateSampleData().then(() => {
    console.log('\n🎉 All sample data created successfully!');
    console.log('\n📋 Test credentials:');
    console.log('Parent: parent@demo.com / password123');
    console.log('Student 1: ananya@demo.com / password123');
    console.log('Student 2: arjun@demo.com / password123');
    console.log('Educator: educator@demo.com / password123');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Failed to populate data:', error);
    process.exit(1);
  });
}

module.exports = { populateSampleData };