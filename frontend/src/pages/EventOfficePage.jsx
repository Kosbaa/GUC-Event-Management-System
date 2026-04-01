import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
//import CreateEvent from "../components/CreateEvent";
import AvailableEvents from "../components/AvailableEvents";
import GymSchedule from "../components/GymSchedule";
import BoothManagement from "../components/BoothManagement";
import BazaarManagement from "../components/BazaarManagement";
import WorkshopManagement from "../components/WorkshopManagement";
import VendorManagement from "../components/VendorManagement";
import CourtsViewer from "../components/CourtsViewer";
import ViewReports from "../components/ViewReports";
import AdminLoyaltyApplications from "../components/AdminLoyaltyApplications";
import LoyaltyPartnersList from "../components/LoyaltyPartnerList";
import ActiveBoothsMap from "../components/ActiveBoothsMap";
import RewardsAdminPanel from "../components/RewardsAdminPanel";
import {
  CalendarDays,
  PanelsTopLeft,
  ShoppingBag,
  Dumbbell,
  Store,
  Wrench,
  FilePieChart,
  ClipboardList,
  Handshake,
  Gavel,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useDashboardNav } from "../context/DashboardNavContext";

export default function EventOfficePage() {
  const storageKey = "dashboard:eventOffice";
  const defaultSection = "Available Events";
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
    { label: "Available Events", type: "section", icon: CalendarDays },
    { label: "Booth Applications", type: "section", icon: PanelsTopLeft },
    { label: "Bazaar Applications", type: "section", icon: ShoppingBag },
    { label: "Courts Events", type: "section", icon: Gavel },
    { label: "Gym Schedule", type: "section", icon: Dumbbell },
    { label: "Vendor Management", type: "section", icon: Store },
    { label: "Active Booths", type: "section", icon: MapPin },
    { label: "Workshop Management", type: "section", icon: Wrench },
    { label: "View Reports", type: "section", icon: FilePieChart },
    { label: "Loyalty Applications", type: "section", icon: ClipboardList },
    { label: "Loyalty Partners", type: "section", icon: Handshake },
    { label: "Rewards & Coupons", type: "section", icon: Sparkles },
  ];

  const renderContent = () => {
    switch (selectedSection) {
      case "Available Events":
        return (
          <AvailableEvents
            onRegistered={() => setSelectedSection("Registered Events")}
          />
        );
      case "Booth Applications":
        return <BoothManagement />;
      case "Bazaar Applications":
        return <BazaarManagement />;
      case "Courts Events":
        return <CourtsViewer />;
      case "Gym Schedule":
        return <GymSchedule />;
      case "Vendor Management":
        return <VendorManagement />;
      case "Active Booths":
        return <ActiveBoothsMap />;
      case "Workshop Management":
        return <WorkshopManagement />;
      case "View Reports":
          return <ViewReports />;
      case "Loyalty Applications":
          return <AdminLoyaltyApplications />;
      case "Loyalty Partners":
              return <LoyaltyPartnersList />;
      case "Rewards & Coupons":
        return <RewardsAdminPanel />;
      default:
        return (
          <AvailableEvents
            onRegistered={() => setSelectedSection("Registered Events")}
          />
        );
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
