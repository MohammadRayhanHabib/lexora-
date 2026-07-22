import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import {
  enrollmentApi,
  EnrollmentType,
  EnrolledModule,
  MODULE_META,
} from "../../api/enrollment";
import { PageLoader } from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import {
  FiHeadphones,
  FiBookOpen,
  FiEdit3,
  FiMic,
  FiChevronLeft,
  FiLock,
  FiTool,
} from "react-icons/fi";

const MODULE_ICONS: Record<string, React.ReactNode> = {
  reading: <FiBookOpen className="h-6 w-6" />,
  listening: <FiHeadphones className="h-6 w-6" />,
  writing: <FiEdit3 className="h-6 w-6" />,
  speaking: <FiMic className="h-6 w-6" />,
};

const ModulePracticePage: React.FC = () => {
  const { module } = useParams<{ module: string }>();
  const navigate = useNavigate();

  const [accessGranted, setAccessGranted] = useState<boolean | null>(null);

  const validMod = Object.values(EnrolledModule).includes(
    module as EnrolledModule,
  );
  const mod = module as EnrolledModule;

  useEffect(() => {
    if (!validMod) {
      navigate("/practice/individual", { replace: true });
      return;
    }
    (async () => {
      try {
        const enrollments = await enrollmentApi.getMyEnrollments();
        const enrolled = enrollments.some(
          (e) =>
            e.type === EnrollmentType.INDIVIDUAL_MODULE &&
            e.module === mod &&
            e.isActive,
        );
        if (!enrolled) {
          setAccessGranted(false);
          return;
        }
        // Reading uses the dedicated reading module — redirect immediately
        if (mod === EnrolledModule.READING) {
          navigate("/reading", { replace: true });
          return;
        }
        // Writing uses the dedicated writing module — redirect immediately
        if (mod === EnrolledModule.WRITING) {
          navigate("/writing", { replace: true });
          return;
        }
        // Listening uses the dedicated listening tests list — same pattern as reading
        if (mod === EnrolledModule.LISTENING) {
          navigate("/listening", { replace: true });
          return;
        }
        setAccessGranted(true);
      } catch {
        toast.error("Failed to verify enrollment");
        setAccessGranted(false);
      }
    })();
  }, [mod, validMod, navigate]);

  if (accessGranted === null) return <PageLoader />;

  // Not enrolled
  if (!accessGranted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="p-4 bg-gray-100 rounded-full">
          <FiLock className="h-10 w-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
        <p className="text-gray-500 max-w-sm">
          You are not enrolled in the{" "}
          <strong>{MODULE_META[mod]?.label ?? module}</strong> module.
        </p>
        <Button onClick={() => navigate("/practice/individual")}>
          Go to Individual Module
        </Button>
      </div>
    );
  }

  // Coming Soon for Speaking only (reading / listening / writing redirect above)
  const meta = MODULE_META[mod];
  return (
    <>
      <Helmet>
        <title>{meta?.label ?? module} Practice – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        {/* Back + header */}
        <div>
          <button
            onClick={() => navigate("/practice/individual")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors"
          >
            <FiChevronLeft className="h-4 w-4" />
            Back to Individual Module
          </button>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${meta?.bg ?? "bg-gray-100"}`}>
              <span className={meta?.color ?? "text-gray-600"}>
                {MODULE_ICONS[mod] ?? <FiBookOpen className="h-6 w-6" />}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {meta?.label ?? module} Practice
              </h1>
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <div className="p-4 bg-white rounded-full shadow">
            <FiTool className="h-10 w-10 text-primary-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Coming Soon</h2>
          <p className="text-gray-500 max-w-sm text-sm">
            The <strong>{meta?.label}</strong> practice module is under
            construction. It will be available soon — stay tuned!
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/practice/individual")}
          >
            Back to Modules
          </Button>
        </div>
      </div>
    </>
  );
};

export default ModulePracticePage;
