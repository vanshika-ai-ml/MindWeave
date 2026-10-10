import {
  TopicInputSchema,
  DocumentUploadSchema,
  SingleAnswerSchema,
  QuestionnaireSubmissionSchema,
  QuestionOptionsSchema
} from "../src/lib/validation.js";

function runTests() {
  console.log("=== Running MindWeave Zod Validation Test Suite ===");
  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      process.exitCode = 1;
    }
  }

  // 1. TopicInputSchema tests
  const validTopic = TopicInputSchema.safeParse({ topic: "Database Management Systems" });
  assert(validTopic.success, "Valid topic is accepted");

  const shortTopic = TopicInputSchema.safeParse({ topic: "a" });
  assert(!shortTopic.success, "Topic < 2 chars is rejected");

  const emptyTopic = TopicInputSchema.safeParse({ topic: "   " });
  assert(!emptyTopic.success, "Whitespace topic is rejected");

  const longTopic = TopicInputSchema.safeParse({ topic: "x".repeat(125) });
  assert(!longTopic.success, "Oversized topic (>120 chars) is rejected");

  // 2. DocumentUploadSchema tests
  const validUpload = DocumentUploadSchema.safeParse({
    file: {},
    fileName: "lecture_notes.pdf",
    fileSize: 1024 * 500, // 500 KB
    fileType: "application/pdf"
  });
  assert(validUpload.success, "Valid PDF upload is accepted");

  const oversizedUpload = DocumentUploadSchema.safeParse({
    file: {},
    fileName: "huge.pdf",
    fileSize: 15 * 1024 * 1024, // 15 MB
    fileType: "application/pdf"
  });
  assert(!oversizedUpload.success, "Oversized file (>10MB) is rejected");

  const invalidTypeUpload = DocumentUploadSchema.safeParse({
    file: {},
    fileName: "script.exe",
    fileSize: 1024,
    fileType: "application/x-msdownload"
  });
  assert(!invalidTypeUpload.success, "Executable file type is rejected");

  // 3. QuestionnaireSubmissionSchema tests
  const validSubmission = QuestionnaireSubmissionSchema.safeParse({
    sessionId: "session-1234",
    answers: [
      { questionId: "q_1", conceptId: "joins", studentAnswer: "INNER JOIN selects matching rows" }
    ]
  });
  assert(validSubmission.success, "Valid questionnaire submission is accepted");

  const emptyAnswer = QuestionnaireSubmissionSchema.safeParse({
    sessionId: "session-1234",
    answers: [
      { questionId: "q_1", conceptId: "joins", studentAnswer: "   " }
    ]
  });
  assert(!emptyAnswer.success, "Blank answer submission is rejected");

  const noAnswers = QuestionnaireSubmissionSchema.safeParse({
    sessionId: "session-1234",
    answers: []
  });
  assert(!noAnswers.success, "Empty answer list is rejected");

  // 4. QuestionOptionsSchema tests
  const validOptions = QuestionOptionsSchema.safeParse({
    difficulty: "medium",
    questionCount: 5
  });
  assert(validOptions.success, "Valid question options are accepted");

  const invalidDifficulty = QuestionOptionsSchema.safeParse({
    difficulty: "extreme",
    questionCount: 5
  });
  assert(!invalidDifficulty.success, "Unsupported difficulty level is rejected");

  console.log(`\nResults: ${passed}/${total} validation tests passed.`);
}

runTests();
