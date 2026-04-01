import React, { useState, useEffect } from "react";
import API from "../utils/axiosInstance";
import { toast } from "react-hot-toast";
import DynamicTable from "./DynamicTable";
import { 
  Star, 
  FileText, 
  Tag, 
  TrendingUp, 
  ShoppingBag, 
  Gift,
  Percent,
  Award
} from "lucide-react";

export default function LoyaltyPartnerList() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all approved/active loyalty partners
  const fetchPartners = async () => {
    try {
      setLoading(true);
      // use shared axios instance (handles baseURL + token if present)
      const res = await API.get("/loyalty/partners");
      setPartners(res.data || []);
    } catch (err) {
      console.error("Error fetching loyalty partners:", err);
      toast.error("Failed to load loyalty partners.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleViewTerms = async (partner) => {
    if (!partner?._id) return;
    try {
      const res = await API.get(`/loyalty/${partner._id}/terms`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], {
        type: res.headers["content-type"] || "application/pdf",
      });
      const url = window.URL.createObjectURL(blob);
      const newWindow = window.open();
      if (newWindow) {
        newWindow.location.href = url;
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("Failed to load terms:", error);
      toast.error("Unable to open terms document.");
    }
  };

  const columns = [
    {
      key: "vendor",
      label: "Vendor",
      render: (value, partner) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <ShoppingBag className="h-5 w-5 text-yellow-400" />
          </div>
          <span className="text-white font-semibold">
            {partner.vendor?.companyName || partner.vendorName || "N/A"}
          </span>
        </div>
      ),
    },
    {
      key: "discountRate",
      label: "Discount Rate",
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
            <Percent className="h-4 w-4 text-green-400" />
          </div>
          <span className="text-white font-semibold">
            {Number.isFinite(value) ? `${value}%` : "N/A"}
          </span>
        </div>
      ),
    },
    {
      key: "promoCode",
      label: "Promo Code",
      render: (value) => (
        value ? (
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-purple-500/10 border border-purple-500/20">
            <Tag className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-purple-300 font-mono font-semibold">{value}</span>
          </div>
        ) : (
          <span className="text-gray-500 italic">No code</span>
        )
      ),
    },
    {
      key: "termsActions",
      label: "Terms & Conditions",
      render: (_, partner) =>
        partner.hasTermsFile ? (
          <button
            onClick={() => handleViewTerms(partner)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-white text-sm font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105"
          >
            <FileText className="h-4 w-4" />
            View Terms
          </button>
        ) : (
          <span className="text-gray-500 italic text-sm">Not available</span>
        ),
    },
  ];

  // Calculate statistics
  const stats = {
    total: partners.length,
    avgDiscount: partners.length > 0
      ? Math.round(
          partners.reduce((sum, p) => sum + (Number(p.discountRate) || 0), 0) / partners.length
        )
      : 0,
    withPromo: partners.filter((p) => p.promoCode).length,
    withTerms: partners.filter((p) => p.hasTermsFile).length,
  };

  if (loading) {
    return (
      <div className="p-6 text-white">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-500"></div>
            <p className="text-gray-400 font-medium">Loading loyalty partners...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 text-white">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                <Star className="h-6 w-6 text-yellow-400" />
              </div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                Loyalty Program Partners
              </h2>
            </div>
            <p className="text-base text-gray-400 ml-15">
              Discover exclusive discounts and offers from our partner vendors.
            </p>
          </div>
        </div>
      </div>

      {partners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <Gift className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No Active Partners
              </h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                There are currently no active partners in the loyalty program. Check back soon for exciting offers!
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Enhanced Statistics Cards */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                  <ShoppingBag className="h-7 w-7 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                    Total Partners
                  </p>
                  <p className="text-3xl font-bold text-white mb-1">{stats.total}</p>
                  <p className="text-sm text-gray-400">Active vendors</p>
                </div>
              </div>
            </div>

            <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Percent className="h-7 w-7 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                    Avg. Discount
                  </p>
                  <p className="text-3xl font-bold text-white mb-1">{stats.avgDiscount}%</p>
                  <p className="text-sm text-gray-400">Average savings</p>
                </div>
              </div>
            </div>

            <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Tag className="h-7 w-7 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                    Promo Codes
                  </p>
                  <p className="text-3xl font-bold text-white mb-1">{stats.withPromo}</p>
                  <p className="text-sm text-gray-400">Available codes</p>
                </div>
              </div>
            </div>

            <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-7 w-7 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                    With Terms
                  </p>
                  <p className="text-3xl font-bold text-white mb-1">{stats.withTerms}</p>
                  <p className="text-sm text-gray-400">Documents available</p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Partners Table */}
          <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg">
            <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <Award className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Active Partners
                  </h3>
                  <p className="text-sm text-gray-400">
                    {partners.length} vendor{partners.length !== 1 ? "s" : ""} offering exclusive discounts
                  </p>
                </div>
              </div>
            </div>
            <DynamicTable
              columns={columns}
              data={partners}
              onEdit={null}
              onCreate={null}
            />
          </div>

          {/* Info Card */}
          <div className="mt-6 rounded-2xl border border-gray-800 bg-gradient-to-br from-blue-900/20 to-gray-900/40 p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  How to Use Your Loyalty Benefits
                </h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Browse available partners and their discount rates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Note the promo code for partners that provide one</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Review terms & conditions before making a purchase</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Present your GUC ID at partner locations to claim discounts</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
