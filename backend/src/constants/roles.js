export const PARTICIPANT_ROLES = [
  "Student",
  "Faculty",
  "Staff",
  "Professor",
  "TA",
  "Vendor",
  "Admin",
  "Event Office",
];

export const DEFAULT_ALLOWED_ROLES = [
  "Student",
  "Faculty",
  "Staff",
  "Professor",
  "TA",
];

export const normalizeRoleName = (role) => {
  if (!role) return "";
  const value = String(role).trim().toLowerCase();
  if (value === "eventoffice" || value === "event office") return "Event Office";
  if (value === "admin") return "Admin";
  if (value === "student") return "Student";
  if (value === "faculty") return "Faculty";
  if (value === "staff") return "Staff";
  if (value === "professor" || value === "prof" || value === "prof.") {
    return "Professor";
  }
  if (
    value === "ta" ||
    value === "teaching assistant" ||
    value === "teachingassistant"
  ) {
    return "TA";
  }
  if (value === "vendor") return "Vendor";
  return role;
};

export const sanitizeAllowedRoles = (roles) => {
  if (roles == null) return null;
  if (!Array.isArray(roles)) {
    return sanitizeAllowedRoles([roles]);
  }
  const normalized = roles
    .map((role) => normalizeRoleName(role))
    .filter((role) => PARTICIPANT_ROLES.includes(role));
  if (!normalized.length) return null;
  return Array.from(new Set(normalized));
};

export const resolveAllowedRolesInput = (roles) =>
  sanitizeAllowedRoles(roles) ?? DEFAULT_ALLOWED_ROLES;

export const userHasRoleBypass = (role) => {
  const normalized = normalizeRoleName(role);
  return normalized === "Admin" || normalized === "Event Office";
};

const isBazaarLikeEvent = (event) => {
  const eventType = String(
    event?.type || event?.eventType || event?.category || ""
  )
    .trim()
    .toLowerCase();
  if (eventType.includes("bazaar")) return true;
  if (
    Object.prototype.hasOwnProperty.call(event || {}, "price2x2") ||
    Object.prototype.hasOwnProperty.call(event || {}, "price4x4")
  ) {
    return true;
  }
  if (Array.isArray(event?.vendorRequests)) return true;
  return false;
};

export const eventAllowsRole = (event, role) => {
  if (!event) return false;
  if (userHasRoleBypass(role)) return true;
  const normalizedRole = normalizeRoleName(role);
  if (!normalizedRole) return false;
  if (normalizedRole === "Vendor" && isBazaarLikeEvent(event)) {
    return true;
  }
  const list = Array.isArray(event.allowedRoles) && event.allowedRoles.length
    ? event.allowedRoles.map((value) => normalizeRoleName(value))
    : null;
  if (!list) return true;
  return list.includes(normalizedRole);
};

export const filterEventsForRole = (events = [], role, options = {}) => {
  if (userHasRoleBypass(role)) return events;
  const creatorId = options?.userId ? String(options.userId) : null;
  return events.filter((event) => {
    if (creatorId) {
      const createdBy =
        event?.createdBy?._id ||
        event?.createdBy?.id ||
        event?.createdBy ||
        event?.creatorId;
      if (createdBy && String(createdBy) === creatorId) {
        return true;
      }
    }
    return eventAllowsRole(event, role);
  });
};
