import React, { useEffect, useState } from "react";
import {
  FiHeadphones,
  FiPause,
  FiPlay,
  FiVolume2,
} from "react-icons/fi";

const QUESTION_NUMBERS = Array.from({ length: 10 }, (_, index) => index + 1);

const ListeningPracticeUI: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(18);
  const [activeQuestion, setActiveQuestion] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setAudioProgress((progress) => {
        if (progress >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return progress + 0.35;
      });
    }, 500);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const updateAnswer = (question: number, value: string) => {
    setAnswers((current) => ({ ...current, [question]: value }));
    setActiveQuestion(question);
  };

  const focusQuestion = (question: number) => {
    setActiveQuestion(question);
    document.getElementById(`listening-answer-${question}`)?.focus();
  };

  return (
    <section
      className="flex min-h-0 flex-1 flex-col gap-3"
      aria-label="Listening practice workspace"
    >
      <div className="shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-4 px-4 py-3 md:grid-cols-[170px_1fr_260px] md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary-700">
              Listening · Part 1
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500">Questions 1-10</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPlaying((playing) => !playing)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700"
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
            >
              {isPlaying ? <FiPause /> : <FiPlay className="ml-0.5" />}
            </button>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-700 transition-[width]"
                style={{ width: `${audioProgress}%` }}
              />
            </div>
            <FiVolume2 className="shrink-0 text-gray-500" />
          </div>

          <div className="exam-readable rounded-lg bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-600">
            Complete the notes below. Write <strong>ONE WORD AND/OR A NUMBER</strong>
            for each answer.
          </div>
        </div>
      </div>

      <div className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:min-h-0">
        <div className="flex items-center gap-2 border-b border-gray-100 bg-slate-50 px-4 py-3">
          <FiHeadphones className="text-primary-600" />
          <h2 className="text-sm font-bold text-gray-900">Restaurant recommendations</h2>
          <span className="ml-auto text-[11px] text-gray-400">Audio preview · replay allowed</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-3 sm:p-5">
          <p className="mb-3 text-xs text-gray-500 md:hidden">
            Swipe sideways to view the full table.
          </p>
          <table className="exam-readable h-full w-full min-w-[850px] border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="sticky top-0 z-10 border border-gray-300 bg-gray-50 px-3 py-3 text-center">Name of restaurant</th>
                <th className="sticky top-0 z-10 border border-gray-300 bg-gray-50 px-3 py-3 text-center">Location</th>
                <th className="sticky top-0 z-10 border border-gray-300 bg-gray-50 px-3 py-3 text-center">Reason for recommendation</th>
                <th className="sticky top-0 z-10 border border-gray-300 bg-gray-50 px-3 py-3 text-center">Other comments</th>
              </tr>
            </thead>
            <tbody className="leading-7 text-gray-700">
              <tr>
                <td className="border border-gray-300 px-3 py-4">The Junction</td>
                <td className="border border-gray-300 px-3 py-4">Greyson Street, near the station</td>
                <td className="border border-gray-300 px-3 py-4">
                  Good for people especially keen on <AnswerBlank question={1} value={answers[1]} active={activeQuestion === 1} onChange={updateAnswer} />
                </td>
                <td className="border border-gray-300 px-3 py-4">
                  Quite expensive. The <AnswerBlank question={2} value={answers[2]} active={activeQuestion === 2} onChange={updateAnswer} /> is a good place for a drink.
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-4">Paloma</td>
                <td className="border border-gray-300 px-3 py-4">In Bow Street, next to the cinema</td>
                <td className="border border-gray-300 px-3 py-4">
                  <AnswerBlank question={3} value={answers[3]} active={activeQuestion === 3} onChange={updateAnswer} /> food, good for sharing
                </td>
                <td className="border border-gray-300 px-3 py-4">
                  Staff are friendly. A limited selection of <AnswerBlank question={4} value={answers[4]} active={activeQuestion === 4} onChange={updateAnswer} /> food.
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-4">
                  The <AnswerBlank question={5} value={answers[5]} active={activeQuestion === 5} onChange={updateAnswer} />
                </td>
                <td className="border border-gray-300 px-3 py-4">
                  At the top of <AnswerBlank question={6} value={answers[6]} active={activeQuestion === 6} onChange={updateAnswer} />
                </td>
                <td className="border border-gray-300 px-3 py-4">
                  A famous chef. All the <AnswerBlank question={7} value={answers[7]} active={activeQuestion === 7} onChange={updateAnswer} /> are very good. Only uses <AnswerBlank question={8} value={answers[8]} active={activeQuestion === 8} onChange={updateAnswer} /> ingredients.
                </td>
                <td className="border border-gray-300 px-3 py-4">
                  Set lunch costs £ <AnswerBlank question={9} value={answers[9]} active={activeQuestion === 9} onChange={updateAnswer} /> per person. Portions probably of <AnswerBlank question={10} value={answers[10]} active={activeQuestion === 10} onChange={updateAnswer} /> size.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 overflow-x-auto rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
        {QUESTION_NUMBERS.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => focusQuestion(question)}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
              activeQuestion === question
                ? "bg-primary-700 text-white"
                : answers[question]
                  ? "bg-primary-100 text-primary-700"
                  : "border border-gray-200 bg-white text-gray-600"
            }`}
          >
            {question}
          </button>
        ))}
        <span className="ml-auto shrink-0 px-2 text-[11px] text-gray-400">
          {Object.values(answers).filter(Boolean).length}/10 answered
        </span>
      </div>
    </section>
  );
};

const AnswerBlank: React.FC<{
  question: number;
  value?: string;
  active: boolean;
  onChange: (question: number, value: string) => void;
}> = ({ question, value = "", active, onChange }) => (
  <span className="relative mx-1 inline-flex align-middle">
    <span className="absolute -top-2 left-1 text-[9px] font-bold text-primary-700">
      {question}
    </span>
    <input
      id={`listening-answer-${question}`}
      value={value}
      onFocus={() => onChange(question, value)}
      onChange={(event) => onChange(question, event.target.value)}
      className={`h-8 w-24 rounded-md border bg-primary-100/70 px-2 pt-1 text-center text-xs font-semibold text-gray-900 outline-none transition-colors ${
        active
          ? "border-primary-500 ring-2 ring-primary-100"
          : "border-primary-200 focus:border-primary-500"
      }`}
      aria-label={`Answer ${question}`}
    />
  </span>
);

export default ListeningPracticeUI;
