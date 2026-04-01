import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import AdminManager from "../components/AdminUserManager";
import RegistrationManager from "../components/RegistrationManager";
import ManageUsers from "../components/ManageUsers";
import VendorManagement from "../components/VendorManagement";
import BoothManagement from "../components/BoothManagement";
import BazaarManagement from "../components/BazaarManagement";
import AvailableEvents from "../components/AvailableEvents";
import LoyaltyPartnersList from "../components/LoyaltyPartnerList";
import ViewReports from "../components/ViewReports";
import ActiveBoothsMap from "../components/ActiveBoothsMap";
import {
  ShieldEllipsis,
  ClipboardCheck,
  Users2,
  Store,
  CalendarDays,
  PanelsTopLeft,
  ShoppingBag,
  Handshake,
  MapPin,
} from "lucide-react";
import { useDashboardNav } from "../context/DashboardNavContext";

export default function AdminDashboard() {
  const storageKey = "dashboard:admin";
  const defaultSection = "Manage Admins and Event Office";
  const [selectedSection, setSelectedSection] = useState(() => {
    if (typeof window === "undefined") return defaultSection;
    return localStorage.getItem(storageKey) || defaultSection;
  });
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

  const menuItems = [
    { label: "Manage Admins and Event Office", type: "section", icon: ShieldEllipsis },
    { label: "Faculty Registrations", type: "section", icon: ClipboardCheck },
    { label: "User Management", type: "section", icon: Users2 },
    { label: "Available Events", type: "section", icon: CalendarDays },
    { label: "Vendor Management", type: "section", icon: Store },
    { label: "Active Booths", type: "section", icon: MapPin },
    { label: "Booth Applications", type: "section", icon: PanelsTopLeft },
    { label: "Bazaar Applications", type: "section", icon: ShoppingBag },
    { label: "View Reports", type: "section", icon: ClipboardCheck },
    { label: "Loyalty Partners", type: "section", icon: Handshake },
  ];

  const renderContent = () => {
    switch (selectedSection) {
      case "Manage Admins and Event Office":
        return <AdminManager />;
      case "Faculty Registrations":
        return <RegistrationManager />;
      case "User Management":
        return <ManageUsers />;
      case "Vendor Management":
        return <VendorManagement />;
      case "Active Booths":
        return <ActiveBoothsMap />;
      case "Available Events":
        return <AvailableEvents />;
      case "Booth Applications":
        return <BoothManagement />;
      case "Bazaar Applications":
        return <BazaarManagement />;
      case "View Reports":
        return <ViewReports />;
      case "Loyalty Partners":
        return <LoyaltyPartnersList />;
      default:
        return <AdminManager />;
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
