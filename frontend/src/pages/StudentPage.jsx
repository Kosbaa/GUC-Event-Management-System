import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import AvailableEvents from "../components/AvailableEvents";
import MyRegistrations from "../components/MyRegistrations";
import CourtsViewer from "../components/CourtsViewer";
import GymSchedule from "../components/GymSchedule";
import WalletPanel from "../components/WalletPanel";
import UnifiedEventRatingPicker from "../components/UnifiedEventRatingPicker";
import MyFavorites from "../components/MyFavorites";
import MySessions from "../components/MySessions";
import BoothPollsViewer from "../components/BoothPollsViewer";
import ActiveBoothsMap from "../components/ActiveBoothsMap";
import LoyaltyPartnersList from "../components/LoyaltyPartnerList";
import Chats from "../components/Chats";
import PointsCouponsPanel from "../components/PointsCouponsPanel";
import {
  CalendarDays,
  ClipboardList,
  Star,
  Gavel,
  Dumbbell,
  StarHalf,
  Megaphone,
  CalendarClock,
  Wallet,
  Handshake,
  Store,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { useDashboardNav } from "../context/DashboardNavContext";

export default function StudentDashboard() {
  const storageKey = "dashboard:student";
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
    { label: "Event Registrations", type: "section", icon: ClipboardList },
    { label: "Rate Event", type: "section", icon: StarHalf },
    { label: "Booth Polls", type: "section", icon: Megaphone },
    { label: "Active Booths", type: "section", icon: Store },
    { label: "Gym Schedule", type: "section", icon: Dumbbell },
    { label: "Court Availability", type: "section", icon: Gavel },
    { label: "Wallet", type: "section", icon: Wallet },
    { label: "My Points & Coupons", type: "section", icon: Sparkles },
    { label: "Loyalty Partners", type: "section", icon: Handshake },
    { label: "Chats", type: "section", icon: MessageCircle },
  ];

  const sections = {
    "Available Events": AvailableEvents,
    "Event Registrations": MyRegistrations,
    "Court Availability": CourtsViewer,
    "Gym Schedule": GymSchedule,
    Wallet: WalletPanel,
    "My Points & Coupons": PointsCouponsPanel,
    "Loyalty Partners": LoyaltyPartnersList,
    "Rate Event": UnifiedEventRatingPicker,
    "Booth Polls": BoothPollsViewer,
    "Active Booths": ActiveBoothsMap,
    Chats,
  };

  const SectionComponent = sections[selectedSection] || AvailableEvents;

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
        <SectionComponent />
      </main>
    </div>
  );
}
