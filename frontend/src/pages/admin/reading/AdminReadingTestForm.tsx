import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { readingApi, IReadingTest } from "../../../api/reading";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Card, { CardBody } from "../../../components/ui/Card";
import { PageLoader } from "../../../components/ui/Spinner";
import RichTextEditor from "../../../components/ui/RichTextEditor";

const AdminReadingTestForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id && id !== "new");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [passageImageFile, setPassageImageFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    title: "",
    passageTitle: "",
    passageContent: "",
    passageImage: "",
    duration: 60,
    showExplanations: false,
    isActive: true,
    // Hierarchy
    academicNumber: "" as string | number,
    testNumber: "" as string | number,
    partNumber: "" as string | number,
    partTypeLabel: "",
  });

  useEffect(() => {
    if (!isEdit) return;
    readingApi
      .adminGetTest(id!)
      .then((r) => {
        const t: IReadingTest = r.data.data?.test!;
        setForm({
          title: t.title,
          passageTitle: t.passageTitle,
          passageContent: t.passageContent,
          passageImage: t.passageImage ?? "",
          duration: t.duration,
          showExplanations: t.showExplanations,
          isActive: t.isActive,
          academicNumber: t.academicNumber ?? "",
          testNumber: t.testNumber ?? "",
          partNumber: t.partNumber ?? "",
          partTypeLabel: t.partTypeLabel ?? "",
        });
      })
      .catch(() => toast.error("Failed to load test"))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleChange = (
    field: keyof typeof form,
    value: string | boolean | number,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.title.trim() ||
      !form.passageTitle.trim() ||
      !form.passageContent.trim()
    ) {
      toast.error("Title, passage title and passage content are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        academicNumber:
          form.academicNumber !== "" ? Number(form.academicNumber) : undefined,
        testNumber:
          form.testNumber !== "" ? Number(form.testNumber) : undefined,
        partNumber:
          form.partNumber !== "" ? Number(form.partNumber) : undefined,
        partTypeLabel: form.partTypeLabel || undefined,
      };

      const formData = new FormData();
      formData.append("title", String(payload.title));
      formData.append("passageTitle", String(payload.passageTitle));
      formData.append("passageContent", String(payload.passageContent));
      formData.append("duration", String(payload.duration));
      formData.append("showExplanations", String(payload.showExplanations));
      formData.append("isActive", String(payload.isActive));
      if (payload.passageImage)
        formData.append("passageImage", payload.passageImage);
      if (payload.academicNumber !== undefined) {
        formData.append("academicNumber", String(payload.academicNumber));
      }
      if (payload.testNumber !== undefined) {
        formData.append("testNumber", String(payload.testNumber));
      }
      if (payload.partNumber !== undefined) {
        formData.append("partNumber", String(payload.partNumber));
      }
      if (payload.partTypeLabel) {
        formData.append("partTypeLabel", String(payload.partTypeLabel));
      }
      if (passageImageFile) {
        formData.append("passageImageFile", passageImageFile);
      }

      if (isEdit) {
        await readingApi.adminUpdateTest(id!, formData);
        toast.success("Reading test updated");
        navigate(`/admin/reading/${id}/questions`);
      } else {
        const res = await readingApi.adminCreateTest(formData);
        const newId = res.data.data?._id;
        toast.success("Reading test created");
        navigate(`/admin/reading/${newId}/questions`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save test");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>
          {isEdit ? "Edit" : "Create"} Reading Test – Admin – Lexora
        </title>
      </Helmet>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/reading")}
          >
            <FiArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? "Edit Reading Test" : "Create Reading Test"}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {isEdit
                ? "Update passage and test settings"
                : "Manually craft a new IELTS reading passage and test"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <Card>
            <CardBody className="space-y-5">
              <h2 className="text-base font-semibold text-gray-800">
                Test Details
              </h2>

              <Input
                label="Test Title *"
                placeholder="e.g. IELTS Academic Reading Practice – Set 1"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                required
              />

              <Input
                label="Passage Title *"
                placeholder="e.g. The History of Urban Transport"
                value={form.passageTitle}
                onChange={(e) => handleChange("passageTitle", e.target.value)}
                required
              />

              {/* ── Hierarchy fields ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Academic No.
                    <span className="text-xs text-gray-400 ml-1">
                      (e.g. 20)
                    </span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="20"
                    value={form.academicNumber}
                    onChange={(e) =>
                      handleChange("academicNumber", e.target.value)
                    }
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test No.
                    <span className="text-xs text-gray-400 ml-1">(1–4)</span>
                  </label>
                  <select
                    value={form.testNumber}
                    onChange={(e) => handleChange("testNumber", e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
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
                    Part No.
                    <span className="text-xs text-gray-400 ml-1">(1–3)</span>
                  </label>
                  <select
                    value={form.partNumber}
                    onChange={(e) => handleChange("partNumber", e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  >
                    <option value="">— none —</option>
                    {[1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        Part {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Type Label
                  </label>
                  <select
                    value={form.partTypeLabel}
                    onChange={(e) =>
                      handleChange("partTypeLabel", e.target.value)
                    }
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  >
                    <option value="">— none —</option>
                    {[
                      "Short Answer",
                      "Identify",
                      "Choice",
                      "Matching",
                      "Heading",
                      "Multiple Choice",
                      "Fill in Blanks",
                      "Sentence Completion",
                      "Summary Completion",
                      "Diagram Label",
                      "Flowchart",
                      "Table Completion",
                    ].map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={form.duration}
                    onChange={(e) =>
                      handleChange("duration", parseInt(e.target.value) || 60)
                    }
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Passage Image (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setPassageImageFile(e.target.files?.[0] ?? null)
                    }
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  />
                  {form.passageImage && !passageImageFile && (
                    <p className="mt-1 text-xs text-gray-500">
                      Existing passage image is set. Select a file to replace
                      it.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => handleChange("isActive", e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Active (visible to students)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.showExplanations}
                    onChange={(e) =>
                      handleChange("showExplanations", e.target.checked)
                    }
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Show explanations after submission
                </label>
              </div>
            </CardBody>
          </Card>

          {/* Passage content */}
          <Card>
            <CardBody className="space-y-3">
              <div>
                <h2 className="text-base font-semibold text-gray-800">
                  Passage Content *
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Rich text supported — use the toolbar for bold, italic,
                  underline, headings.
                </p>
              </div>
              <RichTextEditor
                value={form.passageContent}
                onChange={(html) => handleChange("passageContent", html)}
                placeholder="Paste or type the reading passage here..."
                minHeight="400px"
              />
            </CardBody>
          </Card>

          {/* Save */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/admin/reading")}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="gap-2">
              <FiSave className="w-4 h-4" />
              {isEdit ? "Save Changes" : "Create & Add Questions"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AdminReadingTestForm;
