import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import DynamicModal from "./DynamicModal";
import { 
  Search, 
  Users, 
  UserPlus, 
  Clock3, 
  CheckCircle,
  XCircle,
  Shield,
  Activity,
  RefreshCw,
  Filter,
  TrendingUp,
  Calendar,
  Mail,
  IdCard,
  Award,
  AlertCircle,
  Eye
} from "lucide-react";

export default function RegistrationManager() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState({}); // { userId: "Staff" | "TA" | "Professor" }
  const [searchTerm, setSearchTerm] = useState("");

  // Format date to relative time
  const formatRelativeTime = useCallback((dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 30) {
      const diffInMonths = Math.floor(diffInDays / 30);
      return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
    } else if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
    } else {
      return "Just now";
    }
  }, []);

  // Fetch pending users
  const fetchPendingUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/pending-users");
      const usersWithFormattedDate = (res.data.pendingUsers || []).map((user) => ({
        ...user,
        formattedDate: formatRelativeTime(user.createdAt),
      }));
      setPendingUsers(usersWithFormattedDate);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load pending users");
    } finally {
      setLoading(false);
    }
  }, [formatRelativeTime]);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  // Handle role selection
  const handleRoleSelect = (userId, role) => {
    setSelectedRoles((prev) => {
      // If clicking the same role, unselect it
      if (prev[userId] === role) {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      }
      // Otherwise, select the new role
      return { ...prev, [userId]: role };
    });
  };

  // Open approval confirmation modal
  const handleApproveClick = (user) => {
    const role = selectedRoles[user._id];
    if (!role) {
      toast.error("Please select a role first");
      return;
    }
    setSelectedUser(user);
    setShowModal(true);
  };

  // Confirm approval
  const handleConfirmApproval = async () => {
    try {
      if (!selectedUser?._id) {
        toast.error("No user selected");
        return;
      }
      const role = selectedRoles[selectedUser._id];
      if (!role) {
        toast.error("No role selected");
        return;
      }
      await api.post(`/auth/approve/${selectedUser._id}`, {
        role: role,
      });
      toast.success(
        `${selectedUser.firstName} ${selectedUser.lastName} approved as ${role}`
      );
      setShowModal(false);
      setSelectedUser(null);
      // Remove from selected roles
      setSelectedRoles((prev) => {
        const updated = { ...prev };
        delete updated[selectedUser._id];
        return updated;
      });
      fetchPendingUsers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve user");
    }
  };

  const stats = useMemo(() => {
    const total = pendingUsers.length;
    const last24h = pendingUsers.filter((user) => {
      const created = new Date(user.createdAt).getTime();
      return Date.now() - created <= 24 * 60 * 60 * 1000;
    }).length;
    const oldest =
      pendingUsers.length > 0
        ? pendingUsers.reduce((acc, user) =>
            new Date(user.createdAt) < new Date(acc.createdAt) ? user : acc
          )
        : null;
    
    // Calculate role distribution
    const roleDistribution = pendingUsers.reduce((acc, user) => {
      const role = selectedRoles[user._id];
      if (role) {
        acc[role] = (acc[role] || 0) + 1;
      }
      return acc;
    }, {});

    const readyToApprove = Object.keys(selectedRoles).length;

    return {
      total,
      last24h,
      readyToApprove,
      oldestLabel: oldest ? formatRelativeTime(oldest.createdAt) : "N/A",
      roleDistribution,
    };
  }, [pendingUsers, formatRelativeTime, selectedRoles]);

  const filteredUsers = pendingUsers.filter((user) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return [user.firstName, user.lastName, user.email, user.UniId]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(query));
  });

  const roles = [
    { 
      value: "Staff", 
      label: "Staff", 
      icon: Users,
      color: "blue",
      description: "Administrative support staff"
    },
    { 
      value: "TA", 
      label: "Teaching Assistant", 
      icon: Award,
      color: "purple",
      description: "Graduate teaching assistants"
    },
    { 
      value: "Professor", 
      label: "Professor", 
      icon: Shield,
      color: "amber",
      description: "Faculty professors"
    },
  ];

  return (
    <div className="p-6 text-white">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-800 rounded-3xl p-8 mb-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                <Shield className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                  Faculty Registration Manager
                </h2>
              </div>
            </div>
            <p className="text-base text-gray-400 ml-15">
              Review pending faculty applications and assign appropriate academic roles.
            </p>
          </div>
          <button
            onClick={fetchPendingUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 px-5 py-2.5 font-medium text-white transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
              <Users className="h-7 w-7 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                Awaiting Review
              </p>
              <p className="text-3xl font-bold text-white mb-1">{stats.total}</p>
              <p className="text-sm text-gray-400">Pending registrations</p>
            </div>
          </div>
        </div>

        <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20 group-hover:scale-110 transition-transform duration-300">
              <UserPlus className="h-7 w-7 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                Last 24 Hours
              </p>
              <p className="text-3xl font-bold text-white mb-1">{stats.last24h}</p>
              <p className="text-sm text-gray-400">New applications</p>
            </div>
          </div>
        </div>

        <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="h-7 w-7 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                Ready to Approve
              </p>
              <p className="text-3xl font-bold text-white mb-1">{stats.readyToApprove}</p>
              <p className="text-sm text-gray-400">Roles assigned</p>
            </div>
          </div>
        </div>

        <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
              <Clock3 className="h-7 w-7 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                Oldest Request
              </p>
              <p className="text-xl font-bold text-white mb-1">{stats.oldestLabel}</p>
              <p className="text-sm text-gray-400">Waiting time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Search Bar */}
      <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-5 mb-6 shadow-lg">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <Search className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or university ID..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Activity className="h-4 w-4" />
            <span>
              Showing <span className="font-semibold text-white">{filteredUsers.length}</span> of{" "}
              <span className="font-semibold text-white">{pendingUsers.length}</span> requests
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-500"></div>
            <p className="text-gray-400 font-medium">Loading pending registrations...</p>
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <Eye className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {pendingUsers.length === 0 ? "No Pending Registrations" : "No Results Found"}
              </h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                {pendingUsers.length === 0 
                  ? "There are currently no pending faculty registrations to review."
                  : "No registrations match your search criteria. Try adjusting your search terms."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredUsers.map((user) => {
            const selectedRole = selectedRoles[user._id];
            const roleInfo = roles.find(r => r.value === selectedRole);
            
            return (
              <article
                key={user._id}
                className="group rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300"
              >
                {/* Card Header */}
                <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
                        <Users className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">
                          {user.firstName} {user.lastName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {user.email}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <IdCard className="h-3.5 w-3.5" />
                            ID: {user.UniId || "N/A"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            Registered {user.formattedDate}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {selectedRole && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Role Selected
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                        Select Faculty Role
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {roles.map((role) => {
                        const isSelected = selectedRoles[user._id] === role.value;
                        const RoleIcon = role.icon;
                        const colorClasses = {
                          blue: isSelected 
                            ? "bg-blue-600 border-blue-500 ring-2 ring-blue-400/50" 
                            : "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20",
                          purple: isSelected 
                            ? "bg-purple-600 border-purple-500 ring-2 ring-purple-400/50" 
                            : "bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20",
                          amber: isSelected 
                            ? "bg-amber-600 border-amber-500 ring-2 ring-amber-400/50" 
                            : "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20",
                        };

                        return (
                          <button
                            key={role.value}
                            onClick={() => handleRoleSelect(user._id, role.value)}
                            className={`group/role relative rounded-xl border p-4 text-left transition-all duration-200 ${colorClasses[role.color]}`}
                          >
                            <div className="flex items-start gap-3 mb-2">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                isSelected 
                                  ? "bg-white/20" 
                                  : `bg-${role.color}-500/20`
                              } flex-shrink-0`}>
                                <RoleIcon className={`h-5 w-5 ${
                                  isSelected 
                                    ? "text-white" 
                                    : `text-${role.color}-400`
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold mb-1 ${
                                  isSelected ? "text-white" : `text-${role.color}-400`
                                }`}>
                                  {role.label}
                                </p>
                                <p className={`text-xs ${
                                  isSelected ? "text-white/80" : "text-gray-400"
                                }`}>
                                  {role.description}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="flex items-center gap-1 text-xs text-white/90">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Selected
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-end pt-4 border-t border-gray-700/50">
                    <button
                      onClick={() => handleApproveClick(user)}
                      disabled={!selectedRoles[user._id]}
                      className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all duration-200 ${
                        selectedRoles[user._id]
                          ? "bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105"
                          : "bg-gray-800 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      {selectedRoles[user._id] ? "Approve Registration" : "Select Role First"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Enhanced Approval Confirmation Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowModal(false);
              setSelectedUser(null);
            }}
          />
          <div className="relative w-full max-w-lg bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl">
            {/* Modal Header */}
            <div className="border-b border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 border border-green-500/20">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Confirm Approval</h3>
                    <p className="text-sm text-gray-400">Verify registration details</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedUser(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              <p className="text-sm text-gray-300 mb-5">
                You are about to approve the following faculty member and grant them access to the platform:
              </p>

              {/* User Details Card */}
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-5 mb-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Full Name</p>
                    <p className="text-white font-semibold text-lg">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
                    <Mail className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Email Address</p>
                    <p className="text-sm text-gray-200">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <IdCard className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">University ID</p>
                    <p className="text-sm text-gray-200">{selectedUser.UniId || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Shield className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Assigned Role</p>
                    <p className="text-lg font-bold text-amber-400">
                      {selectedRoles[selectedUser._id]}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Message */}
              <div className="rounded-xl bg-green-900/20 border border-green-800/30 px-4 py-3 flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-300 mb-1">Ready to Approve</p>
                  <p className="text-sm text-green-200">
                    This user will gain immediate access to the platform with {selectedRoles[selectedUser._id]} privileges.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-700 px-6 py-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedUser(null);
                }}
                className="rounded-xl bg-gray-700 hover:bg-gray-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-200"
              >
                <CheckCircle className="h-4 w-4" />
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
