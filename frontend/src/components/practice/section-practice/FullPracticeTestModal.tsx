import React from "react";
import { FiCheck, FiPlay, FiX } from "react-icons/fi";
import {
  MODULE_DETAILS,
  PRACTICE_MODULES,
  SectionPracticeTestSet,
} from "./sectionPracticeData";

export type FullPracticeTestAction =
  | "Start"
  | "Continue"
  | "Review"
  | "Retake";

interface FullPracticeTestModalProps {
  testSet: SectionPracticeTestSet;
  action: FullPracticeTestAction;
  onClose: () => void;
  onConfirm: () => void;
}

const FullPracticeTestModal: React.FC<FullPracticeTestModalProps> = ({
  testSet,
  action,
  onClose,
  onConfirm,
}) => (
  <div
    className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/60 p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="full-practice-test-title"
  >
    <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
            {testSet.book} - {testSet.subtitle}
          </p>
          <h3
            id="full-practice-test-title"
            className="mt-1 text-xl font-bold text-gray-900"
          >
            {action} {testSet.title} as a full test?
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Close full test dialog"
        >
          <FiX />
        </button>
      </div>

      <div className="space-y-4 px-5 py-5">
        <p className="text-sm leading-relaxed text-gray-500">
          The preview moves through all four modules in IELTS order. You can
          save and return after any module.
        </p>
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PRACTICE_MODULES.map((module, index) => (
            <li
              key={module}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                {index + 1}
              </span>
              <span>
                <span className="block text-sm font-semibold text-gray-800">
                  {MODULE_DETAILS[module].label}
                </span>
                <span className="block text-[10px] text-gray-400">
                  {MODULE_DETAILS[module].duration} minutes
                </span>
              </span>
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <FiCheck className="shrink-0" />
          Approximate total time: 2 hours 44 minutes.
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <FiPlay />
          {action} full test
        </button>
      </div>
    </div>
  </div>
);

export default FullPracticeTestModal;
