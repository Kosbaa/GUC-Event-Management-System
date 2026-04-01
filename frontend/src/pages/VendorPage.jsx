import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import BazaarList from "../components/BazaarList";
import BazaarApplication from "../components/BazaarApplication";
import BoothApplication from "../components/BoothApplication";
import VendorBoothApplications from "../components/VendorBoothApplications";
import api from "../lib/axios";
import ApplyLoyaltyProgram from "../components/LoyaltyApplication";
import {
  ShoppingBag,
  PanelsTopLeft,
  ClipboardList,
  Wallet,
  Handshake,
} from "lucide-react";
import { useDashboardNav } from "../context/DashboardNavContext";

export default function VendorPage() {
  const { user, loading: authLoading } = useAuth();
  const storageKey = "dashboard:vendor";
  const defaultSection = "Apply to Join Bazaar";
  const [selectedSection, setSelectedSection] = useState(() => {
    if (typeof window === "undefined") return defaultSection;
    return localStorage.getItem(storageKey) || defaultSection;
  });
  const [applications, setApplications] = useState({
    bazaarApplications: 0,
    boothApplications: 0,
  });
  const [bazaarCount, setBazaarCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load/save counters
  useEffect(() => {
    const saved = localStorage.getItem("vendorApplications");
    if (saved) setApplications(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem("vendorApplications", JSON.stringify(applications));
  }, [applications]);

  // Lightweight active bazaars count for dashboard only
  useEffect(() => {
    let ignore = false;
    async function fetchCount() {
      try {
        setLoading(true);
        const res = await api.get("/events/bazaars");
        if (!ignore) {
          const today = new Date();
          const upcoming = (res.data || []).filter(
            (b) => new Date(b.startDate) > today
          );
          setBazaarCount(upcoming.length);
        }
      } catch (e) {
        if (!ignore) setError("Failed to load bazaars");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchCount();
    return () => {
      ignore = true;
    };
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const { registerNavigator } = useDashboardNav();

  useEffect(() => {
    registerNavigator((sectionLabel) => setSelectedSection(sectionLabel));
    return () => registerNavigator(null);
  }, [registerNavigator]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, selectedSection);
    }
  }, [selectedSection, storageKey]);

  const menuItems = useMemo(
    () => [
      { label: "Apply to Join Bazaar", type: "section", icon: ShoppingBag },
      { label: "Apply for Booth", type: "section", icon: PanelsTopLeft },
      {
        label: "My Booth/Bazaar Applications",
        type: "section",
        icon: ClipboardList,
      },
      {
        label: "Loyalty Program Application",
        type: "section",
        icon: Handshake,
      },
    ],
    []
  );

  // Auth states
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p>Loading...</p>
      </div>
    );
  }
  if (!user || user.role !== "Vendor") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <p>Access denied. Vendor authentication required.</p>
          <p className="text-sm text-gray-400 mt-2">
            Please log in as a vendor to access this page.
          </p>
        </div>
      </div>
    );
  }

  const handleBazaarSubmitted = () => {
    setApplications((prev) => ({
      ...prev,
      bazaarApplications: prev.bazaarApplications + 1,
    }));
  };
  const handleBoothSubmitted = () => {
    setApplications((prev) => ({
      ...prev,
      boothApplications: prev.boothApplications + 1,
    }));
  };

  const renderContent = () => {
    switch (selectedSection) {
      case "Apply to Join Bazaar":
        return <BazaarApplication onSubmitted={handleBazaarSubmitted} />;
      case "Apply for Booth":
        return <BoothApplication onSubmitted={handleBoothSubmitted} />;
      case "My Booth/Bazaar Applications":
        return <VendorBoothApplications />;
      case "Loyalty Program Application":
        return <ApplyLoyaltyProgram />;
      default:
        return <BazaarApplication onSubmitted={handleBazaarSubmitted} />;
    }
  };

  return (
    <div className="flex">
      <Sidebar
        menuItems={menuItems}
        onSelect={(item) => setSelectedSection(item.label)}
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
      />
      <main
        className={`flex-1 p-8 text-white transition-all duration-300 ${
          sidebarOpen ? "md:ml-72" : "md:ml-20"
        }`}
      >
        {renderContent()}
      </main>
    </div>
  );
}
