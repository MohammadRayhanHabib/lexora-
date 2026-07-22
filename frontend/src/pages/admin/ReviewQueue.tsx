import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { adminApi } from "../../api/admin";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import { PageLoader } from "../../components/ui/Spinner";
import type { IReviewRequest } from "../../types";
import { ReviewStatus } from "../../types";

const ReviewQueue: React.FC = () => {
  const [reviews, setReviews] = useState<IReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [assignModal, setAssignModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<IReviewRequest | null>(
    null,
  );
  const [reviewerId, setReviewerId] = useState("");

  useEffect(() => {
    loadReviews();
  }, [statusFilter]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getReviewQueue(statusFilter || undefined);
      setReviews(res.data.data);
    } catch {
      toast.error("Failed to load review queue");
    }
    setLoading(false);
  };

  const handleAssign = async () => {
    if (!selectedReview || !reviewerId) return;
    try {
      await adminApi.assignReviewer(selectedReview._id, reviewerId);
      toast.success("Reviewer assigned");
      setAssignModal(false);
      loadReviews();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to assign");
    }
  };

  if (loading && reviews.length === 0) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Review Queue – Admin – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            {Object.values(ReviewStatus).map((s) => (
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
                    Module
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Student
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Reviewer
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reviews.map((review) => (
                  <tr key={review._id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 capitalize font-medium">
                      {review.module}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {review.studentId}
                    </td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={
                          review.status === ReviewStatus.COMPLETED
                            ? "success"
                            : review.status === ReviewStatus.PENDING
                              ? "warning"
                              : review.status === ReviewStatus.REJECTED
                                ? "danger"
                                : "info"
                        }
                      >
                        {review.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {review.reviewerId || "—"}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3">
                      {review.status === ReviewStatus.PENDING && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedReview(review);
                            setReviewerId("");
                            setAssignModal(true);
                          }}
                        >
                          Assign
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {reviews.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No review requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={assignModal}
        onClose={() => setAssignModal(false)}
        title="Assign Reviewer"
      >
        <div className="space-y-4">
          <Input
            label="Reviewer User ID"
            value={reviewerId}
            onChange={(e) => setReviewerId(e.target.value)}
            placeholder="Enter reviewer's user ID"
          />
          <Button onClick={handleAssign} fullWidth>
            Assign Reviewer
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default ReviewQueue;
