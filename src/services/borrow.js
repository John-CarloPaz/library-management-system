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
async function fetchBorrows(params = {}) {
  const {
    status,
    archived,
    active,
    count = 'all',
    page,
    perPage,
    ...rest
  } = params || {}

  const axiosParams = {
    status,
    archived,
    active,
    count,
    page,
    per_page: perPage,
    ...rest,
  }

  const response = await getAxiosInstance().get(`${API_BASE_URL}/borrows`, {
    params: axiosParams,
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
export async function fetchBorrowsPage(params = {}) {
  const { status, archived, active, page = 1, itemsPerPage = 10, ...rest } = params || {}

  const axiosParams = {
    status,
    archived,
    active,
    page,
    per_page: itemsPerPage,
    ...rest,
  }

  try {
    console.log('fetchBorrowsPage -> requesting borrows with params', axiosParams)
  } catch (e) {}

  const response = await getAxiosInstance().get(`${API_BASE_URL}/borrows`, {
    params: axiosParams,
  })
  try {
    console.log('fetchBorrowsPage -> response.data preview', response.data && (Array.isArray(response.data) ? `array(${response.data.length})` : Object.keys(response.data).slice(0,5)))
  } catch (e) {}

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
export async function extendBorrowing(arg, data) {
  try {
    // Support two calling styles for backward compatibility:
    // 1) extendBorrowing(id, data) -> POST /borrow/extend/{id}
    // 2) extendBorrowing(payloadObject) -> POST /borrow/extend with payload (reference_number, extension_days, ...)
    if (typeof arg === 'object' && arg !== null && data === undefined) {
      const payload = arg
      const response = await getAxiosInstance().post(`${API_BASE_URL}/borrow/extend`, payload)
      return response.data
    }

    // If arg is primitive id and data provided, keep legacy behavior
    if ((typeof arg === 'string' || typeof arg === 'number') && data !== undefined) {
      const response = await getAxiosInstance().post(`${API_BASE_URL}/borrow/extend/${arg}`, data)
      return response.data
    }

    // If arg is string (reference) and no data, treat as payload containing reference_number
    if ((typeof arg === 'string' || typeof arg === 'number') && data === undefined) {
      const payload = { reference_number: String(arg) }
      const response = await getAxiosInstance().post(`${API_BASE_URL}/borrow/extend`, payload)
      return response.data
    }

    throw new Error('Invalid arguments for extendBorrowing')
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
    // Do not force `status` here; backend `processReturnOrStatus` will apply return logic.
    const payload = {
      // set return_date if caller didn't provide one
      return_date: new Date().toISOString().split('T')[0],
      ...data
    }
    const response = await getAxiosInstance().put(`${API_BASE_URL}/borrow/${id}`, payload)
    return response.data
  } catch (error) {
    console.error('Failed to return book:', error.response?.data || error.message)
    throw error
  }
}


/**
 * Fetch return details for a scanned book.
 * Calls backend GET /api/return with query params (e.g. bookCode or reference)
 */
export async function getReturnDetails(identifier = {}) {
  try {
    let payload = {}
    if (typeof identifier === 'string') {
      payload.reference_number = identifier
    } else if (identifier && identifier.reference_number) {
      payload.reference_number = identifier.reference_number
    } else if (identifier && identifier.bookCode) {
      payload.reference_number = identifier.bookCode
    } else if (identifier && identifier.reference) {
      payload.reference_number = identifier.reference
    } else {
      throw new Error('reference_number is required to fetch return details')
    }

    const response = await getAxiosInstance().post(`${API_BASE_URL}/return`, payload)
    return response.data
  } catch (error) {
    console.error('Failed to fetch return details:', error.response?.data || error.message)
    throw error
  }
}


/**
 * Archive a borrow record
 */
export async function archiveBorrowRecord(id) {
  try {
    const response = await getAxiosInstance().put(`${API_BASE_URL}/archive/borrow/${id}`)
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
 * Fetch students already emailed for borrows due on a given date.
 * Backend: GET /api/borrows/reminders/emailed?due_date=YYYY-MM-DD (defaults to tomorrow)
 * Returns: { due_date, type: 'due_soon', channel: 'email', data: [...] }
 */
export async function fetchEmailedBorrowReminders(params = {}) {
  const { due_date } = params || {}

  const response = await getAxiosInstance().get(`${API_BASE_URL}/borrows/reminders/emailed`, {
    params: due_date ? { due_date } : {},
  })

  const payload = response && response.data ? response.data : {}
  const data = Array.isArray(payload.data) ? payload.data : []

  return {
    due_date: payload.due_date || due_date || null,
    type: payload.type || null,
    channel: payload.channel || null,
    data,
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
