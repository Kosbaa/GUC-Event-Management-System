import React, { useEffect, useMemo, useState } from "react";
import Navigation from "../components/Navigation";
import Sidebar from "../components/Sidebar";
import Section from "../components/Section";
import Button from "../components/Button";
import AvailableEvents from "../components/AvailableEvents";
import MyRegistrations from "../components/MyRegistrations";
import GymSchedule from "../components/GymSchedule";
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
  Wallet,
  Handshake,
  StarHalf,
  Store,
} from "lucide-react";
import { useDashboardNav } from "../context/DashboardNavContext";

export default function StaffPage() {
  const storageKey = "dashboard:staff";
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
    { label: "Gym Schedule", type: "section", icon: Dumbbell },
    { label: "Active Booths", type: "section", icon: Store },
    { label: "Wallet", type: "section", icon: Wallet },
    { label: "Loyalty Partners", type: "section", icon: Handshake },
  ];

  const renderContent = () => {
    switch (selectedSection) {
      case "Available Events":
        return (
          <AvailableEvents
            onRegistered={() => setSelectedSection("Registered Events")}
          />
        );
      case "Event Registrations":
        return <MyRegistrations />;
      case "Booth Polls":
        return <BoothPollsViewer />;
      case "Gym Schedule":
        return <GymSchedule />;
      case "Wallet":
        return <WalletPanel />;
      case "Loyalty Partners":
        return <LoyaltyPartnerList />;
      case "Active Booths":
        return <ActiveBoothsMap />;
      case "Rate Event":
        return <UnifiedEventRatingPicker />;
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
