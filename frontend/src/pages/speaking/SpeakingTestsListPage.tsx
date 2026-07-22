import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Mic, Play, BookOpen, MessageCircle } from "lucide-react";
import { getActiveSpeakingTests } from "../../api/speaking";
import { ISpeakingTest } from "../../types";
import toast from "react-hot-toast";

const SpeakingTestsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<ISpeakingTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveSpeakingTests()
      .then((res) => setTests(res.data.data ?? []))
      .catch(() => toast.error("Failed to load tests"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-purple-100 rounded-xl p-3">
            <Mic className="w-7 h-7 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Speaking Module
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              IELTS Computer-Based Speaking Practice & Exam
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-6" />
                <div className="h-8 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Mic className="w-14 h-14 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">
              No speaking tests available yet.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tests.map((test) => (
              <div
                key={test._id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-purple-50 text-purple-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                    Speaking
                  </span>
                  <span className="bg-gray-50 text-gray-500 text-xs font-semibold px-2.5 py-1 rounded-full">
                    3 Parts
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-2">
                  {test.title}
                </h3>
                {test.description && (
                  <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                    {test.description}
                  </p>
                )}

                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">
                    Cue Card Topic
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-2 font-medium">
                    {test.cueCardTopic}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {test.totalDuration} min total
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4" />
                    {test.part1Questions.length +
                      test.part3Questions.length +
                      1}{" "}
                    questions
                  </span>
                </div>

                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() =>
                      navigate(`/speaking/test/${test._id}?mode=practice`)
                    }
                    className="flex-1 flex items-center justify-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium py-2 rounded-lg text-sm transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    Practice
                  </button>
                  <button
                    onClick={() =>
                      navigate(`/speaking/test/${test._id}?mode=exam`)
                    }
                    className="flex-1 flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg text-sm transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Exam
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeakingTestsListPage;
