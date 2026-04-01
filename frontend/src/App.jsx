import React from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AuthPage from "./pages/AuthPage";
import EventsList from "./components/EventsList";
import HomePage from "./pages/HomePage";
import Staff from "./pages/StaffPage";
import Dashboard from "./pages/Dashboard";
import StudentPage from "./pages/StudentPage";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import { Navigate } from "react-router-dom";
import TAPage from "./pages/TAPage";
import WorkshopManagement from "./components/WorkshopManagement";
import TermsAndConditions from "./components/TermsandConditions.jsx";
import { ThemeProvider } from "./context/ThemeContext";
import SupportChatWidget from "./components/SupportChatWidget";


function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <p>loading</p>
  ); // or a spinner component
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}


function App() {


  return (
    <ThemeProvider>
      <AuthProvider>
        <div
          className="min-h-screen w-full"
          style={{ background: "var(--guc-bg)" }}
        >
          <Toaster
            position="top-center"
            gutter={12}
            toastOptions={{
              duration: 3500,
              style: {
                background: "var(--toast-bg, #0f172a)",
                color: "var(--toast-text, #f8fafc)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
              },
              success: {
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#0f172a",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#0f172a",
                },
              },
            }}
          />
          <Router>
            <Routes>
              {/* Public */}
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/terms" element={<TermsAndConditions />} />

              {/* Protected */}
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/ta"
                element={
                  <PrivateRoute>
                    <TAPage/>
                  </PrivateRoute>
                }
              />
               <Route
      path="/workshop-management"
      element={
        <PrivateRoute>
          <WorkshopManagement/>
        </PrivateRoute>
      }
    />


                {/* Direct access to StudentPage for testing */}
            <Route path="/student" element={<StudentPage />} />
            <Route
              path="/events"
              element={
                <PrivateRoute>
                  <EventsList />
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
        <SupportChatWidget />
      </div>
    </AuthProvider>

    </ThemeProvider>
         
  );
}

export default App;
