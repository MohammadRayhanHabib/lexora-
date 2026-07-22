import React, {
  createContext,
  useContext,
  useReducer,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { ISpeakingTest, ISpeakingSession, ISpeakingRecording } from "../types";
import {
  startSpeakingSession,
  getSpeakingTimer,
  setPartTimer,
  uploadSpeakingAudio,
  submitSpeakingSession,
} from "../api/speaking";
import toast from "react-hot-toast";

export type SpeakingPart = 1 | 2 | 3;
export type Part2Step = "prep" | "speaking";

// ─── State ─────────────────────────────────────────────────────────────────

interface SpeakingState {
  test: ISpeakingTest | null;
  session: ISpeakingSession | null;
  mode: "practice" | "exam" | null;
  currentPart: SpeakingPart;
  part2Step: Part2Step;
  currentQuestionIndex: number;
  remainingSeconds: number;
  partRemainingSeconds: number;
  isRecording: boolean;
  recordings: ISpeakingRecording[];
  uploadProgress: number;
  submitted: boolean;
  loading: boolean;
}

type SpeakingAction =
  | { type: "SET_TEST"; payload: ISpeakingTest }
  | { type: "SET_SESSION"; payload: ISpeakingSession }
  | { type: "SET_MODE"; payload: "practice" | "exam" }
  | { type: "SET_PART"; payload: SpeakingPart }
  | { type: "SET_PART2_STEP"; payload: Part2Step }
  | { type: "SET_QUESTION_INDEX"; payload: number }
  | { type: "SET_REMAINING"; payload: number }
  | { type: "SET_PART_REMAINING"; payload: number }
  | { type: "SET_RECORDING"; payload: boolean }
  | { type: "ADD_RECORDING"; payload: ISpeakingRecording }
  | { type: "SET_UPLOAD_PROGRESS"; payload: number }
  | { type: "SET_SUBMITTED" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "RESET" };

const initialState: SpeakingState = {
  test: null,
  session: null,
  mode: null,
  currentPart: 1,
  part2Step: "prep",
  currentQuestionIndex: 0,
  remainingSeconds: 0,
  partRemainingSeconds: 0,
  isRecording: false,
  recordings: [],
  uploadProgress: 0,
  submitted: false,
  loading: false,
};

function reducer(state: SpeakingState, action: SpeakingAction): SpeakingState {
  switch (action.type) {
    case "SET_TEST":
      return { ...state, test: action.payload };
    case "SET_SESSION":
      return { ...state, session: action.payload };
    case "SET_MODE":
      return { ...state, mode: action.payload };
    case "SET_PART":
      return { ...state, currentPart: action.payload, currentQuestionIndex: 0 };
    case "SET_PART2_STEP":
      return { ...state, part2Step: action.payload };
    case "SET_QUESTION_INDEX":
      return { ...state, currentQuestionIndex: action.payload };
    case "SET_REMAINING":
      return { ...state, remainingSeconds: action.payload };
    case "SET_PART_REMAINING":
      return { ...state, partRemainingSeconds: action.payload };
    case "SET_RECORDING":
      return { ...state, isRecording: action.payload };
    case "ADD_RECORDING":
      return { ...state, recordings: [...state.recordings, action.payload] };
    case "SET_UPLOAD_PROGRESS":
      return { ...state, uploadProgress: action.payload };
    case "SET_SUBMITTED":
      return { ...state, submitted: true, isRecording: false };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────────────────

interface SpeakingContextValue {
  state: SpeakingState;
  startSession: (
    test: ISpeakingTest,
    mode: "practice" | "exam",
  ) => Promise<void>;
  startPartTimer: (part: SpeakingPart, durationSeconds: number) => void;
  goToNextQuestion: () => void;
  goToPart: (part: SpeakingPart) => void;
  setPart2Step: (step: Part2Step) => void;
  setRecording: (recording: boolean) => void;
  uploadRecording: (
    blob: Blob,
    part: SpeakingPart,
    questionIndex?: number,
    durationSeconds?: number,
  ) => Promise<void>;
  submitSession: () => Promise<ISpeakingSession | null>;
  reset: () => void;
}

const SpeakingContext = createContext<SpeakingContextValue | null>(null);

export const SpeakingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const partTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopPartTimer = useCallback(() => {
    if (partTimerRef.current) {
      clearInterval(partTimerRef.current);
      partTimerRef.current = null;
    }
  }, []);

  const startGlobalTimer = useCallback(
    (expiresAt: number) => {
      stopTimer();
      const tick = () => {
        const remaining = Math.max(
          0,
          Math.floor((expiresAt - Date.now()) / 1000),
        );
        dispatch({ type: "SET_REMAINING", payload: remaining });
        if (remaining <= 0) stopTimer();
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    },
    [stopTimer],
  );

  const startPartTimerLocal = useCallback(
    (expiresAt: number) => {
      stopPartTimer();
      const tick = () => {
        const remaining = Math.max(
          0,
          Math.floor((expiresAt - Date.now()) / 1000),
        );
        dispatch({ type: "SET_PART_REMAINING", payload: remaining });
        if (remaining <= 0) stopPartTimer();
      };
      tick();
      partTimerRef.current = setInterval(tick, 1000);
    },
    [stopPartTimer],
  );

  useEffect(() => {
    return () => {
      stopTimer();
      stopPartTimer();
    };
  }, [stopTimer, stopPartTimer]);

  const startSession = useCallback(
    async (test: ISpeakingTest, mode: "practice" | "exam") => {
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const { data } = await startSpeakingSession(test._id, mode);
        const { session } = data.data;

        dispatch({ type: "SET_TEST", payload: test });
        dispatch({ type: "SET_SESSION", payload: session });
        dispatch({ type: "SET_MODE", payload: mode });

        if (session.recordings) {
          for (const r of session.recordings) {
            dispatch({ type: "ADD_RECORDING", payload: r });
          }
        }

        // Sync global timer
        const timerRes = await getSpeakingTimer(test._id);
        if (timerRes.data.data) {
          startGlobalTimer(timerRes.data.data.expiresAt);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message ?? "Failed to start session");
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [startGlobalTimer],
  );

  const startPartTimer = useCallback(
    async (part: SpeakingPart, durationSeconds: number) => {
      if (!state.test) return;
      dispatch({ type: "SET_PART", payload: part });
      try {
        const { data } = await setPartTimer(
          state.test._id,
          part,
          durationSeconds,
        );
        startPartTimerLocal(data.data.expiresAt);
      } catch {
        // Fallback: local timer
        const expiresAt = Date.now() + durationSeconds * 1000;
        startPartTimerLocal(expiresAt);
      }
    },
    [state.test, startPartTimerLocal],
  );

  const goToNextQuestion = useCallback(() => {
    dispatch({
      type: "SET_QUESTION_INDEX",
      payload: state.currentQuestionIndex + 1,
    });
  }, [state.currentQuestionIndex]);

  const goToPart = useCallback((part: SpeakingPart) => {
    dispatch({ type: "SET_PART", payload: part });
  }, []);

  const setPart2Step = useCallback((step: Part2Step) => {
    dispatch({ type: "SET_PART2_STEP", payload: step });
  }, []);

  const setRecording = useCallback((recording: boolean) => {
    dispatch({ type: "SET_RECORDING", payload: recording });
  }, []);

  const uploadRecording = useCallback(
    async (
      blob: Blob,
      part: SpeakingPart,
      questionIndex?: number,
      durationSeconds?: number,
    ) => {
      if (!state.test) return;
      const formData = new FormData();
      const ext = blob.type.includes("webm") ? "webm" : "wav";
      formData.append("audio", blob, `recording_${Date.now()}.${ext}`);
      formData.append("testId", state.test._id);
      formData.append("part", String(part));
      if (questionIndex !== undefined)
        formData.append("questionIndex", String(questionIndex));
      if (durationSeconds !== undefined)
        formData.append("durationSeconds", String(durationSeconds));

      try {
        const { data } = await uploadSpeakingAudio(
          formData,
          (progress: number) => {
            dispatch({ type: "SET_UPLOAD_PROGRESS", payload: progress });
          },
        );
        const { audioUrl } = data.data;
        dispatch({
          type: "ADD_RECORDING",
          payload: {
            part,
            questionIndex,
            audioUrl,
            durationSeconds,
            uploadedAt: new Date().toISOString(),
          },
        });
        dispatch({ type: "SET_UPLOAD_PROGRESS", payload: 0 });
      } catch (err: any) {
        toast.error("Failed to upload recording");
        dispatch({ type: "SET_UPLOAD_PROGRESS", payload: 0 });
      }
    },
    [state.test],
  );

  const submitSession =
    useCallback(async (): Promise<ISpeakingSession | null> => {
      if (!state.test) return null;
      dispatch({ type: "SET_LOADING", payload: true });
      stopTimer();
      stopPartTimer();
      try {
        const { data } = await submitSpeakingSession(state.test._id);
        dispatch({ type: "SET_SUBMITTED" });
        return data.data as ISpeakingSession;
      } catch (err: any) {
        toast.error(err.response?.data?.message ?? "Failed to submit");
        return null;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }, [state.test, stopTimer, stopPartTimer]);

  const reset = useCallback(() => {
    stopTimer();
    stopPartTimer();
    dispatch({ type: "RESET" });
  }, [stopTimer, stopPartTimer]);

  return (
    <SpeakingContext.Provider
      value={{
        state,
        startSession,
        startPartTimer,
        goToNextQuestion,
        goToPart,
        setPart2Step,
        setRecording,
        uploadRecording,
        submitSession,
        reset,
      }}
    >
      {children}
    </SpeakingContext.Provider>
  );
};

export const useSpeaking = () => {
  const ctx = useContext(SpeakingContext);
  if (!ctx) throw new Error("useSpeaking must be used inside SpeakingProvider");
  return ctx;
};
