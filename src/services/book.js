/**
 * Book Service
 * Handles book CRUD operations with real-time updates
 */

import { getAxiosInstance } from './auth'

// API Configuration
const API_ENDPOINTS = {
  LIST: '/books/list',
  VIEW: '/books/view',
  EDIT_STATUS: '/books/edit-status',
  ARCHIVE: '/books/archive',
  RESTORE: '/books/restore',
}

// Simple in-memory caches for frequently used book lists
let activeBooksCache = null
let archivedBooksCache = null
let activeBooksCachedAt = 0
let archivedBooksCachedAt = 0
const BOOKS_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function isBooksCacheValid(type) {
  const now = Date.now()
  if (type === 'active' && Array.isArray(activeBooksCache)) {
    return now - activeBooksCachedAt < BOOKS_CACHE_TTL_MS
  }
  if (type === 'archived' && Array.isArray(archivedBooksCache)) {
    return now - archivedBooksCachedAt < BOOKS_CACHE_TTL_MS
  }
  return false
}

function setBooksCache(type, data) {
  const now = Date.now()
  const safeData = Array.isArray(data) ? data : []
  if (type === 'active') {
    activeBooksCache = safeData
    activeBooksCachedAt = now
  } else if (type === 'archived') {
    archivedBooksCache = safeData
    archivedBooksCachedAt = now
  }
}

export function clearBooksCache() {
  activeBooksCache = null
  archivedBooksCache = null
  activeBooksCachedAt = 0
  archivedBooksCachedAt = 0
}

/**
 * Flatten book data - merge catalogue info into book object for easy display
 */
function flattenBook(book) {
  if (!book) return book;
  
  // If book has a catalogue object, merge its properties into the book
  if (book.catalogue && typeof book.catalogue === 'object') {
    return {
      // Preserve all original book fields (including branch, branch_id, book_status, etc.)
      ...book,

      // Catalogue info flattened to top level for display
      title: book.catalogue.title,
      author: book.catalogue.author,
      publisher: book.catalogue.publisher,
      year_of_publication: book.catalogue.year_of_publication,
      edition: book.catalogue.edition,
      isbn: book.catalogue.isbn,
      place_of_publication: book.catalogue.place_of_publication,
      dewey: book.catalogue.dewey,
      cutter_number: book.catalogue.cutter_number,
      call_number: book.catalogue.call_number,
      cataloging_status: book.catalogue.cataloging_status,

      // Keep original catalogue reference for detail views
      catalogue: book.catalogue,
    };
  }
  
  // If no catalogue, still ensure book-level fields are available
  return {
    ...book,
    qr_code: book.qr_code,
    id: book.id,
    catalogue_id: book.catalogue_id,
    copy_number: book.copy_number,
    reference_number: book.reference_number,
    is_archived: book.is_archived,
    created_by: book.created_by,
    updated_by: book.updated_by,
    expiration_date: book.expiration_date,
    created_at: book.created_at,
    updated_at: book.updated_at,
  };
}

/**
 * Flatten array of books
 */
function flattenBooks(books) {
  if (!Array.isArray(books)) return [];
  return books.map(flattenBook);
}

/**
 * Internal helper to fetch books via unified list endpoint.
 * Supports ListQueryService params: status, archived, active, count, page, per_page.
 */
async function fetchBooks({ status, archived, active, count = 'all', page, perPage } = {}) {
  const response = await getAxiosInstance().get(API_ENDPOINTS.LIST, {
    params: {
      status,
      archived,
      active,
      count,
      page,
      per_page: perPage,
    },
  });

  let data = response.data;

  if (data.books && Array.isArray(data.books)) {
    data = data.books;
  } else if (data.data && Array.isArray(data.data)) {
    data = data.data;
  } else if (!Array.isArray(data)) {
    data = [];
  }

  // Flatten the books to include catalogue data at top level
  return flattenBooks(data);
}

/**
 * Paginated helper for server-side tables.
 * Returns an object with the current page of flattened books and the total count.
 */
export async function fetchBooksPage({ status, archived, active, page = 1, itemsPerPage = 10 } = {}) {
  const response = await getAxiosInstance().get(API_ENDPOINTS.LIST, {
    params: {
      status,
      archived,
      active,
      page,
      per_page: itemsPerPage,
    },
  });

  const payload = response.data || {};

  let rows = [];
  let total = 0;

  if (payload.books) {
    const container = payload.books;
    if (Array.isArray(container)) {
      rows = container;
      total = rows.length;
    } else if (Array.isArray(container.data)) {
      rows = container.data;
      total = typeof container.total === 'number' ? container.total : rows.length;
    }
  } else if (Array.isArray(payload.data)) {
    rows = payload.data;
    total = rows.length;
  } else if (Array.isArray(payload)) {
    rows = payload;
    total = rows.length;
  }

  const items = flattenBooks(rows);
  if (!total) {
    total = items.length;
  }

  return { items, total };
}

/**
 * Generic list helper so views can query books by backend filters (status, archived, active, etc.).
 */
export async function listBooksFiltered(filters = {}) {
  return fetchBooks(filters)
}


/**
 * Get list of active books
 * @returns {Promise<array>}
 */
export async function listBooks({ forceRefresh = false } = {}) {
  if (!forceRefresh && isBooksCacheValid('active')) {
    return activeBooksCache.slice()
  }
  try {
    const data = await fetchBooks({ active: true, archived: 'false', count: 'all' });
    console.log('Active books loaded from API:', data.length, 'items')
    setBooksCache('active', data)
    return data
  } catch (error) {
    console.error('Failed to list active books from API:', error.message)
    return []
  }
}

/**
 * Get list of archived books
 * @returns {Promise<array>}
 */
export async function listArchivedBooks({ forceRefresh = false } = {}) {
  if (!forceRefresh && isBooksCacheValid('archived')) {
    return archivedBooksCache.slice()
  }
  try {
    const data = await fetchBooks({ archived: 'true', count: 'all' });
    console.log('Archived books loaded from API:', data.length, 'items')
    setBooksCache('archived', data)
    return data
  } catch (error) {
    console.error('Failed to list archived books from API:', error.message)
    return []
  }
}

/**
 * Get a specific book by ID
 * @param {number|string} id - Book ID
 * @returns {Promise<object>}
 */
export async function getBook(id) {
  try {
    const response = await getAxiosInstance().get(`${API_ENDPOINTS.VIEW}/${id}`)
    let data = response.data

    // Handle different response formats
    if (data.book && typeof data.book === 'object') {
      data = data.book
    } else if (data.data && typeof data.data === 'object') {
      data = data.data
    }

    data = data || {}
    
    // Debug: log the API response to check if qr_code is present
    console.log('API Response for book ID:', id, data)
    
    // Flatten the book to include catalogue data at top level
    data = flattenBook(data)

    console.log('Book loaded from API:', id, 'QR Code:', data.qr_code)

    return data
  } catch (error) {
    console.error('Failed to get book:', id, error.message)
    throw error
  }
}

/**
 * Update book status
 * @param {number|string} id - Book ID
 * @param {string} status - New status (available, for_archiving, lost, damaged, under_repair)
 * @returns {Promise<object>}
 */
export async function editBookStatus(id, status) {
  try {
    const response = await getAxiosInstance().post(`${API_ENDPOINTS.EDIT_STATUS}/${id}`, { status })
    
    let result = response.data
    if (result.book && typeof result.book === 'object') {
      result = result.book
    } else if (result.data && typeof result.data === 'object') {
      result = result.data
    }

    console.log('Book status updated:', id)
    clearBooksCache()
    return result
  } catch (error) {
    console.error('Failed to update book status:', error.message)
    throw new Error(error.response?.data?.message || error.message)
  }
}

/**
 * Archive a book
 * @param {number|string} id - Book ID
 * @returns {Promise<object>}
 */
export async function archiveBook(id) {
  try {
    const response = await getAxiosInstance().post(`${API_ENDPOINTS.ARCHIVE}/${id}`)
    
    let result = response.data
    if (result.book && typeof result.book === 'object') {
      result = result.book
    }

    console.log('Book archived:', id)
    clearBooksCache()

    return result
  } catch (error) {
    console.error('Failed to archive book:', error.message)
    throw new Error(error.response?.data?.message || error.message)
  }
}

/**
 * Restore an archived book
 * @param {number|string} id - Book ID
 * @returns {Promise<object>}
 */
export async function restoreBook(id) {
  try {
    const response = await getAxiosInstance().get(`${API_ENDPOINTS.RESTORE}/${id}`)
    
    let result = response.data
    if (result.book && typeof result.book === 'object') {
      result = result.book
    }

    console.log('Book restored:', id)
    clearBooksCache()

    return result
  } catch (error) {
    console.error('Failed to restore book:', error.message)
    throw new Error(error.response?.data?.message || error.message)
  }
}

/**
 * Validate book status
 * @param {string} status - Status to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export function validateBookStatus(status) {
  const validStatuses = ['available', 'for_archiving', 'lost', 'damaged', 'under_repair']
  
  if (!status) {
    return { isValid: false, error: 'Status is required' }
  }
  
  if (!validStatuses.includes(status)) {
    return { isValid: false, error: `Status must be one of: ${validStatuses.join(', ')}` }
  }
  
  return { isValid: true, error: null }
}

export default {
  listBooks,
  listArchivedBooks,
  getBook,
  editBookStatus,
  archiveBook,
  restoreBook,
  validateBookStatus,
}
