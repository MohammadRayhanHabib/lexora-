import type { IMockExam, IMockExamAttempt } from "../api/mockExam";
import {
  FLOWCHART_GAP_TOKEN,
  ReadingQuestionType,
  type IReadingQuestionStudent,
  type IReadingTest,
} from "../api/reading";

const SHOWCASE_ID = "reading-part-1-client-showcase";
const CREATED_AT = "2026-07-24T00:00:00.000Z";

const question = (
  orderNumber: number,
  questionType: ReadingQuestionType,
  data: Omit<
    IReadingQuestionStudent,
    "_id" | "questionType" | "orderNumber" | "pageNumber" | "marks"
  >,
): IReadingQuestionStudent => ({
  _id: `reading-showcase-r-${String(orderNumber).padStart(2, "0")}`,
  questionType,
  orderNumber,
  pageNumber: orderNumber,
  marks: 1,
  ...data,
});

export const READING_PART_1_SHOWCASE_TEST: IReadingTest = {
  _id: SHOWCASE_ID,
  title: "Reading Part 1 — 18 Question Type Showcase",
  passageTitle: "How Urban Trees Make Cities More Resilient",
  passageContent: `
    <section>
      <h3>A — More than decoration</h3>
      <p>For much of the twentieth century, city trees were treated mainly as decoration. Modern research presents a different picture: a connected urban forest can cool streets, slow rainwater, improve air quality and make neighbourhoods more comfortable for walking.</p>
    </section>
    <section>
      <h3>B — Cooling the street</h3>
      <p>Trees reduce heat in two ways. Their crowns provide shade, while water released through their leaves cools the surrounding air. The effect is strongest where mature trees form an almost continuous canopy above pavements and buildings.</p>
    </section>
    <section>
      <h3>C — Managing heavy rain</h3>
      <p>Leaves and branches intercept rainfall before it reaches the ground. Some water evaporates and some travels slowly down the trunk. Roots also create channels in the soil, allowing more water to soak in and reducing pressure on drainage systems.</p>
    </section>
    <section>
      <h3>D — Choosing the right species</h3>
      <p>No single species is suitable everywhere. Planners compare expected height, root spread, tolerance of pollution and demand for water. A diverse mix is safer than planting one species because disease is less likely to damage the whole urban forest.</p>
    </section>
    <section>
      <h3>E — Evidence from local residents</h3>
      <p>Residents often identify needs that maps miss. They may know which bus stops have no shade, which paths flood after storms and where poorly placed branches obstruct lighting. Successful planting programmes therefore combine technical surveys with community consultation.</p>
    </section>
    <section>
      <h3>F — Looking after young trees</h3>
      <p>Planting is only the beginning. During their first years, trees require regular watering, protection from accidental damage and inspections by trained staff. Without this maintenance, a large proportion may fail before producing significant benefits.</p>
    </section>
    <section>
      <h3>G — Measuring long-term value</h3>
      <p>The cost of a planting programme is immediate, but many benefits appear gradually. Cities increasingly measure canopy cover, summer surface temperature, intercepted rainfall and tree survival so that future investment can be based on evidence.</p>
    </section>
    <section>
      <h3>H — A shared urban resource</h3>
      <p>Urban trees work best as infrastructure rather than isolated objects. When planning, planting and maintenance are coordinated, they support public health, climate adaptation and biodiversity at the same time.</p>
    </section>
  `,
  duration: 60,
  totalQuestions: 18,
  isActive: true,
  showExplanations: false,
  createdBy: "client-preview",
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  partNumber: 1,
  partTypeLabel: "18 IELTS Reading question types",
};

export const READING_PART_1_SHOWCASE_QUESTIONS: IReadingQuestionStudent[] = [
  question(1, ReadingQuestionType.LIST_MATCHING, {
    instructions:
      "R-01 List Matching — Match the purpose with the correct planning action, A–C.",
    questionText: "Planning actions",
    options: ["Reduce pressure on drains"],
    wordBank: [
      "A — Protect and maintain young trees",
      "B — Use trees to intercept rainfall",
      "C — Consult local residents",
    ],
  }),
  question(2, ReadingQuestionType.MATCHING_HEADINGS, {
    instructions:
      "R-02 Heading Matching — Choose the correct heading for the section and move it into the gap.",
    questionText: "Choose the correct heading.",
    options: ["Section A"],
    wordBank: [
      "Trees as essential city infrastructure",
      "Why one species should be planted everywhere",
      "The end of community consultation",
    ],
  }),
  question(3, ReadingQuestionType.MATCHING_FEATURES, {
    instructions:
      "R-03 Matching Features — Match the statement with the correct feature, A–C.",
    questionText: "Urban tree benefits",
    options: ["Catches rain before it reaches the ground"],
    wordBank: [
      "A — Street cooling",
      "B — Rainwater management",
      "C — Community knowledge",
    ],
  }),
  question(4, ReadingQuestionType.MATCHING_INFORMATION, {
    instructions:
      "R-04 Information Matching — Which section contains the following information?",
    questionText: "Find the information in sections A–H.",
    options: ["An explanation of why a mixture of species is safer"],
    wordBank: ["A", "B", "C", "D", "E", "F", "G", "H"],
  }),
  question(5, ReadingQuestionType.MATCHING_SENTENCE_ENDINGS, {
    instructions:
      "R-05 Sentence-Ending Matching — Complete the sentence with the correct ending, A–C.",
    questionText: "Complete the sentence.",
    options: ["Young trees may die before delivering major benefits unless they"],
    wordBank: [
      "receive regular care.",
      "are planted beside every road.",
      "replace existing drainage systems.",
    ],
  }),
  question(6, ReadingQuestionType.NOTE_COMPLETION, {
    instructions:
      "R-06 Note Completion — Complete the note. Write NO MORE THAN TWO WORDS.",
    questionText: "How trees cool a city",
    options: [`Tree crowns provide ${FLOWCHART_GAP_TOKEN}.`],
  }),
  question(7, ReadingQuestionType.TABLE_COMPLETION, {
    instructions:
      "R-07 Table Completion — Complete the table. Write NO MORE THAN TWO WORDS.",
    questionText: "Urban forest planning",
    options: [
      "Stage|||Evidence considered",
      `Species selection|||Expected height and ${FLOWCHART_GAP_TOKEN}`,
    ],
  }),
  question(8, ReadingQuestionType.SENTENCE_COMPLETION, {
    instructions:
      "R-08 Sentence Completion — Complete the sentence. Write NO MORE THAN TWO WORDS.",
    questionText:
      "Tree roots help rainwater enter the ground by creating ______ in the soil.",
  }),
  question(9, ReadingQuestionType.FLOWCHART_COMPLETION, {
    instructions:
      "R-09 Flow-chart Completion — Complete the flow chart. Write ONE WORD ONLY.",
    questionText: "Rainfall pathway",
    options: [
      `Rain reaches leaves → some water evaporates → the remainder moves slowly down the ${FLOWCHART_GAP_TOKEN}`,
    ],
    wordBank: ["trunk", "canopy", "pavement"],
  }),
  question(10, ReadingQuestionType.DIAGRAM_LABEL_COMPLETION, {
    instructions:
      "R-10 Diagram Label Completion — Choose the correct label from the box.",
    questionText: "Parts of an urban tree",
    options: ["Upper layer that provides shade"],
    wordBank: ["canopy", "roots", "trunk"],
  }),
  question(11, ReadingQuestionType.SUMMARY_COMPLETION, {
    instructions:
      "R-11 Summary Completion (with clues) — Choose ONE WORD from the clue list.",
    questionText: "Community knowledge",
    options: [
      `Residents can identify paths that ${FLOWCHART_GAP_TOKEN} after storms.`,
    ],
    wordBank: ["flood", "cool", "widen"],
  }),
  question(12, ReadingQuestionType.SUMMARY_COMPLETION, {
    instructions:
      "R-12 Summary Completion (without clues) — Write ONE WORD ONLY.",
    questionText: "Tree maintenance",
    options: [
      `New trees require watering and protection from accidental ${FLOWCHART_GAP_TOKEN}.`,
    ],
    wordBank: [],
  }),
  question(13, ReadingQuestionType.SHORT_ANSWER, {
    instructions:
      "R-13 Short-Answer Question — Answer using NO MORE THAN TWO WORDS.",
    questionText: "What do roots create in the soil?",
  }),
  question(14, ReadingQuestionType.CLASSIFICATION, {
    instructions:
      "R-14 Classification — Classify the item according to the category, A–C.",
    questionText: "Classify each measurement",
    options: ["Summer surface temperature"],
    wordBank: [
      "A — Climate measurement",
      "B — Community observation",
      "C — Maintenance activity",
    ],
  }),
  question(15, ReadingQuestionType.YES_NO_NOT_GIVEN, {
    instructions:
      "R-15 Yes / No / Not Given — Does the statement agree with the writer's views?",
    questionText:
      "Urban trees should be planned as infrastructure, not merely as isolated decorations.",
    options: ["YES", "NO", "NOT GIVEN"],
  }),
  question(16, ReadingQuestionType.TRUE_FALSE_NOT_GIVEN, {
    instructions:
      "R-16 True / False / Not Given — Decide whether the statement agrees with the passage.",
    questionText:
      "A diverse mix of tree species reduces the risk that disease will damage the entire urban forest.",
    options: ["TRUE", "FALSE", "NOT GIVEN"],
  }),
  question(17, ReadingQuestionType.TITLE_SUBTITLE_FINDING, {
    instructions:
      "R-17 Title or Subtitle Finding — Choose the most suitable title for the passage.",
    questionText: "Which title best describes the passage?",
    options: [
      "Urban Trees as Living Infrastructure",
      "The History of Botanical Illustration",
      "Why Cities No Longer Need Drainage",
      "A Guide to Indoor Plants",
    ],
  }),
  question(18, ReadingQuestionType.MCQ_SINGLE, {
    instructions:
      "R-18 Multiple Choice Question — Choose the correct letter, A, B, C or D.",
    questionText:
      "According to the passage, why do cities measure tree survival?",
    options: [
      "To support evidence-based future investment",
      "To remove all mature trees",
      "To replace community consultation",
      "To calculate the age of every resident",
    ],
  }),
];

export const READING_PART_1_SHOWCASE_EXAM: IMockExam = {
  _id: "client-preview-reading-exam",
  title: "Client Approval — Reading UI",
  description:
    "Interactive preview of all 18 supported IELTS Reading question patterns.",
  readingPart1Id: SHOWCASE_ID,
  listeningDuration: 40,
  readingDuration: 60,
  writingDuration: 60,
  speakingDuration: 15,
  isActive: true,
  examType: "practice",
  createdBy: "client-preview",
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

export const READING_PART_1_SHOWCASE_ATTEMPT: IMockExamAttempt = {
  _id: "client-preview-candidate-001",
  userId: "client-preview",
  examId: READING_PART_1_SHOWCASE_EXAM._id,
  status: "in_progress",
  startedAt: CREATED_AT,
  createdAt: CREATED_AT,
};
