import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { bookingApi } from "../../api/courses";
import Card, { CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import { PageLoader } from "../../components/ui/Spinner";
import type { IBooking } from "../../types";
import { BookingStatus } from "../../types";
import { FiCalendar, FiClock, FiPlus, FiX } from "react-icons/fi";

const statusColor: Record<string, "warning" | "info" | "success" | "danger"> = {
  paid: "warning",
  confirmed: "info",
  completed: "success",
  cancelled: "danger",
};

const BookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    preferredDate: "",
    preferredTimeSlot: "",
    notes: "",
  });
  const [creating, setCreating] = useState(false);
  const [cancelModal, setCancelModal] = useState<IBooking | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingApi.getMyBookings();
      setBookings(res.data.data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.preferredDate || !form.preferredTimeSlot) {
      toast.error("Please select date and time slot");
      return;
    }

    setCreating(true);
    try {
      const txnId = crypto.randomUUID();
      await bookingApi.createBooking({
        preferredDate: form.preferredDate,
        preferredTimeSlot: form.preferredTimeSlot,
        notes: form.notes || undefined,
        transactionId: txnId,
      });
      toast.success("Booking request created!");
      setShowCreate(false);
      setForm({
        preferredDate: "",
        preferredTimeSlot: "",
        notes: "",
      });
      loadBookings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Booking failed");
    }
    setCreating(false);
  };

  const handleCancel = async () => {
    if (!cancelModal) return;
    try {
      await bookingApi.cancelBooking(cancelModal._id);
      toast.success("Booking cancelled");
      setCancelModal(null);
      loadBookings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Cancel failed");
    }
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>1-on-1 Bookings – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              1-on-1 Sessions
            </h1>
            <p className="text-gray-500 mt-1">
              Book personal sessions with IELTS experts
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <FiPlus className="mr-1" /> Book Session
          </Button>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <FiCalendar className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p>No bookings yet. Book your first session!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <Card key={b._id}>
                <CardBody>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">
                          Session Booking
                        </h3>
                        <Badge variant={statusColor[b.status] || "info"}>
                          {b.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <FiCalendar className="h-4 w-4" />
                          {new Date(b.preferredDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiClock className="h-4 w-4" />
                          {b.preferredTimeSlot}
                        </span>
                      </div>
                      {b.confirmedDate && (
                        <p className="text-sm text-green-600">
                          Confirmed:{" "}
                          {new Date(b.confirmedDate).toLocaleDateString()} at{" "}
                          {b.confirmedTimeSlot}
                        </p>
                      )}
                      {b.notes && (
                        <p className="text-sm text-gray-500">{b.notes}</p>
                      )}
                    </div>
                    {b.status === BookingStatus.PAID && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCancelModal(b)}
                      >
                        <FiX className="mr-1" /> Cancel
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Book 1-on-1 Session"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Preferred Date"
            type="date"
            min={new Date().toISOString().split("T")[0]}
            value={form.preferredDate}
            onChange={(e) =>
              setForm({ ...form, preferredDate: e.target.value })
            }
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Slot
            </label>
            <select
              value={form.preferredTimeSlot}
              onChange={(e) =>
                setForm({ ...form, preferredTimeSlot: e.target.value })
              }
              className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Select a time slot</option>
              {[
                "09:00",
                "10:00",
                "11:00",
                "13:00",
                "14:00",
                "15:00",
                "16:00",
                "17:00",
              ].map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="Any specific topics or concerns..."
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
              Book Session
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={!!cancelModal}
        onClose={() => setCancelModal(null)}
        title="Cancel Booking"
      >
        <p className="text-gray-600 mb-4">
          Are you sure you want to cancel this booking?
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            fullWidth
            onClick={() => setCancelModal(null)}
          >
            Keep
          </Button>
          <Button variant="danger" fullWidth onClick={handleCancel}>
            Cancel Booking
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default BookingsPage;
