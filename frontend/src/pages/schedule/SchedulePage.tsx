import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiX,
  FiEdit2,
  FiTrash2,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";
import {
  scheduleApi,
  IScheduleItem,
  CreateScheduleItemDto,
} from "../../api/schedule";

/* ═════════════════════════════════════════════════════════════════ */
/* TYPES & CONSTANTS */
/* ═════════════════════════════════════════════════════════════════ */

type ItemType = "task" | "event";
type Priority = "low" | "medium" | "high";

const COLORS = [
  { name: "Light Pink", hex: "#F79191", bg: "bg-red-50" },
  { name: "Coral", hex: "#E25858", bg: "bg-primary-50" },
  { name: "Rose", hex: "#e01c1c", bg: "bg-red-100" },
  { name: "Dark Red", hex: "#7C3030", bg: "bg-red-200" },
  { name: "Green", hex: "#22c55e", bg: "bg-green-50" },
  { name: "Purple", hex: "#a855f7", bg: "bg-purple-50" },
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

/* ═════════════════════════════════════════════════════════════════ */
/* MAIN COMPONENT */
/* ═════════════════════════════════════════════════════════════════ */

const SchedulePage: React.FC = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(
    today.toISOString().split("T")[0],
  );

  const [items, setItems] = useState<IScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(getDefaultForm());

  function getDefaultForm() {
    return {
      type: "task" as ItemType,
      title: "",
      description: "",
      date: today.toISOString().split("T")[0],
      time: "09:00",
      priority: "medium" as Priority,
      color: COLORS[2].hex,
    };
  }

  /* ── Load items from backend on mount ── */
  const loadItems = useCallback(async () => {
    try {
      const data = await scheduleApi.getAll();
      setItems(data);
    } catch {
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  /* ── Calendar calculations ── */
  const firstDay = new Date(year, month, 1).getDay();
  const daysCount = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7;
  const calendarDays: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysCount }, (_, i) => i + 1),
  ];

  function isSameDate(
    d: Date,
    checkYear: number,
    checkMonth: number,
    checkDay: number,
  ): boolean {
    return (
      d.getFullYear() === checkYear &&
      d.getMonth() === checkMonth &&
      d.getDate() === checkDay
    );
  }

  function isToday(d: number): boolean {
    return isSameDate(today, year, month, d);
  }

  function dateToString(y: number, m: number, d: number): string {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  /* ── Items for selected date ── */
  const selectedDateItems = useMemo(
    () =>
      items
        .filter((item) => item.date === selectedDate)
        .sort((a, b) => {
          if (a.type === "event" && b.type === "task") return -1;
          if (a.type === "task" && b.type === "event") return 1;
          return (a.time || "").localeCompare(b.time || "");
        }),
    [items, selectedDate],
  );

  const itemsForMonth = useMemo(() => {
    const map = new Map<string, IScheduleItem[]>();
    items.forEach((item) => {
      if (!map.has(item.date)) map.set(item.date, []);
      map.get(item.date)!.push(item);
    });
    return map;
  }, [items]);

  /* ── Handlers ── */
  const openCreateModal = (date: string) => {
    setSelectedDate(date);
    setEditingId(null);
    setForm({ ...getDefaultForm(), date });
    setShowModal(true);
  };

  const openEditModal = (item: IScheduleItem) => {
    setEditingId(item._id);
    setForm({
      type: item.type,
      title: item.title,
      description: item.description || "",
      date: item.date,
      time: item.time || "09:00",
      priority: item.priority || "medium",
      color: item.color,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title required");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const dto: CreateScheduleItemDto = {
          type: form.type,
          title: form.title,
          description: form.description || undefined,
          date: form.date,
          time: form.time || undefined,
          priority: form.priority,
          color: form.color,
        };
        const updated = await scheduleApi.update(editingId, dto);
        setItems((prev) =>
          prev.map((i) => (i._id === editingId ? updated : i)),
        );
        toast.success("Updated!");
      } else {
        const dto: CreateScheduleItemDto = {
          type: form.type,
          title: form.title,
          description: form.description || undefined,
          date: form.date,
          time: form.time || undefined,
          priority: form.priority,
          color: form.color,
        };
        const created = await scheduleApi.create(dto);
        setItems((prev) => [...prev, created]);
        toast.success("Created!");
      }
      setShowModal(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await scheduleApi.delete(id);
      setItems((prev) => prev.filter((i) => i._id !== id));
      toast.success("Deleted!");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleToggleComplete = async (item: IScheduleItem) => {
    try {
      const updated = await scheduleApi.update(item._id, {
        completed: !item.completed,
      });
      setItems((prev) => prev.map((i) => (i._id === item._id ? updated : i)));
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleMonthNav = (offset: number) => {
    let newMonth = month + offset;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setMonth(newMonth);
    setYear(newYear);
  };

  return (
    <>
      <Helmet>
        <title>Schedule – Lexora</title>
      </Helmet>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <svg
            className="animate-spin h-8 w-8 text-primary-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ══════════════ CALENDAR ══════════════ */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => handleMonthNav(-1)}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg font-bold"
              >
                ‹
              </button>
              <h2 className="text-lg font-bold text-gray-900 min-w-[140px] text-center">
                {MONTHS[month]} {year}
              </h2>
              <button
                onClick={() => handleMonthNav(1)}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg font-bold"
              >
                ›
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {DAYS.map((d, i) => (
                <div
                  key={i}
                  className="text-center text-xs font-bold text-gray-400 py-2"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((d, i) => {
                const dateStr = d ? dateToString(year, month, d) : "";
                const dayItems = d ? itemsForMonth.get(dateStr) || [] : [];
                const isSelected = d && dateStr === selectedDate;
                const isTodayDate = d && isToday(d);

                return (
                  <button
                    key={i}
                    onClick={() => d && openCreateModal(dateStr)}
                    className={`aspect-square rounded-xl text-sm relative transition-all p-2 ${
                      !d
                        ? ""
                        : isSelected
                          ? "bg-primary-600 text-white ring-2 ring-primary-400"
                          : isTodayDate
                            ? "bg-primary-50 border-2 border-primary-600 text-gray-900"
                            : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    {d ? (
                      <>
                        <div className="font-bold text-center">{d}</div>
                        {dayItems.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {dayItems.slice(0, 2).map((item, idx) => (
                              <div
                                key={idx}
                                className={`h-1.5 rounded-full`}
                                style={{ backgroundColor: item.color }}
                              />
                            ))}
                            {dayItems.length > 2 && (
                              <div className="text-[9px] font-semibold opacity-70">
                                +{dayItems.length - 2}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Quick add button */}
            <button
              onClick={() => openCreateModal(selectedDate)}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700 transition-colors"
            >
              <FiPlus className="h-4 w-4" /> Add Task / Event
            </button>
          </div>

          {/* ══════════════ SELECTED DATE ITEMS ══════════════ */}
          <div className="lg:col-span-1">
            {/* Date header */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-4 text-white mb-4">
              <p className="text-xs font-semibold text-primary-100 uppercase tracking-wide mb-1">
                Selected Date
              </p>
              <p className="text-2xl font-bold">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                  "en-US",
                  {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  },
                )}
              </p>
            </div>

            {/* Items list */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {selectedDateItems.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No tasks or events</p>
                </div>
              ) : (
                selectedDateItems.map((item) => (
                  <div
                    key={item._id}
                    className={`rounded-xl p-3 border-l-4 transition-all ${
                      item.type === "event"
                        ? "bg-white"
                        : item.completed
                          ? "bg-gray-50 opacity-60"
                          : "bg-white"
                    }`}
                    style={{ borderLeftColor: item.color }}
                  >
                    <div className="flex items-start gap-2">
                      {item.type === "task" && (
                        <button
                          onClick={() => handleToggleComplete(item)}
                          className={`mt-0.5 shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                            item.completed
                              ? "bg-primary-600 border-primary-600"
                              : "border-gray-300 hover:border-primary-600"
                          }`}
                        >
                          {item.completed && (
                            <FiCheckCircle className="h-3 w-3 text-white" />
                          )}
                        </button>
                      )}
                      {item.type === "event" && (
                        <FiClock className="h-4 w-4 text-primary-600 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold text-gray-900 ${item.completed ? "line-through text-gray-400" : ""}`}
                        >
                          {item.title}
                        </p>
                        {item.time && (
                          <p className="text-xs text-gray-500">{item.time}</p>
                        )}
                        {item.priority && item.type === "task" && (
                          <div className="mt-1">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PRIORITY_COLORS[item.priority]}`}
                            >
                              {item.priority.charAt(0).toUpperCase() +
                                item.priority.slice(1)}
                            </span>
                          </div>
                        )}
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <FiEdit2 className="h-3.5 w-3.5 text-gray-400 hover:text-primary-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <FiTrash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ ADD/EDIT MODAL ══════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? "Edit" : "Create"}{" "}
                {form.type.charAt(0).toUpperCase() + form.type.slice(1)}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Type toggle */}
              <div className="flex gap-2">
                {(["task", "event"] as ItemType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, type: t })}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                      form.type === t
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Enter title"
                  className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Add notes..."
                  rows={3}
                  className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary-400 resize-none"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
                />
              </div>

              {/* Priority (tasks only) */}
              {form.type === "task" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {(["low", "medium", "high"] as Priority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setForm({ ...form, priority: p })}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                          form.priority === p
                            ? PRIORITY_COLORS[p]
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setForm({ ...form, color: c.hex })}
                      className={`h-8 w-8 rounded-full transition-all ring-2 ${
                        form.color === c.hex
                          ? "ring-gray-900 scale-110"
                          : "ring-gray-200 hover:ring-gray-400"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border-2 border-gray-200 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-primary-600 py-2 text-sm font-bold text-white hover:bg-primary-700 transition-colors disabled:opacity-60"
                >
                  {saving ? "Saving…" : editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SchedulePage;
