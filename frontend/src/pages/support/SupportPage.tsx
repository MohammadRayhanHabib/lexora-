import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { supportApi } from "../../api/support";
import Card, { CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { PageLoader } from "../../components/ui/Spinner";
import type { ISupportTicket } from "../../types";
import { TicketStatus, TicketCategory, UserRole } from "../../types";
import {
  FiPlus,
  FiMessageSquare,
  FiChevronLeft,
  FiClock,
  FiSend,
} from "react-icons/fi";

const statusColor: Record<string, "warning" | "info" | "success" | "danger"> = {
  open: "warning",
  "in-progress": "info",
  resolved: "success",
  closed: "danger",
};

const SupportPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId?: string }>();
  const [tickets, setTickets] = useState<ISupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<ISupportTicket | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    category: TicketCategory.GENERAL as string,
    message: "",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (ticketId) {
      loadTicket(ticketId);
    } else {
      setSelectedTicket(null);
    }
  }, [ticketId]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await supportApi.getMyTickets();
      setTickets(res.data.data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  const loadTicket = async (id: string) => {
    try {
      const res = await supportApi.getTicket(id);
      setSelectedTicket(res.data.data);
    } catch {
      toast.error("Ticket not found");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await supportApi.createTicket({
        subject: form.subject,
        category: form.category as TicketCategory,
        message: form.message,
      });
      toast.success("Ticket created!");
      setShowCreate(false);
      setForm({ subject: "", category: TicketCategory.GENERAL, message: "" });
      loadTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create ticket");
    }
    setCreating(false);
  };

  const handleReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    setSending(true);
    try {
      await supportApi.replyToTicket(selectedTicket._id, { message: reply });
      toast.success("Reply sent!");
      setReply("");
      loadTicket(selectedTicket._id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send reply");
    }
    setSending(false);
  };

  if (loading) return <PageLoader />;

  // Ticket detail view
  if (selectedTicket) {
    return (
      <>
        <Helmet>
          <title>{selectedTicket.subject} – Support – Lexora</title>
        </Helmet>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link to="/support" className="text-gray-400 hover:text-gray-600">
              <FiChevronLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">
                  {selectedTicket.subject}
                </h1>
                <Badge variant={statusColor[selectedTicket.status] || "info"}>
                  {selectedTicket.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {selectedTicket.category} · Opened{" "}
                {new Date(selectedTicket.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <Card>
            <CardBody className="space-y-4 max-h-[500px] overflow-y-auto">
              {selectedTicket.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.senderRole === UserRole.STUDENT ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-xl px-4 py-3 ${
                      msg.senderRole === UserRole.STUDENT
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.senderRole === UserRole.STUDENT
                          ? "text-primary-200"
                          : "text-gray-400"
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          {selectedTicket.status !== TicketStatus.CLOSED &&
            selectedTicket.status !== TicketStatus.RESOLVED && (
              <div className="flex gap-3">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply..."
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleReply()
                  }
                />
                <Button onClick={handleReply} loading={sending}>
                  <FiSend />
                </Button>
              </div>
            )}
        </div>
      </>
    );
  }

  // Ticket list view
  return (
    <>
      <Helmet>
        <title>Support – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support</h1>
            <p className="text-gray-500 mt-1">Get help from our support team</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <FiPlus className="mr-1" /> New Ticket
          </Button>
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <FiMessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p>No support tickets yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <Link key={t._id} to={`/support/${t._id}`}>
                <Card hover className="mb-3">
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {t.subject}
                          </h3>
                          <Badge variant={statusColor[t.status] || "info"}>
                            {t.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <Badge variant="info">{t.category}</Badge>
                          <span className="flex items-center gap-1">
                            <FiClock className="h-3.5 w-3.5" />
                            {new Date(t.createdAt).toLocaleDateString()}
                          </span>
                          <span>{t.messages.length} messages</span>
                        </div>
                      </div>
                      <FiChevronLeft className="h-5 w-5 text-gray-400 rotate-180" />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Support Ticket"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Brief description of your issue"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              {Object.values(TicketCategory).map((cat: string) => (
                <option key={cat} value={cat}>
                  {(cat as string).charAt(0).toUpperCase() +
                    (cat as string).slice(1).replace("-", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={5}
              className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="Describe your issue in detail..."
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={creating}>
              Submit Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default SupportPage;
