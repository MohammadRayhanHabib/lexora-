import React, { useMemo, useState } from "react";
import {
  FiBookOpen,
  FiCheck,
  FiClock,
  FiInfo,
  FiMonitor,
  FiPlay,
  FiX,
} from "react-icons/fi";
import {
  MODULE_DETAILS,
  PRACTICE_MODE_CONFIG,
  PracticeModule,
  SectionPracticeMode,
  SectionPracticeTestSet,
} from "./sectionPracticeData";

export interface PracticeModeSelection {
  mode: SectionPracticeMode;
  partIds: string[];
  timeLimitMinutes: number;
}

interface PracticeModeChooserModalProps {
  testSet: SectionPracticeTestSet;
  module: PracticeModule;
  onClose: () => void;
  onStart: (selection: PracticeModeSelection) => void;
}

const PracticeModeChooserModal: React.FC<PracticeModeChooserModalProps> = ({
  testSet,
  module,
  onClose,
  onStart,
}) => {
  const config = PRACTICE_MODE_CONFIG[module];
  const allPartIds = useMemo(
    () => config.parts.map((part) => part.id),
    [config.parts],
  );
  const [selectedPartIds, setSelectedPartIds] = useState(allPartIds);
  const suggestedMinutes = config.parts
    .filter((part) => selectedPartIds.includes(part.id))
    .reduce((total, part) => total + part.suggestedMinutes, 0);
  const [customMinutes, setCustomMinutes] = useState(
    Math.max(5, suggestedMinutes),
  );
  const allSelected = selectedPartIds.length === allPartIds.length;

  const togglePart = (partId: string) => {
    setSelectedPartIds((current) => {
      const next = current.includes(partId)
        ? current.filter((id) => id !== partId)
        : [...current, partId];
      const ordered = allPartIds.filter((id) => next.includes(id));
      const nextSuggested = config.parts
        .filter((part) => ordered.includes(part.id))
        .reduce((total, part) => total + part.suggestedMinutes, 0);
      if (nextSuggested > 0) setCustomMinutes(nextSuggested);
      return ordered;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedPartIds([]);
      return;
    }
    setSelectedPartIds(allPartIds);
    setCustomMinutes(
      config.parts.reduce((total, part) => total + part.suggestedMinutes, 0),
    );
  };

  const startPractice = () => {
    if (!selectedPartIds.length) return;
    onStart({
      mode: "practice",
      partIds: selectedPartIds,
      timeLimitMinutes: customMinutes,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-gray-950/60 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="practice-mode-title"
    >
      <div className="my-auto max-h-[94dvh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-primary-100 bg-[#fffafa] shadow-2xl">
        <div className="relative border-b border-primary-100 bg-gradient-to-r from-[#fff0f0] via-[#ffe5e7] to-[#ffdadd] px-6 py-4 text-center sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">
            {testSet.book} · {testSet.title} · {MODULE_DETAILS[module].label}
          </p>
          <h2
            id="practice-mode-title"
            className="mt-1 text-2xl font-extrabold text-primary-700 sm:text-[28px]"
          >
            Choose a mode
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-2 text-primary-400 transition hover:bg-white/70 hover:text-primary-700"
            aria-label="Close mode chooser"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 bg-[#fff7f7] p-4 sm:p-5 md:grid-cols-2">
          <section className="flex flex-col rounded-2xl border border-primary-100 bg-white p-4 shadow-[0_10px_28px_rgba(157,52,52,0.08)] sm:p-5">
            <div className="text-center">
              <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <FiBookOpen className="h-5 w-5" />
              </span>
              <h3 className="mt-2 text-xl font-bold text-gray-900">
                Practice mode
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-500">
                Choose only the parts you want and set a comfortable time limit.
              </p>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-lg bg-primary-50 px-3 py-2 text-[11px] text-primary-700">
              <FiInfo className="mt-0.5 shrink-0" />
              Best for improving accuracy and timing one step at a time.
            </div>

            <fieldset className="mt-3 space-y-1.5">
              <legend className="mb-2 text-xs font-bold text-gray-800">
                1. Choose part/task(s) to practise
              </legend>
              <PartCheckbox
                checked={allSelected}
                label={`Full ${config.parts.length === 1 ? "part" : "parts"}`}
                detail={`${config.parts.length} parts · ${MODULE_DETAILS[module].detail}`}
                onChange={toggleAll}
              />
              {config.parts.map((part) => (
                <PartCheckbox
                  key={part.id}
                  checked={selectedPartIds.includes(part.id)}
                  label={part.label}
                  detail={part.detail}
                  onChange={() => togglePart(part.id)}
                />
              ))}
            </fieldset>

            <label className="mt-3 block text-xs font-bold text-gray-800">
              2. Choose a time limit
              <span className="relative mt-2 flex items-center">
                <FiClock className="pointer-events-none absolute left-3 text-primary-400" />
                <select
                  value={customMinutes}
                  onChange={(event) => setCustomMinutes(Number(event.target.value))}
                  className="h-10 w-full appearance-none rounded-lg border border-primary-100 bg-[#fffafa] pl-9 pr-3 text-xs font-semibold text-gray-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                >
                  {[5, 10, 15, 20, 30, 40, 60, suggestedMinutes]
                    .filter((value, index, values) => value > 0 && values.indexOf(value) === index)
                    .sort((a, b) => a - b)
                    .map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} minutes
                      </option>
                    ))}
                </select>
              </span>
            </label>

            <button
              type="button"
              disabled={!selectedPartIds.length}
              onClick={startPractice}
              className="mx-auto mt-4 inline-flex min-w-36 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-primary-500 to-primary-700 px-6 py-2.5 text-xs font-bold text-white shadow-[0_8px_16px_rgba(157,52,52,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FiPlay /> Start practice
            </button>
          </section>

          <section className="flex flex-col rounded-2xl border border-primary-100 bg-white p-4 shadow-[0_10px_28px_rgba(157,52,52,0.08)] sm:p-5">
            <div className="text-center">
              <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <FiMonitor className="h-5 w-5" />
              </span>
              <h3 className="mt-2 text-xl font-bold text-gray-900">
                Simulation test mode
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-500">
                Experience the complete module with real-test timing and order.
              </p>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-lg bg-primary-50 px-3 py-2 text-[11px] text-primary-700">
              <FiInfo className="mt-0.5 shrink-0" />
              All parts are required and the time limit cannot be changed.
            </div>

            <div className="mt-3 rounded-xl border border-primary-100 bg-[#fffafa] p-4">
              <h4 className="text-xs font-bold text-gray-800">Test information</h4>
              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Module</dt>
                  <dd className="font-semibold text-gray-800">{MODULE_DETAILS[module].label}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Parts</dt>
                  <dd className="font-semibold text-gray-800">All {config.parts.length} parts</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Content</dt>
                  <dd className="font-semibold text-gray-800">{MODULE_DETAILS[module].detail}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-primary-100 pt-2">
                  <dt className="text-gray-500">Fixed time</dt>
                  <dd className="font-bold text-primary-700">{config.simulationMinutes} minutes</dd>
                </div>
              </dl>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-gray-600">
              {config.parts.map((part) => (
                <p key={part.id} className="flex items-center gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                    <FiCheck className="h-3 w-3" />
                  </span>
                  {part.label}: {part.detail}
                </p>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                onStart({
                  mode: "simulation",
                  partIds: allPartIds,
                  timeLimitMinutes: config.simulationMinutes,
                })
              }
              className="mx-auto mt-4 inline-flex min-w-36 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-primary-500 to-primary-700 px-6 py-2.5 text-xs font-bold text-white shadow-[0_8px_16px_rgba(157,52,52,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 md:mt-auto"
            >
              <FiPlay /> Start simulation
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

const PartCheckbox: React.FC<{
  checked: boolean;
  label: string;
  detail: string;
  onChange: () => void;
}> = ({ checked, label, detail, onChange }) => (
  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-100 px-3 py-1.5 transition hover:border-primary-200 hover:bg-primary-50/50">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
    />
    <span className="min-w-0 flex-1">
      <span className="block text-xs font-semibold text-gray-800">{label}</span>
      <span className="block text-[10px] text-gray-400">{detail}</span>
    </span>
  </label>
);

export default PracticeModeChooserModal;
