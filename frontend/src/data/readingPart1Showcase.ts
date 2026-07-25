import type { IMockExam, IMockExamAttempt } from "../api/mockExam";
import {
  FLOWCHART_GAP_TOKEN,
  ReadingQuestionType,
  type IReadingQuestionStudent,
  type IReadingTest,
} from "../api/reading";

const SHOWCASE_ID = "reading-part-1-client-showcase";
const CREATED_AT = "2026-07-24T00:00:00.000Z";

export const READING_SHOWCASE_EXAMPLES_PER_TYPE = 5;

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
  pageNumber: (orderNumber - 1) * READING_SHOWCASE_EXAMPLES_PER_TYPE + 1,
  marks: READING_SHOWCASE_EXAMPLES_PER_TYPE,
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
  totalQuestions: 90,
  isActive: true,
  showExplanations: false,
  createdBy: "client-preview",
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  partNumber: 1,
  partTypeLabel: "18 IELTS Reading question types · 5 examples each",
};

export const READING_PART_1_SHOWCASE_QUESTIONS: IReadingQuestionStudent[] = [
  question(1, ReadingQuestionType.LIST_MATCHING, {
    groupLabel: "R-01 · List Matching",
    instructions:
      "Choose FIVE answers from the box and write the correct letter, A–G, next to Questions 1–5.",
    questionText:
      "What is the main purpose of each of the following planning actions?",
    options: [
      "Reduce pressure on drains",
      "Protect new planting from early failure",
      "Find locations where maps miss local problems",
      "Limit the risk from a single disease",
      "Provide evidence for later investment",
    ],
    wordBank: [
      "A — Protect and maintain young trees",
      "B — Use trees to intercept rainfall",
      "C — Consult local residents",
      "D — Plant a diverse mix of species",
      "E — Measure long-term outcomes",
      "F — Remove all mature trees",
      "G — Replace every drainage system",
    ],
  }),
  question(2, ReadingQuestionType.MATCHING_HEADINGS, {
    groupLabel: "R-02 · Heading Matching",
    instructions:
      "Choose the correct heading for sections A–E and move it into each gap.",
    questionText: "Choose the correct heading.",
    options: ["Section A", "Section B", "Section C", "Section D", "Section E"],
    wordBank: [
      "A new view of the urban forest",
      "Two natural cooling processes",
      "How trees slow storm water",
      "Reducing risk through variety",
      "Knowledge supplied by residents",
      "Why all cities need one species",
      "The end of public consultation",
    ],
  }),
  question(3, ReadingQuestionType.MATCHING_FEATURES, {
    groupLabel: "R-03 · Matching Features",
    instructions:
      "Match each statement with the correct feature, A–E.",
    questionText: "Urban tree features",
    options: [
      "Catches rain before it reaches the ground",
      "Releases water through leaves",
      "Identifies bus stops without shade",
      "Requires watering during its first years",
      "Supports evidence-based investment",
    ],
    wordBank: [
      "A — Street cooling",
      "B — Rainwater management",
      "C — Community knowledge",
      "D — Young-tree maintenance",
      "E — Long-term measurement",
    ],
  }),
  question(4, ReadingQuestionType.MATCHING_INFORMATION, {
    groupLabel: "R-04 · Information Matching",
    instructions:
      "Which section, A–H, contains the following information?",
    questionText: "Find the information in sections A–H.",
    options: [
      "An explanation of why a mixture of species is safer",
      "Examples of problems known by local residents",
      "The two ways in which trees reduce heat",
      "A warning that planting alone is not enough",
      "The measurements cities use to judge value",
    ],
    wordBank: ["A", "B", "C", "D", "E", "F", "G", "H"],
  }),
  question(5, ReadingQuestionType.MATCHING_SENTENCE_ENDINGS, {
    groupLabel: "R-05 · Sentence-Ending Matching",
    instructions:
      "Complete each sentence with the correct ending, A–G.",
    questionText: "Complete the sentences.",
    options: [
      "Young trees may die before delivering major benefits unless they",
      "A connected canopy is most effective when mature crowns",
      "Rainwater enters the ground more easily because roots",
      "A diverse mix protects the urban forest because disease",
      "Future investment can be evidence-based when cities",
    ],
    wordBank: [
      "receive regular care.",
      "extend above pavements and buildings.",
      "create channels in the soil.",
      "is less likely to affect every tree.",
      "measure survival and environmental results.",
      "remove all community consultation.",
      "replace public drainage completely.",
    ],
  }),
  question(6, ReadingQuestionType.NOTE_COMPLETION, {
    groupLabel: "R-06 · Note Completion",
    instructions:
      "Complete the notes. Write NO MORE THAN TWO WORDS for each answer.",
    questionText: "How urban trees help a city",
    options: [
      `Tree crowns provide ${FLOWCHART_GAP_TOKEN}.`,
      `Water released through leaves cools the surrounding ${FLOWCHART_GAP_TOKEN}.`,
      `Roots create channels in the ${FLOWCHART_GAP_TOKEN}.`,
      `Residents identify paths that flood after ${FLOWCHART_GAP_TOKEN}.`,
      `Young trees need inspections by trained ${FLOWCHART_GAP_TOKEN}.`,
    ],
  }),
  question(7, ReadingQuestionType.TABLE_COMPLETION, {
    groupLabel: "R-07 · Table Completion",
    instructions:
      "Complete the table. Write NO MORE THAN TWO WORDS for each answer.",
    questionText: "Urban forest planning",
    options: [
      "Stage|||Evidence considered",
      `Species selection|||Expected height and ${FLOWCHART_GAP_TOKEN}`,
      `Heat management|||Summer surface ${FLOWCHART_GAP_TOKEN}`,
      `Storm planning|||Amount of intercepted ${FLOWCHART_GAP_TOKEN}`,
      `Early maintenance|||Regular watering and damage ${FLOWCHART_GAP_TOKEN}`,
      `Long-term review|||Tree ${FLOWCHART_GAP_TOKEN}`,
    ],
  }),
  question(8, ReadingQuestionType.SENTENCE_COMPLETION, {
    groupLabel: "R-08 · Sentence Completion",
    instructions:
      "Complete the sentences. Write NO MORE THAN TWO WORDS for each answer.",
    questionText: "Complete the sentences below.",
    options: [
      `Tree roots create ${FLOWCHART_GAP_TOKEN} in the soil.`,
      `Mature trees can form an almost continuous ${FLOWCHART_GAP_TOKEN}.`,
      `Disease is less likely to damage the whole ${FLOWCHART_GAP_TOKEN}.`,
      `Poorly placed branches may obstruct ${FLOWCHART_GAP_TOKEN}.`,
      `The benefits of planting often appear ${FLOWCHART_GAP_TOKEN}.`,
    ],
  }),
  question(9, ReadingQuestionType.FLOWCHART_COMPLETION, {
    groupLabel: "R-09 · Flow-chart Completion",
    instructions:
      "Complete the flow chart. Write ONE WORD ONLY for each answer.",
    questionText: "From planning to long-term value",
    options: [
      `Residents identify local ${FLOWCHART_GAP_TOKEN}`,
      `Planners compare suitable tree ${FLOWCHART_GAP_TOKEN}`,
      `Young trees receive regular ${FLOWCHART_GAP_TOKEN}`,
      `Mature trees intercept ${FLOWCHART_GAP_TOKEN}`,
      `Cities measure tree ${FLOWCHART_GAP_TOKEN}`,
    ],
    wordBank: [
      "needs",
      "species",
      "watering",
      "rainfall",
      "survival",
      "furniture",
      "traffic",
    ],
  }),
  question(10, ReadingQuestionType.DIAGRAM_LABEL_COMPLETION, {
    groupLabel: "R-10 · Diagram Label Completion",
    instructions:
      "Choose the correct label from the box for each numbered feature.",
    questionText: "Urban tree system",
    options: [
      "Upper layer that provides shade",
      "Part that carries water slowly downward",
      "Underground structures that create soil channels",
      "Ground area cooled below the crown",
      "Space where intercepted water can soak in",
    ],
    wordBank: [
      "canopy",
      "trunk",
      "roots",
      "pavement",
      "soil",
      "branch guard",
      "street lamp",
    ],
  }),
  question(11, ReadingQuestionType.SUMMARY_COMPLETION, {
    groupLabel: "R-11 · Summary Completion (With Clues)",
    instructions:
      "Complete the summary using ONE WORD from the clue list for each answer.",
    questionText: "Community knowledge and planning",
    options: [
      `Residents can identify paths that ${FLOWCHART_GAP_TOKEN} after storms.`,
      `They know which bus stops have no ${FLOWCHART_GAP_TOKEN}.`,
      `Branches in the wrong position may obstruct ${FLOWCHART_GAP_TOKEN}.`,
      `Their observations complement technical ${FLOWCHART_GAP_TOKEN}.`,
      `Successful programmes include community ${FLOWCHART_GAP_TOKEN}.`,
    ],
    wordBank: [
      "flood",
      "shade",
      "lighting",
      "surveys",
      "consultation",
      "disease",
      "height",
    ],
  }),
  question(12, ReadingQuestionType.SUMMARY_COMPLETION, {
    groupLabel: "R-12 · Summary Completion (Without Clues)",
    instructions:
      "Complete the summary. Write ONE WORD ONLY for each answer.",
    questionText: "Looking after young trees",
    options: [
      `Planting is only the ${FLOWCHART_GAP_TOKEN}.`,
      `New trees require regular ${FLOWCHART_GAP_TOKEN}.`,
      `They need protection from accidental ${FLOWCHART_GAP_TOKEN}.`,
      `Inspections should be carried out by trained ${FLOWCHART_GAP_TOKEN}.`,
      `Without maintenance, many trees may ${FLOWCHART_GAP_TOKEN}.`,
    ],
    wordBank: [],
  }),
  question(13, ReadingQuestionType.SHORT_ANSWER, {
    groupLabel: "R-13 · Short-Answer Questions",
    instructions:
      "Answer the questions using NO MORE THAN TWO WORDS for each answer.",
    questionText: "Answer the questions below.",
    options: [
      "What do roots create in the soil?",
      "What do tree crowns provide?",
      "Who can identify needs that maps miss?",
      "What may damage the whole forest if only one species is planted?",
      "What do cities measure to track the amount of tree cover?",
    ],
  }),
  question(14, ReadingQuestionType.CLASSIFICATION, {
    groupLabel: "R-14 · Classification",
    instructions:
      "Classify each item according to the category, A–C.",
    questionText: "Classify each observation",
    options: [
      "Summer surface temperature",
      "A bus stop with no shade",
      "Regular watering",
      "Intercepted rainfall",
      "Protection from accidental damage",
    ],
    wordBank: [
      "A — Environmental measurement",
      "B — Community observation",
      "C — Maintenance activity",
    ],
  }),
  question(15, ReadingQuestionType.YES_NO_NOT_GIVEN, {
    groupLabel: "R-15 · Yes / No / Not Given",
    instructions:
      "Do the following statements agree with the views of the writer?",
    questionText: "Choose YES, NO or NOT GIVEN.",
    options: [
      "Urban trees should be planned as infrastructure rather than decoration.",
      "Every city should plant only one tree species.",
      "Community observations can improve technical planning.",
      "All planting programmes become profitable within one year.",
      "Planting a tree is enough to guarantee its survival.",
    ],
  }),
  question(16, ReadingQuestionType.TRUE_FALSE_NOT_GIVEN, {
    groupLabel: "R-16 · True / False / Not Given",
    instructions:
      "Do the following statements agree with the information in the passage?",
    questionText: "Choose TRUE, FALSE or NOT GIVEN.",
    options: [
      "A diverse mix reduces the risk that disease damages the entire forest.",
      "Tree crowns and released water both contribute to cooling.",
      "Roots prevent any rainwater from entering the ground.",
      "Residents may know where paths flood after storms.",
      "The passage states that all young trees are inspected every month.",
    ],
  }),
  question(17, ReadingQuestionType.TITLE_SUBTITLE_FINDING, {
    groupLabel: "R-17 · Title or Subtitle Finding",
    instructions:
      "Choose the most suitable title or subtitle for each item.",
    questionText: "Choose the best answer, A, B, C or D.",
    options: [
      "Whole passage|||Urban Trees as Living Infrastructure|||A History of Botanical Drawing|||Why Cities No Longer Need Drainage|||A Guide to Indoor Plants",
      "Section B|||Cooling Streets in Two Natural Ways|||Replacing Every Pavement|||The Cost of Street Lighting|||Growing Trees Indoors",
      "Section C|||How Trees Help Manage Heavy Rain|||Why Roots Must Be Removed|||Building Larger Storm Drains|||Measuring Air Pollution",
      "Section E|||Local Knowledge Improves Planning|||Ending Community Consultation|||Choosing Trees by Colour|||The Decline of Bus Travel",
      "Section F|||Planting Is Only the Beginning|||Why Young Trees Need No Care|||Removing Trained Staff|||Benefits That Appear Immediately",
    ],
  }),
  question(18, ReadingQuestionType.MCQ_SINGLE, {
    groupLabel: "R-18 · Multiple Choice Questions (MCQ)",
    instructions:
      "Choose the correct answer, A, B, C or D, for each question.",
    questionText: "Answer the questions below.",
    options: [
      "Why do cities measure tree survival?|||To support evidence-based investment|||To remove all mature trees|||To replace community consultation|||To calculate residents' ages",
      "How do leaves help during heavy rain?|||They intercept water before it reaches the ground|||They stop all evaporation|||They harden the pavement|||They increase pressure on drains",
      "Why is a diverse species mix safer?|||Disease is less likely to affect every tree|||Every tree grows to the same height|||It removes the need for maintenance|||It uses no water",
      "What can residents contribute?|||Knowledge of local shade and flooding problems|||Laboratory measurements of every leaf|||A replacement for all technical surveys|||Guaranteed funding",
      "What do young trees need?|||Watering, protection and inspections|||Only decorative lighting|||Immediate removal of branches|||No attention after planting",
    ],
  }),
];

export const READING_PART_1_SHOWCASE_EXAM: IMockExam = {
  _id: "client-preview-reading-exam",
  title: "Client Approval — Reading UI",
  description:
    "Interactive preview of all 18 supported IELTS Reading question patterns with five examples per type.",
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
