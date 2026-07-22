import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { mockExamApi, IMockExam } from "../../../api/mockExam";
import { readingApi, IReadingTest } from "../../../api/reading";
import { adminListListeningTests } from "../../../api/listening";
import { writingAdminApi, IWritingModule } from "../../../api/writing";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Card, { CardBody } from "../../../components/ui/Card";
import { PageLoader } from "../../../components/ui/Spinner";

type SelectOption = { value: string; label: string };

const AdminMockExamForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id && id !== "new");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Drop-down data
  const [readingTests, setReadingTests] = useState<SelectOption[]>([]);
  const [listeningTests, setListeningTests] = useState<SelectOption[]>([]);
  const [writingModules, setWritingModules] = useState<SelectOption[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    academicNumber: "" as string | number,
    testNumber: "" as string | number,
    isActive: true,
    examType: "mock" as "mock" | "practice",
    // Sections
    listeningTestId: "",
    listeningDuration: 40,
    readingPart1Id: "",
    readingPart2Id: "",
    readingPart3Id: "",
    readingDuration: 60,
    writingTask1Id: "",
    writingTask2Id: "",
    writingDuration: 60,
    speakingTestId: "",
    speakingDuration: 15,
  });

  // Load dropdowns + exam data
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [rRes, lRes, wRes] = await Promise.all([
          readingApi.adminListTests(1, 200),
          adminListListeningTests(1, 200),
          writingAdminApi.listModules(),
        ]);

        setReadingTests(
          (rRes.data.data?.tests ?? []).map((t: IReadingTest) => ({
            value: t._id,
            label: `${t.title}${t.partNumber ? ` (Part ${t.partNumber})` : ""}`,
          })),
        );
        setListeningTests(
          (lRes.data?.data?.tests ?? []).map((t: any) => ({
            value: String(t._id),
            label: t.title,
          })),
        );
        setWritingModules(
          (wRes.data.data ?? []).map((m: IWritingModule) => ({
            value: m._id,
            label: `${m.title} (${m.taskType})`,
          })),
        );
      } catch {
        toast.error("Failed to load test lists");
      }
    };

    loadDropdowns();

    if (isEdit && id) {
      mockExamApi
        .adminGetExam(id)
        .then((r) => {
          const e = r.data.data!;
          setForm({
            title: e.title,
            description: e.description ?? "",
            academicNumber: e.academicNumber ?? "",
            testNumber: e.testNumber ?? "",
            isActive: e.isActive,
            examType: e.examType ?? "mock",
            listeningTestId: e.listeningTestId != null ? String(e.listeningTestId) : "",
            listeningDuration: e.listeningDuration,
            readingPart1Id: e.readingPart1Id ?? "",
            readingPart2Id: e.readingPart2Id ?? "",
            readingPart3Id: e.readingPart3Id ?? "",
            readingDuration: e.readingDuration,
            writingTask1Id: e.writingTask1Id ?? "",
            writingTask2Id: e.writingTask2Id ?? "",
            writingDuration: e.writingDuration,
            speakingTestId: e.speakingTestId ?? "",
            speakingDuration: e.speakingDuration,
          });
        })
        .catch(() => toast.error("Failed to load exam"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id, isEdit]);

  const set = (key: keyof typeof form, val: any) =>
    setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<IMockExam> = {
        ...form,
        academicNumber:
          form.academicNumber !== "" ? Number(form.academicNumber) : undefined,
        testNumber:
          form.testNumber !== "" ? Number(form.testNumber) : undefined,
        listeningTestId: form.listeningTestId || undefined,
        readingPart1Id: form.readingPart1Id || undefined,
        readingPart2Id: form.readingPart2Id || undefined,
        readingPart3Id: form.readingPart3Id || undefined,
        writingTask1Id: form.writingTask1Id || undefined,
        writingTask2Id: form.writingTask2Id || undefined,
        speakingTestId: form.speakingTestId || undefined,
      };

      if (isEdit) {
        await mockExamApi.adminUpdateExam(id!, payload);
        toast.success("Mock exam updated");
      } else {
        await mockExamApi.adminCreateExam(payload);
        toast.success("Mock exam created");
      }
      navigate("/admin/mock-exam");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>{isEdit ? "Edit" : "Create"} Mock Exam – Admin – Lexora</title>
      </Helmet>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/mock-exam")}>
            <FiArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? "Edit Mock Exam" : "Create Mock Exam"}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Bundle existing tests into a full IELTS mock exam
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic info */}
          <Card>
            <CardBody className="space-y-4">
              <h2 className="font-semibold text-gray-800">Exam Details</h2>
              <Input
                label="Exam Title *"
                placeholder="e.g. Cambridge IELTS 20 Test 2"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                required
              />
              <Input
                label="Description"
                placeholder="Brief description for students"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Academic No.
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="20"
                    value={form.academicNumber}
                    onChange={(e) => set("academicNumber", e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test No.
                  </label>
                  <select
                    value={form.testNumber}
                    onChange={(e) => set("testNumber", e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="">— none —</option>
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        Test {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Type
                  </label>
                  <select
                    value={form.examType}
                    onChange={(e) => set("examType", e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="mock">Mock Test</option>
                    <option value="practice">Practice Test</option>
                  </select>
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => set("isActive", e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    Active (visible to students)
                  </label>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Listening */}
          <SectionCard
            title="🎧 Listening Section"
            color="blue"
            durationLabel="Duration (min)"
            duration={form.listeningDuration}
            onDurationChange={(v) => set("listeningDuration", v)}
          >
            <SelectField
              label="Listening Test"
              value={form.listeningTestId}
              options={listeningTests}
              onChange={(v) => set("listeningTestId", v)}
              placeholder="— Select listening test —"
            />
          </SectionCard>

          {/* Reading */}
          <SectionCard
            title="📖 Reading Section"
            color="green"
            durationLabel="Total Duration (min)"
            duration={form.readingDuration}
            onDurationChange={(v) => set("readingDuration", v)}
          >
            <SelectField
              label="Part 1 Passage"
              value={form.readingPart1Id}
              options={readingTests}
              onChange={(v) => set("readingPart1Id", v)}
              placeholder="— Select Part 1 reading test —"
            />
            <SelectField
              label="Part 2 Passage"
              value={form.readingPart2Id}
              options={readingTests}
              onChange={(v) => set("readingPart2Id", v)}
              placeholder="— Select Part 2 reading test —"
            />
            <SelectField
              label="Part 3 Passage"
              value={form.readingPart3Id}
              options={readingTests}
              onChange={(v) => set("readingPart3Id", v)}
              placeholder="— Select Part 3 reading test —"
            />
          </SectionCard>

          {/* Writing */}
          <SectionCard
            title="✍️ Writing Section"
            color="purple"
            durationLabel="Total Duration (min)"
            duration={form.writingDuration}
            onDurationChange={(v) => set("writingDuration", v)}
          >
            <SelectField
              label="Task 1 Module"
              value={form.writingTask1Id}
              options={writingModules.filter((m) =>
                m.label.includes("task1"),
              )}
              onChange={(v) => set("writingTask1Id", v)}
              placeholder="— Select Task 1 module —"
            />
            <SelectField
              label="Task 2 Module"
              value={form.writingTask2Id}
              options={writingModules.filter((m) =>
                m.label.includes("task2"),
              )}
              onChange={(v) => set("writingTask2Id", v)}
              placeholder="— Select Task 2 module —"
            />
          </SectionCard>

          {/* Speaking */}
          <SectionCard
            title="🎙️ Speaking Section"
            color="orange"
            durationLabel="Duration (min)"
            duration={form.speakingDuration}
            onDurationChange={(v) => set("speakingDuration", v)}
          >
            <SelectField
              label="Speaking Test"
              value={form.speakingTestId}
              options={[]} // speaking admin API to be wired similarly
              onChange={(v) => set("speakingTestId", v)}
              placeholder="— Select speaking test —"
            />
          </SectionCard>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/admin/mock-exam")}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="gap-2">
              <FiSave className="w-4 h-4" />
              {isEdit ? "Save Changes" : "Create Mock Exam"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

/* ─── Reusable sub-components ───────────────────────────────── */

const colorMap = {
  blue: "border-blue-200 bg-blue-50/40",
  green: "border-green-200 bg-green-50/40",
  purple: "border-purple-200 bg-purple-50/40",
  orange: "border-orange-200 bg-orange-50/40",
};

const SectionCard: React.FC<{
  title: string;
  color: keyof typeof colorMap;
  durationLabel: string;
  duration: number;
  onDurationChange: (v: number) => void;
  children: React.ReactNode;
}> = ({ title, color, durationLabel, duration, onDurationChange, children }) => (
  <div className={`rounded-xl border p-5 space-y-4 ${colorMap[color]}`}>
    <div className="flex items-center justify-between">
      <h2 className="font-semibold text-gray-800">{title}</h2>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">{durationLabel}:</label>
        <input
          type="number"
          min={5}
          max={180}
          value={duration}
          onChange={(e) => onDurationChange(parseInt(e.target.value) || 0)}
          className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
        />
      </div>
    </div>
    {children}
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, options, onChange, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
    >
      <option value="">{placeholder ?? "— none —"}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

export default AdminMockExamForm;
