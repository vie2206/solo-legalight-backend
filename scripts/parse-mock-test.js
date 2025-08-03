// Mock Test Parser Script
// This script will help create demo mock test data from the PDF content

const fs = require('fs');
const path = require('path');

// Mock Test Template for CLAT 2027
const mockTestTemplate = {
  title: "CLAT 2027 Mock Test 04",
  description: "Full-length mock test for CLAT 2027 preparation",
  total_questions: 120,
  total_marks: 480,
  duration_minutes: 120,
  sections: {
    english: {
      name: "English Language",
      questions: 24,
      marks_per_question: 4,
      negative_marking: 1
    },
    gk: {
      name: "General Knowledge & Current Affairs",
      questions: 28,
      marks_per_question: 4,
      negative_marking: 1
    },
    legal: {
      name: "Legal Reasoning",
      questions: 32,
      marks_per_question: 4,
      negative_marking: 1
    },
    logical: {
      name: "Logical Reasoning",
      questions: 24,
      marks_per_question: 4,
      negative_marking: 1
    },
    quant: {
      name: "Quantitative Techniques",
      questions: 12,
      marks_per_question: 4,
      negative_marking: 1
    }
  }
};

// Sample questions structure (you'll need to fill this with actual data from PDF)
const sampleQuestions = [
  // ENGLISH LANGUAGE (Q1-Q24)
  {
    question_number: 1,
    section: "english",
    question_text: "Read the following passage and answer the questions that follow:\n\nThe rapid advancement of artificial intelligence has sparked debates about its impact on society...",
    options: {
      A: "Technology will replace all human jobs",
      B: "AI advancement requires ethical considerations",
      C: "Progress should be halted immediately",
      D: "Only positive impacts are expected"
    },
    correct_answer: "B",
    difficulty: "medium",
    topic: "Reading Comprehension",
    explanation: "The passage emphasizes the need for ethical considerations in AI development, making option B the most appropriate answer.",
    time_suggested: 90 // seconds
  },
  // Add more questions here...
];

// Function to create a complete mock test
function createMockTest() {
  const mockTest = {
    ...mockTestTemplate,
    questions: [],
    created_at: new Date().toISOString(),
    answer_key: {},
    explanations: {}
  };

  // Generate sample questions for each section
  let questionNumber = 1;
  
  // English Language (24 questions)
  for (let i = 0; i < 24; i++) {
    mockTest.questions.push({
      question_number: questionNumber,
      section: "english",
      question_text: `English Question ${questionNumber}: [Insert actual question from PDF]`,
      options: {
        A: "[Option A from PDF]",
        B: "[Option B from PDF]",
        C: "[Option C from PDF]",
        D: "[Option D from PDF]"
      },
      correct_answer: "A", // Update with actual answer
      difficulty: i < 8 ? "easy" : i < 16 ? "medium" : "hard",
      topic: i < 12 ? "Reading Comprehension" : "Grammar & Vocabulary",
      explanation: "[Insert explanation from PDF]",
      time_suggested: 90
    });
    questionNumber++;
  }

  // General Knowledge (28 questions)
  for (let i = 0; i < 28; i++) {
    mockTest.questions.push({
      question_number: questionNumber,
      section: "gk",
      question_text: `GK Question ${questionNumber}: [Insert actual question from PDF]`,
      options: {
        A: "[Option A from PDF]",
        B: "[Option B from PDF]",
        C: "[Option C from PDF]",
        D: "[Option D from PDF]"
      },
      correct_answer: "B", // Update with actual answer
      difficulty: i < 10 ? "easy" : i < 20 ? "medium" : "hard",
      topic: i < 14 ? "Current Affairs" : "Static GK",
      explanation: "[Insert explanation from PDF]",
      time_suggested: 60
    });
    questionNumber++;
  }

  // Legal Reasoning (32 questions)
  for (let i = 0; i < 32; i++) {
    mockTest.questions.push({
      question_number: questionNumber,
      section: "legal",
      question_text: `Legal Question ${questionNumber}: [Insert actual question from PDF]`,
      options: {
        A: "[Option A from PDF]",
        B: "[Option B from PDF]",
        C: "[Option C from PDF]",
        D: "[Option D from PDF]"
      },
      correct_answer: "C", // Update with actual answer
      difficulty: i < 10 ? "easy" : i < 22 ? "medium" : "hard",
      topic: i < 16 ? "Legal Principles" : "Case Analysis",
      explanation: "[Insert explanation from PDF]",
      time_suggested: 120
    });
    questionNumber++;
  }

  // Logical Reasoning (24 questions)
  for (let i = 0; i < 24; i++) {
    mockTest.questions.push({
      question_number: questionNumber,
      section: "logical",
      question_text: `Logical Question ${questionNumber}: [Insert actual question from PDF]`,
      options: {
        A: "[Option A from PDF]",
        B: "[Option B from PDF]",
        C: "[Option C from PDF]",
        D: "[Option D from PDF]"
      },
      correct_answer: "D", // Update with actual answer
      difficulty: i < 8 ? "easy" : i < 16 ? "medium" : "hard",
      topic: i < 12 ? "Puzzles" : "Critical Reasoning",
      explanation: "[Insert explanation from PDF]",
      time_suggested: 90
    });
    questionNumber++;
  }

  // Quantitative Techniques (12 questions)
  for (let i = 0; i < 12; i++) {
    mockTest.questions.push({
      question_number: questionNumber,
      section: "quant",
      question_text: `Quant Question ${questionNumber}: [Insert actual question from PDF]`,
      options: {
        A: "[Option A from PDF]",
        B: "[Option B from PDF]",
        C: "[Option C from PDF]",
        D: "[Option D from PDF]"
      },
      correct_answer: "A", // Update with actual answer
      difficulty: i < 4 ? "easy" : i < 8 ? "medium" : "hard",
      topic: i < 6 ? "Arithmetic" : "Data Interpretation",
      explanation: "[Insert explanation from PDF]",
      time_suggested: 120
    });
    questionNumber++;
  }

  // Create answer key and explanations
  mockTest.questions.forEach(q => {
    mockTest.answer_key[q.question_number] = q.correct_answer;
    mockTest.explanations[q.question_number] = q.explanation;
  });

  return mockTest;
}

// Create sample student attempts
function createSampleAttempts() {
  const attempts = [
    {
      student_id: "demo-student-001",
      attempt_date: new Date().toISOString(),
      score: 340,
      percentile: 92.5,
      total_attempted: 110,
      correct: 88,
      incorrect: 22,
      time_taken: 118,
      section_wise: {
        english: { attempted: 23, correct: 20, time_spent: 22 },
        gk: { attempted: 25, correct: 18, time_spent: 18 },
        legal: { attempted: 30, correct: 26, time_spent: 34 },
        logical: { attempted: 22, correct: 18, time_spent: 26 },
        quant: { attempted: 10, correct: 6, time_spent: 18 }
      }
    },
    {
      student_id: "demo-student-002",
      attempt_date: new Date(Date.now() - 86400000).toISOString(),
      score: 280,
      percentile: 78.3,
      total_attempted: 95,
      correct: 73,
      incorrect: 22,
      time_taken: 120,
      section_wise: {
        english: { attempted: 20, correct: 16, time_spent: 20 },
        gk: { attempted: 20, correct: 14, time_spent: 15 },
        legal: { attempted: 28, correct: 22, time_spent: 35 },
        logical: { attempted: 20, correct: 15, time_spent: 30 },
        quant: { attempted: 7, correct: 6, time_spent: 20 }
      }
    }
  ];

  return attempts;
}

// Generate the mock test data
const mockTestData = createMockTest();
const studentAttempts = createSampleAttempts();

// Save to files
fs.writeFileSync(
  path.join(__dirname, 'mock-test-data.json'),
  JSON.stringify(mockTestData, null, 2)
);

fs.writeFileSync(
  path.join(__dirname, 'student-attempts.json'),
  JSON.stringify(studentAttempts, null, 2)
);

console.log('✅ Mock test template created!');
console.log('📝 Please update the questions with actual content from the PDF.');
console.log('📄 Files created:');
console.log('   - mock-test-data.json');
console.log('   - student-attempts.json');

module.exports = { mockTestData, studentAttempts };