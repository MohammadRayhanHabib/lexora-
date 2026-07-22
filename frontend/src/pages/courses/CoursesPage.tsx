import React, { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { courseApi } from "../../api/courses";
import Card, { CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { PageLoader } from "../../components/ui/Spinner";
import type { ICourseNote, ICourseVideo } from "../../types";
import { TestModule } from "../../types";
import { FiPlay, FiClock, FiFilter, FiSend, FiTrash2 } from "react-icons/fi";

function formatTimestamp(seconds?: number) {
  if (seconds === undefined || Number.isNaN(seconds)) return "00:00";
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const remaining = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

const CoursesPage: React.FC = () => {
  const [videos, setVideos] = useState<ICourseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [streamModal, setStreamModal] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");
  const [streamTitle, setStreamTitle] = useState("");
  const [activeVideo, setActiveVideo] = useState<ICourseVideo | null>(null);
  const [notes, setNotes] = useState<ICourseNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const vRes = await courseApi.listVideos(
        filter === "all" ? undefined : filter,
      );
      setVideos(vRes.data.data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  const loadNotes = async (videoId: string) => {
    setNotesLoading(true);
    try {
      const res = await courseApi.getVideoNotes(videoId);
      setNotes(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Cannot load notes");
    } finally {
      setNotesLoading(false);
    }
  };

  const handleWatch = async (video: ICourseVideo) => {
    try {
      const res = await courseApi.streamVideo(video._id);
      setStreamUrl(res.data.data.streamUrl);
      setStreamTitle(video.title);
      setActiveVideo(video);
      setCurrentTime(0);
      setNoteText("");
      setNotes([]);
      setStreamModal(true);
      loadNotes(video._id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Cannot stream video");
    }
  };

  const handleSaveNote = async () => {
    if (!activeVideo) return;
    if (!noteText.trim()) {
      toast.error("Please write a note first");
      return;
    }
    setSavingNote(true);
    try {
      await courseApi.createVideoNote(activeVideo._id, {
        content: noteText.trim(),
        videoTimestamp: currentTime,
      });
      setNoteText("");
      await loadNotes(activeVideo._id);
      toast.success("Note saved");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Cannot save note");
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await courseApi.deleteVideoNote(noteId);
      if (activeVideo) {
        await loadNotes(activeVideo._id);
      }
      toast.success("Note deleted");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Cannot delete note");
    }
  };

  const handleCloseModal = () => {
    setStreamModal(false);
    setStreamUrl("");
    setStreamTitle("");
    setActiveVideo(null);
    setNotes([]);
    setNoteText("");
    setCurrentTime(0);
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Courses – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Videos</h1>
          <p className="text-gray-500 mt-1">
            Direct lesson access with timestamped notes and playback protection.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-400" />
            {(["all", ...Object.values(TestModule)] as const).map((mod) => (
              <button
                key={mod}
                onClick={() => setFilter(mod)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  filter === mod
                    ? "bg-primary-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {mod === "all"
                  ? "All"
                  : mod.charAt(0).toUpperCase() + mod.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            No videos available.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => {
              return (
                <Card key={video._id} hover>
                  {video.thumbnailUrl && (
                    <div className="aspect-video bg-gray-100 rounded-t-xl overflow-hidden">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardBody className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="info">{video.category || "course"}</Badge>
                      <Badge variant="success">Open access</Badge>
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {video.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {video.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FiClock className="h-4 w-4" />
                        {video.duration} min
                      </span>
                    </div>
                    <Button fullWidth onClick={() => handleWatch(video)}>
                      <FiPlay className="mr-1" /> Watch
                    </Button>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={streamModal}
        onClose={handleCloseModal}
        title={streamTitle}
        size="xl"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="space-y-3">
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {streamUrl ? (
                <video
                  ref={videoRef}
                  src={streamUrl}
                  controls
                  controlsList="nodownload"
                  disablePictureInPicture
                  className="w-full h-full"
                  onContextMenu={(e) => e.preventDefault()}
                  onTimeUpdate={() => {
                    if (videoRef.current) {
                      setCurrentTime(videoRef.current.currentTime);
                    }
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="flex items-center justify-center h-full text-white">
                  Loading...
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rotate-[-20deg] text-white/15 text-4xl font-black tracking-[0.35em] select-none">
                  LEXORA
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Current playback position: {formatTimestamp(currentTime)}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900">Notes</h4>
              <p className="text-xs text-gray-500 mt-1">
                Save timestamps and ideas while watching.
              </p>
            </div>

            <div className="space-y-3">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={4}
                placeholder="Write a note for this lesson..."
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <Button
                fullWidth
                onClick={handleSaveNote}
                loading={savingNote}
                disabled={!activeVideo}
              >
                <FiSend className="mr-2" /> Save Note
              </Button>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {notesLoading ? (
                <p className="text-sm text-gray-500">Loading notes...</p>
              ) : notes.length === 0 ? (
                <p className="text-sm text-gray-500">No notes yet.</p>
              ) : (
                notes.map((note) => (
                  <div
                    key={note._id}
                    className="rounded-xl bg-white border border-gray-200 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-gray-400">
                      <span>{formatTimestamp(note.videoTimestamp)}</span>
                      <button
                        onClick={() => handleDeleteNote(note._id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete note"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CoursesPage;
