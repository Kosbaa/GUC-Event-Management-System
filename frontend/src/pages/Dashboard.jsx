import React from "react";
import { useAuth } from "../context/AuthContext";
import Staff from "./StaffPage";
import TAPage from "./TAPage";
import Sidebar from "../components/Sidebar";
import AdminDashboard from "./AdminPage";
import EventOfficePage from "./EventOfficePage";
import ProfessorPage from "./ProfessorPage";
import StudentPage from "./StudentPage";
import VendorPage from "./VendorPage";
import NotificationBell from "../components/NotificationsBell";
import { DashboardNavProvider } from "../context/DashboardNavContext";
import ThemeToggle from "../components/ThemeToggle";

const Dashboard = () => {
  const { user, loading } = useAuth(); // ✅ Get loading state from context

  // ✅ Show loading while fetching user
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <p>Loading...</p>
      </div>
    );
  }

  // ✅ Handle case where user is null
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <p>No user found. Please log in.</p>
      </div>
    );
  }

  // 🔔 small helper to wrap any page with the bell in top-right
  const withNotifications = (PageComponent) => (
    <DashboardNavProvider>
      <div className="relative min-h-screen bg-gray-950">
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
          <ThemeToggle />
          <NotificationBell />
        </div>
        <PageComponent />
      </div>
    </DashboardNavProvider>
  );

  // ✅ Use strict equality and switch statement for cleaner code
  switch (user.role) {
    case "Staff":
      return withNotifications(Staff);
    case "TA":
      return withNotifications(TAPage);
    case "Professor":
      return withNotifications(ProfessorPage);
    case "Admin":
      return withNotifications(AdminDashboard);
    case "Event Office":
      return withNotifications(EventOfficePage);
    case "Student":
      return withNotifications(StudentPage);
    case "Vendor":
      return withNotifications(VendorPage);
    default:
      return <Sidebar />;
  }
};

export default Dashboard;
