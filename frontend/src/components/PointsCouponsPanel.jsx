import { useEffect, useMemo, useState } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import {
  Sparkles,
  Percent,
  Ticket,
  Coins,
  Clock,
  ShoppingCart,
  ShieldCheck,
} from "lucide-react";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-EG") : "Always available";

const SectionCard = ({ children, className = "" }) => (
  <div
    className={`rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/50 shadow-lg shadow-black/20 ${className}`}
  >
    {children}
  </div>
);

const StatChip = ({ icon: Icon, label, value, accent }) => (
  <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-3">
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}
    >
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  </div>
);

export default function PointsCouponsPanel() {
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState(null);
  const [storeCoupons, setStoreCoupons] = useState([]);
  const [myCoupons, setMyCoupons] = useState([]);
  const [buyingId, setBuyingId] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pointsRes, storeRes, myRes] = await Promise.all([
        api.get("/points/my"),
        api.get("/coupons"),
        api.get("/coupons/my"),
      ]);
      setBalance(pointsRes.data?.balance || 0);
      setHistory(pointsRes.data?.history || []);
      setSettings(pointsRes.data?.settings || null);
      setStoreCoupons(storeRes.data || []);
      const ownedClean = (myRes.data || []).filter(
        (c) => c && c.code && !c.deleted && !c.used
      );
      setMyCoupons(ownedClean);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to load points and coupons."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const myCouponCodes = useMemo(() => {
    const set = new Set();
    // Only block buying if the user already has an unused copy
    (myCoupons || [])
      .filter((c) => !c.used)
      .forEach((c) => set.add(String(c.code)));
    return set;
  }, [myCoupons]);

  const handleBuy = async (couponId, code, priceInPoints) => {
    setBuyingId(couponId);
    try {
      await api.post(`/coupons/buy/${couponId}`);
      toast.success(`Bought ${code} for ${priceInPoints || 0} pts`);
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to buy coupon.");
    } finally {
      setBuyingId("");
    }
  };

  const totalUnused = myCoupons.filter((c) => !c.used).length;

  return (
    <div className="space-y-6">
      <SectionCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-400/30">
              <Sparkles className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-200/70">
                Rewards
              </p>
              <h2 className="text-2xl font-bold text-white">
                My Points & Coupons
              </h2>
              <p className="text-sm text-gray-400">
                Earn points from trip/workshop payments, buy coupons, and apply
                them at checkout.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto min-w-[280px]">
            <StatChip
              icon={Coins}
              label="Points"
              value={balance}
              accent="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
            />
            <StatChip
              icon={Percent}
              label="Earn rate"
              value={
                settings
                  ? `${settings.pointsPerAmount} / ${settings.amountUnit} EGP`
                  : "Not set"
              }
              accent="bg-blue-500/15 text-blue-300 border border-blue-500/30"
            />
            <StatChip
              icon={ShieldCheck}
              label="Unused coupons"
              value={totalUnused}
              accent="bg-amber-500/15 text-amber-300 border border-amber-500/30"
            />
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard className="lg:col-span-2 p-5">
          <div className="flex items-center gap-2 text-gray-200 font-semibold mb-3">
            <ShoppingCart className="h-5 w-5 text-blue-300" />
            Coupon store
          </div>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : storeCoupons.length === 0 ? (
            <p className="text-sm text-gray-500">No coupons available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {storeCoupons.map((c) => (
                <div
                  key={c._id}
                  className="rounded-xl border border-gray-800 bg-gray-900/70 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-emerald-300" />
                      <p className="text-sm font-semibold text-white">
                        {c.code}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {c.discountType === "percentage"
                        ? `${c.value}% off`
                        : `${c.value} EGP off`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {c.description || "Coupon"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="px-2 py-1 rounded-full bg-gray-800/70 border border-gray-700">
                      {c.applicableEventType || "Any"}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-gray-800/70 border border-gray-700">
                      Always available
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-gray-400">
                      Price:{" "}
                      <span className="text-white font-semibold">
                        {c.priceInPoints || 0} pts
                      </span>
                    </p>
                    <button
                      onClick={() => handleBuy(c._id, c.code, c.priceInPoints)}
                      disabled={
                        buyingId === c._id ||
                        (c.priceInPoints || 0) > balance ||
                        myCouponCodes.has(String(c.code))
                      }
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1 disabled:opacity-50"
                    >
                      {myCouponCodes.has(String(c.code))
                        ? "Owned"
                        : buyingId === c._id
                        ? "Buying..."
                        : "Buy"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard className="p-5">
          <div className="flex items-center gap-2 text-gray-200 font-semibold mb-3">
            <Percent className="h-5 w-5 text-emerald-300" />
            Recent transactions
          </div>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500">No transactions yet.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {history.map((tx) => (
                <div
                  key={tx._id}
                  className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2 text-sm"
                >
                  <div className="space-y-1">
                    <p className="text-gray-200 font-semibold">
                      {tx.type === "earn" ? "Earned" : "Spent"} {tx.amount} pts
                    </p>
                    <p className="text-xs text-gray-500">
                      {tx.description || "No description"}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-4 w-4" /> {formatDate(tx.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard className="p-5">
        <div className="flex items-center gap-2 text-gray-200 font-semibold mb-3">
          <Percent className="h-5 w-5 text-emerald-300" />
          My coupons
        </div>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : myCoupons.length === 0 ? (
          <p className="text-sm text-gray-500">You have no coupons yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {myCoupons.map((c) => (
              <div
                key={c.couponId || c.code}
                className="rounded-xl border border-gray-800 bg-gray-900/70 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    {c.code || c.couponId}
                  </p>
                  <span className="text-xs text-gray-400">
                    {c.discountType === "percentage"
                      ? `${c.value}% off`
                      : `${c.value} EGP off`}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {c.description || "Coupon"}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="px-2 py-1 rounded-full bg-gray-800/70 border border-gray-700">
                    {c.applicableEventType || "Any"}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-gray-800/70 border border-gray-700">
                    Obtained: {formatDate(c.obtainedAt)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Status:{" "}
                  <span
                    className={`font-semibold ${
                      c.used ? "text-gray-400" : "text-emerald-300"
                    }`}
                  >
                    {c.used ? "Used" : "Unused"}
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
