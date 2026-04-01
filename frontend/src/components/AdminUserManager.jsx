import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/axios";
import { toast } from "react-hot-toast";
import DynamicTable from "./DynamicTable";
import DynamicModal from "./DynamicModal";
import { useAuth } from "../context/AuthContext";
import {
  Shield,
  Building2,
  Search, 
  AlertTriangle,
  UserPlus,
  RefreshCw,
  Users,
  Lock,
  Mail,
  Eye,
  Trash2,
  XCircle,
  Activity,
  TrendingUp,
  Zap
} from "lucide-react";

export default function AdminManager() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
  });

  const fields = [
    {
      name: "name",
      type: "text",
      placeholder: "Enter full name",
      label: "Name",
      required: true,
    },
    {
      name: "email",
      type: "email",
      placeholder: "Enter email address",
      label: "Email",
      required: true,
    },
    {
      name: "password",
      type: "password",
      placeholder: "Enter password",
      label: "Password",
      required: true,
    },
    {
      name: "role",
      type: "select",
      label: "Role",
      required: true,
      options: [
        { value: "", label: "Select Role" },
        { value: "admin", label: "Admin" },
        { value: "eventOffice", label: "Event Office" },
      ],
    },
  ];

  // Fetch all admins + event offices
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/admins");
      const merged = [
        ...res.data.admins.map((a) => ({ ...a, type: "Admin" })),
        ...res.data.eventOffices.map((e) => ({ ...e, type: "Event Office" })),
      ];
      setUsers(merged);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle form submission
  const handleCreate = async (formData) => {
    try {
      const endpoint =
        formData.role === "admin"
          ? "/auth/create-admin"
          : "/auth/create-event-office";
      await api.post(endpoint, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      toast.success(`${formData.role} created successfully`);
      setForm({ name: "", email: "", password: "", role: "" });
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create user");
    }
  };

  // Open delete confirmation modal
  const handleDelete = (id) => {
    const currentUserId = currentUser?._id || currentUser?.id;
    if (currentUserId && String(currentUserId) === String(id)) {
      toast.error("You cannot remove your own account.");
      return;
    }
    const targetUser = users.find((u) => u._id === id);
    if (!targetUser) return;
    setUserToDelete(targetUser);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!userToDelete) return;
    const currentUserId = currentUser?._id || currentUser?.id;
    if (currentUserId && String(currentUserId) === String(userToDelete._id)) {
      toast.error("You cannot remove your own account.");
      setShowDeleteModal(false);
      setUserToDelete(null);
      return;
    }
    try {
      const endpoint =
        userToDelete.type === "Admin"
          ? `/auth/delete-admin/${userToDelete._id}`
          : `/auth/delete-event-office/${userToDelete._id}`;
      await api.delete(endpoint);
      toast.success(`${userToDelete.type} deleted successfully`);
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete user");
    }
  };

  // Define enhanced table columns
  const columns = [
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
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-400" />
          <span className="text-gray-300">{v}</span>
        </div>
      )
    },
    { 
      key: "type", 
      label: "Type",
      render: (v) => {
        const colorMap = {
          Admin: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", icon: Shield },
          "Event Office": { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20", icon: Building2 },
        };
        const config = colorMap[v] || { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/20", icon: Users };
        const Icon = config.icon;
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.bg} ${config.text} border ${config.border}`}>
            <Icon className="h-3 w-3" />
            {v}
          </span>
        );
      }
    },
  ];

  const roleMeta = useMemo(
    () => [
      {
        value: "Admin",
        label: "Admins",
        description: "Full platform access & governance.",
        icon: Shield,
        color: "purple",
      },
      {
        value: "Event Office",
        label: "Event Office",
        description: "Manage events, vendors & logistics.",
        icon: Building2,
        color: "green",
      },
    ],
    []
  );

  const summary = useMemo(() => {
    const map = {};
    roleMeta.forEach((r) => (map[r.value] = 0));
    users.forEach((u) => {
      if (map[u.type] !== undefined) map[u.type] += 1;
    });
    return map;
  }, [users, roleMeta]);

  const stats = useMemo(() => {
    return {
      totalUsers: users.length,
      admins: summary["Admin"] || 0,
      eventOffices: summary["Event Office"] || 0,
    };
  }, [users, summary]);

  const filteredUsers = users.filter((userItem) => {
    const matchesRole =
      activeFilter === "All" || userItem.type === activeFilter;
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      [userItem.name, userItem.email]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query));
    return matchesRole && matchesSearch;
  });

  const visibleRoles =
    activeFilter === "All" ? roleMeta.map((r) => r.value) : [activeFilter];

  const getColorClasses = (color) => {
    const colorMap = {
      purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
      green: "bg-green-500/10 border-green-500/20 text-green-400",
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
                  Admin & Event Office Manager
                </h2>
              </div>
            </div>
            <p className="text-base text-gray-400 ml-15">
              Create, manage, and organize privileged platform accounts.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 px-5 py-2.5 font-medium text-white transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => {
                setForm({ name: "", email: "", password: "", role: "" });
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 px-5 py-2.5 font-semibold text-gray-900 shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 hover:scale-105 transition-all duration-200"
            >
              <UserPlus className="h-4 w-4" />
              New Account
            </button>
          </div>
        </div>
      </div>
      
      {/* Role Distribution Cards */}
      <div className="grid gap-5 sm:grid-cols-2 mb-6">
        {roleMeta.map(({ value, label, icon: Icon, description, color }) => (
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
              <Activity className="h-4 w-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                Filter by Role
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["All", ...roleMeta.map((r) => r.value)].map((role) => (
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

          {/* Results Counter */}
          <div className="flex items-center gap-2 text-sm text-gray-400 pt-2 border-t border-gray-700/50">
            <TrendingUp className="h-4 w-4" />
            <span>
              Showing <span className="font-semibold text-white">{filteredUsers.length}</span> of{" "}
              <span className="font-semibold text-white">{users.length}</span> users
            </span>
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
          const roleInfo = roleMeta.find((r) => r.value === roleKey);
          const roleUsers = filteredUsers.filter((u) => u.type === roleKey);

          if (!roleInfo) return null;

          const Icon = roleInfo.icon;

          return (
            <section
              key={roleKey}
              className="mb-6 rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-900/40 overflow-hidden shadow-lg"
            >
              <div className="border-b border-gray-700 bg-gray-900/50 px-6 py-4">
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
                  columns={columns}
                  data={roleUsers}
                  onDelete={handleDelete}
                  hideTitle
                />
              )}
            </section>
          );
        })
      )}

      {/* Create User Modal */}
      {showModal && (
        <DynamicModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setForm({ name: "", email: "", password: "", role: "" });
          }}
          title="Create New User"
          onSubmit={handleCreate}
          fields={fields}
          formState={form}
          setFormState={setForm}
          submitLabel="Create"
        />
      )}

      {/* Enhanced Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowDeleteModal(false);
              setUserToDelete(null);
            }}
          />
          <div className="relative w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Confirm Deletion</h3>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              <p className="text-sm text-gray-300 mb-4">
                Are you sure you want to delete the following user? This action cannot be undone.
              </p>

              {/* User Details Card */}
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4 mb-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Name</p>
                    <p className="text-white font-semibold">{userToDelete.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
                    <Mail className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Email</p>
                    <p className="text-sm text-gray-200">{userToDelete.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                    {userToDelete.type === "Admin" ? (
                      <Shield className="h-5 w-5 text-purple-400" />
                    ) : (
                      <Building2 className="h-5 w-5 text-green-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Type</p>
                    <p className="text-sm font-semibold text-purple-400">{userToDelete.type}</p>
                  </div>
                </div>
              </div>

              {/* Warning Message */}
              <div className="rounded-xl bg-red-900/20 border border-red-800/30 px-4 py-3 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-300 mb-1">Warning</p>
                  <p className="text-sm text-red-200">
                    This will permanently remove the user's access to the platform. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-700 px-6 py-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="rounded-xl bg-gray-700 hover:bg-gray-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200"
              >
                <Trash2 className="h-4 w-4" />
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
