// Generate realistic student attempts with performance data
// Based on CLAT Mock Test 04 with 120 questions

const mockTestAnswers = require('./complete-answer-key.js');

// Sample student profiles with different performance levels
const studentProfiles = [
  // Grandmaster Lightian Level (95-120 marks)
  {
    id: "demo-student-001",
    name: "Arjun Sharma",
    email: "arjun@demo.com",
    level: "Grandmaster Lightian",
    target_score: 105,
    accuracy_rate: 0.92,
    attempt_rate: 0.98,
    strengths: ["Legal Reasoning", "Logical Reasoning"],
    weaknesses: ["Current Affairs"],
    time_management: "excellent"
  },
  
  // Master Lightian Level (80-94 marks)
  {
    id: "demo-student-002", 
    name: "Priya Patel",
    email: "priya@demo.com",
    level: "Master Lightian",
    target_score: 87,
    accuracy_rate: 0.85,
    attempt_rate: 0.95,
    strengths: ["English Language", "Legal Reasoning"],
    weaknesses: ["Quantitative Techniques"],
    time_management: "good"
  },
  
  // Champion Lightian Level (65-79 marks)
  {
    id: "demo-student-003",
    name: "Rohit Kumar",
    email: "rohit@demo.com", 
    level: "Champion Lightian",
    target_score: 72,
    accuracy_rate: 0.78,
    attempt_rate: 0.88,
    strengths: ["Logical Reasoning", "Current Affairs"],
    weaknesses: ["Legal Reasoning", "English Language"],
    time_management: "average"
  },
  
  // Advancing Lightian Level (50-64 marks)
  {
    id: "demo-student-004",
    name: "Ananya Singh",
    email: "ananya@demo.com",
    level: "Advancing Lightian", 
    target_score: 58,
    accuracy_rate: 0.68,
    attempt_rate: 0.82,
    strengths: ["Current Affairs", "English Language"],
    weaknesses: ["Legal Reasoning", "Quantitative Techniques"],
    time_management: "needs_improvement"
  },
  
  // Rising Lightian Level (Below 50 marks)
  {
    id: "demo-student-005",
    name: "Vikram Joshi",
    email: "vikram@demo.com",
    level: "Rising Lightian",
    target_score: 42,
    accuracy_rate: 0.58,
    attempt_rate: 0.75,
    strengths: ["Current Affairs"],
    weaknesses: ["Legal Reasoning", "Logical Reasoning", "Quantitative Techniques"],
    time_management: "poor"
  }
];

// Section-wise performance patterns by level
const performancePatterns = {
  "Grandmaster Lightian": {
    "English Language": { accuracy: 0.95, attempt_rate: 0.98, avg_time: 85 },
    "Current Affairs": { accuracy: 0.88, attempt_rate: 0.96, avg_time: 65 },
    "Legal Reasoning": { accuracy: 0.94, attempt_rate: 1.0, avg_time: 100 },
    "Logical Reasoning": { accuracy: 0.92, attempt_rate: 0.98, avg_time: 95 },
    "Quantitative Techniques": { accuracy: 0.90, attempt_rate: 0.95, avg_time: 120 }
  },
  
  "Master Lightian": {
    "English Language": { accuracy: 0.88, attempt_rate: 0.95, avg_time: 95 },
    "Current Affairs": { accuracy: 0.85, attempt_rate: 0.93, avg_time: 70 },
    "Legal Reasoning": { accuracy: 0.87, attempt_rate: 0.98, avg_time: 110 },
    "Logical Reasoning": { accuracy: 0.84, attempt_rate: 0.95, avg_time: 105 },
    "Quantitative Techniques": { accuracy: 0.78, attempt_rate: 0.88, avg_time: 140 }
  },
  
  "Champion Lightian": {
    "English Language": { accuracy: 0.80, attempt_rate: 0.90, avg_time: 105 },
    "Current Affairs": { accuracy: 0.82, attempt_rate: 0.88, avg_time: 75 },
    "Legal Reasoning": { accuracy: 0.75, attempt_rate: 0.90, avg_time: 120 },
    "Logical Reasoning": { accuracy: 0.78, attempt_rate: 0.85, avg_time: 115 },
    "Quantitative Techniques": { accuracy: 0.70, attempt_rate: 0.80, avg_time: 160 }
  },
  
  "Advancing Lightian": {
    "English Language": { accuracy: 0.72, attempt_rate: 0.85, avg_time: 115 },
    "Current Affairs": { accuracy: 0.75, attempt_rate: 0.82, avg_time: 80 },
    "Legal Reasoning": { accuracy: 0.65, attempt_rate: 0.80, avg_time: 135 },
    "Logical Reasoning": { accuracy: 0.68, attempt_rate: 0.78, avg_time: 125 },
    "Quantitative Techniques": { accuracy: 0.60, attempt_rate: 0.70, avg_time: 180 }
  },
  
  "Rising Lightian": {
    "English Language": { accuracy: 0.62, attempt_rate: 0.78, avg_time: 125 },
    "Current Affairs": { accuracy: 0.68, attempt_rate: 0.75, avg_time: 85 },
    "Legal Reasoning": { accuracy: 0.55, attempt_rate: 0.70, avg_time: 145 },
    "Logical Reasoning": { accuracy: 0.58, attempt_rate: 0.72, avg_time: 135 },
    "Quantitative Techniques": { accuracy: 0.50, attempt_rate: 0.65, avg_time: 200 }
  }
};

// Generate individual question attempts
function generateQuestionAttempt(questionId, section, difficulty, correctAnswer, studentLevel, sectionPattern) {
  const random = Math.random();
  const difficultyModifier = {
    'easy': 0.1,
    'medium': 0.0,
    'hard': -0.1,
    'very_hard': -0.2
  };
  
  const adjustedAccuracy = Math.max(0.1, sectionPattern.accuracy + difficultyModifier[difficulty]);
  const shouldAttempt = random < sectionPattern.attempt_rate;
  
  if (!shouldAttempt) {
    return {
      question_id: questionId,
      selected_answer: null,
      is_correct: false,
      time_spent: 0,
      confidence_level: 0,
      status: "unattempted"
    };
  }
  
  const isCorrect = random < adjustedAccuracy;
  let selectedAnswer;
  
  if (isCorrect) {
    selectedAnswer = correctAnswer;
  } else {
    // Generate wrong answer (not the correct one)
    const options = ['A', 'B', 'C', 'D'];
    const wrongOptions = options.filter(opt => opt !== correctAnswer);
    selectedAnswer = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
  }
  
  // Generate realistic time spent based on difficulty and student level
  const baseTime = sectionPattern.avg_time;
  const timeVariation = 0.3; // 30% variation
  const timeSpent = Math.floor(baseTime * (1 + (Math.random() - 0.5) * timeVariation));
  
  // Confidence level based on correctness and student level
  const confidenceBase = isCorrect ? 0.8 : 0.5;
  const confidenceLevel = Math.min(1.0, confidenceBase + (Math.random() - 0.5) * 0.3);
  
  return {
    question_id: questionId,
    selected_answer: selectedAnswer,
    is_correct: isCorrect,
    time_spent: Math.max(30, timeSpent), // Minimum 30 seconds
    confidence_level: Math.round(confidenceLevel * 100) / 100,
    status: "attempted"
  };
}

// Generate complete student attempt
function generateStudentAttempt(student, testDate = new Date()) {
  const pattern = performancePatterns[student.level];
  const attempts = [];
  let totalTimeSpent = 0;
  let sectionStats = {};
  
  // Initialize section statistics
  const sections = ["English Language", "Current Affairs", "Legal Reasoning", "Logical Reasoning", "Quantitative Techniques"];
  sections.forEach(section => {
    sectionStats[section] = {
      attempted: 0,
      correct: 0,
      incorrect: 0,
      time_spent: 0
    };
  });
  
  // Generate attempts for each question
  mockTestAnswers.answers.forEach(question => {
    const sectionPattern = pattern[question.section];
    const attempt = generateQuestionAttempt(
      question.id,
      question.section, 
      question.difficulty,
      question.correct_answer,
      student.level,
      sectionPattern
    );
    
    attempts.push(attempt);
    totalTimeSpent += attempt.time_spent;
    
    // Update section statistics
    if (attempt.status === "attempted") {
      sectionStats[question.section].attempted++;
      sectionStats[question.section].time_spent += attempt.time_spent;
      
      if (attempt.is_correct) {
        sectionStats[question.section].correct++;
      } else {
        sectionStats[question.section].incorrect++;
      }
    }
  });
  
  // Calculate overall statistics
  const totalAttempted = attempts.filter(a => a.status === "attempted").length;
  const totalCorrect = attempts.filter(a => a.is_correct).length;
  const totalIncorrect = totalAttempted - totalCorrect;
  const score = totalCorrect - (totalIncorrect * 0.25); // CLAT scoring: +1 correct, -0.25 incorrect
  
  // Calculate percentile (simplified)
  const percentileMap = {
    "Grandmaster Lightian": 95 + Math.random() * 5,
    "Master Lightian": 80 + Math.random() * 15,
    "Champion Lightian": 65 + Math.random() * 15,
    "Advancing Lightian": 40 + Math.random() * 25,
    "Rising Lightian": 10 + Math.random() * 30
  };
  
  const attempt = {
    student_id: student.id,
    student_name: student.name,
    student_level: student.level,
    test_id: "mock-test-04",
    attempt_date: testDate.toISOString(),
    total_questions: 120,
    attempted: totalAttempted,
    correct: totalCorrect,
    incorrect: totalIncorrect,
    unattempted: 120 - totalAttempted,
    raw_score: totalCorrect,
    final_score: Math.max(0, score),
    percentage: Math.round((score / 120) * 100 * 100) / 100,
    percentile: Math.round(percentileMap[student.level] * 100) / 100,
    total_time_spent: Math.min(7200, totalTimeSpent), // Max 2 hours
    section_wise_performance: sectionStats,
    question_attempts: attempts,
    analysis: generatePerformanceAnalysis(student, sectionStats, score),
    recommendations: generateRecommendations(student, sectionStats)
  };
  
  return attempt;
}

// Generate performance analysis
function generatePerformanceAnalysis(student, sectionStats, score) {
  const analysis = {
    overall_performance: score >= student.target_score ? "Above Target" : "Below Target",
    strongest_section: "",
    weakest_section: "",
    time_management: "",
    accuracy_analysis: {},
    improvement_areas: []
  };
  
  // Find strongest and weakest sections
  let maxAccuracy = 0;
  let minAccuracy = 1;
  
  Object.keys(sectionStats).forEach(section => {
    const stats = sectionStats[section];
    const accuracy = stats.attempted > 0 ? stats.correct / stats.attempted : 0;
    
    if (accuracy > maxAccuracy) {
      maxAccuracy = accuracy;
      analysis.strongest_section = section;
    }
    
    if (accuracy < minAccuracy && stats.attempted > 0) {
      minAccuracy = accuracy;
      analysis.weakest_section = section;
    }
    
    analysis.accuracy_analysis[section] = {
      accuracy_rate: Math.round(accuracy * 100),
      attempt_rate: Math.round((stats.attempted / (section === "Quantitative Techniques" ? 12 : section === "English Language" ? 24 : section === "Current Affairs" ? 28 : section === "Logical Reasoning" ? 24 : 32)) * 100),
      avg_time_per_question: stats.attempted > 0 ? Math.round(stats.time_spent / stats.attempted) : 0
    };
  });
  
  // Time management analysis
  const avgTimePerQuestion = analysis.total_time_spent / 120;
  if (avgTimePerQuestion < 45) {
    analysis.time_management = "Rushed - May benefit from spending more time per question";
  } else if (avgTimePerQuestion > 75) {
    analysis.time_management = "Slow - Work on speed without compromising accuracy";
  } else {
    analysis.time_management = "Good pacing";
  }
  
  // Improvement areas
  if (analysis.accuracy_analysis[analysis.weakest_section].accuracy_rate < 70) {
    analysis.improvement_areas.push(`Focus on ${analysis.weakest_section} - accuracy below 70%`);
  }
  
  if (score < student.target_score) {
    analysis.improvement_areas.push("Overall score below target - comprehensive review needed");
  }
  
  return analysis;
}

// Generate recommendations
function generateRecommendations(student, sectionStats) {
  const recommendations = {
    immediate_focus: [],
    study_plan: [],
    practice_areas: [],
    time_management_tips: []
  };
  
  // Analyze each section for recommendations
  Object.keys(sectionStats).forEach(section => {
    const stats = sectionStats[section];
    const accuracy = stats.attempted > 0 ? stats.correct / stats.attempted : 0;
    const attemptRate = stats.attempted / (section === "Quantitative Techniques" ? 12 : section === "English Language" ? 24 : section === "Current Affairs" ? 28 : section === "Logical Reasoning" ? 24 : 32);
    
    if (accuracy < 0.6) {
      recommendations.immediate_focus.push(`${section}: Strengthen fundamentals`);
      recommendations.study_plan.push(`Dedicate 40% more time to ${section} practice`);
    }
    
    if (attemptRate < 0.8) {
      recommendations.practice_areas.push(`${section}: Practice more questions to build confidence`);
      recommendations.time_management_tips.push(`Allocate fixed time slots for ${section} questions`);
    }
  });
  
  // Level-specific recommendations
  if (student.level === "Rising Lightian") {
    recommendations.study_plan.push("Focus on NCERT textbooks for foundational concepts");
    recommendations.study_plan.push("Start with easier practice sets before attempting mock tests");
  } else if (student.level === "Advancing Lightian") {
    recommendations.study_plan.push("Take sectional tests to improve weak areas");
    recommendations.study_plan.push("Review mistakes thoroughly with explanations");
  } else if (student.level === "Champion Lightian") {
    recommendations.study_plan.push("Take full-length mocks twice weekly");
    recommendations.study_plan.push("Focus on speed optimization techniques");
  }
  
  return recommendations;
}

// Generate multiple attempts with different dates
function generateMultipleAttempts() {
  const allAttempts = [];
  const dates = [
    new Date('2025-01-15'),
    new Date('2025-01-10'),
    new Date('2025-01-05'),
    new Date('2024-12-28'),
    new Date('2024-12-20')
  ];
  
  studentProfiles.forEach(student => {
    dates.forEach((date, index) => {
      // Simulate improvement over time
      const improvementFactor = index * 0.05; // 5% improvement per attempt
      const adjustedStudent = {
        ...student,
        accuracy_rate: Math.min(0.95, student.accuracy_rate + improvementFactor),
        attempt_rate: Math.min(0.98, student.attempt_rate + improvementFactor * 0.5)
      };
      
      const attempt = generateStudentAttempt(adjustedStudent, date);
      allAttempts.push(attempt);
    });
  });
  
  return allAttempts;
}

// Generate leaderboard data
function generateLeaderboard(attempts) {
  const latestAttempts = {};
  
  // Get latest attempt for each student
  attempts.forEach(attempt => {
    const studentId = attempt.student_id;
    if (!latestAttempts[studentId] || new Date(attempt.attempt_date) > new Date(latestAttempts[studentId].attempt_date)) {
      latestAttempts[studentId] = attempt;
    }
  });
  
  // Sort by score and create leaderboard
  const leaderboard = Object.values(latestAttempts)
    .sort((a, b) => b.final_score - a.final_score)
    .map((attempt, index) => ({
      rank: index + 1,
      student_id: attempt.student_id,
      student_name: attempt.student_name,
      student_level: attempt.student_level,
      score: attempt.final_score,
      percentile: attempt.percentile,
      attempt_date: attempt.attempt_date,
      badge: index === 0 ? "🏆 Top Performer" : index < 3 ? "🥉 Top 3" : attempt.student_level
    }));
  
  return leaderboard;
}

// Main execution
console.log("🚀 Generating sample student attempts for Mock Test 04...");

const allAttempts = generateMultipleAttempts();
const leaderboard = generateLeaderboard(allAttempts);

// Sample statistics for dashboard
const dashboardStats = {
  total_students: studentProfiles.length,
  total_attempts: allAttempts.length,
  average_score: Math.round(allAttempts.reduce((sum, attempt) => sum + attempt.final_score, 0) / allAttempts.length * 100) / 100,
  highest_score: Math.max(...allAttempts.map(attempt => attempt.final_score)),
  completion_rate: Math.round(allAttempts.reduce((sum, attempt) => sum + (attempt.attempted / 120), 0) / allAttempts.length * 100),
  section_averages: {
    "English Language": 18.5,
    "Current Affairs": 19.2, 
    "Legal Reasoning": 22.8,
    "Logical Reasoning": 17.6,
    "Quantitative Techniques": 8.4
  }
};

console.log("✅ Generated sample data:");
console.log(`📊 Total attempts: ${allAttempts.length}`);
console.log(`👥 Students: ${studentProfiles.length}`);
console.log(`📈 Average score: ${dashboardStats.average_score}`);
console.log(`🏆 Highest score: ${dashboardStats.highest_score}`);

// Export data
module.exports = {
  studentProfiles,
  studentAttempts: allAttempts,
  leaderboard,
  dashboardStats,
  performancePatterns
};

// Save to files
const fs = require('fs');
const path = require('path');

fs.writeFileSync(
  path.join(__dirname, 'student-attempts-data.json'),
  JSON.stringify({ 
    attempts: allAttempts,
    leaderboard: leaderboard,
    dashboard_stats: dashboardStats
  }, null, 2)
);

fs.writeFileSync(
  path.join(__dirname, 'student-profiles.json'),
  JSON.stringify(studentProfiles, null, 2)
);

console.log("💾 Data saved to files:");
console.log("   - student-attempts-data.json");  
console.log("   - student-profiles.json");
console.log("🎯 Ready for integration with Level Up platform!");