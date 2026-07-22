import React, { useState } from "react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiBatteryCharging,
  FiChevronLeft,
  FiChevronRight,
  FiWifi,
} from "react-icons/fi";

export interface ReadingPracticeQuestion {
  id: number;
  text: string;
  choices?: string[];
}

export interface ReadingPracticeContent {
  partLabel: string;
  passageInstruction: string;
  passageTitle: string;
  passageParagraphs: string[];
  questionInstructions: string[];
  questions: ReadingPracticeQuestion[];
}

export interface ReadingPracticeUIProps {
  content?: ReadingPracticeContent;
  initialAnswers?: Record<number, string>;
  onAnswersChange?: (answers: Record<number, string>) => void;
}

export const DEFAULT_READING_PRACTICE_CONTENT: ReadingPracticeContent = {
  partLabel: "Part-1",
  passageInstruction:
    "You should spend about 20 minutes on Questions 1-13, which are based on Reading Passage 1 below.",
  passageTitle: "The kākāpō",
  passageParagraphs: [
    "The kākāpō is a nocturnal, flightless parrot that is critically endangered and one of New Zealand's unique treasures.",
    "The kākāpō, also known as the owl parrot, is a large, forest-dwelling bird, with a pale owl-like face. Up to 64 cm in length, it has predominantly yellow-green feathers, forward-facing eyes, a large grey beak, large blue feet, and relatively short wings and tail. It is the world's only flightless parrot, and is also possibly one of the world's longest-living birds, with a reported lifespan of up to 100 years.",
    "Kākāpō are solitary birds and tend to occupy the same home range for many years. They forage on the ground and climb high into trees.",
    "Adult kākāpō are remarkably heavy. Males may weigh more than three kilograms, making the species the world's heaviest parrot. Their colouring allows them to blend into native vegetation, while a strong sense of smell helps them find fruit, seeds and leaves.",
    "Once widespread, the population declined after introduced predators arrived. Today, every known bird is monitored by a conservation team and moved between protected islands when necessary.",
  ],
  questionInstructions: [
    "Do the following statements agree with the information given in Reading Passage 1?",
    "Choose TRUE if the statement agrees with the information in the text.",
    "Choose FALSE if the statement contradicts the information.",
    "Choose NOT GIVEN if there is no information on this.",
  ],
  questions: [
    { id: 1, text: "There are other parrots that share the kākāpō's inability to fly." },
    { id: 2, text: "The kākāpō is the heaviest parrot in the world." },
    { id: 3, text: "Every kākāpō lives in a different home range." },
    { id: 4, text: "Conservationists monitor every known kākāpō." },
    { id: 5, text: "Kākāpō are most active during daylight hours." },
    { id: 6, text: "The bird's green feathers provide camouflage." },
    { id: 7, text: "Male kākāpō can weigh more than three kilograms." },
    { id: 8, text: "Kākāpō mainly eat small animals." },
    { id: 9, text: "Introduced predators contributed to the population decline." },
    { id: 10, text: "All kākāpō remain on the island where they were born." },
  ],
};

const DEFAULT_CHOICES = ["True", "False", "Not Given"];

const ReadingPracticeUI: React.FC<ReadingPracticeUIProps> = ({
  content = DEFAULT_READING_PRACTICE_CONTENT,
  initialAnswers = {},
  onAnswersChange,
}) => {
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [answers, setAnswers] =
    useState<Record<number, string>>(initialAnswers);
  const [mobilePane, setMobilePane] = useState<"passage" | "questions">(
    "passage",
  );

  const activeQuestion = content.questions[activeQuestionIndex];
  const firstQuestionInGroup = activeQuestionIndex < 6 ? 1 : 7;
  const lastQuestionInGroup = activeQuestionIndex < 6 ? 6 : content.questions.length;

  const chooseAnswer = (answer: string) => {
    if (!activeQuestion) return;
    const nextAnswers = { ...answers, [activeQuestion.id]: answer };
    setAnswers(nextAnswers);
    onAnswersChange?.(nextAnswers);
  };

  const openQuestion = (index: number) => {
    const safeIndex = Math.min(
      Math.max(index, 0),
      Math.max(content.questions.length - 1, 0),
    );
    setActiveQuestionIndex(safeIndex);
    setMobilePane("questions");
  };

  return (
    <section
      className="flex min-h-0 flex-1 flex-col gap-3"
      aria-label="Reading practice workspace"
    >
      <div className="grid shrink-0 grid-cols-2 gap-2 rounded-xl bg-white p-1 shadow-sm lg:hidden">
        {(["passage", "questions"] as const).map((pane) => (
          <button
            key={pane}
            type="button"
            onClick={() => setMobilePane(pane)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition-colors ${
              mobilePane === pane
                ? "bg-primary-700 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {pane}
          </button>
        ))}
      </div>

      <div className="grid min-h-[620px] flex-1 grid-cols-1 gap-3 lg:min-h-0 lg:grid-cols-[1.48fr_1fr]">
        <article
          className={`${
            mobilePane === "passage" ? "flex" : "hidden"
          } min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:flex`}
        >
          <div className="shrink-0 border-b border-gray-200 bg-[#edf0f8] px-5 py-4">
            <h2 className="font-serif text-lg font-bold text-gray-900">
              {content.partLabel}
            </h2>
            <p className="exam-readable mt-3 text-[11px] leading-relaxed text-gray-600">
              {content.passageInstruction}
            </p>
          </div>

          <div className="exam-readable min-h-0 flex-1 overflow-y-auto px-6 py-6 text-[13px] leading-7 text-gray-800 sm:px-9">
            <h3 className="text-center font-serif text-lg font-bold text-gray-950">
              {content.passageTitle}
            </h3>
            <div className="mx-auto mt-5 max-w-4xl space-y-4">
              {content.passageParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </article>

        <aside
          className={`${
            mobilePane === "questions" ? "flex" : "hidden"
          } min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:flex`}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:px-8 sm:py-10">
            <h2 className="exam-readable-heading text-lg font-bold text-gray-950">
              Questions {firstQuestionInGroup} - {lastQuestionInGroup}
            </h2>

            <div className="exam-readable mt-12 space-y-3 text-xs font-medium leading-6 text-gray-700">
              {content.questionInstructions.map((instruction) => (
                <p key={instruction}>{instruction}</p>
              ))}
            </div>

            {activeQuestion && (
              <fieldset className="mt-10">
                <legend className="exam-readable-heading flex items-start gap-3 text-sm font-semibold leading-6 text-gray-900">
                  <span className="mt-0.5 text-[10px] font-bold text-primary-300">
                    {activeQuestion.id}
                  </span>
                  <span>{activeQuestion.text}</span>
                </legend>

                <div className="mt-5 space-y-2 pl-7">
                  {(activeQuestion.choices ?? DEFAULT_CHOICES).map((choice) => (
                    <label
                      key={choice}
                      className={`exam-readable flex cursor-pointer items-center gap-2 py-1 text-xs font-medium transition-colors ${
                        answers[activeQuestion.id] === choice
                          ? "text-primary-800"
                          : "text-gray-800 hover:text-primary-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`reading-question-${activeQuestion.id}`}
                        value={choice}
                        checked={answers[activeQuestion.id] === choice}
                        onChange={() => chooseAnswer(choice)}
                        className="h-3.5 w-3.5 accent-primary-700"
                      />
                      {choice.toUpperCase()}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-2 px-5 pb-5">
            <button
              type="button"
              disabled={activeQuestionIndex === 0}
              onClick={() => openQuestion(activeQuestionIndex - 1)}
              className="relative flex h-10 w-12 items-center justify-center overflow-hidden rounded-xl border border-[#f0cdbb] bg-gradient-to-br from-[#fff8df] via-[#f5ddce] to-[#efbda8] text-black shadow-[0_4px_10px_rgba(178,86,56,0.24)] transition hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              aria-label="Previous question"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[2px] left-[2px] top-[2px] w-[76%] rounded-[10px] bg-gradient-to-b from-[#fffbed] to-[#f9dfd2]"
              />
              <FiArrowLeft
                className="relative z-10 h-6 w-7"
                strokeWidth={3}
              />
            </button>
            <button
              type="button"
              disabled={activeQuestionIndex === content.questions.length - 1}
              onClick={() => openQuestion(activeQuestionIndex + 1)}
              className="relative flex h-10 w-12 items-center justify-center overflow-hidden rounded-xl border border-[#f0cdbb] bg-gradient-to-br from-[#efbda8] via-[#f5ddce] to-[#fff8df] text-black shadow-[6px_5px_11px_rgba(178,86,56,0.28)] transition hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              aria-label="Next question"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[2px] right-[2px] top-[2px] w-[76%] rounded-[10px] bg-gradient-to-b from-[#f8d9ce] to-[#fffbe2]"
              />
              <FiArrowRight
                className="relative z-10 h-6 w-7"
                strokeWidth={3}
              />
            </button>
          </div>
        </aside>
      </div>

      <footer className="flex shrink-0 items-center gap-2 overflow-x-auto rounded-lg border border-[#d8deea] bg-[#e8edf7] px-3 py-2 shadow-sm">
        <button
          type="button"
          disabled={activeQuestionIndex === 0}
          onClick={() => openQuestion(activeQuestionIndex - 1)}
          className="flex h-9 w-5 shrink-0 items-center justify-center text-gray-900 transition hover:text-primary-700 disabled:opacity-70"
          aria-label="Previous question"
        >
          <FiChevronLeft />
        </button>

        {content.questions.map((question, index) => (
          <button
            key={question.id}
            type="button"
            onClick={() => openQuestion(index)}
            aria-label={`Open question ${question.id}`}
            aria-current={activeQuestionIndex === index ? "step" : undefined}
            className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border px-2 text-xs font-bold shadow-sm transition-colors ${
              activeQuestionIndex === index
                ? "border-[#8f3036] bg-[#8f3036] text-white"
                : answers[question.id]
                  ? "border-primary-100 bg-primary-100 text-primary-800"
                  : "border-white bg-white text-gray-800 hover:border-primary-100 hover:bg-primary-50"
            }`}
          >
            {activeQuestionIndex === index ? `Q${question.id}` : question.id}
          </button>
        ))}

        <button
          type="button"
          disabled={activeQuestionIndex === content.questions.length - 1}
          onClick={() => openQuestion(activeQuestionIndex + 1)}
          className="flex h-9 w-5 shrink-0 items-center justify-center text-gray-900 transition hover:text-primary-700 disabled:opacity-70"
          aria-label="Next question"
        >
          <FiChevronRight />
        </button>

        <div className="ml-auto hidden shrink-0 items-center gap-2 md:flex">
          <div className="min-w-[112px] rounded-lg border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
            <p className="text-[8px] font-semibold leading-none text-gray-500">
              Confidence Level
            </p>
            <div className="mt-1.5 flex items-center gap-0.5" aria-label="Medium confidence">
              {[0, 1, 2, 3].map((bar) => (
                <span
                  key={bar}
                  className={`h-1.5 w-2 rounded-sm ${
                    bar < 3 ? "bg-primary-300" : "bg-gray-200"
                  }`}
                />
              ))}
              <span className="ml-1 text-[7px] font-semibold text-gray-400">
                Medium
              </span>
            </div>
          </div>
          <div className="flex h-10 items-center gap-3 rounded-lg bg-gradient-to-b from-[#dce8fb] to-[#acc4ee] px-4 text-gray-900 shadow-[0_3px_7px_rgba(70,93,135,0.28)]">
            <FiWifi className="h-4 w-4" aria-label="Connected" />
            <FiBatteryCharging className="h-4 w-4" aria-label="Battery status" />
          </div>
        </div>
      </footer>
    </section>
  );
};

export default ReadingPracticeUI;
