/**
 * Catalogue Service
 * Handles catalogue CRUD operations with real-time updates
 */

import { getAxiosInstance } from './auth'

// API Configuration
const API_ENDPOINTS = {
  LIST: '/catalogues/list',
  VIEW: '/catalogues/view',
  CREATE: '/catalogues/create',
  EDIT: '/catalogues/edit',
  ARCHIVE: '/catalogues/archive',
  RESTORE: '/catalogues/restore',
}

// Simple in-memory caches for frequently used catalogue lists
let activeCataloguesCache = null
let archivedCataloguesCache = null
let activeCataloguesCachedAt = 0
let archivedCataloguesCachedAt = 0
const CATALOGUES_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function isCataloguesCacheValid(type) {
  const now = Date.now()
  if (type === 'active' && Array.isArray(activeCataloguesCache)) {
    return now - activeCataloguesCachedAt < CATALOGUES_CACHE_TTL_MS
  }
  if (type === 'archived' && Array.isArray(archivedCataloguesCache)) {
    return now - archivedCataloguesCachedAt < CATALOGUES_CACHE_TTL_MS
  }
  return false
}

function setCataloguesCache(type, data) {
  const now = Date.now()
  const safeData = Array.isArray(data) ? data : []
  if (type === 'active') {
    activeCataloguesCache = safeData
    activeCataloguesCachedAt = now
  } else if (type === 'archived') {
    archivedCataloguesCache = safeData
    archivedCataloguesCachedAt = now
  }
}

export function clearCataloguesCache() {
  activeCataloguesCache = null
  archivedCataloguesCache = null
  activeCataloguesCachedAt = 0
  archivedCataloguesCachedAt = 0
}

/**
 * Internal helper to fetch catalogues via unified list endpoint.
 * Supports ListQueryService params: status, archived, active, count, page, per_page.
 */
async function fetchCatalogues({ status, archived, active, count = 'all', page, perPage } = {}) {
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

  if (data.catalogues && Array.isArray(data.catalogues)) {
    data = data.catalogues
  } else if (data.active_catalogues && Array.isArray(data.active_catalogues)) {
    data = data.active_catalogues
  } else if (data.archived_catalogues && Array.isArray(data.archived_catalogues)) {
    data = data.archived_catalogues
  } else if (data.data && Array.isArray(data.data)) {
    data = data.data
  } else if (!Array.isArray(data)) {
    data = []
  }

  return data
}

/**
 * Paginated helper for server-side tables.
 * Returns an object with the current page of catalogues and the total count.
 */
export async function fetchCataloguesPage({ status, archived, active, page = 1, itemsPerPage = 10 } = {}) {
  const params = {
    status,
    archived,
    active,
    page,
    per_page: itemsPerPage,
  }

  console.log('[Catalogue] fetchCataloguesPage request params:', params)

  const response = await getAxiosInstance().get(API_ENDPOINTS.LIST, { params })

  const payload = response.data || {}
  console.log('[Catalogue] fetchCataloguesPage raw payload:', payload)

  let rows = []
  let total = 0

  // New paginator-aware logic: payload.catalogues may be a LengthAwarePaginator
  if (payload.catalogues) {
    const container = payload.catalogues
    if (Array.isArray(container)) {
      rows = container
      total = rows.length
    } else if (Array.isArray(container.data)) {
      rows = container.data
      total = typeof container.total === 'number' ? container.total : rows.length
    }
  } else if (payload.active_catalogues) {
    const container = payload.active_catalogues
    if (Array.isArray(container)) {
      rows = container
      total = rows.length
    } else if (Array.isArray(container.data)) {
      rows = container.data
      total = typeof container.total === 'number' ? container.total : rows.length
    }
  } else if (payload.archived_catalogues) {
    const container = payload.archived_catalogues
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
    total = rows.length
  }

  console.log('[Catalogue] fetchCataloguesPage normalized result:', { itemsCount: items.length, total })

  return { items, total }
}

// Legacy list* catalogue helpers removed in favor of paginated fetchCataloguesPage

/**
 * Get a specific catalogue by ID
 * @param {number|string} id - Catalogue ID
 * @returns {Promise<object>}
 */
export async function getCatalogue(id) {
  try {
    const response = await getAxiosInstance().get(`${API_ENDPOINTS.VIEW}/${id}`)
    let data = response.data

    // Handle different response formats
    if (data.catalogue && typeof data.catalogue === 'object') {
      data = data.catalogue
    } else if (data.data && typeof data.data === 'object') {
      data = data.data
    }

    data = data || {}
    console.log('Catalogue loaded from API:', id)

    return data
  } catch (error) {
    console.error('Failed to get catalogue:', id, error.message)
    throw error
  }
}

/**
 * Create a new catalogue
 * @param {object} data - Catalogue data
 * @returns {Promise<object>}
 */
export async function createCatalogue(data) {
  try {
    const response = await getAxiosInstance().post(API_ENDPOINTS.CREATE, data)
    
    let result = response.data
    if (result.catalogue && typeof result.catalogue === 'object') {
      result = result.catalogue
    } else if (result.data && typeof result.data === 'object') {
      result = result.data
    }

    console.log('Catalogue created:', result)
    clearCataloguesCache()
    return result
  } catch (error) {
    console.error('Failed to create catalogue:', error.message)
    throw new Error(error.response?.data?.message || error.message)
  }
}

/**
 * Update a catalogue
 * @param {number|string} id - Catalogue ID
 * @param {object} data - Updated catalogue data
 * @returns {Promise<object>}
 */
export async function updateCatalogue(id, data) {
  try {
    const response = await getAxiosInstance().put(`${API_ENDPOINTS.EDIT}/${id}`, data)
    
    let result = response.data
    if (result.catalogue && typeof result.catalogue === 'object') {
      result = result.catalogue
    } else if (result.data && typeof result.data === 'object') {
      result = result.data
    }

    console.log('Catalogue updated:', result)
    clearCataloguesCache()
    return result
  } catch (error) {
    console.error('Failed to update catalogue:', error.message)
    throw new Error(error.response?.data?.message || error.message)
  }
}

/**
 * Archive a catalogue
 * @param {number|string} id - Catalogue ID
 * @returns {Promise<object>}
 */
export async function archiveCatalogue(id) {
  try {
    const response = await getAxiosInstance().post(`${API_ENDPOINTS.ARCHIVE}/${id}`)
    
    let result = response.data
    if (result.catalogue && typeof result.catalogue === 'object') {
      result = result.catalogue
    }

    console.log('Catalogue archived:', id)
    clearCataloguesCache()
    return result
  } catch (error) {
    console.error('Failed to archive catalogue:', error.message)
    throw new Error(error.response?.data?.message || error.message)
  }
}

/**
 * Restore an archived catalogue
 * @param {number|string} id - Catalogue ID
 * @returns {Promise<object>}
 */
export async function restoreCatalogue(id) {
  try {
    const response = await getAxiosInstance().get(`${API_ENDPOINTS.RESTORE}/${id}`)
    
    let result = response.data
    if (result.catalogue && typeof result.catalogue === 'object') {
      result = result.catalogue
    }

    console.log('Catalogue restored:', id)
    clearCataloguesCache()
    return result
  } catch (error) {
    console.error('Failed to restore catalogue:', error.message)
    throw new Error(error.response?.data?.message || error.message)
  }
}

/**
 * Validate catalogue data
 * @param {object} data - Catalogue data to validate
 * @param {string} mode - 'create' (all fields required) or 'edit' (partial allowed)
 * @returns {object} - { isValid: boolean, errors: object }
 */
export function validateCatalogue(data, mode = 'create') {
  const errors = {}
  const isCreating = mode === 'create'

  // For creation, all fields are required. For edit, only provided fields are validated.

  // Number of copies validation
  if (isCreating ? !data.number_of_copies : data.number_of_copies !== undefined) {
    if (isCreating && !data.number_of_copies) {
      errors.number_of_copies = ['Number of copies is required']
    } else if (data.number_of_copies && (isNaN(data.number_of_copies) || data.number_of_copies < 1 || data.number_of_copies > 1000)) {
      errors.number_of_copies = ['Number of copies must be between 1 and 1000']
    }
  }

  // Dewey validation (required for creation)
  if (isCreating ? !data.dewey : data.dewey !== undefined) {
    if (isCreating && (!data.dewey || data.dewey.trim().length === 0)) {
      errors.dewey = ['Dewey Classification is required']
    } else if (data.dewey && (data.dewey.length < 1 || data.dewey.length > 50)) {
      errors.dewey = ['Dewey must be between 1 and 50 characters']
    }
  }

  // Cutter number validation (required for creation)
  if (isCreating ? !data.cutter_number : data.cutter_number !== undefined) {
    if (isCreating && (!data.cutter_number || data.cutter_number.trim().length === 0)) {
      errors.cutter_number = ['Cutter Number is required']
    } else if (data.cutter_number && (data.cutter_number.length < 1 || data.cutter_number.length > 50)) {
      errors.cutter_number = ['Cutter number must be between 1 and 50 characters']
    }
  }

  // Call number validation (required for creation)
  if (isCreating ? !data.call_number : data.call_number !== undefined) {
    if (isCreating && (!data.call_number || data.call_number.trim().length === 0)) {
      errors.call_number = ['Call Number is required']
    } else if (data.call_number && (data.call_number.length < 1 || data.call_number.length > 100)) {
      errors.call_number = ['Call number must be between 1 and 100 characters']
    }
  }

  // Title validation
  if (isCreating ? !data.title : data.title !== undefined) {
    if (isCreating && (!data.title || data.title.trim().length === 0)) {
      errors.title = ['Title is required']
    } else if (data.title && (data.title.length < 3 || data.title.length > 255)) {
      errors.title = ['Title must be between 3 and 255 characters']
    }
  }

  // Author validation
  if (isCreating ? !data.author : data.author !== undefined) {
    if (isCreating && (!data.author || data.author.trim().length === 0)) {
      errors.author = ['Author is required']
    } else if (data.author && (data.author.length < 3 || data.author.length > 255)) {
      errors.author = ['Author must be between 3 and 255 characters']
    }
  }

  // Edition validation
  if (isCreating ? !data.edition : data.edition !== undefined) {
    if (isCreating && (!data.edition || data.edition.trim().length === 0)) {
      errors.edition = ['Edition is required']
    } else if (data.edition && (data.edition.length < 1 || data.edition.length > 255)) {
      errors.edition = ['Edition must be between 1 and 255 characters']
    }
  }

  // ISBN validation
  if (isCreating ? !data.isbn : data.isbn !== undefined) {
    if (isCreating && (!data.isbn || data.isbn.trim().length === 0)) {
      errors.isbn = ['ISBN is required']
    } else if (data.isbn && (data.isbn.length < 1 || data.isbn.length > 50)) {
      errors.isbn = ['ISBN must be between 1 and 50 characters']
    }
  }

  // Publisher validation
  if (isCreating ? !data.publisher : data.publisher !== undefined) {
    if (isCreating && (!data.publisher || data.publisher.trim().length === 0)) {
      errors.publisher = ['Publisher is required']
    } else if (data.publisher && (data.publisher.length < 1 || data.publisher.length > 255)) {
      errors.publisher = ['Publisher must be between 1 and 255 characters']
    }
  }

  // Place of publication validation
  if (isCreating ? !data.place_of_publication : data.place_of_publication !== undefined) {
    if (isCreating && (!data.place_of_publication || data.place_of_publication.trim().length === 0)) {
      errors.place_of_publication = ['Place of Publication is required']
    } else if (data.place_of_publication && (data.place_of_publication.length < 1 || data.place_of_publication.length > 255)) {
      errors.place_of_publication = ['Place of Publication must be between 1 and 255 characters']
    }
  }

  // Year of publication validation
  if (isCreating ? !data.year_of_publication : data.year_of_publication !== undefined) {
    if (isCreating && !data.year_of_publication) {
      errors.year_of_publication = ['Year of Publication is required']
    } else if (data.year_of_publication && (isNaN(data.year_of_publication) || data.year_of_publication < 1000 || data.year_of_publication > new Date().getFullYear())) {
      errors.year_of_publication = ['Year must be a valid year']
    }
  }

  // Cataloging status validation
  if (isCreating ? !data.cataloging_status : data.cataloging_status !== undefined) {
    if (isCreating && !data.cataloging_status) {
      errors.cataloging_status = ['Cataloging status is required']
    } else if (data.cataloging_status && !['pending', 'in_progress', 'cataloged', 'ready_for_labeling', 'available', 'on_hold', 'archived'].includes(data.cataloging_status)) {
      errors.cataloging_status = ['Invalid cataloging status']
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export default {
  getCatalogue,
  createCatalogue,
  updateCatalogue,
  archiveCatalogue,
  restoreCatalogue,
  validateCatalogue,
}
