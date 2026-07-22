import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { writingAdminApi, WritingTaskType } from "../../../api/writing";
import Card, { CardBody } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";

const AdminWritingModuleForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    taskType: WritingTaskType.TASK1,
    instruction: "",
    duration: "40",
    isActive: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    writingAdminApi
      .getModule(id!)
      .then((res) => {
        const mod = res.data.data;
        setForm({
          title: mod.title,
          taskType: mod.taskType,
          instruction: mod.instruction,
          duration: String(mod.duration),
          isActive: mod.isActive,
        });
        if (mod.imageUrl) setExistingImage(mod.imageUrl);
      })
      .catch(() => setError("Failed to load module"))
      .finally(() => setInitialLoading(false));
  }, [id, isEdit]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim() || !form.instruction.trim()) {
      setError("Title and instruction are required");
      return;
    }

    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("taskType", form.taskType);
    fd.append("instruction", form.instruction.trim());
    fd.append("duration", form.duration);
    if (isEdit) fd.append("isActive", String(form.isActive));
    if (imageFile) fd.append("image", imageFile);

    setLoading(true);
    try {
      if (isEdit) {
        await writingAdminApi.updateModule(id!, fd);
      } else {
        await writingAdminApi.createModule(fd);
      }
      navigate("/admin/writing");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to save module");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {isEdit ? "Edit Writing Module" : "New Writing Module"} – Admin –
          Lexora
        </title>
      </Helmet>

      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Edit Writing Module" : "New Writing Module"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure a writing practice task for IELTS students
          </p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="e.g. Bar Chart – Internet Usage 2010–2020"
                  required
                />
              </div>

              {/* Task Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.taskType}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      taskType: e.target.value as WritingTaskType,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={WritingTaskType.TASK1}>
                    Task 1 – Describe a Graph / Chart / Diagram
                  </option>
                  <option value={WritingTaskType.TASK2}>
                    Task 2 – Essay / Discussion / Opinion
                  </option>
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={form.duration}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, duration: e.target.value }))
                  }
                />
              </div>

              {/* Instruction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instruction / Task Prompt{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.instruction}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, instruction: e.target.value }))
                  }
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="The graph below shows... Summarise the information by selecting and reporting the main features..."
                  required
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chart / Diagram Image
                  <span className="text-gray-400 font-normal ml-1">
                    (optional, max 5MB)
                  </span>
                </label>
                {(imagePreview ?? existingImage) && (
                  <img
                    src={imagePreview ?? existingImage!}
                    alt="preview"
                    className="mb-3 max-h-48 rounded-lg border object-contain"
                  />
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  {(imagePreview ?? existingImage)
                    ? "Change Image"
                    : "Upload Image"}
                </Button>
              </div>

              {/* Active toggle - edit only */}
              {isEdit && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, isActive: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-sm font-medium text-gray-700"
                  >
                    Module is active (visible to students)
                  </label>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={loading}>
                  {isEdit ? "Save Changes" : "Create Module"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin/writing")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </>
  );
};

export default AdminWritingModuleForm;
