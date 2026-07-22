import React, {
  createContext,
  useContext,
  useReducer,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { IListeningTest, IListeningAttempt } from "../types";
import {
  startListeningAttempt,
  getListeningTimer,
  submitListeningAttempt,
} from "../api/listening";
import toast from "react-hot-toast";

// ─── State ─────────────────────────────────────────────────────────────────

interface ListeningState {
  test: IListeningTest | null;
  attempt: IListeningAttempt | null;
  answers: Record<string, string>;
  remainingSeconds: number;
  isRunning: boolean;
  audioStarted: boolean;
  submitted: boolean;
  loading: boolean;
  mode: "practice" | "exam" | null;
}

type ListeningAction =
  | { type: "SET_TEST"; payload: IListeningTest }
  | { type: "SET_ATTEMPT"; payload: IListeningAttempt }
  | { type: "SET_MODE"; payload: "practice" | "exam" }
  | { type: "SET_ANSWERS"; payload: Record<string, string> }
  | { type: "UPDATE_ANSWER"; payload: { qId: string; value: string } }
  | { type: "SET_REMAINING"; payload: number }
  | { type: "SET_RUNNING"; payload: boolean }
  | { type: "AUDIO_STARTED" }
  | { type: "SET_SUBMITTED" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "RESET" };

const initialState: ListeningState = {
  test: null,
  attempt: null,
  answers: {},
  remainingSeconds: 0,
  isRunning: false,
  audioStarted: false,
  submitted: false,
  loading: false,
  mode: null,
};

function reducer(
  state: ListeningState,
  action: ListeningAction,
): ListeningState {
  switch (action.type) {
    case "SET_TEST":
      return { ...state, test: action.payload };
    case "SET_ATTEMPT":
      return { ...state, attempt: action.payload };
    case "SET_MODE":
      return { ...state, mode: action.payload };
    case "SET_ANSWERS":
      return { ...state, answers: action.payload };
    case "UPDATE_ANSWER":
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.payload.qId]: action.payload.value,
        },
      };
    case "SET_REMAINING":
      return { ...state, remainingSeconds: action.payload };
    case "SET_RUNNING":
      return { ...state, isRunning: action.payload };
    case "AUDIO_STARTED":
      return { ...state, audioStarted: true, isRunning: true };
    case "SET_SUBMITTED":
      return { ...state, submitted: true, isRunning: false };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────────────────

interface ListeningContextValue {
  state: ListeningState;
  startSession: (
    test: IListeningTest,
    mode: "practice" | "exam",
  ) => Promise<void>;
  updateAnswer: (qId: string, value: string) => void;
  markAudioStarted: () => void;
  submitTest: () => Promise<IListeningAttempt | null>;
  reset: () => void;
}

const ListeningContext = createContext<ListeningContextValue | null>(null);

export const ListeningProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Timer tick ────────────────────────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (expiresAt: number) => {
      stopTimer();
      const tick = () => {
        const remaining = Math.max(
          0,
          Math.floor((expiresAt - Date.now()) / 1000),
        );
        dispatch({ type: "SET_REMAINING", payload: remaining });
        if (remaining <= 0) {
          stopTimer();
        }
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    },
    [stopTimer],
  );

  // ── Autosave ──────────────────────────────────────────────────────────────
  const stopAutosave = useCallback(() => {
    if (autosaveRef.current) {
      clearInterval(autosaveRef.current);
      autosaveRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      stopAutosave();
    };
  }, [stopTimer, stopAutosave]);

  // ── Start session ─────────────────────────────────────────────────────────
  const startSession = useCallback(
    async (test: IListeningTest, mode: "practice" | "exam") => {
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const { data } = await startListeningAttempt(test._id, mode);
        const raw = data.data as Record<string, unknown> | IListeningAttempt;
        const attempt =
          raw &&
          typeof raw === "object" &&
          "attempt" in raw &&
          raw.attempt &&
          typeof raw.attempt === "object"
            ? (raw.attempt as IListeningAttempt)
            : raw && typeof raw === "object" && "_id" in raw
              ? (raw as IListeningAttempt)
              : null;
        if (!attempt) {
          throw new Error("Invalid start session response");
        }

        dispatch({ type: "SET_TEST", payload: test });
        dispatch({ type: "SET_ATTEMPT", payload: attempt });
        dispatch({ type: "SET_MODE", payload: mode });

        // Restore existing answers
        if (attempt.answers) {
          dispatch({ type: "SET_ANSWERS", payload: attempt.answers });
        }

        // Sync timer from Redis
        const timerRes = await getListeningTimer(test._id);
        const timerPayload = timerRes.data.data;
        if (timerPayload?.expiresAt != null) {
          startTimer(timerPayload.expiresAt);
        }

        // Start periodic autosave every 15s
        autosaveRef.current = setInterval(async () => {
          // accessed via closure - but state.answers won't update here because of stale closure
          // We need to use a ref for answers
        }, 15000);
      } catch (err: any) {
        toast.error(err.response?.data?.message ?? "Failed to start test");
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [startTimer],
  );

  const updateAnswer = useCallback((qId: string, value: string) => {
    dispatch({ type: "UPDATE_ANSWER", payload: { qId, value } });
  }, []);

  const markAudioStarted = useCallback(() => {
    dispatch({ type: "AUDIO_STARTED" });
  }, []);

  const submitTest =
    useCallback(async (): Promise<IListeningAttempt | null> => {
      if (!state.test || !state.attempt) return null;
      dispatch({ type: "SET_LOADING", payload: true });
      stopTimer();
      stopAutosave();
      try {
        const att = state.attempt;
        const attemptId =
          typeof att._id === "string" ? att._id : String(att._id ?? "");
        const { data } = await submitListeningAttempt(
          state.test._id,
          state.answers,
          { attemptId, mode: state.mode ?? undefined },
        );
        dispatch({ type: "SET_SUBMITTED" });
        return data.data as IListeningAttempt;
      } catch (err: any) {
        toast.error(err.response?.data?.message ?? "Failed to submit");
        return null;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }, [state.test, state.attempt, state.answers, state.mode, stopTimer, stopAutosave]);

  const reset = useCallback(() => {
    stopTimer();
    stopAutosave();
    dispatch({ type: "RESET" });
  }, [stopTimer, stopAutosave]);

  return (
    <ListeningContext.Provider
      value={{
        state,
        startSession,
        updateAnswer,
        markAudioStarted,
        submitTest,
        reset,
      }}
    >
      {children}
    </ListeningContext.Provider>
  );
};

export const useListening = () => {
  const ctx = useContext(ListeningContext);
  if (!ctx)
    throw new Error("useListening must be used inside ListeningProvider");
  return ctx;
};
