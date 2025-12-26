/**
 * Borrow Service
 * Handles borrow and return operations with real-time updates
 */

import { getAxiosInstance } from './auth'

// API Configuration
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const API_BASE_URL = `${API_ORIGIN}/api`

/**
 * Internal helper to fetch borrows via unified endpoint.
 * Backend exposes GET /api/borrows with ListQueryService-style filters.
 */
async function fetchBorrows({ status, archived, active, count = 'all', page, perPage } = {}) {
  const response = await getAxiosInstance().get(`${API_BASE_URL}/borrows`, {
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
 * Returns an object with the current page of borrow records and the total count.
 */
export async function fetchBorrowsPage({ status, archived, active, page = 1, itemsPerPage = 10 } = {}) {
  const response = await getAxiosInstance().get(`${API_BASE_URL}/borrows`, {
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

  if (payload.borrows) {
    const container = payload.borrows
    if (Array.isArray(container)) {
      rows = container
      total = rows.length
    } else if (Array.isArray(container.data)) {
      rows = container.data
      total = typeof container.total === 'number' ? container.total : rows.length
    }
  } else if (Array.isArray(payload)) {
    rows = payload
    total = rows.length
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
 * Borrow a book
 */
export async function borrowBook(data) {
  try {
    const response = await getAxiosInstance().post(`${API_BASE_URL}/borrow`, data)
    return response.data
  } catch (error) {
    console.error('Failed to borrow book:', error.response?.data || error.message)
    throw error
  }
}

/**
 * Get all borrow records
 */
export async function getBorrowRecords() {
  try {
    const data = await fetchBorrows({ active: true, archived: 'false', count: 'all' })
    return data
  } catch (error) {
    console.error('Failed to fetch borrow records:', error.response?.data || error.message)
    throw error
  }
}

// Legacy listBorrowRecords/getBorrowsByStatus helpers removed in favor of paginated fetchBorrowsPage

/**
 * Extend borrowing duration
 */
export async function extendBorrowing(id, data) {
  try {
    const response = await getAxiosInstance().post(`${API_BASE_URL}/borrow/extend/${id}`, data)
    return response.data
  } catch (error) {
    console.error('Failed to extend borrowing:', error.response?.data || error.message)
    throw error
  }
}

/**
 * Update a borrow record
 */
export async function updateBorrowRecord(id, data) {
  try {
    const response = await getAxiosInstance().put(`${API_BASE_URL}/borrow/${id}`, data)
    return response.data
  } catch (error) {
    console.error('Failed to update borrow record:', error.response?.data || error.message)
    throw error
  }
}

/**
 * Return a book (update status to returned)
 */
export async function returnBook(id, data) {
  try {
    const response = await getAxiosInstance().put(`${API_BASE_URL}/borrow/${id}`, {
      status: 'returned',
      return_date: new Date().toISOString().split('T')[0],
      ...data
    })
    return response.data
  } catch (error) {
    console.error('Failed to return book:', error.response?.data || error.message)
    throw error
  }
}

/**
 * Archive a borrow record
 */
export async function archiveBorrowRecord(id) {
  try {
    const response = await getAxiosInstance().post(`${API_BASE_URL}/archive/borrow/${id}`)
    return response.data
  } catch (error) {
    console.error('Failed to archive borrow record:', error.response?.data || error.message)
    throw error
  }
}

/**
 * Restore an archived borrow record
 */
export async function restoreBorrowRecord(id) {
  try {
    const response = await getAxiosInstance().post(`${API_BASE_URL}/borrow/restore/${id}`)
    return response.data
  } catch (error) {
    console.error('Failed to restore borrow record:', error.response?.data || error.message)
    throw error
  }
}

/**
 * Check overdue records
 */
export async function checkOverdue() {
  try {
    const response = await getAxiosInstance().get(`${API_BASE_URL}/borrows/overdue`)
    return response.data
  } catch (error) {
    console.error('Failed to check overdue records:', error.response?.data || error.message)
    throw error
  }
}
