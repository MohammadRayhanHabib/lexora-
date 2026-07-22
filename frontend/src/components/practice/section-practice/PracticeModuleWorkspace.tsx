import React from "react";
import ListeningPracticeUI from "./ListeningPracticeUI";
import ReadingPracticeUI, {
  ReadingPracticeContent,
} from "./ReadingPracticeUI";
import SpeakingPracticeUI from "./SpeakingPracticeUI";
import WritingPracticeUI from "./WritingPracticeUI";
import {
  PracticeModule,
  SectionPracticeMode,
} from "./sectionPracticeData";

export interface PracticeSessionSummary {
  mode: SectionPracticeMode;
  partLabels: string[];
  timeLimitMinutes: number;
}

export interface PracticeModuleWorkspaceProps {
  module: PracticeModule;
  readingContent?: ReadingPracticeContent;
  session?: PracticeSessionSummary;
}

/**
 * Shared module renderer used by Section Practice and the full Mock Practice
 * orchestrator. The parent flow owns sequencing and data; each module
 * component owns only its exam interaction UI.
 */
const PracticeModuleWorkspace: React.FC<PracticeModuleWorkspaceProps> = ({
  module,
  readingContent,
  session,
}) => {
  let workspace: React.ReactNode;

  switch (module) {
    case "listening":
      workspace = <ListeningPracticeUI />;
      break;
    case "reading":
      workspace = <ReadingPracticeUI content={readingContent} />;
      break;
    case "writing":
      workspace = <WritingPracticeUI />;
      break;
    case "speaking":
      workspace = <SpeakingPracticeUI />;
      break;
  }

  return (
    <>
      {session && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/80 bg-white/75 px-4 py-2 text-xs shadow-sm backdrop-blur">
          <p className="font-semibold text-gray-700">
            {session.mode === "simulation" ? "Simulation test" : "Practice mode"}
            <span className="mx-2 text-gray-300">•</span>
            {session.partLabels.join(", ")}
          </p>
          <p className="font-semibold text-primary-700">
            {session.timeLimitMinutes} minute limit
          </p>
        </div>
      )}
      {workspace}
    </>
  );
};

export default PracticeModuleWorkspace;
