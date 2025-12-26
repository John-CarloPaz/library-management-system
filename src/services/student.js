import { getAxiosInstance } from './auth'

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const API_BASE_URL = `${API_ORIGIN}/api`
const BASE_URL = `${API_BASE_URL}/students`

// Simple in-memory caches for student lists
let activeStudentsCache = null
let archivedStudentsCache = null
let activeStudentsCachedAt = 0
let archivedStudentsCachedAt = 0
const STUDENTS_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function isStudentsCacheValid(type) {
  const now = Date.now()
  if (type === 'active' && Array.isArray(activeStudentsCache)) {
    return now - activeStudentsCachedAt < STUDENTS_CACHE_TTL_MS
  }
  if (type === 'archived' && Array.isArray(archivedStudentsCache)) {
    return now - archivedStudentsCachedAt < STUDENTS_CACHE_TTL_MS
  }
  return false
}

function setStudentsCache(type, data) {
  const now = Date.now()
  const safeData = Array.isArray(data) ? data : []
  if (type === 'active') {
    activeStudentsCache = safeData
    activeStudentsCachedAt = now
  } else if (type === 'archived') {
    archivedStudentsCache = safeData
    archivedStudentsCachedAt = now
  }
}

export function clearStudentsCache() {
  activeStudentsCache = null
  archivedStudentsCache = null
  activeStudentsCachedAt = 0
  archivedStudentsCachedAt = 0
}

/**
 * Internal helper to fetch students via unified list endpoint.
 * Supports ListQueryService params: status, archived, active, count, page, per_page.
 */
async function fetchStudents({ status, archived, active, count = 'all', page, perPage } = {}) {
  const response = await getAxiosInstance().get(`${BASE_URL}/list`, {
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

  if (Array.isArray(data)) {
    // use as-is
  } else if (data.data && Array.isArray(data.data)) {
    data = data.data
  } else {
    data = []
  }

  return data
}

/**
 * Paginated helper for server-side tables.
 * Returns an object with the current page of items and the total count.
 */
export async function fetchStudentsPage({ status, archived, active, page = 1, itemsPerPage = 10 } = {}) {
  const response = await getAxiosInstance().get(`${BASE_URL}/list`, {
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

  if (payload.students) {
    const container = payload.students
    if (Array.isArray(container)) {
      rows = container
      total = rows.length
    } else if (Array.isArray(container.data)) {
      rows = container.data
      total = typeof container.total === 'number' ? container.total : rows.length
    }
  } else if (Array.isArray(payload)) {
    rows = payload
    total = payload.length
  } else if (Array.isArray(payload.data)) {
    rows = payload.data
    total = typeof payload.total === 'number' ? payload.total : rows.length
  }

  const items = rows
  if (!total) {
    total = items.length
  }

  return { items, total }
}

/**
 * Generic list helper so views can query students by backend filters (status, archived, active, etc.).
 */
export async function listStudentsFiltered(filters = {}) {
  return fetchStudents(filters)
}

// List unarchived (active) students
export async function listActiveStudents({ forceRefresh = false } = {}) {
  if (!forceRefresh && isStudentsCacheValid('active')) {
    return activeStudentsCache.slice()
  }
  try {
    const data = await fetchStudents({ active: true, archived: 'false', count: 'all' })
    setStudentsCache('active', data)
    return data
  } catch (error) {
    console.error('Failed to list active students:', error.response?.data || error.message)
    throw error
  }
}

// List archived students
export async function listArchivedStudents({ forceRefresh = false } = {}) {
  if (!forceRefresh && isStudentsCacheValid('archived')) {
    return archivedStudentsCache.slice()
  }
  try {
    const data = await fetchStudents({ archived: 'true', count: 'all' })
    setStudentsCache('archived', data)
    return data
  } catch (error) {
    console.error('Failed to list archived students:', error.response?.data || error.message)
    throw error
  }
}

// Get a single student by student number
export async function getStudentByNumber(studentNumber) {
  try {
    const response = await getAxiosInstance().get(`${BASE_URL}/view/${studentNumber}`)
    return response.data
  } catch (error) {
    console.error(`Failed to get student ${studentNumber}:`, error.response?.data || error.message)
    throw error
  }
}

// Create a new student
export async function createStudent(data) {
  try {
    const response = await getAxiosInstance().post(`${BASE_URL}/create`, data)
    clearStudentsCache()
    return response.data
  } catch (error) {
    console.error('Failed to create student:', error.response?.data || error.message)
    throw error
  }
}

// Update an existing student (by student number)
export async function updateStudent(studentNumber, data) {
  try {
    const response = await getAxiosInstance().put(`${BASE_URL}/edit/${studentNumber}`, data)
    clearStudentsCache()
    return response.data
  } catch (error) {
    console.error(`Failed to update student ${studentNumber}:`, error.response?.data || error.message)
    throw error
  }
}

// Archive a student (by student number)
export async function archiveStudent(studentNumber) {
  try {
    const response = await getAxiosInstance().post(`${BASE_URL}/archive/${studentNumber}`)
    clearStudentsCache()
    return response.data
  } catch (error) {
    console.error(`Failed to archive student ${studentNumber}:`, error.response?.data || error.message)
    throw error
  }
}

// Restore an archived student (by student number)
export async function restoreStudent(studentNumber) {
  try {
    const response = await getAxiosInstance().post(`${BASE_URL}/restore/${studentNumber}`)
    clearStudentsCache()
    return response.data
  } catch (error) {
    console.error(`Failed to restore student ${studentNumber}:`, error.response?.data || error.message)
    throw error
  }
}

// Get students by status
export async function getStudentsByStatus(status) {
  try {
    const data = await fetchStudents({ status, count: 'all' })
    return data
  } catch (error) {
    console.error(`Failed to get students by status '${status}':`, error.response?.data || error.message)
    throw error
  }
}
