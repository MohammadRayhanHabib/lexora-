import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { paymentApi } from "../../api/payments";
import Card, { CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { PageLoader } from "../../components/ui/Spinner";
import { useAppSelector } from "../../hooks/useAppStore";
import type { IPayment, ICreditLedger } from "../../types";
import { FiCreditCard, FiPlus } from "react-icons/fi";

const CREDIT_PACKAGES = [
  { id: "basic_5", name: "Basic", credits: 5, price: 10, currency: "USD" },
  {
    id: "standard_12",
    name: "Standard",
    credits: 12,
    price: 20,
    currency: "USD",
    popular: true,
  },
  {
    id: "premium_25",
    name: "Premium",
    credits: 25,
    price: 35,
    currency: "USD",
  },
];

const PaymentPage: React.FC = () => {
  const { user } = useAppSelector((s) => s.auth);
  const [payments, setPayments] = useState<IPayment[]>([]);
  const [ledger, setLedger] = useState<ICreditLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"packages" | "history" | "ledger">("packages");
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<
    (typeof CREDIT_PACKAGES)[0] | null
  >(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [payRes, ledgerRes] = await Promise.all([
        paymentApi.getMyPayments(),
        paymentApi.getCreditLedger(),
      ]);
      setPayments(payRes.data.data);
      setLedger(ledgerRes.data.data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    setProcessing(true);
    try {
      const txnId = crypto.randomUUID();
      const payRes = await paymentApi.createPayment({
        transactionId: txnId,
        amount: selectedPkg.price,
        currency: selectedPkg.currency,
        method: "card",
        packageType: "credit",
        packageId: selectedPkg.id,
      });

      // Simulate payment verification
      await paymentApi.verifyPayment({
        paymentId: payRes.data.data._id,
        gatewayRef: `GW-${txnId.slice(0, 8)}`,
      });

      toast.success(`${selectedPkg.credits} credits added!`);
      setPurchaseModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Payment failed");
    }
    setProcessing(false);
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Credits & Payments – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Credits & Payments
            </h1>
            <p className="text-gray-500 mt-1">
              Current balance:{" "}
              <span className="font-semibold text-primary-600">
                {user?.creditBalance ?? 0} credits
              </span>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {(["packages", "history", "ledger"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "packages"
                ? "Buy Credits"
                : t === "history"
                  ? "Payment History"
                  : "Credit Ledger"}
            </button>
          ))}
        </div>

        {/* Packages */}
        {tab === "packages" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CREDIT_PACKAGES.map((pkg) => (
              <Card
                key={pkg.id}
                className={pkg.popular ? "ring-2 ring-primary-500" : ""}
              >
                <CardBody className="text-center space-y-4 py-8">
                  {pkg.popular && (
                    <Badge variant="info" size="md">
                      Most Popular
                    </Badge>
                  )}
                  <h3 className="text-xl font-bold text-gray-900">
                    {pkg.name}
                  </h3>
                  <p className="text-4xl font-bold text-primary-600">
                    {pkg.credits}
                    <span className="text-base font-normal text-gray-500 ml-1">
                      credits
                    </span>
                  </p>
                  <p className="text-gray-500">
                    ${pkg.price} {pkg.currency}
                  </p>
                  <p className="text-xs text-gray-400">
                    ${(pkg.price / pkg.credits).toFixed(2)} per credit
                  </p>
                  <Button
                    fullWidth
                    size="lg"
                    variant={pkg.popular ? "primary" : "secondary"}
                    onClick={() => {
                      setSelectedPkg(pkg);
                      setPurchaseModal(true);
                    }}
                  >
                    <FiPlus className="mr-1" /> Purchase
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* Payment history */}
        {tab === "history" && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Transaction
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
                    <tr key={p._id}>
                      <td className="px-6 py-3 font-mono text-xs text-gray-600">
                        {p.transactionId.slice(0, 12)}...
                      </td>
                      <td className="px-6 py-3 font-medium">
                        {p.currency} {p.amount}
                      </td>
                      <td className="px-6 py-3 capitalize">{p.packageId}</td>
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
                        colSpan={5}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        No payments yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Credit ledger */}
        {tab === "ledger" && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Balance After
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ledger.map((entry) => (
                    <tr key={entry._id}>
                      <td className="px-6 py-3 capitalize font-medium">
                        {entry.action.replace("_", " ")}
                      </td>
                      <td
                        className={`px-6 py-3 font-medium ${entry.amount > 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {entry.amount > 0 ? "+" : ""}
                        {entry.amount}
                      </td>
                      <td className="px-6 py-3">{entry.balanceAfter}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {entry.description}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {ledger.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        No credit transactions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Purchase confirmation modal */}
      <Modal
        isOpen={purchaseModal}
        onClose={() => setPurchaseModal(false)}
        title="Confirm Purchase"
      >
        {selectedPkg && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-primary-600">
                {selectedPkg.credits} credits
              </p>
              <p className="text-gray-500">
                ${selectedPkg.price} {selectedPkg.currency}
              </p>
            </div>
            <p className="text-sm text-gray-500 text-center">
              Credits will be added to your account immediately after payment.
            </p>
            <Button
              onClick={handlePurchase}
              fullWidth
              loading={processing}
              size="lg"
            >
              <FiCreditCard className="mr-2" /> Pay ${selectedPkg.price}
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
};

export default PaymentPage;
