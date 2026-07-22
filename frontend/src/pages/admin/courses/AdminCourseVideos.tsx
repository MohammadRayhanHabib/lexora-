import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { courseApi } from "../../../api/courses";
import Card, { CardBody } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Input from "../../../components/ui/Input";
import { PageLoader } from "../../../components/ui/Spinner";
import type { ICourseVideo } from "../../../types";
import { TestModule } from "../../../types";
import { FiTrash2, FiEdit2, FiUpload } from "react-icons/fi";

type VideoFormState = {
  title: string;
  description: string;
  category: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
  price: string;
  sortOrder: string;
  isFree: boolean;
};

const emptyForm: VideoFormState = {
  title: "",
  description: "",
  category: TestModule.LISTENING,
  videoUrl: "",
  thumbnailUrl: "",
  duration: "60",
  price: "0",
  sortOrder: "0",
  isFree: false,
};

const AdminCourseVideos: React.FC = () => {
  const [videos, setVideos] = useState<ICourseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VideoFormState>(emptyForm);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const res = await courseApi.adminListVideos();
      setVideos(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Cannot load course videos");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setVideoFile(null);
    setThumbnailFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!videoFile && !form.videoUrl.trim()) {
      toast.error("Upload a video file or provide a video URL");
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("title", form.title.trim());
      data.append("description", form.description.trim());
      data.append("category", form.category);
      data.append("videoUrl", form.videoUrl.trim());
      data.append("thumbnailUrl", form.thumbnailUrl.trim());
      data.append("duration", form.duration);
      data.append("price", form.price);
      data.append("sortOrder", form.sortOrder);
      data.append("isFree", String(form.isFree));
      if (videoFile) data.append("videoFile", videoFile);
      if (thumbnailFile) data.append("thumbnailFile", thumbnailFile);

      if (editingId) {
        await courseApi.adminUpdateVideo(editingId, data);
        toast.success("Course video updated");
      } else {
        await courseApi.adminCreateVideo(data);
        toast.success("Course video created");
      }

      resetForm();
      await loadVideos();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Cannot save course video");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (video: ICourseVideo) => {
    setEditingId(video._id);
    setForm({
      title: video.title || "",
      description: video.description || "",
      category: video.category || TestModule.LISTENING,
      videoUrl: video.videoUrl || "",
      thumbnailUrl: video.thumbnailUrl || "",
      duration: String(video.duration ?? 60),
      price: String(video.price ?? 0),
      sortOrder: String((video as any).sortOrder ?? 0),
      isFree: Boolean(video.isFree),
    });
    setVideoFile(null);
    setThumbnailFile(null);
  };

  const handleDelete = async (videoId: string) => {
    if (!window.confirm("Deactivate this video?")) return;
    try {
      await courseApi.adminDeleteVideo(videoId);
      toast.success("Video deactivated");
      await loadVideos();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Cannot delete video");
    }
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Course Videos – Admin</title>
      </Helmet>

      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Videos</h1>
          <p className="text-gray-500 mt-1">
            Upload lesson videos for students and manage playback content.
          </p>
        </div>

        <Card>
          <CardBody className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingId ? "Edit video" : "Add new video"}
                </h2>
                <p className="text-sm text-gray-500">
                  Use a file upload for the actual lesson or paste a streaming
                  URL.
                </p>
              </div>
              {editingId && (
                <Button variant="ghost" onClick={resetForm}>
                  Cancel edit
                </Button>
              )}
            </div>

            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <Input
                label="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Lesson title"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  {Object.values(TestModule).map((mod) => (
                    <option key={mod} value={mod}>
                      {mod.charAt(0).toUpperCase() + mod.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="What will students learn in this video?"
                />
              </div>

              <Input
                label="Video URL"
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                placeholder="Optional when uploading a file"
              />
              <Input
                label="Thumbnail URL"
                value={form.thumbnailUrl}
                onChange={(e) =>
                  setForm({ ...form, thumbnailUrl: e.target.value })
                }
                placeholder="Optional when uploading a file"
              />

              <Input
                label="Duration (minutes)"
                type="number"
                min="0"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              />
              <Input
                label="Price"
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />

              <Input
                label="Sort Order"
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: e.target.value })
                }
              />
              <label className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isFree}
                  onChange={(e) =>
                    setForm({ ...form, isFree: e.target.checked })
                  }
                />
                Free lesson
              </label>

              <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                  Video File
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Thumbnail File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setThumbnailFile(e.target.files?.[0] || null)
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                  />
                </label>
              </div>

              <div className="md:col-span-2 flex gap-3">
                <Button type="submit" loading={submitting}>
                  <FiUpload className="mr-2" />
                  {editingId ? "Update Video" : "Upload Video"}
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Reset
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {videos.map((video) => (
            <Card key={video._id} hover>
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {video.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {video.category || "course"} · {video.duration} min
                    </p>
                  </div>
                  <Badge variant={video.isActive ? "success" : "gray"}>
                    {video.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <p className="text-sm text-gray-600 line-clamp-3">
                  {video.description}
                </p>

                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  <Badge variant="info">
                    {video.isFree ? "Free" : `Paid ${video.price}`}
                  </Badge>
                  <Badge variant="gray">Sort {video.sortOrder ?? 0}</Badge>
                </div>

                <div className="flex flex-wrap gap-3">
                  {video.videoUrl && (
                    <a
                      href={video.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      Open video URL
                    </a>
                  )}
                  {video.thumbnailUrl && (
                    <a
                      href={video.thumbnailUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      Open thumbnail
                    </a>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEdit(video)}
                  >
                    <FiEdit2 className="mr-2" /> Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(video._id)}
                  >
                    <FiTrash2 className="mr-2" /> Deactivate
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
};

export default AdminCourseVideos;
