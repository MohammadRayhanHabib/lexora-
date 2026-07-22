import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { FiArrowLeft, FiSave, FiMic, FiInfo } from "react-icons/fi";
import {
  adminGetSpeakingTest,
  adminCreateSpeakingTest,
  adminUpdateSpeakingTest,
} from "../../../api/speaking";
import Button from "../../../components/ui/Button";
import Card, { CardBody } from "../../../components/ui/Card";
import { PageLoader } from "../../../components/ui/Spinner";

/* ---------- Helper to split textarea lines ---------- */
const linesToArray = (text: string): string[] =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

const arrayToLines = (arr: string[]): string => arr.join("\n");

/* ---------- Component ---------- */
const AdminSpeakingTestForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Basic info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [totalDuration, setTotalDuration] = useState(15);
  const [perQuestionRecording, setPerQuestionRecording] = useState(true);

  // Part 1
  const [part1Text, setPart1Text] = useState("");

  // Part 2
  const [cueCardTopic, setCueCardTopic] = useState("");
  const [cueCardInstructions, setCueCardInstructions] = useState("");
  const [prepTime, setPrepTime] = useState(60);
  const [speakingTime, setSpeakingTime] = useState(120);

  // Part 3
  const [part3Text, setPart3Text] = useState("");

  /* ---- Load existing test for edit ---- */
  useEffect(() => {
    if (!id) return;
    adminGetSpeakingTest(id)
      .then((r) => {
        const t = r.data.data?.test;
        if (!t) return;
        setTitle(t.title ?? "");
        setDescription(t.description ?? "");
        setIsActive(t.isActive ?? true);
        setTotalDuration(t.totalDuration ?? 15);
        setPerQuestionRecording(t.perQuestionRecording ?? true);
        setPart1Text(arrayToLines(t.part1Questions ?? []));
        setCueCardTopic(t.cueCardTopic ?? "");
        setCueCardInstructions(t.cueCardInstructions ?? "");
        setPrepTime(t.prepTime ?? 60);
        setSpeakingTime(t.speakingTime ?? 120);
        setPart3Text(arrayToLines(t.part3Questions ?? []));
      })
      .catch(() => toast.error("Failed to load test"))
      .finally(() => setLoading(false));
  }, [id]);

  /* ---- Submit ---- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");
    if (!cueCardTopic.trim()) return toast.error("Cue card topic is required");
    if (linesToArray(part1Text).length === 0)
      return toast.error("Please add at least one Part 1 question");
    if (linesToArray(part3Text).length === 0)
      return toast.error("Please add at least one Part 3 question");

    const payload = {
      title: title.trim(),
      description: description.trim(),
      isActive,
      totalDuration,
      perQuestionRecording,
      part1Questions: linesToArray(part1Text),
      cueCardTopic: cueCardTopic.trim(),
      cueCardInstructions: cueCardInstructions.trim(),
      prepTime,
      speakingTime,
      part3Questions: linesToArray(part3Text),
    };

    setSaving(true);
    try {
      if (isEdit && id) {
        await adminUpdateSpeakingTest(id, payload);
        toast.success("Speaking test updated");
      } else {
        await adminCreateSpeakingTest(payload);
        toast.success("Speaking test created");
      }
      navigate("/admin/speaking");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save test");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>
          {isEdit ? "Edit Speaking Test" : "New Speaking Test"} – Admin – Lexora
        </title>
      </Helmet>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/speaking")}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? "Edit Speaking Test" : "Create Speaking Test"}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              3-part IELTS speaking format: Interview → Cue Card → Discussion
            </p>
          </div>
          <Button type="submit" disabled={saving} className="gap-2 min-w-32">
            {saving ? (
              "Saving…"
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                {isEdit ? "Update" : "Create"}
              </>
            )}
          </Button>
        </div>

        {/* Basic info */}
        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-gray-800">Basic Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. IELTS Speaking Practice Test 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Optional description…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Duration (minutes)
                </label>
                <input
                  type="number"
                  value={totalDuration}
                  onChange={(e) => setTotalDuration(Number(e.target.value))}
                  min={5}
                  max={30}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-3 justify-end">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={perQuestionRecording}
                    onChange={(e) => setPerQuestionRecording(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    Record per question (one recording per Q)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    Active (visible to students)
                  </span>
                </label>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Part 1 — Interview */}
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                1
              </div>
              <h2 className="font-semibold text-gray-800">
                Part 1 — Introduction &amp; Interview
              </h2>
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <FiInfo className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                Enter one question per line. The examiner asks these questions
                to warm up the candidate.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Part 1 Questions <span className="text-red-500">*</span>
                <span className="text-xs text-gray-400 ml-2 font-normal">
                  ({linesToArray(part1Text).length} questions)
                </span>
              </label>
              <textarea
                value={part1Text}
                onChange={(e) => setPart1Text(e.target.value)}
                rows={6}
                placeholder={
                  "Do you work or study?\nWhat do you do in your free time?\nTell me about your hometown."
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </CardBody>
        </Card>

        {/* Part 2 — Cue Card */}
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                2
              </div>
              <h2 className="font-semibold text-gray-800">
                Part 2 — Long Turn (Cue Card)
              </h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cue Card Topic <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cueCardTopic}
                onChange={(e) => setCueCardTopic(e.target.value)}
                placeholder="e.g. Describe a memorable journey you have taken."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cue Card Instructions
              </label>
              <textarea
                value={cueCardInstructions}
                onChange={(e) => setCueCardInstructions(e.target.value)}
                rows={4}
                placeholder={
                  "You should say:\n  - Where you went\n  - Who you went with\n  - What you did there\n  - And explain why it was memorable"
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preparation Time (seconds)
                </label>
                <input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(Number(e.target.value))}
                  min={30}
                  max={120}
                  step={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Standard: 60 seconds
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Speaking Time (seconds)
                </label>
                <input
                  type="number"
                  value={speakingTime}
                  onChange={(e) => setSpeakingTime(Number(e.target.value))}
                  min={60}
                  max={300}
                  step={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Standard: 120 seconds (2 min)
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Part 3 — Discussion */}
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                3
              </div>
              <h2 className="font-semibold text-gray-800">
                Part 3 — Two-Way Discussion
              </h2>
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <FiInfo className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                Enter one question per line. These are deeper, abstract
                questions related to the Part 2 topic.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Part 3 Questions <span className="text-red-500">*</span>
                <span className="text-xs text-gray-400 ml-2 font-normal">
                  ({linesToArray(part3Text).length} questions)
                </span>
              </label>
              <textarea
                value={part3Text}
                onChange={(e) => setPart3Text(e.target.value)}
                rows={5}
                placeholder={
                  "Why do people travel?\nHow has tourism changed over the years?\nWhat impact does travel have on the environment?"
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </CardBody>
        </Card>

        {/* Summary card */}
        <Card>
          <CardBody>
            <h2 className="font-semibold text-gray-800 mb-3">Test Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-indigo-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">
                  {linesToArray(part1Text).length}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Part 1 Questions
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(prepTime / 60)}:
                  {String(prepTime % 60).padStart(2, "0")}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">Prep Time</div>
              </div>
              <div className="p-3 bg-pink-50 rounded-lg">
                <div className="text-2xl font-bold text-pink-600">
                  {Math.round(speakingTime / 60)}:
                  {String(speakingTime % 60).padStart(2, "0")}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Cue Card Speaking
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {linesToArray(part3Text).length}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Part 3 Questions
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Bottom save */}
        <div className="flex justify-end pb-8">
          <Button type="submit" disabled={saving} className="gap-2 min-w-40">
            {saving ? (
              "Saving…"
            ) : (
              <>
                <FiMic className="w-4 h-4" />
                {isEdit ? "Update Test" : "Create Test"}
              </>
            )}
          </Button>
        </div>
      </form>
    </>
  );
};

export default AdminSpeakingTestForm;
