import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../hooks/useAppStore";
import {
  fetchPracticeTests,
  startPracticeTest,
  setCurrentTest,
} from "../../store/slices/testSlice";
import Card, { CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { PageLoader } from "../../components/ui/Spinner";
import { TestModule } from "../../types";
import {
  FiHeadphones,
  FiBookOpen,
  FiEdit3,
  FiMic,
  FiClock,
  FiFilter,
} from "react-icons/fi";

const moduleIcons: Record<string, React.ReactNode> = {
  listening: <FiHeadphones className="h-5 w-5" />,
  reading: <FiBookOpen className="h-5 w-5" />,
  writing: <FiEdit3 className="h-5 w-5" />,
  speaking: <FiMic className="h-5 w-5" />,
};

const PracticeTestsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { practiceTests, loading } = useAppSelector((s) => s.tests);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    dispatch(fetchPracticeTests(filter === "all" ? undefined : filter));
  }, [dispatch, filter]);

  const handleStart = async (testId: string, module: string) => {
    const result = await dispatch(startPracticeTest({ testId, module }));
    if (startPracticeTest.fulfilled.match(result)) {
      navigate(`/test-attempt/${result.payload._id}?type=practice`);
    } else {
      toast.error((result.payload as string) || "Failed to start test");
    }
  };

  if (loading && practiceTests.length === 0) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Practice Tests – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Practice Tests</h1>
            <p className="text-gray-500 mt-1">
              Individual module practice — Listening & Reading are auto-scored
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <FiFilter className="text-gray-400 mr-1" />
          {["all", ...Object.values(TestModule)].map((mod) => (
            <button
              key={mod}
              onClick={() => setFilter(mod)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                filter === mod
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {mod === "all"
                ? "All Modules"
                : mod.charAt(0).toUpperCase() + mod.slice(1)}
            </button>
          ))}
        </div>

        {/* Test grid */}
        {practiceTests.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            No practice tests available for this module.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {practiceTests.map((test) => (
              <Card key={test._id} hover>
                <CardBody className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                        {moduleIcons[test.module] || (
                          <FiBookOpen className="h-5 w-5" />
                        )}
                      </div>
                      <Badge variant="info">{test.module}</Badge>
                    </div>
                    <Badge
                      variant={
                        test.difficulty === "hard"
                          ? "danger"
                          : test.difficulty === "medium"
                            ? "warning"
                            : "success"
                      }
                    >
                      {test.difficulty}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {test.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {test.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <FiClock className="h-4 w-4" />
                      {test.duration} min
                    </span>
                  </div>

                  <Button
                    onClick={() => {
                      dispatch(setCurrentTest(test));
                      handleStart(test._id, test.module);
                    }}
                    fullWidth
                    size="md"
                  >
                    Start Practice
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default PracticeTestsPage;
