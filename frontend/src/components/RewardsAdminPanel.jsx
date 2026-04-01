import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import api from "../lib/axios";
import {
  Sparkles,
  Settings2,
  Percent,
  Hash,
  CheckCircle,
  AlertCircle,
  Trash2,
  Plus,
  X,
  Info,
} from "lucide-react";

const numberOrEmpty = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
};

const PAGE_SIZE = 10;

export default function RewardsAdminPanel() {
  const [settings, setSettings] = useState({
    pointsPerAmount: "",
    amountUnit: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const [couponForm, setCouponForm] = useState({
    code: "",
    description: "",
    discountType: "fixed",
    value: "",
    applicableEventType: "workshop",
    priceInPoints: "",
  });
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, couponsRes] = await Promise.all([
        api.get("/points/settings"),
        api.get("/coupons"),
      ]);
      setSettings({
        pointsPerAmount: settingsRes.data?.pointsPerAmount ?? "",
        amountUnit: settingsRes.data?.amountUnit ?? "",
      });
      setCoupons(couponsRes.data || []);
    } catch (err) {
      toast.error("Failed to load rewards data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveSettings = async () => {
    if (!settings.pointsPerAmount || !settings.amountUnit) {
      toast.error("Please fill both rate fields.");
      return;
    }
    setSavingSettings(true);
    try {
      await api.put("/points/settings", {
        pointsPerAmount: Number(settings.pointsPerAmount),
        amountUnit: Number(settings.amountUnit),
      });
      toast.success("Point settings updated.");
      await loadData();
    } catch (err) {
      const message =
        err?.response?.data?.message || "Unable to update point settings.";
      toast.error(message);
    } finally {
      setSavingSettings(false);
    }
  };

  const submitCoupon = async () => {
    const payload = {
      ...couponForm,
      value: Number(couponForm.value),
      priceInPoints: couponForm.priceInPoints
        ? Number(couponForm.priceInPoints)
        : 0,
      discountType: couponForm.discountType || "fixed",
    };
    if (!payload.code || !payload.value || !payload.applicableEventType) {
      toast.error("Code, value, and applicable event are required.");
      return;
    }
    setCreatingCoupon(true);
    try {
      if (editId) {
        await api.put(`/coupons/${editId}`, payload);
        toast.success("Coupon updated.");
      } else {
        await api.post("/coupons", payload);
        toast.success("Coupon created.");
      }
      setCouponForm({
        code: "",
        description: "",
        discountType: "fixed",
        value: "",
        applicableEventType: "workshop",
        priceInPoints: "",
      });
      setEditId(null);
      setShowCouponModal(false);
      setPage(1);
      await loadData();
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to create coupon.";
      toast.error(message);
    } finally {
      setCreatingCoupon(false);
    }
  };

  const sortedCoupons = useMemo(() => {
    return [...(coupons || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [coupons]);

  const filteredCoupons = useMemo(() => {
    return sortedCoupons.filter((c) => {
      const matchesType =
        filterType === "all" ||
        (c.applicableEventType || "").toLowerCase() === filterType;
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        (c.code || "").toLowerCase().includes(term) ||
        (c.applicableEventType || "").toLowerCase().includes(term);
      return matchesType && matchesSearch;
    });
  }, [sortedCoupons, filterType, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredCoupons.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paginatedCoupons = filteredCoupons.slice(
    (pageSafe - 1) * PAGE_SIZE,
    pageSafe * PAGE_SIZE
  );

  const handleDelete = async (id) => {
    if (!id) return;
    setDeletingId(id);
    try {
      await api.delete(`/coupons/${id}`);
      toast.success("Coupon deleted");
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete coupon");
    } finally {
      setDeletingId("");
      setShowDeleteModal(false);
    }
  };

  const openCreateModal = () => {
    setEditId(null);
    setCouponForm({
      code: "",
      description: "",
      discountType: "fixed",
      value: "",
      applicableEventType: "workshop",
      priceInPoints: "",
    });
    setShowCouponModal(true);
  };

  const openEditModal = (coupon) => {
    setEditId(coupon._id);
    setCouponForm({
      code: coupon.code || "",
      description: coupon.description || "",
      discountType: coupon.discountType || "fixed",
      value: coupon.value ?? "",
      applicableEventType: coupon.applicableEventType || "workshop",
      priceInPoints: coupon.priceInPoints ?? "",
    });
    setShowCouponModal(true);
  };

  const formattedRate =
    settings.pointsPerAmount && settings.amountUnit
      ? `${settings.pointsPerAmount} pts / ${settings.amountUnit} EGP`
      : "Not set yet";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Sparkles className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-amber-200/70">
              Rewards & Coupons
            </p>
            <h2 className="text-2xl font-bold text-white">Engagement Incentives</h2>
            <p className="text-sm text-gray-400">
              Configure how students earn points and publish coupons they can redeem.
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-3 py-2 shadow-md"
        >
          <Plus className="h-4 w-4" />
          New Coupon
        </button>
      </div>

      <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-800 p-6 shadow-xl hover:shadow-emerald-500/10 transition">
        <div className="flex items-center justify-between text-gray-200 mb-2">
          <div className="flex items-center gap-2 font-semibold">
            <Settings2 className="h-5 w-5 text-blue-400" />
            Current Earn Rate
            <Info
              className="h-4 w-4 text-gray-400"
              title="Students earn points based on the amount they spend."
            />
          </div>
          <button
            onClick={() => setShowRateModal(true)}
            className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg shadow-md"
          >
            Edit Rate
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Applied to workshop/trip payments.
        </p>
        <div className="rounded-xl border border-gray-700 bg-gray-800/70 p-5 space-y-2">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Points per amount
          </p>
          <p className="text-3xl font-bold text-white">{formattedRate}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-700 bg-gray-900/80 p-5 shadow-xl hover:shadow-emerald-500/10 transition space-y-3">
        <div className="flex items-center gap-2 text-gray-200 font-semibold">
          <Percent className="h-5 w-5 text-emerald-300" />
          <span>Coupons</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="col-span-1 md:col-span-2 flex items-center gap-2">
            <input
              type="text"
              placeholder="Search coupon code or event type..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All</option>
              <option value="workshop">Workshop</option>
              <option value="trip">Trip</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-700 bg-gray-900/80 p-6 shadow-xl hover:shadow-emerald-500/10 transition space-y-4">
        <div className="flex items-center gap-2 text-gray-200 font-semibold">
          <Hash className="h-5 w-5 text-purple-300" />
          Coupons
        </div>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : filteredCoupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-500 py-10 border border-dashed border-gray-700 rounded-xl bg-gray-900/60">
            <Sparkles className="h-10 w-10 text-amber-300 mb-3" />
            <p className="text-sm font-semibold text-gray-200">No coupons yet</p>
            <p className="text-xs text-gray-500">
              Create a coupon to kick-start engagement.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-gray-200">
                <thead>
                  <tr className="text-left border-b border-gray-700 text-gray-400">
                    <th className="py-2 pr-4">Code</th>
                    <th className="py-2 pr-4">Value</th>
                    <th className="py-2 pr-4">Event</th>
                    <th className="py-2 pr-4">Pts</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCoupons.map((c) => {
                    const valueLabel =
                      c.discountType === "percentage"
                        ? `${c.value}% Off`
                        : `${c.value} EGP Off`;
                    const discountIcon = c.discountType === "percentage" ? "%" : "EGP";
                    return (
                      <tr
                        key={c._id || c.code}
                        className="border-b border-gray-800 hover:bg-gray-800/60 transition"
                      >
                        <td className="py-2 pr-4 font-semibold flex items-center gap-2">
                          {c.code}
                        </td>
                        <td className="py-2 pr-4 text-gray-200">
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2 py-1 text-xs border border-gray-700">
                            <span className="text-gray-400">{discountIcon}</span>
                            {valueLabel}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-gray-200">
                          <span className="inline-flex items-center rounded-full bg-gray-800 px-2 py-1 text-xs border border-gray-700 capitalize">
                            {c.applicableEventType || "Any"}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-gray-400">
                          {c.priceInPoints || 0}
                        </td>
                    <td className="py-2 pr-4 text-right">
                      <button
                        onClick={() => {
                          setDeletingId(c._id);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-red-300"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between pt-2 text-sm text-gray-400">
              <p>
                Page {pageSafe} of {totalPages} • {filteredCoupons.length} item(s)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pageSafe === 1}
                  className="px-3 py-1 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={pageSafe === totalPages}
                  className="px-3 py-1 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showCouponModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl max-w-3xl w-full shadow-2xl">
            <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-300" />
                <h3 className="text-xl font-bold text-white">
                  {editId ? "Edit Coupon" : "Create Coupon"}
                </h3>
              </div>
              <button
                onClick={() => setShowCouponModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm text-gray-300 flex flex-col gap-1">
                  Code
                  <input
                    type="text"
                    value={couponForm.code}
                    onChange={(e) =>
                      setCouponForm((prev) => ({ ...prev, code: e.target.value }))
                    }
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </label>
                <label className="text-sm text-gray-300 flex flex-col gap-1">
                  Description (optional)
                  <input
                    type="text"
                    value={couponForm.description}
                    onChange={(e) =>
                      setCouponForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </label>
                <label className="text-sm text-gray-300 flex flex-col gap-1">
                  Discount type
                  <select
                    value={couponForm.discountType}
                    onChange={(e) =>
                      setCouponForm((prev) => ({
                        ...prev,
                        discountType: e.target.value,
                      }))
                    }
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="fixed">Amount (EGP)</option>
                    <option value="percentage">Percent (%)</option>
                  </select>
                </label>
                <label className="text-sm text-gray-300 flex flex-col gap-1">
                  Discount value
                  <input
                    type="number"
                    min="0"
                    value={couponForm.value}
                    onChange={(e) =>
                      setCouponForm((prev) => ({
                        ...prev,
                        value: numberOrEmpty(e.target.value),
                      }))
                    }
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </label>
                <label className="text-sm text-gray-300 flex flex-col gap-1">
                  Applicable event type
                <select
                  value={couponForm.applicableEventType}
                  onChange={(e) =>
                    setCouponForm((prev) => ({
                      ...prev,
                      applicableEventType: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="workshop">Workshop</option>
                  <option value="trip">Trip</option>
                </select>
                </label>
                <label className="text-sm text-gray-300 flex flex-col gap-1">
                  Price in points
                  <input
                    type="number"
                    min="0"
                    value={couponForm.priceInPoints}
                    onChange={(e) =>
                      setCouponForm((prev) => ({
                        ...prev,
                        priceInPoints: numberOrEmpty(e.target.value),
                      }))
                    }
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </label>
              </div>
            </div>
            <div className="border-t border-gray-700 px-6 py-4 flex justify-end gap-3 bg-gray-900/70 rounded-b-2xl">
              <button
                onClick={() => setShowCouponModal(false)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={submitCoupon}
                disabled={creatingCoupon}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 text-sm disabled:opacity-50"
              >
                {creatingCoupon ? "Saving..." : editId ? "Save Changes" : "Create Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-blue-400" />
                <h3 className="text-xl font-bold text-white">Edit Point Rate</h3>
              </div>
              <button
                onClick={() => setShowRateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <label className="text-sm text-gray-300 flex flex-col gap-1">
                Points awarded per amount
                <input
                  type="number"
                  min="0"
                  value={settings.pointsPerAmount}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      pointsPerAmount: numberOrEmpty(e.target.value),
                    }))
                  }
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="text-sm text-gray-300 flex flex-col gap-1">
                Amount unit (EGP)
                <input
                  type="number"
                  min="1"
                  value={settings.amountUnit}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      amountUnit: numberOrEmpty(e.target.value),
                    }))
                  }
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>
            <div className="border-t border-gray-700 px-6 py-4 flex justify-end gap-3 bg-gray-900/70 rounded-b-2xl">
              <button
                onClick={() => setShowRateModal(false)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await saveSettings();
                  setShowRateModal(false);
                }}
                disabled={savingSettings}
                className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 text-sm disabled:opacity-50"
              >
                {savingSettings ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deletingId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/30">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-red-300">
                  Delete coupon
                </p>
                <p className="text-sm text-gray-300">
                  Are you sure you want to delete this coupon?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingId("");
                }}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
