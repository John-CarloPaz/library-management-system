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
  [ACTIONS.ARCHIVE]: ['Super Admin'],
  [ACTIONS.PRINT_QR]: ['Super Admin', 'Admin'],
  [ACTIONS.CREATE]: ['Super Admin', 'Admin'],
  [ACTIONS.EDIT]: ['Super Admin', 'Admin'],
  [ACTIONS.VIEW]: ['Super Admin', 'Admin', 'User'],
  [ACTIONS.DELETE]: ['Super Admin'],
  [ACTIONS.NOTIF]: ['Super Admin'],
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
  if (role === 'Super Admin') return true;
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
  return hasRole(s.role, allowed);
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
