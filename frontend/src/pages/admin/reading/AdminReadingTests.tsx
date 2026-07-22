import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiUsers,
  FiClock,
  FiFileText,
  FiChevronDown,
  FiChevronRight,
  FiBook,
} from "react-icons/fi";
import {
  readingApi,
  IReadingTest,
  IReadingAcademicGroup,
} from "../../../api/reading";
import Button from "../../../components/ui/Button";
import Card, { CardBody } from "../../../components/ui/Card";
import { PageLoader } from "../../../components/ui/Spinner";
import Badge from "../../../components/ui/Badge";

// ─── Part row ──────────────────────────────────────────────
const PartRow: React.FC<{
  t: IReadingTest;
  deletingId: string | null;
  onDelete: (id: string, title: string) => void;
}> = ({ t, deletingId, onDelete }) => (
  <tr className="hover:bg-gray-50 transition-colors">
    <td className="px-4 py-3 pl-14">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-400 w-14 shrink-0">
          Part {t.partNumber ?? "—"}
        </span>
        <div>
          <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
            {t.passageTitle}
          </p>
          {t.partTypeLabel && (
            <span className="inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
              {t.partTypeLabel}
            </span>
          )}
        </div>
      </div>
    </td>
    <td className="px-4 py-3 text-gray-700 text-sm">
      <span className="flex items-center gap-1">
        <FiFileText className="w-3.5 h-3.5 text-gray-400" />
        {t.totalQuestions}
      </span>
    </td>
    <td className="px-4 py-3 text-gray-700 text-sm">
      <span className="flex items-center gap-1">
        <FiClock className="w-3.5 h-3.5 text-gray-400" />
        {t.duration} min
      </span>
    </td>
    <td className="px-4 py-3">
      <Badge variant={t.isActive ? "success" : "gray"}>
        {t.isActive ? "Active" : "Inactive"}
      </Badge>
    </td>
    <td className="px-4 py-3">
      <div className="flex items-center justify-end gap-1.5">
        <Link to={`/admin/reading/${t._id}/preview`}>
          <Button variant="ghost" size="sm" title="Preview">
            <FiEye className="w-4 h-4" />
          </Button>
        </Link>
        <Link to={`/admin/reading/${t._id}/edit`}>
          <Button variant="ghost" size="sm" title="Edit">
            <FiEdit2 className="w-4 h-4" />
          </Button>
        </Link>
        <Link to={`/admin/reading/${t._id}/questions`}>
          <Button size="sm" className="gap-1">
            <FiPlus className="w-3.5 h-3.5" />
            Questions
          </Button>
        </Link>
        <Link to={`/admin/reading/${t._id}/attempts`}>
          <Button variant="ghost" size="sm" title="Attempts">
            <FiUsers className="w-4 h-4" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          title="Delete"
          className="text-red-500 hover:bg-red-50"
          loading={deletingId === t._id}
          onClick={() => onDelete(t._id, t.title)}
        >
          <FiTrash2 className="w-4 h-4" />
        </Button>
      </div>
    </td>
  </tr>
);

// ─── Academic group card ───────────────────────────────────
const AcademicCard: React.FC<{
  group: IReadingAcademicGroup;
  deletingId: string | null;
  onDelete: (id: string, title: string) => void;
}> = ({ group, deletingId, onDelete }) => {
  const [openTests, setOpenTests] = useState<Record<number, boolean>>({});

  const toggle = (tn: number) =>
    setOpenTests((prev) => ({ ...prev, [tn]: !prev[tn] }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Academic header */}
      <div className="flex items-center gap-3 px-6 py-4 bg-[#2d2042] text-white">
        <FiBook className="w-5 h-5 opacity-70" />
        <h2 className="text-lg font-bold">
          Reading Academic {group.academicNumber}
        </h2>
        <span className="ml-auto text-xs opacity-60">
          {group.tests.length} test{group.tests.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="divide-y divide-gray-100">
        {group.tests.map((tg) => (
          <div key={tg.testNumber}>
            {/* Test sub-header */}
            <button
              className="w-full flex items-center gap-2 px-6 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              onClick={() => toggle(tg.testNumber)}
            >
              {openTests[tg.testNumber] ? (
                <FiChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <FiChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <span className="font-semibold text-sm text-gray-800">
                Test-{tg.testNumber}
              </span>
              <span className="text-xs text-gray-400 ml-1">
                ({tg.parts.length} part{tg.parts.length !== 1 ? "s" : ""})
              </span>
            </button>

            {/* Parts table */}
            {openTests[tg.testNumber] && (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {tg.parts.map((p) => (
                    <PartRow
                      key={p._id}
                      t={p}
                      deletingId={deletingId}
                      onDelete={onDelete}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main page ─────────────────────────────────────────────
const AdminReadingTests: React.FC = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<IReadingTest[]>([]);
  const [academicGroups, setAcademicGroups] = useState<IReadingAcademicGroup[]>(
    [],
  );
  const [ungrouped, setUngrouped] = useState<IReadingTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTests = () => {
    setLoading(true);
    readingApi
      .adminListTests()
      .then((r) => {
        const all: IReadingTest[] = r.data.data?.tests ?? [];
        setTests(all);

        // Group locally (mirror backend grouping for instant display)
        const grouped: Record<number, IReadingAcademicGroup> = {};
        const ungrp: IReadingTest[] = [];
        for (const t of all) {
          if (t.academicNumber == null) {
            ungrp.push(t);
            continue;
          }
          if (!grouped[t.academicNumber])
            grouped[t.academicNumber] = {
              academicNumber: t.academicNumber,
              tests: [],
            };
          const tn = t.testNumber ?? 0;
          let tg = grouped[t.academicNumber].tests.find(
            (x) => x.testNumber === tn,
          );
          if (!tg) {
            tg = { testNumber: tn, parts: [] };
            grouped[t.academicNumber].tests.push(tg);
          }
          tg.parts.push(t);
        }
        const sortedGroups = Object.values(grouped)
          .sort((a, b) => b.academicNumber - a.academicNumber)
          .map((g) => ({
            ...g,
            tests: g.tests
              .sort((a, b) => a.testNumber - b.testNumber)
              .map((tg) => ({
                ...tg,
                parts: tg.parts.sort(
                  (a, b) => (a.partNumber ?? 0) - (b.partNumber ?? 0),
                ),
              })),
          }));
        setAcademicGroups(sortedGroups);
        setUngrouped(ungrp);
      })
      .catch(() => toast.error("Failed to load reading tests"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This also removes all questions.`))
      return;
    setDeletingId(id);
    try {
      await readingApi.adminDeleteTest(id);
      toast.success("Reading test deleted");
      fetchTests();
    } catch {
      toast.error("Failed to delete test");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Reading Tests – Admin – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              IELTS Reading Tests
            </h1>
            <p className="text-gray-500 mt-1">
              Manage reading tests grouped by Cambridge Academic number
            </p>
          </div>
          <Button
            onClick={() => navigate("/admin/reading/new")}
            className="gap-2"
          >
            <FiPlus className="w-4 h-4" />
            New Part / Test
          </Button>
        </div>

        {tests.length === 0 ? (
          <Card>
            <CardBody className="text-center py-16">
              <FiFileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">
                No reading tests yet
              </p>
              <p className="text-gray-400 mt-1">
                Create your first part to get started.
              </p>
              <Button
                className="mt-6 gap-2"
                onClick={() => navigate("/admin/reading/new")}
              >
                <FiPlus className="w-4 h-4" />
                Create Part
              </Button>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Grouped by academic */}
            {academicGroups.map((g) => (
              <AcademicCard
                key={g.academicNumber}
                group={g}
                deletingId={deletingId}
                onDelete={handleDelete}
              />
            ))}

            {/* Ungrouped / legacy tests */}
            {ungrouped.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-700 text-white">
                  <h2 className="text-base font-bold">Ungrouped Tests</h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Questions
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ungrouped.map((t) => (
                      <tr
                        key={t._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{t.title}</p>
                          <p className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">
                            {t.passageTitle}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          <span className="flex items-center gap-1">
                            <FiFileText className="w-3.5 h-3.5 text-gray-400" />
                            {t.totalQuestions}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          <span className="flex items-center gap-1">
                            <FiClock className="w-3.5 h-3.5 text-gray-400" />
                            {t.duration} min
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={t.isActive ? "success" : "gray"}>
                            {t.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link to={`/admin/reading/${t._id}/preview`}>
                              <Button variant="ghost" size="sm" title="Preview">
                                <FiEye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Link to={`/admin/reading/${t._id}/edit`}>
                              <Button variant="ghost" size="sm" title="Edit">
                                <FiEdit2 className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Link to={`/admin/reading/${t._id}/questions`}>
                              <Button size="sm" className="gap-1">
                                <FiPlus className="w-3.5 h-3.5" />
                                Questions
                              </Button>
                            </Link>
                            <Link to={`/admin/reading/${t._id}/attempts`}>
                              <Button variant="ghost" size="sm">
                                <FiUsers className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:bg-red-50"
                              loading={deletingId === t._id}
                              onClick={() => handleDelete(t._id, t.title)}
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default AdminReadingTests;
