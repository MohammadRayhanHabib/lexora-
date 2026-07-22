import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Headphones, Play, BookOpen } from "lucide-react";
import { getActiveListeningTests } from "../../api/listening";
import { IListeningTest } from "../../types";
import toast from "react-hot-toast";

const ListeningTestsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<IListeningTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveListeningTests()
      .then((res) => setTests(res.data.data ?? []))
      .catch(() => toast.error("Failed to load tests"))
      .finally(() => setLoading(false));
  }, []);

  const totalQuestions = (test: IListeningTest) =>
    (test.sections ?? []).reduce(
      (acc, s) => acc + (s.questions?.length ?? 0),
      0,
    );

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-100 rounded-xl p-3">
            <Headphones className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Listening Module
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              IELTS Computer-Based Listening Practice & Exam
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
            <Headphones className="w-14 h-14 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">
              No listening tests available yet.
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
                  <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                    Listening
                  </span>
                  {test.allowReplay && (
                    <span className="bg-green-50 text-green-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                      Replay ✓
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-2">
                  {test.title}
                </h3>
                {test.description && (
                  <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                    {test.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500 mt-auto mb-4">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {test.duration} min
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    {totalQuestions(test)} questions
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      navigate(`/listening/test/${test._id}?mode=practice`)
                    }
                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 rounded-lg text-sm transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    Practice
                  </button>
                  <button
                    onClick={() =>
                      navigate(`/listening/test/${test._id}?mode=exam`)
                    }
                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition-colors"
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

export default ListeningTestsListPage;
