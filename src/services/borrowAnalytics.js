import { getAxiosInstance } from './auth'

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const API_BASE_URL = `${API_ORIGIN}/api`

export async function getBorrowOverview() {
  const response = await getAxiosInstance().get(`${API_BASE_URL}/analytics/borrows/overview`)
  return response.data || {}
}

export async function getMostBorrowedBooks() {
  const response = await getAxiosInstance().get(`${API_BASE_URL}/analytics/borrows/top-books`)
  return Array.isArray(response.data) ? response.data : (response.data?.data || [])
}

export async function getTopBorrowers() {
  const response = await getAxiosInstance().get(`${API_BASE_URL}/analytics/borrows/top-borrowers`)
  return Array.isArray(response.data) ? response.data : (response.data?.data || [])
}

export async function getBorrowTrends(range = 'daily') {
  const response = await getAxiosInstance().get(`${API_BASE_URL}/analytics/borrows/trends/${range}`)
  let data = response.data || []

  // Normalize response shapes to array of { label, total }
  if (data && data.data) data = data.data

  if (!Array.isArray(data)) {
    if (Array.isArray(data.totals) && Array.isArray(data.labels)) {
      data = data.totals.map((total, i) => ({ label: data.labels[i] ?? String(i), total }))
    } else if (typeof data === 'object' && data !== null) {
      data = Object.keys(data).map((k) => ({ label: k, total: Number(data[k]) || 0 }))
      data.sort((a, b) => (a.label > b.label ? 1 : a.label < b.label ? -1 : 0))
    } else {
      data = []
    }
  } else {
    if (data.length > 0 && data.every(d => typeof d === 'number')) {
      data = data.map((total, i) => ({ label: String(i), total }))
    }
  }

  // Normalize array items: ensure each item has { label, total }
  if (Array.isArray(data)) {
    data = data.map((item, i) => {
      if (item == null) return { label: String(i), total: 0 }
      if (typeof item === 'number') return { label: String(i), total: item }
      const lbl = item.label || item.date || item.x || item.name || String(i)
      const total = Number(item.total ?? item.y ?? item.value ?? 0) || 0
      return { label: String(lbl), total }
    })
  }

  // If series is sparse (very few points), fill a recent window so charts show meaningful trends.
  // For daily trends: show last 7 days. For monthly: show last 6 months.
  const desiredPoints = range === 'monthly' ? 6 : 7

  // Helper: format and manipulate dates
  const padToTwo = v => (v < 10 ? `0${v}` : `${v}`)
  const formatYMD = d => `${d.getFullYear()}-${padToTwo(d.getMonth() + 1)}-${padToTwo(d.getDate())}`
  const formatYM = d => `${d.getFullYear()}-${padToTwo(d.getMonth() + 1)}`
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
  const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x }

  // Create a map from label -> total for quick lookup. Accept both daily (YYYY-MM-DD) and monthly (YYYY-MM).
  const dataMap = {}
  data.forEach(item => {
    const lbl = String(item.label)
    dataMap[lbl] = Number(item.total) || 0
  })

  // Determine the end date for filling. Prefer last data point's label, otherwise today.
  let endDate = new Date()
  if (data.length > 0) {
    const lastLabel = String(data[data.length - 1].label)
    if (range === 'monthly') {
      // parse YYYY-MM or fallback
      const [y, m] = lastLabel.split('-').map(Number)
      if (!Number.isNaN(y) && !Number.isNaN(m)) endDate = new Date(y, m - 1, 1)
    } else {
      const parsed = new Date(lastLabel)
      if (!Number.isNaN(parsed.getTime())) endDate = parsed
    }
  }

  const labels = []
  if (range === 'monthly') {
    for (let i = desiredPoints - 1; i >= 0; i--) {
      const d = addMonths(endDate, -i)
      labels.push(formatYM(d))
    }
  } else {
    for (let i = desiredPoints - 1; i >= 0; i--) {
      const d = addDays(endDate, -i)
      labels.push(formatYMD(d))
    }
  }

  const filled = labels.map(l => ({ label: l, total: dataMap[l] || 0 }))

  return filled
}

export async function getAverageBorrowDuration() {
  const response = await getAxiosInstance().get(`${API_BASE_URL}/analytics/borrows/average-duration`)
  return response.data || {}
}

export default {
  getBorrowOverview,
  getMostBorrowedBooks,
  getTopBorrowers,
  getBorrowTrends,
  getAverageBorrowDuration,
}
