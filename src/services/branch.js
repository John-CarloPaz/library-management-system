import { getAxiosInstance } from './auth'

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const BASE_URL = `${API_ORIGIN}/api/branches`

let activeBranchesCache = null
let activeBranchesCacheAt = 0

/**
 * Internal helper to fetch branches via unified list endpoint.
 * Supports ListQueryService params: archived, active, count, page, per_page.
 */
async function fetchBranches({ archived, active, count = 'all', page, perPage } = {}) {
  const response = await getAxiosInstance().get(`${BASE_URL}/list`, {
    params: {
      archived,
      active,
      count,
      page,
      per_page: perPage,
    },
  })

  let data = response.data

  if (data.branches && Array.isArray(data.branches)) {
    data = data.branches
  } else if (data.data && Array.isArray(data.data)) {
    data = data.data
  } else if (!Array.isArray(data)) {
    data = []
  }

  return data
}

/**
 * Paginated helper for server-side tables.
 * Returns an object with the current page of branches and the total count.
 */
export async function fetchBranchesPage({ archived, active, page = 1, itemsPerPage = 10 } = {}) {
  const response = await getAxiosInstance().get(`${BASE_URL}/list`, {
    params: {
      archived,
      active,
      page,
      per_page: itemsPerPage,
    },
  })

  const payload = response.data || {}

  let rows = []
  let total = 0

  if (payload.branches) {
    const container = payload.branches
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

/**
 * Fetch active branches with a small in-memory cache.
 * Useful for branch filter dropdowns across modules.
 */
export async function listActiveBranchesCached({ force = false, ttlMs = 5 * 60 * 1000 } = {}) {
  const now = Date.now()
  if (!force && Array.isArray(activeBranchesCache) && now - activeBranchesCacheAt < ttlMs) {
    return activeBranchesCache
  }

  const data = await listActiveBranches()
  activeBranchesCache = Array.isArray(data) ? data : []
  activeBranchesCacheAt = now
  return activeBranchesCache
}

/**
 * Fetch all active branches
 */
export async function listActiveBranches() {
  try {
    console.log(`Fetching active branches from ${BASE_URL}/list`)
    const data = await fetchBranches({ active: true, archived: 'false', count: 'all' })
    console.log('Active branches:', data)
    return data
  } catch (error) {
    console.error('Failed to list active branches:', error.response?.data || error.message)
    throw error
  }
}

/**
 * Fetch all archived branches
 */
export async function listArchivedBranches() {
  try {
    console.log(`Fetching archived branches from ${BASE_URL}/list`)
    const data = await fetchBranches({ archived: 'true', count: 'all' })
    console.log('Archived branches:', data)
    return data
  } catch (error) {
    console.error('Failed to list archived branches:', error.response?.data || error.message)
    throw error
  }
}

/**
 * Fetch a single branch by ID
 */
export async function getBranch(id) {
  try {
    const response = await getAxiosInstance().get(`${BASE_URL}/view/${id}`)
    return response.data
  } catch (error) {
    console.error(`Failed to fetch branch ${id}:`, error.response?.data || error.message)
    throw error
  }
}

/**
 * Create a new branch
 */
export async function createBranch(data) {
  try {
    const response = await getAxiosInstance().post(`${BASE_URL}/create`, data)
    return response.data
  } catch (error) {
    console.error('Failed to create branch:', error.response?.data || error.message)
    throw error
  }
}

/**
 * Update an existing branch
 */
export async function editBranch(id, data) {
  try {
    const response = await getAxiosInstance().post(`${BASE_URL}/edit/${id}`, data)
    return response.data
  } catch (error) {
    console.error(`Failed to edit branch ${id}:`, error.response?.data || error.message)
    throw error
  }
}

/**
 * Archive a branch
 */
export async function archiveBranch(id) {
  try {
    const response = await getAxiosInstance().post(`${BASE_URL}/archive/${id}`)
    return response.data
  } catch (error) {
    console.error(`Failed to archive branch ${id}:`, error.response?.data || error.message)
    throw error
  }
}

/**
 * Restore an archived branch
 */
export async function restoreBranch(id) {
  try {
    const response = await getAxiosInstance().post(`${BASE_URL}/restore/${id}`)
    return response.data
  } catch (error) {
    console.error(`Failed to restore branch ${id}:`, error.response?.data || error.message)
    throw error
  }
}
