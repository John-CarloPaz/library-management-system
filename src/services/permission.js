// Centralized permission policy service
// Import and use these helpers across components and services to check permissions.

// Action constants - use these to avoid string typos across the app
export const ACTIONS = Object.freeze({
  ARCHIVE: 'archive',
  PRINT_QR: 'print_qr',
  CREATE: 'create',
  EDIT: 'edit',
  VIEW: 'view',
  DELETE: 'delete',
  NOTIF: 'notif',
});

// Policy map: action -> allowed roles
// Change these values to match your business rules. Roles are strings as stored in session.role
const POLICY = {
  [ACTIONS.ARCHIVE]: ['super_admin'],
  [ACTIONS.PRINT_QR]: ['super_admin', 'branch_admin'],
  [ACTIONS.CREATE]: ['super_admin', 'branch_admin'],
  [ACTIONS.EDIT]: ['super_admin', 'branch_admin', 'admin'],
  [ACTIONS.VIEW]: ['super_admin', 'branch_admin', 'admin'],
  [ACTIONS.DELETE]: ['super_admin'],
  [ACTIONS.NOTIF]: ['super_admin'],
};

const SESSION_KEY = 'app_session';

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function hasRole(role, allowedRoles = []) {
  if (!role) return false;
  // Super Admin bypass
  if (role === 'super_admin') return true;
  return allowedRoles.includes(role);
}

/**
 * Check whether the provided session (or current session) is allowed to perform action
 * @param {string} action - one of ACTIONS.*
 * @param {object|null} session - optional session object; if omitted we'll read from localStorage
 * @returns {boolean}
 */
export function can(action, session = null) {
  if (!action) return false;
  const allowed = POLICY[action];
  if (!allowed || !Array.isArray(allowed)) return false;
  const s = session || getSession();
  if (!s || !s.role) return false;
  // Standard role check
  if (hasRole(s.role, allowed)) return true;

  // Special-case: allow `admin` users with certain employee types to perform some actions
  // e.g., allow `admin` whose `employee_type` is `dean` to create procurement requests
  if (s.role === 'admin' && action === ACTIONS.CREATE) {
    if (s.employee_type === 'dean') return true;
  }

  return false;
}

/**
 * Convenience that throws or returns a boolean. Useful in services before performing an action.
 * @param {string} action
 * @param {object|null} session
 * @param {object} options - { throwOnFail: boolean }
 */
export function requirePermission(action, session = null, options = { throwOnFail: false }) {
  const allowed = can(action, session);
  if (!allowed && options.throwOnFail) {
    throw new Error(`Permission denied for action "${action}"`);
  }
  return allowed;
}

export function registerPolicy(action, roles = []) {
  if (!action) return;
  POLICY[action] = Array.isArray(roles) ? roles.slice() : [];
}

export default {
  ACTIONS,
  POLICY,
  getSession,
  hasRole,
  can,
  requirePermission,
  registerPolicy,
};
