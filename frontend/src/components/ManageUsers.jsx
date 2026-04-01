import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import DynamicTable from "./DynamicTable";
import {
  Search,
  GraduationCap,
  IdCard,
  Briefcase,
  Building2,
  AlertTriangle,
  RefreshCw,
  Users,
  Shield,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  Activity,
  TrendingUp,
  Filter,
  Eye,
  UserX,
  UserCheck
} from "lucide-react";

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [facultySubFilter, setFacultySubFilter] = useState("All");
  const [confirmModal, setConfirmModal] = useState(null);

  const formatStatusLabel = useCallback((status) => {
    const normalized = String(status || "").trim().toLowerCase();
    if (normalized === "blocked") return "Blocked";
    if (normalized === "pending") return "Pending";
    return "Active";
  }, []);

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/users/status");

      // Merge all user types into one array
      const allUsers = [
        ...(res.data.students || []).map((u) => ({
          _id: u._id,
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
          role: u.role,
          isVerified: u.isVerified ? "Yes" : "No",
          status: formatStatusLabel(u.status),
        })),
        ...(res.data.faculty || []).map((u) => ({
          _id: u._id,
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
          role: u.role,
          isVerified: u.isVerified ? "Yes" : "No",
          status: formatStatusLabel(u.status),
        })),
        ...(res.data.eventOffices || []).map((u) => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          isVerified: "Yes",
          status: formatStatusLabel(u.status),
        })),
        ...(res.data.vendors || []).map((u) => ({
          _id: u._id,
          name: u.companyName || "N/A",
          email: u.email,
          role: u.role,
          isVerified: u.isVerified ? "Yes" : "No",
          status: formatStatusLabel(u.status),
        })),
      ];

      setUsers(allUsers);
    } catch (err) {
      console.error("Fetch Error:", err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [formatStatusLabel]);

  // Handle block/unblock user
  const handleBlockUser = async (userId, currentStatus) => {
    console.log("handleBlockUser called with:", { userId, currentStatus });
    
    if (!userId) {
      toast.error("Invalid user ID");
      return;
    }
    
    try {
      const isCurrentlyBlocked = currentStatus === "Blocked";
      const endpoint = isCurrentlyBlocked 
        ? `/auth/users/${userId}/unblock` 
        : `/auth/users/${userId}/block`;
      
      console.log("Sending API request to:", endpoint);
      
      const response = await api.patch(endpoint);
      
      console.log("API Response:", response.data);
      
      toast.success(`User ${isCurrentlyBlocked ? "unblocked" : "blocked"} successfully`);
      
      setConfirmModal(null);
      // Refresh the users list
      await fetchUsers();
    } catch (err) {
      console.error("Block/Unblock Error:", err);
      console.error("Error Response:", err.response?.data);
      toast.error(err.response?.data?.message || "Failed to update user status");
    }
  };

  const openBlockConfirmation = (user) => {
    const isBlocked = user.status === "Blocked";
    setConfirmModal({
      user,
      isBlocked,
      action: isBlocked ? "unblock" : "block",
    });
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (activeFilter !== "Faculty") {
      setFacultySubFilter("All");
    }
  }, [activeFilter]);

  // Define role metadata
  const roleMeta = useMemo(
    () => [
      {
        value: "Student",
        label: "Students",
        description: "Undergraduate & postgraduate community members.",
        icon: GraduationCap,
        color: "blue",
      },
      {
        value: "Faculty",
        label: "Faculty",
        description: "Professors, teaching assistants, and academic staff.",
        icon: IdCard,
        color: "purple",
      },
      {
        value: "Event Office",
        label: "Event Office",
        description: "Campus event operations & approvals.",
        icon: Building2,
        color: "green",
      },
      {
        value: "Vendor",
        label: "Vendors",
        description: "External partners and booth owners.",
        icon: Briefcase,
        color: "amber",
      },
    ],
    []
  );

  const summary = useMemo(() => {
    const map = roleMeta.reduce(
      (acc, role) => ({ ...acc, [role.value]: 0 }),
      {}
    );
    users.forEach((user) => {
      if (["Professor", "TA", "Staff"].includes(user.role)) {
        map["Faculty"] = (map["Faculty"] || 0) + 1;
      } else if (map[user.role] !== undefined) {
        map[user.role] += 1;
      }
    });
    return map;
  }, [users, roleMeta]);

  // Calculate additional statistics
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === "Active").length,
    blockedUsers: users.filter(u => u.status === "Blocked").length,
    verifiedUsers: users.filter(u => u.isVerified === "Yes").length,
  };

  const filteredUsers = users.filter((userItem) => {
    const matchesRole =
      activeFilter === "All" ||
      userItem.role === activeFilter ||
      (activeFilter === "Faculty" && ["Professor", "TA", "Staff"].includes(userItem.role));
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      [userItem.name, userItem.email]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query));
    return matchesRole && matchesSearch;
  });

  // Enhanced table columns with icons
  const roleColumns = [
    { 
      key: "name", 
      label: "Name",
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <span className="font-semibold text-white">{v}</span>
        </div>
      )
    },
    { 
      key: "email", 
      label: "Email",
      render: (v) => (
        <span className="text-gray-300">{v}</span>
      )
    },
    { 
      key: "role", 
      label: "Role",
      render: (v) => {
        const colorMap = {
          Student: "blue",
          Professor: "purple",
          TA: "purple",
          Staff: "purple",
          "Event Office": "green",
          Vendor: "amber",
        };
        const color = colorMap[v] || "gray";
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>
            {v}
          </span>
        );
      }
    },
    { 
      key: "isVerified", 
      label: "Verified",
      render: (v) => (
        <div className="flex items-center gap-1.5">
          {v === "Yes" ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-400">Verified</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-sm text-red-400">Unverified</span>
            </>
          )}
        </div>
      )
    },
    { 
      key: "status", 
      label: "Status",
      render: (v) => {
        const statusConfig = {
          Active: { color: "green", icon: CheckCircle },
          Blocked: { color: "red", icon: XCircle },
          Pending: { color: "yellow", icon: Activity },
        };
        const config = statusConfig[v] || { color: "gray", icon: Activity };
        const Icon = config.icon;
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-${config.color}-500/10 text-${config.color}-400 border border-${config.color}-500/20`}>
            <Icon className="h-3 w-3" />
            {v}
          </span>
        );
      }
    },
    {
      key: "manage",
      label: "Actions",
      render: (value, row) => {
        if (!row?._id) return <span className="text-red-400">Error</span>;
        const isBlocked = row.status === "Blocked";
        return (
          <button
            onClick={() => openBlockConfirmation(row)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-white transition-all duration-200 ${
              isBlocked
                ? "bg-green-600 hover:bg-green-500"
                : "bg-red-600 hover:bg-red-500"
            }`}
          >
            {isBlocked ? (
              <>
                <Unlock className="h-3.5 w-3.5" />
                Unblock
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                Block
              </>
            )}
          </button>
        );
      },
    },
  ];

  const visibleRoles =
    activeFilter === "All"
      ? roleMeta.map((role) => role.value)
      : [activeFilter];

  const getColorClasses = (color) => {
    const colorMap = {
      blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
      purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
      green: "bg-green-500/10 border-green-500/20 text-green-400",
      amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    };
    return colorMap[color] || "bg-gray-500/10 border-gray-500/20 text-gray-400";
  };

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
                  User Management
                </h2>
              </div>
            </div>
            <p className="text-base text-gray-400 ml-15">
              Monitor verification status, manage access permissions, and moderate user accounts.
            </p>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 px-5 py-2.5 font-medium text-white transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Role Distribution Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {roleMeta.map(({ value, label, description, icon: Icon, color }) => (
          <div
            key={value}
            className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 shadow-lg hover:shadow-xl hover:border-gray-700 transition-all duration-300"
          >
            <div className="flex items-start gap-4 mb-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${getColorClasses(color)} border group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  {label}
                </p>
                <p className="text-3xl font-bold text-white">
                  {summary[value] ?? 0}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
        ))}
      </div>

      {/* Enhanced Search and Filter Section */}
      <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 p-6 mb-6 shadow-lg">
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <Search className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email address..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Role Filters */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                Filter by Role
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["All", ...roleMeta.map((role) => role.value)].map((role) => (
                <button
                  key={role}
                  onClick={() => setActiveFilter(role)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    activeFilter === role
                      ? "bg-yellow-500 text-gray-900 shadow-lg shadow-yellow-500/20"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* User Tables by Role */}
      {loading ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-500"></div>
            <p className="text-gray-400 font-medium">Loading users...</p>
          </div>
        </div>
      ) : (
        visibleRoles.map((roleKey) => {
          const roleInfo = roleMeta.find((role) => role.value === roleKey);
          if (!roleInfo) return null;

          let roleUsers = filteredUsers.filter((user) => {
            if (roleKey === "Faculty") {
              return ["Professor", "TA", "Staff"].includes(user.role);
            }
            return user.role === roleKey;
          });

          if (roleKey === "Faculty" && facultySubFilter !== "All") {
            roleUsers = roleUsers.filter((user) => user.role === facultySubFilter);
          }

          const Icon = roleInfo.icon;

          return (
            <section
              key={roleKey}
              className="mb-6 rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg"
            >
              <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${getColorClasses(roleInfo.color)} border`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {roleInfo.label}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {roleUsers.length} account{roleUsers.length === 1 ? "" : "s"} in this category
                      </p>
                    </div>
                  </div>

                  {roleKey === "Faculty" && (
                    <div className="flex flex-wrap gap-2">
                      {["All", "Professor", "TA", "Staff"].map((subRole) => (
                        <button
                          key={subRole}
                          onClick={() => setFacultySubFilter(subRole)}
                          className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                            facultySubFilter === subRole
                              ? "bg-yellow-500 text-gray-900"
                              : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                          }`}
                        >
                          {subRole}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {roleUsers.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800">
                      <Eye className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">No Users Found</p>
                      <p className="text-xs text-gray-400">
                        No users match the selected filters for this role
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <DynamicTable
                  columns={roleColumns}
                  data={roleUsers}
                  hideActions
                />
              )}
            </section>
          );
        })
      )}

      {/* Enhanced Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setConfirmModal(null)}
          />
          <div className="relative w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  confirmModal.isBlocked 
                    ? 'bg-green-500/10 border border-green-500/20' 
                    : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  {confirmModal.isBlocked ? (
                    <UserCheck className="h-5 w-5 text-green-400" />
                  ) : (
                    <UserX className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-white">
                  {confirmModal.isBlocked ? "Unblock User" : "Block User"}
                </h3>
              </div>
              <button
                onClick={() => setConfirmModal(null)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              <p className="text-sm text-gray-300 mb-4">
                {confirmModal.isBlocked
                  ? "Are you sure you want to restore access for this user? They will be able to use the platform immediately."
                  : "Are you sure you want to block this user? This will prevent them from accessing the platform."}
              </p>

              {/* User Details Card */}
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4 mb-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">User Name</p>
                    <p className="text-white font-semibold text-lg">{confirmModal.user.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <IdCard className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Role</p>
                    <p className="text-sm text-gray-200">{confirmModal.user.role}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
                    <Activity className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Email</p>
                    <p className="text-sm text-gray-200">{confirmModal.user.email}</p>
                  </div>
                </div>
              </div>

              {/* Warning Message */}
              {!confirmModal.isBlocked && (
                <><div className="flex items-start gap-3 rounded-xl bg-red-900/20 border border-red-800/30 p-4"></div><AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" /><div>
                  <p className="text-sm font-semibold text-red-300 mb-1">Warning</p>
                  <p className="text-sm text-red-200">
                    This action will immediately prevent the user from accessing the platform. They will be logged out and unable to sign in.
                  </p>
                </div></>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-700 px-6 py-4">
              <button
                onClick={() => setConfirmModal(null)}
                className="rounded-xl bg-gray-700 hover:bg-gray-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBlockUser(confirmModal.user._id, confirmModal.user.status)}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 ${
                  confirmModal.isBlocked
                    ? "bg-green-600 hover:bg-green-500"
                    : "bg-red-600 hover:bg-red-500"
                }`}
              >
                {confirmModal.isBlocked ? (
                  <>
                    <Unlock className="h-4 w-4" />
                    Unblock User
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Block User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
