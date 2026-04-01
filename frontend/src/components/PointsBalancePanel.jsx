import { useEffect, useMemo, useState } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import { Sparkles, Percent, CalendarClock } from "lucide-react";

export default function PointsBalancePanel() {
  const [balance, setBalance] = useState(0);
  const [settings, setSettings] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [myCoupons, setMyCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingCode, setBuyingCode] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [pointsRes, couponsRes, myCouponsRes] = await Promise.all([
        api.get("/rewards/points/balance"),
        api.get("/rewards/coupons"),
        api.get("/rewards/my-coupons"),
      ]);
      setBalance(pointsRes.data?.balance ?? 0);
      setSettings(pointsRes.data?.settings || null);
      setCoupons(couponsRes.data || []);
      setMyCoupons(myCouponsRes.data || []);
    } catch (err) {
      toast.error("Failed to load points data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBuy = async (code, cost) => {
    setBuyingCode(code);
    try {
      await api.post(`/rewards/coupons/${code}/buy`);
      toast.success(`Bought ${code} for ${cost} pts.`);
      await loadData();
    } catch (err) {
      const msg = err?.response?.data?.message || "Unable to buy coupon.";
      toast.error(msg);
    } finally {
      setBuyingCode("");
    }
  };

  const upcomingCoupons = useMemo(() => {
    const now = new Date();
    return (coupons || []).filter((c) => {
      if (c.validFrom && new Date(c.validFrom) > now) return false;
      if (c.validTo && new Date(c.validTo) < now) return false;
      if (c.maxRedemptions && c.redemptionsUsed >= c.maxRedemptions) return false;
      return true;
    });
  }, [coupons]);

  const myCouponsByCode = useMemo(() => {
    const map = new Set();
    (myCoupons || []).forEach((c) => map.add(c.code));
    return map;
  }, [myCoupons]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Sparkles className="h-6 w-6 text-amber-300" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-amber-200/70">
            Rewards
          </p>
          <h2 className="text-2xl font-bold text-white">My Points</h2>
          <p className="text-sm text-gray-400">
            Earn points when you pay for trips/workshops, spend them on coupons.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 rounded-2xl border border-gray-700 bg-gray-900/70 p-5 space-y-2">
          <p className="text-sm text-gray-400">Current balance</p>
          <p className="text-4xl font-bold text-white">{balance}</p>
          {settings && (
            <p className="text-xs text-gray-500">
              Earn {settings.pointsPerAmount} pts per {settings.amountUnit} EGP spent
            </p>
          )}
        </div>
        <div className="md:col-span-2 rounded-2xl border border-gray-700 bg-gray-900/70 p-5 space-y-3">
          <div className="flex items-center gap-2 text-gray-200 font-semibold">
            <Percent className="h-5 w-5 text-emerald-300" />
            Coupon store
          </div>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : upcomingCoupons.length === 0 ? (
            <p className="text-sm text-gray-500">No coupons are active right now.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcomingCoupons.map((c) => (
                <div
                  key={c._id || c.code}
                  className="rounded-xl border border-gray-700 bg-gray-800/60 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{c.code}</p>
                    <span className="text-xs text-gray-400">
                      {c.discountType === "percent"
                        ? `${c.discountValue}% off`
                        : `${c.discountValue} EGP off`}
                    </span>
                  </div>
                  {c.title && (
                    <p className="text-xs text-gray-400">{c.title}</p>
                  )}
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-gray-400" />
                    {c.validTo
                      ? `Valid until ${new Date(c.validTo).toLocaleDateString()}`
                      : "No expiry set"}
                  </div>
                  <p className="text-xs text-gray-500">
                    {c.minAmount ? `Min spend: ${c.minAmount} EGP` : "No minimum spend"}
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-gray-400">
                      Cost: {c.pointCost || 0} pts
                    </p>
                    <button
                      onClick={() => handleBuy(c.code, c.pointCost || 0)}
                      disabled={
                        buyingCode === c.code ||
                        (c.pointCost || 0) > balance ||
                        myCouponsByCode.has(c.code)
                      }
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1 disabled:opacity-50"
                    >
                      {myCouponsByCode.has(c.code)
                        ? "Owned"
                        : buyingCode === c.code
                        ? "Buying..."
                        : "Buy"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-700 bg-gray-900/70 p-5 space-y-3">
        <div className="flex items-center gap-2 text-gray-200 font-semibold">
          <Sparkles className="h-5 w-5 text-amber-300" />
          My coupons
        </div>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : myCoupons.length === 0 ? (
          <p className="text-sm text-gray-500">You have no coupons yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myCoupons.map((c) => (
              <div
                key={c._id || c.code}
                className="rounded-xl border border-gray-700 bg-gray-800/60 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{c.code}</p>
                  <span className="text-xs text-gray-400">
                    {c.discountType === "percent"
                      ? `${c.discountValue}% off`
                      : `${c.discountValue} EGP off`}
                  </span>
                </div>
                {c.title && <p className="text-xs text-gray-400">{c.title}</p>}
                <p className="text-xs text-gray-500">
                  {c.minAmount ? `Min spend: ${c.minAmount} EGP` : "No minimum spend"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
