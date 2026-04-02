/**
 * Acquisition Service
 * Handles acquisition CRUD operations with real-time updates
 */

import { getAxiosInstance } from './auth'

// API Configuration
const API_ENDPOINTS = {
  LIST: '/acquisitions/list',
  VIEW: '/acquisitions/view',
  CREATE: '/acquisitions/create',
  EDIT: '/acquisitions/edit',
  ARCHIVE: '/acquisition/archive',
  RESTORE: '/acquisitions/restore',
}

/**
 * Paginated helper for server-side tables.
 * Returns an object with the current page of acquisitions and the total count.
 */
export async function fetchAcquisitionsPage({ status, archived, active, page = 1, itemsPerPage = 10 } = {}) {
  console.log('[Acquisition] fetchAcquisitionsPage request params:', {
    status,
    archived,
    active,
    page,
    itemsPerPage,
  })

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

  console.log('[Acquisition] fetchAcquisitionsPage raw payload:', payload)

  let rows = []
  let total = 0

  if (payload.acquisitions) {
    const container = payload.acquisitions
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

   console.log('[Acquisition] fetchAcquisitionsPage normalized result:', {
    itemsCount: Array.isArray(items) ? items.length : 0,
    total,
  })

  return { items, total }
}

// Legacy list* acquisition helpers removed in favor of paginated fetchAcquisitionsPage

/**
 * Get a specific acquisition by ID
 * @param {number|string} id - Acquisition ID
 * @returns {Promise<object>}
 */
export async function getAcquisition(id) {
  try {
    const response = await getAxiosInstance().get(`${API_ENDPOINTS.VIEW}/${id}`)
    let data = response.data

    // Handle different response formats
    if (data.acquisition && typeof data.acquisition === 'object') {
      data = data.acquisition
    } else if (data.data && typeof data.data === 'object') {
      data = data.data
    }

    data = data || {}
    console.log('Acquisition loaded from API:', id)

    return data
  } catch (error) {
    console.error('Failed to get acquisition:', id, error.message)
    throw error
  }
}

/**
 * Create a new acquisition
 * @param {object} data - Acquisition data
 * @returns {Promise<object>}
 */
export async function createAcquisition(data) {
  try {
    const response = await getAxiosInstance().post(API_ENDPOINTS.CREATE, data)
    
    let result = response.data
    if (result.acquisition && typeof result.acquisition === 'object') {
      result = result.acquisition
    } else if (result.data && typeof result.data === 'object') {
      result = result.data
    }

    console.log('Acquisition created:', result)

    return result
  } catch (error) {
    console.error('Failed to create acquisition:', error.message)
    throw new Error(error.response?.data?.message || error.message)
  }
}

/**
 * Update an acquisition
 * @param {number|string} id - Acquisition ID
 * @param {object} data - Updated acquisition data
 * @returns {Promise<object>}
 */
export async function updateAcquisition(id, data) {
  try {
    const response = await getAxiosInstance().put(`${API_ENDPOINTS.EDIT}/${id}`, data)
    
    let result = response.data
    if (result.acquisition && typeof result.acquisition === 'object') {
      result = result.acquisition
    } else if (result.data && typeof result.data === 'object') {
      result = result.data
    }

    console.log('Acquisition updated:', result)
    return result
  } catch (error) {
    console.error('Failed to update acquisition:', error.message)
    throw new Error(error.response?.data?.message || error.message)
  }
}

/**
 * Archive an acquisition
 * @param {number|string} id - Acquisition ID
 * @returns {Promise<object>}
 */
export async function archiveAcquisition(id) {
  try {
    const response = await getAxiosInstance().post(`${API_ENDPOINTS.ARCHIVE}/${id}`)
    
    let result = response.data
    if (result.acquisition && typeof result.acquisition === 'object') {
      result = result.acquisition
    }

    console.log('Acquisition archived:', id)

    return result
  } catch (error) {
    console.error('Failed to archive acquisition:', error.message)
    throw new Error(error.response?.data?.message || error.message)
  }
}

/**
 * Restore an archived acquisition
 * @param {number|string} id - Acquisition ID
 * @returns {Promise<object>}
 */
export async function restoreAcquisition(id) {
  try {
    const response = await getAxiosInstance().get(`${API_ENDPOINTS.RESTORE}/${id}`)
    
    let result = response.data
    if (result.acquisition && typeof result.acquisition === 'object') {
      result = result.acquisition
    }

    console.log('Acquisition restored:', id)

    return result
  } catch (error) {
    console.error('Failed to restore acquisition:', error.message)
    throw new Error(error.response?.data?.message || error.message)
  }
}

/**
 * Validate acquisition data
 * @param {object} data - Acquisition data to validate
 * @returns {object} - { isValid: boolean, errors: object }
 */
export function validateAcquisition(data) {
  const errors = {}

  // Title validation
  if (!data.title || data.title.trim().length === 0) {
    errors.title = ['Title is required']
  } else if (data.title.length < 3 || data.title.length > 255) {
    errors.title = ['Title must be between 3 and 255 characters']
  }

  // Author validation
  if (!data.author || data.author.trim().length === 0) {
    errors.author = ['Author is required']
  } else if (data.author.length < 3 || data.author.length > 255) {
    errors.author = ['Author must be between 3 and 255 characters']
  }

  // Year of publication validation
  if (!data.year_of_publication) {
    errors.year_of_publication = ['Year of publication is required']
  } else if (isNaN(data.year_of_publication) || data.year_of_publication < 1000 || data.year_of_publication > new Date().getFullYear()) {
    errors.year_of_publication = ['Year must be a valid year']
  }

  // Quantity requested validation
  if (!data.quantity_requested) {
    errors.quantity_requested = ['Quantity requested is required']
  } else if (isNaN(data.quantity_requested) || data.quantity_requested < 1 || data.quantity_requested > 1000) {
    errors.quantity_requested = ['Quantity must be between 1 and 1000']
  }

  // Acquisition method validation
  if (!data.acquisition_method) {
    errors.acquisition_method = ['Acquisition method is required']
  } else if (!['book_fair', 'supplier', 'donation'].includes(data.acquisition_method)) {
    errors.acquisition_method = ['Invalid acquisition method']
  }

  // Acquisition status validation
  if (!data.acquisition_status) {
    errors.acquisition_status = ['Acquisition status is required']
  } else if (!['received', 'partial', 'missing', 'cancelled', 'pending'].includes(data.acquisition_status)) {
    errors.acquisition_status = ['Invalid acquisition status']
  }

  // Optional fields validation
  if (data.edition && (data.edition.length < 3 || data.edition.length > 255)) {
    errors.edition = ['Edition must be between 3 and 255 characters']
  }

  if (data.isbn && (data.isbn.length < 3 || data.isbn.length > 255)) {
    errors.isbn = ['ISBN must be between 3 and 255 characters']
  }

  if (data.publisher && (data.publisher.length < 3 || data.publisher.length > 255)) {
    errors.publisher = ['Publisher must be between 3 and 255 characters']
  }

  if (data.supplier_name && (data.supplier_name.length < 3 || data.supplier_name.length > 255)) {
    errors.supplier_name = ['Supplier name must be between 3 and 255 characters']
  }

  if (data.cost && (isNaN(data.cost) || data.cost < 0 || data.cost > 1000000)) {
    errors.cost = ['Cost must be between 0 and 1000000']
  }

  if (data.quantity_acquired && (isNaN(data.quantity_acquired) || data.quantity_acquired < 0 || data.quantity_acquired > 1000)) {
    errors.quantity_acquired = ['Quantity acquired must be between 0 and 1000']
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export default {
  getAcquisition,
  createAcquisition,
  updateAcquisition,
  archiveAcquisition,
  restoreAcquisition,
  validateAcquisition,
}
