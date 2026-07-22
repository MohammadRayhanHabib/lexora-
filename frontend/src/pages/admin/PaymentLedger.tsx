import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { adminApi } from "../../api/admin";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { PageLoader } from "../../components/ui/Spinner";
import type { IPayment } from "../../types";
import { FiDollarSign } from "react-icons/fi";

const PaymentLedger: React.FC = () => {
  const [payments, setPayments] = useState<IPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadPayments();
  }, [page]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAllPayments(page, 50);
      setPayments(res.data.data);
      setTotal(res.data.pagination?.total ?? 0);
    } catch {
      toast.error("Failed to load payments");
    }
    setLoading(false);
  };

  if (loading && payments.length === 0) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Payment Ledger – Admin – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FiDollarSign className="h-6 w-6 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">Payment Ledger</h1>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Transaction ID
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Package
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs text-gray-600">
                      {p.transactionId}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{p.userId}</td>
                    <td className="px-6 py-3 font-medium">
                      {p.currency} {p.amount}
                    </td>
                    <td className="px-6 py-3 capitalize">
                      {p.packageType} – {p.packageId}
                    </td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={
                          p.status === "completed"
                            ? "success"
                            : p.status === "failed"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No payments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {total > 50 && (
          <div className="flex justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="px-3 py-1.5 text-sm text-gray-600">
              Page {page}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={page * 50 >= total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default PaymentLedger;
