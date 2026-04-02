import { getAxiosInstance } from './auth'

const api = () => getAxiosInstance()

const BASE_PATH = '/semesters'

/**
 * Paginated semester fetcher using the new ListQueryService-backed endpoints.
 * Scope can be 'active', 'archived', or 'all' (default maps to /semesters).
 */
export async function fetchSemestersPage({ scope = 'active', page = 1, itemsPerPage = 10 } = {}) {
  let path = BASE_PATH

  if (scope === 'active') {
    path = `${BASE_PATH}/active`
  } else if (scope === 'archived') {
    path = `${BASE_PATH}/archived`
  }

  const response = await api().get(path, {
    params: {
      page,
      per_page: itemsPerPage,
    },
  })

  const payload = response.data || {}

  let rows = []
  let total = 0

  if (payload.semesters) {
    const container = payload.semesters
    if (Array.isArray(container)) {
      rows = container
      total = container.length
    } else if (Array.isArray(container.data)) {
      rows = container.data
      total = typeof container.total === 'number' ? container.total : rows.length
    }
  } else if (Array.isArray(payload.data)) {
    rows = payload.data
    total = typeof payload.total === 'number' ? payload.total : rows.length
  } else if (Array.isArray(payload)) {
    rows = payload
    total = rows.length
  }

  if (!total) {
    total = rows.length
  }

  return { items: rows, total }
}

/**
 * Convenience helper for dropdowns: returns all active (non-archived) semesters.
 * Uses the /semesters/active endpoint with a high per_page limit.
 */
export async function listActiveSemesters({ itemsPerPage = 1000 } = {}) {
  const { items } = await fetchSemestersPage({ scope: 'active', page: 1, itemsPerPage })
  return items
}

// Backwards-compatible alias used by student forms; now returns only active semesters.
export async function listSemesters(options = {}) {
  return listActiveSemesters(options)
}

export async function getSemester(id) {
  const response = await api().get(`${BASE_PATH}/${id}`)
  return response.data
}

export async function createSemester(data) {
  const response = await api().post(BASE_PATH, data)
  return response.data
}

export async function updateSemester(id, data) {
  const response = await api().put(`${BASE_PATH}/${id}`, data)
  return response.data
}

export async function deleteSemester(id) {
  const response = await api().delete(`${BASE_PATH}/${id}`)
  return response.data
}

/**
 * Restore an archived semester
 * POST /semesters/restore/{id}
 */
export async function restoreSemester(id) {
  const response = await api().post(`${BASE_PATH}/restore/${id}`)
  return response.data
}
