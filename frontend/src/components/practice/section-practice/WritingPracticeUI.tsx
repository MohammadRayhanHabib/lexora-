import React, { useMemo, useState } from "react";
import { FiArrowDown, FiArrowRight, FiEdit3, FiFileText } from "react-icons/fi";

const WRITING_TASKS = {
  1: {
    title: "Writing Task 1",
    time: "20 minutes",
    minimum: 150,
    instruction:
      "The diagram shows how fabric is manufactured from bamboo. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  },
  2: {
    title: "Writing Task 2",
    time: "40 minutes",
    minimum: 250,
    instruction:
      "Some people believe that public transport should be free in large cities. Discuss both views and give your own opinion.",
  },
} as const;

type WritingTaskNumber = keyof typeof WRITING_TASKS;

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

const WritingPracticeUI: React.FC = () => {
  const [task, setTask] = useState<WritingTaskNumber>(1);
  const [answers, setAnswers] = useState<Record<WritingTaskNumber, string>>({
    1: "",
    2: "",
  });
  const activeTask = WRITING_TASKS[task];
  const wordCount = useMemo(() => countWords(answers[task]), [answers, task]);

  return (
    <section className="space-y-3" aria-label="Writing practice workspace">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary-700">
            Academic writing
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Complete both tasks. Task 2 carries more marks.
          </p>
        </div>
        <div className="flex rounded-lg bg-gray-100 p-1">
          {([1, 2] as WritingTaskNumber[]).map((number) => (
            <button
              key={number}
              type="button"
              onClick={() => setTask(number)}
              className={`rounded-md px-4 py-2 text-xs font-semibold ${
                task === number
                  ? "bg-primary-700 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Task {number}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-190px)] grid-cols-1 gap-3 lg:grid-cols-[0.72fr_1.28fr]">
        <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-slate-50 px-5 py-3">
            <p className="text-xs font-semibold text-gray-500">{activeTask.time}</p>
            <h2 className="mt-1 text-base font-bold uppercase text-gray-900">
              {activeTask.title}
            </h2>
          </div>
          <div className="exam-readable max-h-[calc(100vh-260px)] overflow-y-auto px-5 py-5 text-sm leading-6 text-gray-700">
            <p>{activeTask.instruction}</p>
            <p className="mt-4 font-semibold text-gray-900">
              Write at least {activeTask.minimum} words.
            </p>

            {task === 1 ? (
              <BambooProcessDiagram />
            ) : (
              <div className="mt-6 rounded-2xl border border-primary-100 bg-primary-50 p-5">
                <FiFileText className="h-8 w-8 text-primary-600" />
                <p className="mt-3 font-semibold text-primary-900">
                  Consider access, public cost, traffic congestion and the
                  environmental impact in your response.
                </p>
              </div>
            )}
          </div>
        </article>

        <div className="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <FiEdit3 className="text-primary-600" />
              <h3 className="text-sm font-bold text-gray-900">Your essay</h3>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                wordCount >= activeTask.minimum
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {wordCount} / {activeTask.minimum} words
            </span>
          </div>
          <textarea
            value={answers[task]}
            onChange={(event) =>
              setAnswers((current) => ({
                ...current,
                [task]: event.target.value,
              }))
            }
            placeholder={`Write your Task ${task} response here...`}
            className="min-h-[440px] flex-1 resize-none px-5 py-5 text-[15px] leading-7 text-gray-800 outline-none placeholder:text-gray-300 focus:bg-primary-50/20"
            aria-label={`Writing Task ${task} response`}
          />
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-[11px] text-gray-400">
            <span>Draft stays until you leave this preview</span>
            <span>Plain text response</span>
          </div>
        </div>
      </div>
    </section>
  );
};

const BambooProcessDiagram: React.FC = () => {
  const steps = [
    "Plant bamboo",
    "Harvest stems",
    "Cut into strips",
    "Crush strips",
    "Soften fibres",
    "Spin yarn",
    "Weave fabric",
    "Make clothing",
  ];

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-center text-xs font-bold uppercase tracking-wider text-gray-500">
        How bamboo fabric is made
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <div className="relative flex min-h-20 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-2 text-center shadow-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                {index + 1}
              </span>
              <span className="mt-2 text-[10px] font-semibold leading-tight text-gray-700">
                {step}
              </span>
              {index < steps.length - 1 && index % 4 !== 3 && (
                <FiArrowRight className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-primary-400 sm:block" />
              )}
              {index === 3 && (
                <FiArrowDown className="absolute -bottom-3 left-1/2 z-10 hidden -translate-x-1/2 text-primary-400 sm:block" />
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default WritingPracticeUI;
