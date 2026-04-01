import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import api from "../lib/axios";
import { 
  Wallet as WalletIcon, 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Plus,
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  AlertCircle,
  CheckCircle
} from "lucide-react";

const formatterCache = {};
const formatCurrency = (valueInCents = 0, currency = "EGP") => {
  const key = currency.toUpperCase();
  if (!formatterCache[key]) {
    formatterCache[key] = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: key,
    });
  }
  return formatterCache[key].format((valueInCents || 0) / 100);
};

export default function WalletPanel() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("50");
  const [processingStripeSession, setProcessingStripeSession] = useState(false);
  const [error, setError] = useState("");
  const [hasWallet, setHasWallet] = useState(false);

  const fetchWallet = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/wallet/me");
      setWallet(res.data.wallet);
      setHasWallet(true);
    } catch (err) {
      if (err?.response?.status === 404) {
        setWallet(null);
        setHasWallet(false);
      } else {
        const message =
          err?.response?.data?.message || "Failed to load wallet details.";
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("stripe");
    const sessionIdFromQuery = params.get("session_id");

    const cleanupParams = () => {
      params.delete("stripe");
      params.delete("session_id");
      const newUrl = `${window.location.pathname}${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      window.history.replaceState({}, "", newUrl);
    };

    const confirmSession = (sessionId, cleanup) => {
      if (!sessionId) return;
      const processedKey = `wallet:stripeSession:${sessionId}`;
      if (localStorage.getItem(processedKey)) {
        cleanup?.();
        if (localStorage.getItem("wallet:pendingSession") === sessionId) {
          localStorage.removeItem("wallet:pendingSession");
        }
        return;
      }

      setProcessingStripeSession(true);
      api
        .post("/payments/wallet-topup-confirm", { sessionId })
        .then((res) => {
          if (res.data?.wallet) {
            setWallet(res.data.wallet);
            setHasWallet(true);
            toast.success(res.data?.message || "Wallet credited successfully.");
            localStorage.setItem(processedKey, "true");
          }
        })
        .catch((err) => {
          const message =
            err?.response?.data?.message ||
            "Unable to confirm Stripe payment. Please contact support.";
          toast.error(message);
        })
        .finally(() => {
          setProcessingStripeSession(false);
          cleanup?.();
          if (localStorage.getItem("wallet:pendingSession") === sessionId) {
            localStorage.removeItem("wallet:pendingSession");
          }
          fetchWallet();
        });
    };

    if (status === "cancelled") {
      cleanupParams();
      localStorage.removeItem("wallet:pendingSession");
      toast.error("Stripe payment cancelled.");
      return;
    }

    if (status === "success" && sessionIdFromQuery) {
      confirmSession(sessionIdFromQuery, cleanupParams);
      return;
    }

    const pendingSession = localStorage.getItem("wallet:pendingSession");
    if (pendingSession) {
      confirmSession(pendingSession);
    }
  }, []);

  const handleOpenWallet = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await api.post("/wallet/open");
      setWallet(res.data.wallet);
      setHasWallet(true);
      toast.success(res.data?.message || "Wallet created successfully.");
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Failed to open wallet. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleTopUp = async () => {
    const numeric = Number.parseFloat(topUpAmount);
    if (!Number.isFinite(numeric) || numeric < 5) {
      toast.error("Minimum top-up is 5 EGP.");
      return;
    }
    const amountInMinor = Math.round(numeric * 100);
    setToppingUp(true);
    setError("");
    try {
      const res = await api.post("/payments/wallet-topup-session", {
        amount: amountInMinor,
      });

      const { id: sessionId, url } = res.data || {};
      if (sessionId) {
        localStorage.setItem("wallet:pendingSession", sessionId);
      }
      if (url) {
        window.location.assign(url);
        return;
      }
      if (sessionId) {
        localStorage.removeItem("wallet:pendingSession");
      }

      toast.error("Stripe did not return a checkout URL.");
    } catch (err) {
      localStorage.removeItem("wallet:pendingSession");
      const message =
        err?.response?.data?.message ||
        "Failed to start Stripe top-up session.";
      toast.error(message);
      setError(message);
    } finally {
      setToppingUp(false);
    }
  };

  const recentTransactions = useMemo(() => {
    if (!wallet?.history?.length) return [];
    const sorted = [...wallet.history].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const seenRefs = new Set();
    const deduped = [];
    for (const tx of sorted) {
      if (tx.stripeReference) {
        if (seenRefs.has(tx.stripeReference)) continue;
        seenRefs.add(tx.stripeReference);
      }
      deduped.push(tx);
      if (deduped.length === 5) break;
    }
    return deduped;
  }, [wallet]);

  const handleResetWallet = async () => {
    if (
      !window.confirm(
        "Resetting your wallet will clear the balance and history. Continue?"
      )
    ) {
      return;
    }
    setCreating(true);
    try {
      const res = await api.post("/wallet/reset");
      setWallet(res.data.wallet);
      setHasWallet(true);
      toast.success(res.data?.message || "Wallet reset.");
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to reset wallet. Try again.";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const recentActivityMeta = (type = "") => {
    const normalized = String(type).toLowerCase();
    if (normalized === "debit") {
      return {
        label: "Debit",
        icon: ArrowDownRight,
        badge: "bg-red-500/10 text-red-400 border border-red-500/20",
        amount: "text-red-400",
        iconBg: "bg-red-500/10 border-red-500/20",
        prefix: "-",
      };
    }
    if (normalized === "init") {
      return {
        label: "Initial",
        icon: CheckCircle,
        badge: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
        amount: "text-blue-400",
        iconBg: "bg-blue-500/10 border-blue-500/20",
        prefix: "",
      };
    }
    return {
      label: "Credit",
      icon: ArrowUpRight,
      badge: "bg-green-500/10 text-green-400 border border-green-500/20",
      amount: "text-green-400",
      iconBg: "bg-green-500/10 border-green-500/20",
      prefix: "+",
    };
  };

  // Calculate statistics
  const stats = useMemo(() => {
    if (!wallet?.history?.length) return { totalCredits: 0, totalDebits: 0, transactionCount: 0 };
    
    let totalCredits = 0;
    let totalDebits = 0;
    
    wallet.history.forEach(tx => {
      const type = String(tx.type).toLowerCase();
      if (type === "credit" || type === "init") {
        totalCredits += tx.amount || 0;
      } else if (type === "debit") {
        totalDebits += tx.amount || 0;
      }
    });
    
    return {
      totalCredits,
      totalDebits,
      transactionCount: wallet.history.length
    };
  }, [wallet]);

  return (
    <div className="p-6 text-white">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                <WalletIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                My Wallet
              </h2>
            </div>
            <p className="text-base text-gray-400 ml-15">
              {hasWallet 
                ? "Manage your campus balance and view transaction history."
                : "Create your campus wallet to start using digital payments."}
            </p>
          </div>
          <button
            onClick={fetchWallet}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 px-5 py-2.5 font-medium text-white transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-700 bg-red-900/20 px-5 py-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {processingStripeSession && (
        <div className="rounded-2xl border border-blue-700 bg-blue-900/20 px-5 py-4 mb-6 flex items-start gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent flex-shrink-0 mt-0.5"></div>
          <p className="text-sm text-blue-200">
            Finalizing Stripe payment... please wait a moment.
          </p>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-500"></div>
            <p className="text-gray-400 font-medium">Loading wallet details...</p>
          </div>
        </div>
      ) : !hasWallet ? (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <WalletIcon className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No Wallet Yet
              </h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
                Create your campus wallet to start topping up with Stripe and paying for trips, workshops, and more.
              </p>
              <button
                onClick={handleOpenWallet}
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 px-6 py-3 font-bold text-gray-900 shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-5 w-5" />
                {creating ? "Creating..." : "Create Wallet"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Balance Card */}
          <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg mb-6">
            <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <DollarSign className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Current Balance
                    </h3>
                    <p className="text-sm text-gray-400">
                      Updated {new Date(wallet.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {wallet.status || "Active"}
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-baseline gap-3 mb-4">
                <p className="text-5xl font-bold text-white">
                  {formatCurrency(wallet.balance, wallet.currency)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Currency</p>
                  <p className="text-white font-semibold">{wallet.currency?.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Account Type</p>
                  <p className="text-white font-semibold">{wallet.userRole}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid gap-5 sm:grid-cols-3 mb-6">
            <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-7 w-7 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                    Total Credits
                  </p>
                  <p className="text-3xl font-bold text-white mb-1">
                    {formatCurrency(stats.totalCredits, wallet.currency)}
                  </p>
                  <p className="text-sm text-gray-400">Money added</p>
                </div>
              </div>
            </div>

            <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 group-hover:scale-110 transition-transform duration-300">
                  <TrendingDown className="h-7 w-7 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                    Total Debits
                  </p>
                  <p className="text-3xl font-bold text-white mb-1">
                    {formatCurrency(stats.totalDebits, wallet.currency)}
                  </p>
                  <p className="text-sm text-gray-400">Money spent</p>
                </div>
              </div>
            </div>

            <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Activity className="h-7 w-7 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                    Transactions
                  </p>
                  <p className="text-3xl font-bold text-white mb-1">
                    {stats.transactionCount}
                  </p>
                  <p className="text-sm text-gray-400">Total activities</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Up Section */}
          <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg mb-6">
            <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <CreditCard className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Top Up Wallet
                  </h3>
                  <p className="text-sm text-gray-400">
                    Add funds via Stripe secure payment
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-400 mb-2 block">
                    Amount (EGP)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      type="number"
                      min="5"
                      step="1"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                      placeholder="Enter amount (min. 5 EGP)"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleTopUp}
                    disabled={toppingUp}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CreditCard className="h-5 w-5" />
                    {toppingUp ? "Processing..." : "Top Up Now"}
                  </button>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-3 flex items-start gap-3 shadow-none">
                <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-100">
                  <strong>Test Mode:</strong> Use Stripe test card 4242 4242 4242 4242 with any future expiry date and CVC to simulate payments.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg">
            <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <Activity className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Recent Activity
                    </h3>
                    <p className="text-sm text-gray-400">
                      Last {recentTransactions.length} transactions
                    </p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {wallet.history?.length || 0} total
                </span>
              </div>
            </div>
            <div className="p-6">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 mx-auto mb-3">
                    <Clock className="h-6 w-6 text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-400">
                    No transactions recorded yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTransactions.map((tx) => {
                    const meta = recentActivityMeta(tx.type);
                    const TxIcon = meta.icon;
                    return (
                      <div
                        key={tx._id}
                        className="group rounded-xl border border-gray-800 bg-gray-900/60 hover:bg-gray-900 p-4 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.iconBg} border flex-shrink-0`}>
                              <TxIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badge}`}>
                                  {meta.label}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-white mb-1">
                                {tx.description || "No description provided"}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {new Date(tx.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </div>
                              {tx.stripeReference && (
                                <p className="text-[10px] text-gray-600 mt-1 font-mono">
                                  Ref: {tx.stripeReference}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className={`text-xl font-bold ${meta.amount} flex-shrink-0`}>
                            {meta.prefix}
                            {formatCurrency(
                              tx.amount,
                              tx.currency || wallet.currency
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
