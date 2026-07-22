import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { adminApi } from "../../api/admin";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { PageLoader } from "../../components/ui/Spinner";
import type { IBooking } from "../../types";
import { BookingStatus } from "../../types";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";

const BookingManagement: React.FC = () => {
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [confirmModal, setConfirmModal] = useState(false);
  const [selected, setSelected] = useState<IBooking | null>(null);
  const [confirmedDate, setConfirmedDate] = useState("");
  const [confirmedTime, setConfirmedTime] = useState("");

  useEffect(() => {
    loadBookings();
  }, [statusFilter]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAllBookings(statusFilter || undefined);
      setBookings(res.data.data);
    } catch {
      toast.error("Failed to load bookings");
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (!selected || !confirmedDate || !confirmedTime) return;
    try {
      await adminApi.confirmBooking(selected._id, {
        confirmedDate,
        confirmedTimeSlot: confirmedTime,
      });
      toast.success("Booking confirmed");
      setConfirmModal(false);
      loadBookings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await adminApi.completeBooking(id);
      toast.success("Booking marked as completed");
      loadBookings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  if (loading && bookings.length === 0) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Booking Management – Admin – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">1-on-1 Bookings</h1>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {Object.values(BookingStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Preferred
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Confirmed
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-600">{b.userId}</td>
                    <td className="px-6 py-3 text-gray-600">
                      {b.preferredDate} {b.preferredTimeSlot}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {b.confirmedDate
                        ? `${b.confirmedDate} ${b.confirmedTimeSlot}`
                        : "—"}
                    </td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={
                          b.status === BookingStatus.COMPLETED
                            ? "success"
                            : b.status === BookingStatus.CONFIRMED
                              ? "info"
                              : b.status === BookingStatus.CANCELLED
                                ? "danger"
                                : "warning"
                        }
                      >
                        {b.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 flex gap-2">
                      {b.status === BookingStatus.PAID && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelected(b);
                            setConfirmedDate(b.preferredDate);
                            setConfirmedTime(b.preferredTimeSlot);
                            setConfirmModal(true);
                          }}
                        >
                          Confirm
                        </Button>
                      )}
                      {b.status === BookingStatus.CONFIRMED && (
                        <Button size="sm" onClick={() => handleComplete(b._id)}>
                          Complete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No bookings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Confirm Booking"
      >
        <div className="space-y-4">
          <Input
            label="Confirmed Date"
            type="date"
            value={confirmedDate}
            onChange={(e) => setConfirmedDate(e.target.value)}
          />
          <Input
            label="Confirmed Time Slot"
            value={confirmedTime}
            onChange={(e) => setConfirmedTime(e.target.value)}
            placeholder="e.g. 10:00 AM – 11:30 AM"
          />
          <Button onClick={handleConfirm} fullWidth>
            Confirm Booking
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default BookingManagement;
