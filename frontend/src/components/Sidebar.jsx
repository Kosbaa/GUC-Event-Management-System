import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu as MenuIcon, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({
  menuItems = [],
  className = "",
  onSelect,
  isOpen = true,
  onToggle = () => {},
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path = "") => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const widthClass = isOpen ? "md:w-72" : "md:w-20";
  const textVisibility = isOpen
    ? "opacity-100"
    : "opacity-0 pointer-events-none";
  const labelClass = `ml-3 whitespace-nowrap transition-opacity duration-200 ${textVisibility}`;
  const tooltip = (label) => (!isOpen ? label : undefined);

  return (
    <aside
      className={`hidden md:fixed md:inset-y-0 md:left-0 ${widthClass} md:h-screen bg-gray-900 border-r border-gray-800 z-40 md:flex md:flex-col md:py-6 transition-all duration-300 ease-in-out ${className}`}
    >
      {/* Toggle */}
      <div className="px-3 flex items-center justify-center">
        {isOpen && (
          <span className="mr-auto text-sm font-semibold uppercase tracking-wide text-gray-400">
            Menu
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center justify-center rounded-lg border border-gray-700 bg-gray-800/70 p-2 text-gray-300 hover:text-yellow-400 hover:border-yellow-500 transition"
          aria-label="Toggle sidebar"
        >
          <MenuIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-8 px-3 flex-1 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-2 pb-6">
          {menuItems.map((item, index) => {
            const Icon = item.icon || MenuIcon;
            if (item.type === "link" && item.path) {
              return (
                <li key={index}>
                  <Link
                    to={item.path}
                    className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium text-white transition ${
                      isActive(item.path)
                        ? "bg-gray-800 text-yellow-400"
                        : "hover:bg-gray-800 hover:text-yellow-400"
                    }`}
                    title={tooltip(item.label)}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className={labelClass}>{item.label}</span>
                  </Link>
                </li>
              );
            }

            return (
              <li key={index}>
                <button
                  onClick={() =>
                    item.onClick ? item.onClick() : onSelect?.(item)
                  }
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-white transition hover:bg-gray-800 hover:text-yellow-400"
                  title={tooltip(item.label)}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className={labelClass}>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info + Logout */}
      <div className="px-4 mt-auto border-t border-gray-800 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-gray-900 font-semibold shadow-inner shadow-yellow-500/30">
            {initials}
          </div>
          {isOpen && (
            <div className="transition-opacity duration-200">
              <div className="text-sm font-semibold text-white">
                {user?.name || "Unknown User"}
              </div>
              <div className="text-xs text-gray-300">
                {user?.role || "Guest"}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
          title="Log out"
        >
          <LogOut className="h-4 w-4" />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
