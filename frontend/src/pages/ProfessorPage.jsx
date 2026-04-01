import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import AvailableEvents from "../components/AvailableEvents";
import MyRegistrations from "../components/MyRegistrations";
import GymSchedule from "../components/GymSchedule";
import WorkshopManager from "../components/WorkshopManager";
import MessagesFromEventOffice from "../components/MessagesFromEventOffice";
import MySessions from "../components/MySessions";
import BoothPollsViewer from "../components/BoothPollsViewer";
import WalletPanel from "../components/WalletPanel";
import MyFavorites from "../components/MyFavorites";
import LoyaltyPartnerList from "../components/LoyaltyPartnerList";
import UnifiedEventRatingPicker from "../components/UnifiedEventRatingPicker";
import ActiveBoothsMap from "../components/ActiveBoothsMap";
import {
  CalendarDays,
  Star,
  ClipboardList,
  Megaphone,
  Dumbbell,
  CalendarClock,
  Mail,
  Wallet,
  Wrench,
  Handshake,
  StarHalf,
  Store,
} from "lucide-react";
import { useDashboardNav } from "../context/DashboardNavContext";

export default function ProfessorPage() {
  const { user } = useAuth();
  const storageKey = "dashboard:professor";
  const defaultSection = "Workshop Manager";
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
    { label: "Workshop Manager", type: "section", icon: Wrench },
    { label: "Event Office Messages", type: "section", icon: Mail },
    { label: "Available Events", type: "section", icon: CalendarDays },
    { label: "Rate Event", type: "section", icon: StarHalf },
    { label: "Event Registrations", type: "section", icon: ClipboardList },
    { label: "Booth Polls", type: "section", icon: Megaphone },
    { label: "Gym Schedule", type: "section", icon: Dumbbell },
    { label: "Active Booths", type: "section", icon: Store },
    { label: "Wallet", type: "section", icon: Wallet },
    { label: "Loyalty Partners", type: "section", icon: Handshake },
  ];

  const renderContent = () => {
    switch (selectedSection) {
      case "Available Events":
        return <AvailableEvents />;
      case "Event Registrations":
        return <MyRegistrations professorId={user?._id} />;
      case "Booth Polls":
        return <BoothPollsViewer />;
      case "Gym Schedule":
        return <GymSchedule />;
      case "Workshop Manager":
        return <WorkshopManager />;
      case "Event Office Messages":
        return <MessagesFromEventOffice />;
      case "Wallet":
        return <WalletPanel />;
      case "Loyalty Partners":
        return <LoyaltyPartnerList />;
      case "Active Booths":
        return <ActiveBoothsMap />;
      case "Rate Event":
        return <UnifiedEventRatingPicker />;
      default:
        return <WorkshopManager />;
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
