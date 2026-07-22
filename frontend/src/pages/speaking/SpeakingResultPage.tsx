import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Mic,
  ArrowLeft,
  Trophy,
  Clock,
  MessageCircle,
  Star,
} from "lucide-react";
import { getSpeakingSessionDetail } from "../../api/speaking";
import { getSpeakingTest } from "../../api/speaking";
import { ISpeakingSession, ISpeakingTest } from "../../types";
import toast from "react-hot-toast";

const SpeakingResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<ISpeakingSession | null>(null);
  const [test, setTest] = useState<ISpeakingTest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await getSpeakingSessionDetail(id);
        const sess: ISpeakingSession = data.data;
        setSession(sess);
        const testRes = await getSpeakingTest(sess.testId);
        setTest(testRes.data.data);
      } catch {
        toast.error("Failed to load result");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || !test) return null;

  const isPending =
    session.status === "submitted" && session.score === undefined;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => navigate("/speaking")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tests
        </button>

        {/* Score card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-600 text-sm font-semibold px-3 py-1 rounded-full mb-6">
            <Mic className="w-4 h-4" />
            Speaking Result
          </div>

          {isPending ? (
            <div className="py-6">
              <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-yellow-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Awaiting Evaluation
              </h2>
              <p className="text-gray-500 text-sm">
                Your recordings have been submitted. An examiner will evaluate
                and score your speaking session shortly.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <span className="text-5xl font-bold text-gray-900">
                  {session.score?.toFixed(1) ?? "—"}
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-6">Overall Band Score</p>

              {session.partScores && (
                <div className="flex items-center justify-center gap-6 mb-6">
                  {[1, 2, 3].map((p) => {
                    const score =
                      session.partScores?.[
                        `part${p}` as "part1" | "part2" | "part3"
                      ];
                    return (
                      <div key={p} className="text-center">
                        <div className="text-2xl font-bold text-purple-700">
                          {score?.toFixed(1) ?? "—"}
                        </div>
                        <div className="text-xs text-gray-400">Part {p}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {session.feedback && (
                <div className="bg-purple-50 rounded-xl p-4 text-left mt-4">
                  <div className="flex items-center gap-2 text-purple-700 font-semibold text-sm mb-2">
                    <Star className="w-4 h-4" />
                    Examiner Feedback
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {session.feedback}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Recordings */}
        {session.recordings && session.recordings.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-gray-600" />
                <h3 className="font-semibold text-gray-800">Your Recordings</h3>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {session.recordings.map((rec, i) => {
                const partQuestions =
                  rec.part === 1
                    ? test.part1Questions
                    : rec.part === 3
                      ? test.part3Questions
                      : null;
                const label =
                  rec.part === 2
                    ? "Cue Card — " + test.cueCardTopic
                    : (partQuestions?.[rec.questionIndex ?? 0] ??
                      `Part ${rec.part}`);

                return (
                  <div key={i} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                          Part {rec.part}
                        </span>
                        <p className="text-sm text-gray-700 mt-1 line-clamp-1">
                          {label}
                        </p>
                      </div>
                      {rec.durationSeconds && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.floor(rec.durationSeconds / 60)}:
                          {String(rec.durationSeconds % 60).padStart(2, "0")}
                        </span>
                      )}
                    </div>
                    <audio
                      src={rec.audioUrl}
                      controls
                      className="w-full h-9 accent-purple-600"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => navigate("/speaking")}
            className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-xl text-sm"
          >
            Back to Tests
          </button>
          <button
            onClick={() =>
              navigate(`/speaking/test/${session.testId}?mode=practice`)
            }
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-xl text-sm"
          >
            Practice Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpeakingResultPage;
