/**
 * Procurement Service
 * Handles procurement CRUD operations with real-time updates
 */

import { getAxiosInstance } from './auth'

// API Configuration
const API_ENDPOINTS = {
  LIST: '/procurements/list',
  VIEW: '/procurements/view',
  CREATE: '/procurements/create',
  EDIT: '/procurements/edit',
  ARCHIVE: '/procurements/archive',
  RESTORE: '/procurements/restore',
}

/**
 * Internal helper to fetch procurements from the unified list endpoint
 * Supports backend ListQueryService params: status, archived, active, count, page, per_page.
 */
async function fetchProcurements({ status, archived, active, count = 'all', page, perPage } = {}) {
  const response = await getAxiosInstance().get(API_ENDPOINTS.LIST, {
    params: {
      status,
      archived,
      active,
      count,
      page,
      per_page: perPage,
    },
  })

  let data = response.data

  if (data.procurements && Array.isArray(data.procurements)) {
    data = data.procurements
  } else if (data.data && Array.isArray(data.data)) {
    data = data.data
  } else if (!Array.isArray(data)) {
    data = []
  }

  return data
}

/**
 * Paginated helper for server-side tables.
 * Returns an object with the current page of procurements and the total count.
 */
export async function fetchProcurementsPage({ status, archived, active, page = 1, itemsPerPage = 10 } = {}) {
  const response = await getAxiosInstance().get(API_ENDPOINTS.LIST, {
    params: {
      status,
      archived,
      active,
      page,
      per_page: itemsPerPage,
    },
  })

  const payload = response.data || {}

  let rows = []
  let total = 0

  if (payload.procurements) {
    const container = payload.procurements
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

// Legacy list* procurement helpers removed in favor of paginated fetchProcurementsPage

/**
 * Get a specific procurement by ID
 * @param {number|string} id - Procurement ID
 * @returns {Promise<object>}
 */
export async function getProcurement(id) {
  try {
    const response = await getAxiosInstance().get(`${API_ENDPOINTS.VIEW}/${id}`)
    let data = response.data

    // Handle different response formats
    if (data.procurement && typeof data.procurement === 'object') {
      data = data.procurement
    } else if (data.data && typeof data.data === 'object') {
      data = data.data
    }

    data = data || {}
    console.log('Procurement loaded from API:', id)

    return data
  } catch (error) {
    console.error('Failed to get procurement:', id, error.message)
    throw error
  }
}

/**
 * Create a new procurement
 * @param {object} data - Procurement data
 * @returns {Promise<object>}
 */
export async function createProcurement(data) {
  try {
    const response = await getAxiosInstance().post(API_ENDPOINTS.CREATE, data)
    
    let result = response.data
    if (result.procurement && typeof result.procurement === 'object') {
      result = result.procurement
    } else if (result.data && typeof result.data === 'object') {
      result = result.data
    }

    console.log('Procurement created:', result.id)
    return result
  } catch (error) {
    console.error('Failed to create procurement:', error.message)
    throw new Error(error.response?.data?.message || error.message)
  }
}

/**
 * Update an existing procurement
 * @param {number|string} id - Procurement ID
 * @param {object} data - Updated procurement data
 * @returns {Promise<object>}
 */
export async function updateProcurement(id, data) {
  try {
    const response = await getAxiosInstance().put(`${API_ENDPOINTS.EDIT}/${id}`, data)
    
    let result = response.data
    if (result.procurement && typeof result.procurement === 'object') {
      result = result.procurement
    } else if (result.data && typeof result.data === 'object') {
      result = result.data
    }

    console.log('Procurement updated:', id)
    return result
  } catch (error) {
    console.error('Failed to update procurement:', error.message)
    throw new Error(error.response?.data?.message || error.message)
  }
}

/**
 * Archive a procurement
 * @param {number|string} id - Procurement ID
 * @returns {Promise<object>}
 */
export async function archiveProcurement(id) {
  try {
    const response = await getAxiosInstance().post(`${API_ENDPOINTS.ARCHIVE}/${id}`)
    console.log('Procurement archived:', id)
    return response.data
  } catch (error) {
    console.error('Failed to archive procurement:', error.message)
    throw new Error(error.response?.data?.message || error.message)
  }
}

/**
 * Restore an archived procurement
 * @param {number|string} id - Procurement ID
 * @returns {Promise<object>}
 */
export async function restoreProcurement(id) {
  try {
    const response = await getAxiosInstance().get(`${API_ENDPOINTS.RESTORE}/${id}`)
    console.log('Procurement restored:', id)
    return response.data
  } catch (error) {
    console.error('Failed to restore procurement:', error.message)
    throw new Error(error.response?.data?.message || error.message)
  }
}

/**
 * Validate procurement data
 * @param {object} data - Procurement data to validate
 * @param {string} mode - 'create' or 'edit'
 * @returns {object} - { isValid: boolean, errors: {} }
 */
export function validateProcurement(data, mode = 'create') {
  const errors = {}

  if (mode === 'create') {
    // All fields required for creation
    if (!data.title || !data.title.toString().trim()) {
      errors.title = 'Title is required'
    }
    if (!data.author || !data.author.toString().trim()) {
      errors.author = 'Author is required'
    }
    if (!data.year_of_publication) {
      errors.year_of_publication = 'Year of publication is required'
    } else if (isNaN(data.year_of_publication) || data.year_of_publication < 1000 || data.year_of_publication > new Date().getFullYear()) {
      errors.year_of_publication = 'Invalid year'
    }
    if (!data.quantity_requested) {
      errors.quantity_requested = 'Quantity requested is required'
    } else if (isNaN(data.quantity_requested) || data.quantity_requested < 1) {
      errors.quantity_requested = 'Quantity must be a positive number'
    }
  } else if (mode === 'edit') {
    // Only validate provided fields
    if (data.title !== undefined && (!data.title || !data.title.toString().trim())) {
      errors.title = 'Title cannot be empty'
    }
    if (data.author !== undefined && (!data.author || !data.author.toString().trim())) {
      errors.author = 'Author cannot be empty'
    }
    if (data.year_of_publication !== undefined && data.year_of_publication) {
      if (isNaN(data.year_of_publication) || data.year_of_publication < 1000 || data.year_of_publication > new Date().getFullYear()) {
        errors.year_of_publication = 'Invalid year'
      }
    }
    if (data.quantity_requested !== undefined && data.quantity_requested) {
      if (isNaN(data.quantity_requested) || data.quantity_requested < 1) {
        errors.quantity_requested = 'Quantity must be a positive number'
      }
    }
  }

  // Optional ISBN validation: allow 10 to 13 numeric digits only
  if (data.isbn && data.isbn.toString().trim().length > 0) {
    const isbn = data.isbn.toString().trim()
    if (!/^[0-9]{10,13}$/.test(isbn)) {
      errors.isbn = 'ISBN must be 10 to 13 digits'
    }
  }

  if (data.edition && data.edition.toString().trim().length > 255) {
    errors.edition = 'Edition cannot exceed 255 characters'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Get approval status options
 */
export function getApprovalStatuses() {
  return [
    { value: 'pending', text: 'Pending' },
    { value: 'approved', text: 'Approved' },
    { value: 'rejected', text: 'Rejected' },
  ]
}

export default {
  getProcurement,
  createProcurement,
  updateProcurement,
  archiveProcurement,
  restoreProcurement,
  validateProcurement,
  getApprovalStatuses,
}
