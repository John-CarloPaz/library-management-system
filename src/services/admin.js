/**
 * Admin Service
 * Handles all admin-related operations (create, edit, list, view)
 * Communicates with Laravel backend endpoints
 */

import { getAxiosInstance } from './auth'

// API endpoints
const API_ENDPOINTS = {
  LIST: '/users/list-admins',
  VIEW: '/users/view-admin',
  CREATE: '/users/create-admin',
  EDIT: '/users/edit-admin',
}

/**
 * Get the configured axios instance (from auth service)
 * @returns {object}
 */
const getApi = () => {
  try {
    return getAxiosInstance()
  } catch (e) {
    // Axios instance not available yet, this will trigger fallback
    throw new Error('Axios not initialized')
  }
}

// Cache for admin data (in-memory, faster than API calls)
let adminsCache = null
let adminsCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds
const individualAdminCache = {} // Cache individual admins by ID

/**
 * Check if cache is still valid
 * @returns {boolean}
 */
function isCacheValid() {
  return adminsCache && (Date.now() - adminsCacheTime < CACHE_DURATION)
}

/**
 * Clear all caches (call after create/update operations)
 */
function clearCache() {
  adminsCache = null
  adminsCacheTime = 0
}

/**
 * Internal helper to fetch admins with backend ListQueryService filters.
 *
 * Backend semantics:
 * - status = role (super_admin | branch_admin | admin)
 * - is_active = true|false (active flag)
 * - count/per_page for pagination.
 */
async function fetchAdmins({ status, is_active, count = 'all', page, perPage } = {}) {
  const response = await getApi().get(API_ENDPOINTS.LIST, {
    params: {
      status,
      is_active,
      count,
      page,
      per_page: perPage,
    },
  })

  let data = response.data

  if (data.users && Array.isArray(data.users)) {
    data = data.users
  } else if (data.data && Array.isArray(data.data)) {
    data = data.data
  } else if (!Array.isArray(data)) {
    data = []
  }

  return data
}

/**
 * Paginated helper for server-side tables.
 * Returns an object with the current page of admins and the total count.
 */
export async function fetchAdminsPage(opts = {}) {
  const { page = 1, itemsPerPage = 10, status, is_active, ...rest } = opts || {}
  const params = {
    ...rest,
    status,
    is_active,
    page,
    per_page: itemsPerPage,
  }

  const response = await getApi().get(API_ENDPOINTS.LIST, { params })

  const payload = response.data || {}

  let rows = []
  let total = 0

  if (payload.users) {
    const container = payload.users
    if (Array.isArray(container)) {
      rows = container
      total = rows.length
    } else if (Array.isArray(container.data)) {
      rows = container.data
      total = typeof container.total === 'number' ? container.total : rows.length
    }
  } else if (Array.isArray(payload.data)) {
    rows = payload.data
    total = rows.length
  } else if (Array.isArray(payload)) {
    rows = payload
    total = rows.length
  }

  const items = rows
  if (!total) {
    total = items.length
  }

  return { items, total }
}

// Legacy listAdmins/listAdminsFiltered helpers removed in favor of paginated fetchAdminsPage

/**
 * Get a single admin by ID
 * GET /users/view-admin/{id}
 * @param {number|string} id - Admin ID
 * @param {boolean} forceRefresh - Force refresh from API, ignore cache
 * @returns {Promise<object>}
 */
export async function getAdmin(id, forceRefresh = false) {
  if (!id) {
    throw new Error('Admin ID is required')
  }

  // Check individual admin cache first
  if (!forceRefresh && individualAdminCache[id]) {
    console.log('Returning cached admin', id)
    return individualAdminCache[id]
  }

  // Check if admin is in the main list cache
  if (!forceRefresh && isCacheValid() && adminsCache) {
    const cachedAdmin = adminsCache.find(a => a.id === parseInt(id) || a.id === id)
    if (cachedAdmin) {
      console.log('Found admin', id, 'in list cache')
      individualAdminCache[id] = cachedAdmin
      return cachedAdmin
    }
  }

  try {
    const response = await getApi().get(`${API_ENDPOINTS.VIEW}/${id}`)
    // Handle different response formats
    let data = response.data
    
    // Check for "user" key
    if (data.user && typeof data.user === 'object') {
      data = data.user
    }
    // Check for "data" key
    else if (data.data && typeof data.data === 'object') {
      data = data.data
    }
    
    data = data || {}
    
    // Cache the individual admin
    individualAdminCache[id] = data
    console.log('Admin', id, 'loaded from API and cached')
    
    return data
  } catch (error) {
    console.error(`Failed to fetch admin ${id}:`, error)
    throw new Error(error.response?.data?.message || `Failed to fetch admin ${id}`)
  }
}

/**
 * Create a new admin
 * POST /users/create-admin
 * @param {object} adminData - {
 *   username: string,
 *   email: string,
 *   password: string,
 *   first_name: string,
 *   last_name: string,
 *   middle_name?: string,
 *   suffix?: string,
 *   employee_id?: string,
 *   employee_type: string (dean|administrator|assistant|chief_librarian),
 *   role: string (super_admin|branch_admin|admin),
 *   branch_id: number,
 *   is_active?: boolean
 * }
 * @returns {Promise<object>}
 */
export async function createAdmin(adminData) {
  // Validate required fields
  const required = ['username', 'email', 'password', 'first_name', 'last_name', 'role', 'branch_id']
  const missing = required.filter(field => !adminData[field])

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`)
  }

  try {
    const response = await getApi().post(API_ENDPOINTS.CREATE, adminData)
    // Handle different response formats
    let data = response.data
    
    // Check for "user" key
    if (data.user && typeof data.user === 'object') {
      data = data.user
    }
    // Check for "data" key
    else if (data.data && typeof data.data === 'object') {
      data = data.data
    }
    
    data = data || {}
    
    // Clear cache after creating new admin
    clearCache()
    console.log('Cache cleared after admin creation')
    
    return data
  } catch (error) {
    console.error('Failed to create admin:', error)
    // Handle validation errors from backend
    if (error.response?.data?.errors) {
      const errors = error.response.data.errors
      const errorMessages = Object.entries(errors)
        .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
        .join('\n')
      throw new Error(errorMessages)
    }
    throw new Error(error.response?.data?.message || 'Failed to create admin')
  }
}

/**
 * Update an existing admin
 * POST /users/edit-admin/{id}
 * @param {number|string} id - Admin ID
 * @param {object} adminData - Fields to update (all optional)
 * @returns {Promise<object>}
 */
export async function updateAdmin(id, adminData) {
  if (!id) {
    throw new Error('Admin ID is required')
  }

  // Ensure at least one field is provided
  if (!adminData || Object.keys(adminData).length === 0) {
    throw new Error('At least one field must be provided for update')
  }

  try {
    const response = await getApi().post(`${API_ENDPOINTS.EDIT}/${id}`, adminData)
    // Handle different response formats
    let data = response.data
    
    // Check for "user" key
    if (data.user && typeof data.user === 'object') {
      data = data.user
    }
    // Check for "data" key
    else if (data.data && typeof data.data === 'object') {
      data = data.data
    }
    
    data = data || {}
    
    // Update cache with new data instead of clearing
    // Update individual admin cache
    individualAdminCache[id] = data
    
    // Update admin in list cache if it exists
    if (isCacheValid() && adminsCache) {
      const adminIndex = adminsCache.findIndex(a => a.id === parseInt(id) || a.id === id)
      if (adminIndex !== -1) {
        adminsCache[adminIndex] = data
      }
    }
    
    console.log('Admin', id, 'updated in cache')
    
    return data
  } catch (error) {
    console.error(`Failed to update admin ${id}:`, error)
    // Handle validation errors from backend
    if (error.response?.data?.errors) {
      const errors = error.response.data.errors
      const errorMessages = Object.entries(errors)
        .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
        .join('\n')
      throw new Error(errorMessages)
    }
    throw new Error(error.response?.data?.message || `Failed to update admin ${id}`)
  }
}

/**
 * Utility: Format admin data for display
 * @param {object} admin
 * @returns {object}
 */
export function formatAdminForDisplay(admin) {
  if (!admin) return {}

  return {
    ...admin,
    // Format role for display
    role_display: (admin.role || '').replace(/_/g, ' ').toUpperCase(),
    // Format name
    full_name: [admin.first_name, admin.middle_name, admin.last_name]
      .filter(Boolean)
      .join(' '),
    // Format dates
    created_at_display: admin.created_at ? new Date(admin.created_at).toLocaleDateString() : null,
    updated_at_display: admin.updated_at ? new Date(admin.updated_at).toLocaleDateString() : null,
  }
}

/**
 * Utility: Validate admin data on client before sending
 * @param {object} adminData
 * @returns {object} - { isValid: boolean, errors: object }
 */
export function validateAdmin(adminData) {
  const errors = {}

  // Username: required|string|max:255
  if (!adminData.username || !adminData.username.toString().trim()) {
    errors.username = ['Username is required']
  } else if (adminData.username.toString().length > 255) {
    errors.username = ['Username must be at most 255 characters']
  }

  // Email: required|string|email|max:255|unique:users
  if (!adminData.email || !adminData.email.toString().trim()) {
    errors.email = ['Email is required']
  } else if (adminData.email.toString().length > 255) {
    errors.email = ['Email must be at most 255 characters']
  } else if (!/^\S+@\S+\.\S+$/.test(adminData.email)) {
    errors.email = ['Email format is invalid']
  }
  // Note: unique:users validation is done by backend

  // Password: required|string|min:8
  if (adminData.password !== undefined) {
    if (!adminData.password) {
      errors.password = ['Password is required']
    } else if (adminData.password.toString().length < 8) {
      errors.password = ['Password must be at least 8 characters']
    }
  }

  // First name: required|string|max:100
  if (!adminData.first_name || !adminData.first_name.toString().trim()) {
    errors.first_name = ['First name is required']
  } else if (adminData.first_name.toString().length > 100) {
    errors.first_name = ['First name must be at most 100 characters']
  }

  // Last name: required|string|max:100
  if (!adminData.last_name || !adminData.last_name.toString().trim()) {
    errors.last_name = ['Last name is required']
  } else if (adminData.last_name.toString().length > 100) {
    errors.last_name = ['Last name must be at most 100 characters']
  }

  // Middle name: nullable|string|max:100
  if (adminData.middle_name && adminData.middle_name.toString().length > 100) {
    errors.middle_name = ['Middle name must be at most 100 characters']
  }

  // Suffix: nullable|string|max:50
  if (adminData.suffix && adminData.suffix.toString().length > 50) {
    errors.suffix = ['Suffix must be at most 50 characters']
  }

  // Employee ID: nullable|string|max:50|unique:users
  if (adminData.employee_id && adminData.employee_id.toString().length > 50) {
    errors.employee_id = ['Employee ID must be at most 50 characters']
  }
  // Note: unique:users validation is done by backend

  // Employee Type: required|in:dean,administrator,assistant,chief_librarian
  const allowedEmployeeTypes = ['dean', 'administrator', 'assistant', 'chief_librarian']
  if (!adminData.employee_type) {
    errors.employee_type = ['Employee type is required']
  } else if (!allowedEmployeeTypes.includes(adminData.employee_type)) {
    errors.employee_type = ['Employee type must be one of: dean, administrator, assistant, chief_librarian']
  }

  // Role: required|in:super_admin,branch_admin,admin
  const allowedRoles = ['super_admin', 'branch_admin', 'admin']
  if (!adminData.role) {
    errors.role = ['Role is required']
  } else if (!allowedRoles.includes(adminData.role)) {
    errors.role = ['Role must be one of: super_admin, branch_admin, admin']
  }

  // Branch ID: required|exists:branches,id
  if (adminData.branch_id === null || adminData.branch_id === undefined || adminData.branch_id === '') {
    errors.branch_id = ['Branch is required']
  } else if (!Number.isInteger(Number(adminData.branch_id)) || Number(adminData.branch_id) <= 0) {
    errors.branch_id = ['Branch must be a positive integer']
  }
  // Note: exists:branches,id validation is done by backend

  const isValid = Object.keys(errors).length === 0

  return {
    isValid,
    errors,
  }
}

export default {
  getAdmin,
  createAdmin,
  updateAdmin,
  formatAdminForDisplay,
  validateAdmin,
  API_ENDPOINTS,
}
